"""Asistente conversacional (Groq / Gemini / xAI)."""

from fastapi import APIRouter, File, HTTPException, UploadFile

from src.ai_assistant import (
    ConfiguracionIAError,
    ConsultaFueraDeAmbitoError,
    ServicioIAError,
    responder_consulta,
    transcribir_audio_gemini,
    validar_conexion,
)
from src.schemas.requests import SolicitudChatbot, SolicitudValidacionIA
from src.services.semaforo import resumen_enriquecido

router = APIRouter(tags=["chatbot"])


@router.post("/api/chatbot")
def consultar_chatbot(datos: SolicitudChatbot):
    consulta = datos.consulta.strip()
    if not consulta:
        raise HTTPException(status_code=422, detail="La consulta no puede estar vacía")
    if len(consulta) > 1000:
        raise HTTPException(status_code=422, detail="La consulta supera los 1000 caracteres")
    proveedor = datos.proveedor.strip().lower()
    if proveedor not in {"gemini", "groq", "xai"}:
        raise HTTPException(status_code=422, detail="Proveedor de IA no compatible")
    estado = resumen_enriquecido()
    try:
        respuesta = responder_consulta(
            consulta,
            estado,
            proveedor=proveedor,
            api_key=None,
        )
    except ConsultaFueraDeAmbitoError as exc:
        return {
            "respuesta": str(exc),
            "estado_semaforo": estado,
            "fuera_de_ambito": True,
        }
    except ConfiguracionIAError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ServicioIAError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {
        "respuesta": respuesta,
        "estado_semaforo": estado,
        "fuera_de_ambito": False,
    }


@router.post("/api/chatbot/validar")
def validar_api_key(datos: SolicitudValidacionIA):
    proveedor = datos.proveedor.strip().lower()
    if proveedor not in {"gemini", "groq", "xai"}:
        raise HTTPException(status_code=422, detail="Proveedor de IA no compatible")
    if not datos.api_key.strip() or len(datos.api_key) > 2048:
        raise HTTPException(status_code=422, detail="Ingresa una API key válida")

    try:
        modelo = validar_conexion(proveedor, datos.api_key)
    except ConfiguracionIAError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ServicioIAError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    return {
        "conectado": True,
        "mensaje": "Conectado correctamente",
        "proveedor": proveedor,
        "modelo": modelo,
    }


@router.post("/api/chatbot/transcribir")
async def transcribir_audio(audio: UploadFile = File(...)):
    contenido = await audio.read()
    if not contenido:
        raise HTTPException(status_code=422, detail="El archivo de audio está vacío")
    if len(contenido) > 15 * 1024 * 1024:
        raise HTTPException(
            status_code=422, detail="El archivo de audio supera los 15 MB permitidos"
        )

    mime = audio.content_type or "audio/webm"
    try:
        texto = transcribir_audio_gemini(
            audio_bytes=contenido,
            mime_type=mime,
            api_key=None,
        )
    except ConfiguracionIAError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ServicioIAError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return {"texto": texto}
