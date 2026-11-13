"""
Bot de horarios pico: ingresa a una web pública (URL en BOLETIN_TRANSITO_URL),
extrae franjas de hora punta y ajusta tiempos del semáforo.
"""

from __future__ import annotations

import os
import re
from dataclasses import asdict, dataclass, field
from datetime import datetime, time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from zoneinfo import ZoneInfo

import httpx

try:
    from bs4 import BeautifulSoup
except ImportError as exc:  # pragma: no cover
    raise ImportError(
        "Falta beautifulsoup4. Ejecuta: pip install -r requirements.txt"
    ) from exc


BOLETIN_LOCAL = Path(__file__).with_name("boletin_transito.html")
TZ_DEFAULT = "America/Lima"
DURACION_ROJO_BASE = 60.0
DURACION_COOLDOWN_BASE = 120.0
DURACION_ROJO_PICO = 45.0
DURACION_COOLDOWN_PICO = 180.0

# URL recomendada (ATU / gob.pe). Configúrala en .env como BOLETIN_TRANSITO_URL.
URL_ATU_HORAS_PUNTA_EJEMPLO = (
    "https://www.gob.pe/institucion/atu/noticias/777727-comunicado"
)

# Ej.: "6:30 a. m. a 9:30 a. m." / "5:00 p.m. a 8:30 p. m." / "07:00 a 09:00"
_RE_RANGO_AMPM = re.compile(
    r"(\d{1,2})[:.](\d{2})\s*(a\.?\s*m\.?|p\.?\s*m\.?)\s*(?:a|hasta|-|–|—)\s*"
    r"(\d{1,2})[:.](\d{2})\s*(a\.?\s*m\.?|p\.?\s*m\.?)",
    re.IGNORECASE,
)
_RE_RANGO_24H = re.compile(
    r"(\d{1,2})[:.](\d{2})\s*(?:a|hasta|-|–|—)\s*(\d{1,2})[:.](\d{2})"
)


@dataclass
class FranjaPico:
    nombre: str
    inicio: str  # HH:MM
    fin: str  # HH:MM
    duracion_rojo: float
    duracion_cooldown: float

    def contiene(self, ahora: time) -> bool:
        t0 = _parse_hhmm(self.inicio)
        t1 = _parse_hhmm(self.fin)
        if t0 <= t1:
            return t0 <= ahora < t1
        return ahora >= t0 or ahora < t1


@dataclass
class EstadoHorariosPico:
    fuente_url: str
    zona_horaria: str
    franjas: List[FranjaPico] = field(default_factory=list)
    duracion_rojo_base: float = DURACION_ROJO_BASE
    duracion_cooldown_base: float = DURACION_COOLDOWN_BASE
    en_hora_pico: bool = False
    franja_activa: Optional[str] = None
    duracion_rojo_aplicada: float = DURACION_ROJO_BASE
    duracion_cooldown_aplicada: float = DURACION_COOLDOWN_BASE
    hora_local: Optional[str] = None
    actualizado_en: Optional[str] = None
    error: Optional[str] = None
    parser: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


_ultimo_estado: Optional[EstadoHorariosPico] = None


def _parse_hhmm(value: str) -> time:
    horas, minutos = value.strip().split(":")
    return time(hour=int(horas), minute=int(minutos))


def _a_hhmm(hora: int, minuto: int) -> str:
    return f"{hora:02d}:{minuto:02d}"


def _ampm_a_24h(hora: int, minuto: int, sufijo: str) -> Tuple[int, int]:
    s = re.sub(r"\s+", "", sufijo.lower().replace(".", ""))
    h = hora % 12
    if s.startswith("p"):
        h += 12
    return h, minuto


def url_boletin_default() -> str:
    """
    URL pública a scrapear.
    Prioridad: BOLETIN_TRANSITO_URL → boletín local de la API.
    """
    override = os.getenv("BOLETIN_TRANSITO_URL", "").strip()
    if override:
        return override
    base = os.getenv("API_PUBLIC_URL", os.getenv("API_BASE_URL", "http://localhost:8000"))
    return f"{base.rstrip('/')}/boletin/transito"


