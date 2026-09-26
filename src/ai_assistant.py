"""Asistente conversacional de SemaforoIA integrado con Groq."""

import json
import os
from typing import Any, Dict, Optional


MODELO_GROQ_DEFAULT = "llama-3.3-70b-versatile"
MODELO_XAI_DEFAULT = "grok-4.7"
MODELO_GEMINI_DEFAULT = "gemini-3.6-flash"


class ConfiguracionIAError(RuntimeError):
    """La configuración requerida para usar el asistente no está disponible."""


class ServicioIAError(RuntimeError):
    """Groq no pudo generar una respuesta válida."""


def _crear_cliente_groq(api_key: Optional[str] = None):
    api_key = api_key or os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ConfiguracionIAError(
            "Falta configurar la variable de entorno GROQ_API_KEY."
        )

    try:
        from groq import Groq
    except ImportError as exc:
        raise ConfiguracionIAError(
            "El SDK de Groq no está instalado. Ejecuta: pip install -r requirements.txt"
        ) from exc

    return Groq(api_key=api_key)


def _crear_cliente_xai(api_key: Optional[str] = None):
    api_key = api_key or os.getenv("XAI_API_KEY")
    if not api_key:
        raise ConfiguracionIAError(
            "Ingresa una API key de xAI o configura XAI_API_KEY."
        )

    try:
        from openai import OpenAI
    except ImportError as exc:
        raise ConfiguracionIAError(
            "El SDK requerido no está instalado. Ejecuta: pip install -r requirements.txt"
        ) from exc

    return OpenAI(api_key=api_key, base_url="https://api.x.ai/v1")


def _crear_cliente_gemini(
    api_key: Optional[str] = None,
    vertexai: bool = False,
):
    api_key = api_key or os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ConfiguracionIAError(
            "Ingresa una API key de Gemini o configura GEMINI_API_KEY."
        )

    try:
        from google import genai
    except ImportError as exc:
        raise ConfiguracionIAError(
            "El SDK de Gemini no está instalado. Ejecuta: pip install -r requirements.txt"
        ) from exc

    return genai.Client(api_key=api_key, vertexai=vertexai)


def _generar_gemini(
    api_key: Optional[str],
    modelo: str,
    contenido: str,
    cliente: Optional[Any] = None,
):
    """Prueba Gemini Developer API y, para claves AQ, Vertex AI Express."""
    if cliente is not None:
        return cliente.models.generate_content(model=modelo, contents=contenido)

    clave = api_key or os.getenv("GEMINI_API_KEY")
    cliente_gemini = _crear_cliente_gemini(clave)
    try:
        return cliente_gemini.models.generate_content(
            model=modelo,
            contents=contenido,
        )
    except Exception:
        if not clave or not clave.strip().startswith("AQ."):
            raise
        cliente_vertex = _crear_cliente_gemini(clave, vertexai=True)
        return cliente_vertex.models.generate_content(
            model=modelo,
            contents=contenido,
        )


def _describir_error_proveedor(
    proveedor: str,
    exc: Exception,
    clave: str,
    modelo: str,
) -> str:
    """Convierte errores de SDK en mensajes útiles sin incluir la credencial."""
    status = getattr(exc, "status_code", None) or getattr(exc, "code", None)
    mensaje_api = getattr(exc, "message", None)
    detalle = str(exc).lower()
    nombre = {"gemini": "Google Gemini", "xai": "xAI", "groq": "Groq"}.get(
        proveedor,
        proveedor,
    )

    if "access_token_type_unsupported" in detalle:
        return (
            "Google rechazó esta clave AQ porque no está activa o vinculada "
            "correctamente a Gemini API. Revisa su estado en Google AI Studio."
        )
    if status == 401 or any(
        texto in detalle
        for texto in ("api key not valid", "invalid api key", "unauthenticated")
    ):
        return f"{nombre} rechazó la API key. Revisa su estado en la consola oficial."
    if status == 403 or "permission" in detalle:
        return f"La clave fue reconocida, pero no tiene permiso para usar {modelo}."
    if status == 404 or "not found" in detalle:
        return f"El modelo {modelo} no está disponible para esta cuenta."
    if status == 429 or any(
        texto in detalle for texto in ("quota", "rate limit", "resource_exhausted")
    ):
        return f"La clave llegó a su límite o no tiene cuota disponible en {nombre}."
    if mensaje_api:
        detalle_seguro = str(mensaje_api).replace(clave, "[API_KEY]")[:300]
        return f"{nombre} devolvió {status or 'un error'}: {detalle_seguro}"
    return f"No fue posible conectar con {nombre}. Error técnico: {type(exc).__name__}."


