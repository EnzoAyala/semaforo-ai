"""
Servidor API REST (FastAPI) para conectar el Backend con el Frontend en React.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from src.logic import SemaforoInteligente
from src.automation import enviar_correo_alerta
from src.ai_assistant import (
    ConfiguracionIAError,
    ServicioIAError,
    responder_consulta,
    validar_conexion,
)

app = FastAPI(title="SemaforoIA API", version="2.0.0")

# Configuración nativa de CORS para comunicarse con React en http://localhost:5173
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instancia global del semáforo inteligente
semaforo = SemaforoInteligente(duracion_rojo=60.0, duracion_cooldown=120.0)


class SolicitudPeaton(BaseModel):
    tiempo_actual: Optional[float] = None


class SolicitudEmail(BaseModel):
    destinatario: str
    asunto: str
    mensaje_adicional: Optional[str] = ""


class SolicitudChatbot(BaseModel):
    consulta: str
    proveedor: str = "groq"
    api_key: Optional[str] = None


class SolicitudValidacionIA(BaseModel):
    proveedor: str
    api_key: str


@app.get("/api/estado")
def obtener_estado():
    """Retorna el estado actual del semáforo."""
    return semaforo.obtener_resumen()


@app.post("/api/solicitar-cruce")
def solicitar_cruce(datos: SolicitudPeaton):
    """Simula la activación del sensor PIR."""
    aceptado = semaforo.solicitar_cruce(datos.tiempo_actual)
    resumen = semaforo.obtener_resumen(datos.tiempo_actual)
    return {
        "solicitud_aceptada": aceptado,
        "resumen": resumen
    }


@app.post("/api/enviar-alerta")
def enviar_alerta(datos: SolicitudEmail):
    """Ejecuta el módulo de envío de correo automático."""
    resumen = semaforo.obtener_resumen()
    exito = enviar_correo_alerta(
        destinatario=datos.destinatario,
        asunto=datos.asunto,
        resumen_semaforo=resumen,
        mensaje_adicional=datos.mensaje_adicional
    )
    if not exito:
        raise HTTPException(status_code=500, detail="Error al procesar el envío del correo")
    return {"status": "ok", "mensaje": f"Correo enviado a {datos.destinatario}"}


@app.post("/api/chatbot")
def consultar_chatbot(datos: SolicitudChatbot):
    """Responde al usuario inyectando el estado actual del semáforo."""
    consulta = datos.consulta.strip()
    if not consulta:
        raise HTTPException(status_code=422, detail="La consulta no puede estar vacía")
    if len(consulta) > 1000:
        raise HTTPException(status_code=422, detail="La consulta supera los 1000 caracteres")
    proveedor = datos.proveedor.strip().lower()
    if proveedor not in {"gemini", "groq", "xai"}:
        raise HTTPException(status_code=422, detail="Proveedor de IA no compatible")
    if datos.api_key and len(datos.api_key) > 2048:
        raise HTTPException(status_code=422, detail="La API key no es válida")

    estado = semaforo.obtener_resumen()
    try:
        respuesta = responder_consulta(
            consulta,
            estado,
            proveedor=proveedor,
            api_key=datos.api_key,
        )
    except ConfiguracionIAError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ServicioIAError as exc:
        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc

    return {"respuesta": respuesta, "estado_semaforo": estado}


@app.post("/api/chatbot/validar")
def validar_api_key(datos: SolicitudValidacionIA):
    """Valida una clave contra el proveedor sin almacenarla en el servidor."""
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
        raise HTTPException(
            status_code=401,
            detail=str(exc),
        ) from exc

    return {
        "conectado": True,
        "mensaje": "Conectado correctamente",
        "proveedor": proveedor,
        "modelo": modelo,
    }