def leer_boletin_embebido() -> str:
    return BOLETIN_LOCAL.read_text(encoding="utf-8")


def _politica_pico_desde_env() -> Tuple[float, float]:
    rojo = float(os.getenv("BOT_PICO_DURACION_ROJO", str(DURACION_ROJO_PICO)))
    cool = float(os.getenv("BOT_PICO_DURACION_COOLDOWN", str(DURACION_COOLDOWN_PICO)))
    return rojo, cool


def _politica_base_desde_env() -> Tuple[float, float]:
    rojo = float(os.getenv("BOT_BASE_DURACION_ROJO", str(DURACION_ROJO_BASE)))
    cool = float(os.getenv("BOT_BASE_DURACION_COOLDOWN", str(DURACION_COOLDOWN_BASE)))
    return rojo, cool


def _parsear_boletin_estructurado(soup: BeautifulSoup) -> Dict[str, Any]:
    tz_el = soup.select_one("#tz")
    zona = (tz_el.get_text(strip=True) if tz_el else None) or TZ_DEFAULT

    franjas: List[FranjaPico] = []
    for art in soup.select("article.horario-pico"):
        inicio = art.get("data-inicio") or ""
        fin = art.get("data-fin") or ""
        if not inicio or not fin:
            continue
        nombre = art.get("data-nombre") or (
            art.find("h2").get_text(strip=True) if art.find("h2") else "Pico"
        )
        rojo = float(art.get("data-duracion-rojo") or DURACION_ROJO_PICO)
        cool = float(art.get("data-duracion-cooldown") or DURACION_COOLDOWN_PICO)
        franjas.append(
            FranjaPico(
                nombre=nombre,
                inicio=inicio,
                fin=fin,
                duracion_rojo=rojo,
                duracion_cooldown=cool,
            )
        )

    base = soup.select_one("#politica-fuera-pico")
    if base is not None:
        rojo_base = float(base.get("data-duracion-rojo") or DURACION_ROJO_BASE)
        cool_base = float(base.get("data-duracion-cooldown") or DURACION_COOLDOWN_BASE)
    else:
        rojo_base, cool_base = _politica_base_desde_env()

    return {
        "zona_horaria": zona,
        "franjas": franjas,
        "duracion_rojo_base": rojo_base,
        "duracion_cooldown_base": cool_base,
        "parser": "boletin-semaforoia" if franjas else None,
    }


def _extraer_texto_util(soup: BeautifulSoup) -> str:
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    return " ".join(soup.get_text(" ", strip=True).split())


def _dedup_franjas(franjas: List[FranjaPico]) -> List[FranjaPico]:
    vistas = set()
    out: List[FranjaPico] = []
    for f in franjas:
        key = (f.inicio, f.fin)
        if key in vistas:
            continue
        vistas.add(key)
        out.append(f)
    return out