def responder_consulta(
    consulta: str,
    estado_semaforo: Dict[str, Any],
    cliente: Optional[Any] = None,
    proveedor: str = "groq",
    api_key: Optional[str] = None,
) -> str:
    """
    Responde una consulta usando el estado actual del semáforo como contexto.

    ``cliente`` permite inyectar un cliente falso en pruebas sin llamar a Groq.
    """
    pregunta = consulta.strip()
    if not pregunta:
        raise ValueError("La consulta no puede estar vacía.")

    estado_json = json.dumps(estado_semaforo, ensure_ascii=False)

    mensajes = [
        {
            "role": "system",
            "content": (
                "Eres el asistente de SemaforoIA, un sistema de control peatonal. "
                "Responde en español, de forma breve, clara y útil. Usa el estado "
                "del semáforo incluido abajo como la fuente de verdad para preguntas "
                "sobre luces, cruce o tiempo restante. Nunca indiques que es seguro "
                "cruzar salvo que 'permite_cruce' sea true y la luz peatonal sea VERDE. "
                "Aclara que el usuario debe observar el entorno y las señales físicas. "
                f"Estado actual: {estado_json}"
            ),
        },
        {"role": "user", "content": pregunta},
    ]

    try:
        if proveedor == "gemini":
            completion = _generar_gemini(
                api_key=api_key,
                modelo=os.getenv("GEMINI_MODEL", MODELO_GEMINI_DEFAULT),
                contenido=(
                    f"{mensajes[0]['content']}\n\nConsulta del usuario: {pregunta}"
                ),
                cliente=cliente,
            )
            respuesta = completion.text
        elif proveedor == "xai":
            cliente_xai = cliente or _crear_cliente_xai(api_key)
            completion = cliente_xai.responses.create(
                model=os.getenv("XAI_MODEL", MODELO_XAI_DEFAULT),
                input=mensajes,
                reasoning={"effort": "low"},
            )
            respuesta = completion.output_text
        elif proveedor == "groq":
            cliente_groq = cliente or _crear_cliente_groq(api_key)
            completion = cliente_groq.chat.completions.create(
                model=os.getenv("GROQ_MODEL", MODELO_GROQ_DEFAULT),
                messages=mensajes,
                temperature=0.2,
                max_completion_tokens=350,
            )
            respuesta = completion.choices[0].message.content
        else:
            raise ValueError("Proveedor de IA no compatible.")
    except (ConfiguracionIAError, ValueError):
        raise
    except Exception as exc:
        modelo = {
            "gemini": os.getenv("GEMINI_MODEL", MODELO_GEMINI_DEFAULT),
            "xai": os.getenv("XAI_MODEL", MODELO_XAI_DEFAULT),
            "groq": os.getenv("GROQ_MODEL", MODELO_GROQ_DEFAULT),
        }.get(proveedor, proveedor)
        mensaje = _describir_error_proveedor(
            proveedor,
            exc,
            api_key or "",
            modelo,
        )
        raise ServicioIAError(mensaje) from exc

    if not respuesta or not respuesta.strip():
        raise ServicioIAError("El proveedor devolvió una respuesta vacía.")

    return respuesta.strip()


def validar_conexion(proveedor: str, api_key: str) -> str:
    """Comprueba la clave haciendo una generación mínima con el modelo elegido."""
    clave = api_key.strip()
    if not clave:
        raise ConfiguracionIAError("Ingresa una API key para validarla.")

    try:
        if proveedor == "gemini":
            modelo = os.getenv("GEMINI_MODEL", MODELO_GEMINI_DEFAULT)
            _generar_gemini(
                api_key=clave,
                modelo=modelo,
                contenido="Responde únicamente: OK",
            )
        elif proveedor == "xai":
            modelo = os.getenv("XAI_MODEL", MODELO_XAI_DEFAULT)
            _crear_cliente_xai(clave).responses.create(
                model=modelo,
                input="Responde únicamente: OK",
                reasoning={"effort": "low"},
                max_output_tokens=32,
            )
        elif proveedor == "groq":
            modelo = os.getenv("GROQ_MODEL", MODELO_GROQ_DEFAULT)
            _crear_cliente_groq(clave).chat.completions.create(
                model=modelo,
                messages=[{"role": "user", "content": "Responde únicamente: OK"}],
                temperature=0,
                max_completion_tokens=8,
            )
        else:
            raise ValueError("Proveedor de IA no compatible.")
    except (ConfiguracionIAError, ValueError):
        raise
    except Exception as exc:
        mensaje = _describir_error_proveedor(
            proveedor,
            exc,
            clave,
            modelo,
        )
        raise ServicioIAError(mensaje) from exc

    return modelo
