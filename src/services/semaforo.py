"""Estado en memoria del FSM y operaciones de cruce / resumen / reset."""

from __future__ import annotations

import os
import time
from typing import Optional

from src.bots.horarios_pico import obtener_estado_horarios_pico
from src.logic import SemaforoInteligente
from src.services.notifications import programar_notificacion_suscriptores
from src import storage

# Estado mutable compartido (tests pueden reasignar estos atributos del módulo).
semaforo = SemaforoInteligente(duracion_rojo=60.0, duracion_cooldown=120.0)
_ultimo_modo: Optional[str] = None


def tiempo_seguro(tiempo_actual: Optional[float]) -> Optional[float]:
    """
    Evita que un cliente mande un reloj simulado y rompa las fases del FSM.
    En tests (SEMAFORO_MEMORY_DB=1) se acepta el reloj inyectado.
    """
    if tiempo_actual is None:
        return None
    if os.getenv("SEMAFORO_MEMORY_DB", "").strip() == "1":
        return float(tiempo_actual)
    try:
        t = float(tiempo_actual)
    except (TypeError, ValueError):
        return None
    if abs(t - time.time()) > 7200:
        return None
    return t


def persistir_si_cambio(resumen: dict) -> None:
    """Persiste cambios de fase y notifica por correo automáticamente."""
    global _ultimo_modo
    modo = resumen.get("modo")
    if modo == _ultimo_modo:
        return
    modo_anterior = _ultimo_modo
    storage.registrar_cambio_estado(resumen)
    _ultimo_modo = modo
    if modo_anterior is not None:
        programar_notificacion_suscriptores(resumen)


def resumen_enriquecido(tiempo_actual: Optional[float] = None) -> dict:
    from src.services.peak_hours import aplicar_politica_horarios_pico

    resumen = semaforo.obtener_resumen(tiempo_seguro(tiempo_actual))
    pico = aplicar_politica_horarios_pico()
    resumen["en_hora_pico"] = pico["en_hora_pico"]
    resumen["franja_activa"] = pico["franja_activa"]
    resumen["horarios_pico"] = pico
    return resumen


def procesar_solicitud_cruce(
    source: str,
    tiempo_actual: Optional[float] = None,
    device_id: Optional[str] = None,
) -> dict:
    t = tiempo_seguro(tiempo_actual)
    modo_antes = semaforo.modo.value
    aceptado = semaforo.solicitar_cruce(t)
    resumen = resumen_enriquecido(t)
    storage.registrar_evento_sensor(
        source=source,
        accepted=aceptado,
        modo_resultante=resumen.get("modo", modo_antes),
        device_id=device_id,
    )
    if aceptado or resumen.get("modo") != modo_antes:
        persistir_si_cambio(resumen)
    return {"solicitud_aceptada": aceptado, "resumen": resumen}


def reset_semaforo_estado() -> dict:
    """Vuelve el semáforo a REPOSO (p. ej. al reconectar el bridge)."""
    global semaforo, _ultimo_modo
    estado_bot = obtener_estado_horarios_pico()
    rojo = estado_bot.duracion_rojo_aplicada if estado_bot else 60.0
    cool = estado_bot.duracion_cooldown_aplicada if estado_bot else 120.0
    semaforo = SemaforoInteligente(duracion_rojo=rojo, duracion_cooldown=cool)
    resumen = resumen_enriquecido()
    _ultimo_modo = resumen.get("modo")
    storage.registrar_cambio_estado(resumen)
    return resumen


def marcar_modo_inicial(modo: Optional[str]) -> None:
    """Fija el modo baseline en startup (evita email al arrancar)."""
    global _ultimo_modo
    _ultimo_modo = modo