def parsear_pagina_atu_gob(html: str) -> Dict[str, Any]:
    """
    Extrae franjas de hora punta desde páginas públicas ATU / gob.pe
    (p. ej. comunicados con '6:30 a. m. a 9:30 a. m. y de 5:00 p. m. a 8:30 p. m.').
    """
    soup = BeautifulSoup(html, "html.parser")
    texto = _extraer_texto_util(soup)
    rojo_pico, cool_pico = _politica_pico_desde_env()
    rojo_base, cool_base = _politica_base_desde_env()

    franjas: List[FranjaPico] = []
    for i, m in enumerate(_RE_RANGO_AMPM.finditer(texto), start=1):
        h1, mi1 = _ampm_a_24h(int(m.group(1)), int(m.group(2)), m.group(3))
        h2, mi2 = _ampm_a_24h(int(m.group(4)), int(m.group(5)), m.group(6))
        inicio = _a_hhmm(h1, mi1)
        fin = _a_hhmm(h2, mi2)
        nombre = "Pico mañana" if h1 < 12 else "Pico tarde" if h1 >= 12 else f"Pico {i}"
        if h1 < 12:
            nombre = "Pico mañana"
        elif h1 >= 16:
            nombre = "Pico tarde"
        else:
            nombre = f"Hora punta {i}"
        franjas.append(
            FranjaPico(
                nombre=nombre,
                inicio=inicio,
                fin=fin,
                duracion_rojo=rojo_pico,
                duracion_cooldown=cool_pico,
            )
        )

    if not franjas:
        # Fallback: rangos 24h cerca de menciones de punta
        for i, m in enumerate(_RE_RANGO_24H.finditer(texto), start=1):
            contexto = texto[max(0, m.start() - 80) : m.end() + 40].lower()
            if not any(
                k in contexto
                for k in ("punta", "pico", "hora punta", "horas punta", "hora pico")
            ):
                continue
            inicio = _a_hhmm(int(m.group(1)), int(m.group(2)))
            fin = _a_hhmm(int(m.group(3)), int(m.group(4)))
            h1 = int(m.group(1))
            nombre = "Pico mañana" if h1 < 12 else "Pico tarde"
            franjas.append(
                FranjaPico(
                    nombre=nombre,
                    inicio=inicio,
                    fin=fin,
                    duracion_rojo=rojo_pico,
                    duracion_cooldown=cool_pico,
                )
            )

    franjas = _dedup_franjas(franjas)
    return {
        "zona_horaria": TZ_DEFAULT,
        "franjas": franjas,
        "duracion_rojo_base": rojo_base,
        "duracion_cooldown_base": cool_base,
        "parser": "atu-gob-pe" if franjas else None,
    }


def parsear_boletin_html(html: str) -> Dict[str, Any]:
    """
    Intenta primero el boletín estructurado SemaforoIA;
    si no hay franjas, parsea texto de páginas ATU/gob.pe.
    """
    soup = BeautifulSoup(html, "html.parser")
    estructurado = _parsear_boletin_estructurado(soup)
    if estructurado["franjas"]:
        return estructurado

    externo = parsear_pagina_atu_gob(html)
    if externo["franjas"]:
        return externo

    rojo_base, cool_base = _politica_base_desde_env()
    return {
        "zona_horaria": TZ_DEFAULT,
        "franjas": [],
        "duracion_rojo_base": rojo_base,
        "duracion_cooldown_base": cool_base,
        "parser": None,
    }


def evaluar_franjas(
    franjas: List[FranjaPico],
    *,
    zona_horaria: str,
    duracion_rojo_base: float,
    duracion_cooldown_base: float,
    ahora: Optional[datetime] = None,
) -> Dict[str, Any]:
    tz = ZoneInfo(zona_horaria)
    momento = ahora.astimezone(tz) if ahora else datetime.now(tz)
    hora = momento.time().replace(second=0, microsecond=0)

    activa: Optional[FranjaPico] = None
    for franja in franjas:
        if franja.contiene(hora):
            activa = franja
            break

    if activa:
        return {
            "en_hora_pico": True,
            "franja_activa": activa.nombre,
            "duracion_rojo_aplicada": activa.duracion_rojo,
            "duracion_cooldown_aplicada": activa.duracion_cooldown,
            "hora_local": momento.strftime("%Y-%m-%d %H:%M:%S %Z"),
        }

    return {
        "en_hora_pico": False,
        "franja_activa": None,
        "duracion_rojo_aplicada": duracion_rojo_base,
        "duracion_cooldown_aplicada": duracion_cooldown_base,
        "hora_local": momento.strftime("%Y-%m-%d %H:%M:%S %Z"),
    }


def descargar_boletin(url: str, timeout: float = 12.0) -> str:
    if not url.startswith(("http://", "https://")):
        raise ValueError("BOLETIN_TRANSITO_URL debe usar http:// o https://")
    headers = {
        "User-Agent": (
            "SemaforoIA-Bot/1.0 (+https://localhost; bot academico de horarios pico)"
        ),
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "es-PE,es;q=0.9",
    }
    with httpx.Client(timeout=timeout, follow_redirects=True, headers=headers) as client:
        response = client.get(url)
        response.raise_for_status()
        return response.text


def _es_boletin_local(url: str) -> bool:
    lower = url.rstrip("/").lower()
    return lower.endswith("/boletin/transito") and (
        "localhost" in lower or "127.0.0.1" in lower
    )


def actualizar_horarios_pico(
    *,
    url: Optional[str] = None,
    html: Optional[str] = None,
    ahora: Optional[datetime] = None,
    permitir_fallback_local: bool = True,
) -> EstadoHorariosPico:
    """
    Ejecuta el bot: entra a la web pública (BOLETIN_TRANSITO_URL),
    extrae franjas y calcula si estamos en hora pico.
    """
    global _ultimo_estado
    fuente = url or url_boletin_default()
    error: Optional[str] = None
    contenido = html

    if contenido is None:
        if _es_boletin_local(fuente) and BOLETIN_LOCAL.is_file():
            try:
                contenido = descargar_boletin(fuente, timeout=2.0)
            except Exception:
                contenido = leer_boletin_embebido()
        else:
            try:
                contenido = descargar_boletin(fuente)
            except Exception as exc:
                error = f"No se pudo acceder a {fuente}: {exc}"
                if permitir_fallback_local and BOLETIN_LOCAL.is_file():
                    contenido = leer_boletin_embebido()
                    fuente = f"file://{BOLETIN_LOCAL}"
                else:
                    estado = EstadoHorariosPico(
                        fuente_url=fuente,
                        zona_horaria=TZ_DEFAULT,
                        error=error,
                        actualizado_en=datetime.now(ZoneInfo(TZ_DEFAULT)).isoformat(),
                    )
                    _ultimo_estado = estado
                    return estado

    parsed = parsear_boletin_html(contenido)
    if not parsed["franjas"] and permitir_fallback_local and html is None:
        # Página externa sin horarios detectables → fallback local
        if error is None:
            error = "No se detectaron franjas en la página; usando boletín local."
        parsed = parsear_boletin_html(leer_boletin_embebido())
        if not fuente.startswith("file://"):
            # Conserva la URL real intentada + nota de fallback en error
            pass

    evaluacion = evaluar_franjas(
        parsed["franjas"],
        zona_horaria=parsed["zona_horaria"],
        duracion_rojo_base=parsed["duracion_rojo_base"],
        duracion_cooldown_base=parsed["duracion_cooldown_base"],
        ahora=ahora,
    )

    estado = EstadoHorariosPico(
        fuente_url=fuente,
        zona_horaria=parsed["zona_horaria"],
        franjas=parsed["franjas"],
        duracion_rojo_base=parsed["duracion_rojo_base"],
        duracion_cooldown_base=parsed["duracion_cooldown_base"],
        en_hora_pico=evaluacion["en_hora_pico"],
        franja_activa=evaluacion["franja_activa"],
        duracion_rojo_aplicada=evaluacion["duracion_rojo_aplicada"],
        duracion_cooldown_aplicada=evaluacion["duracion_cooldown_aplicada"],
        hora_local=evaluacion["hora_local"],
        actualizado_en=datetime.now(ZoneInfo(parsed["zona_horaria"])).isoformat(),
        error=error,
        parser=parsed.get("parser"),
    )
    _ultimo_estado = estado
    return estado


def obtener_estado_horarios_pico() -> Optional[EstadoHorariosPico]:
    return _ultimo_estado


def reset_estado_horarios_pico() -> None:
    global _ultimo_estado
    _ultimo_estado = None
