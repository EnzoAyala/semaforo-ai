"""
Servidor API REST y WebSockets (FastAPI) para SemaforoIA.
Sincronización en tiempo real multi-dispositivo en la red local.
"""

import asyncio
from typing import List, Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.logic import SemaforoInteligente
from src.automation import enviar_correo_alerta
from src.ai_assistant import (
    ConfiguracionIAError,
    ServicioIAError,
    responder_consulta,
    validar_conexion,
    transcribir_audio_gemini,
)

app = FastAPI(title="SemaforoIA API", version="2.0.0")

# Habilitar CORS para cualquier origen en la red local
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

semaforo = SemaforoInteligente(duracion_rojo=60.0, duracion_cooldown=120.0)


# -----------------------------------------------------------------------------
# Gestor de WebSockets para Múltiples Dispositivos en Red Local
# -----------------------------------------------------------------------------
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)


manager = ConnectionManager()


# Bucle en segundo plano que emite el estado del semáforo en tiempo real a todos los clientes
async def bucle_transmision_estado():
    while True:
        resumen = semaforo.obtener_resumen()
        await manager.broadcast(resumen)
        await asyncio.sleep(1)


@app.on_event("startup")
async def startup_event():
    asyncio.create_task(bucle_transmision_estado())


@app.websocket("/ws/estado")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    # Enviar estado inicial inmediatamente tras conectar
    await websocket.send_json(semaforo.obtener_resumen())
    try:
        while True:
            # Mantiene la conexión abierta escuchando mensajes si fuera necesario
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# -----------------------------------------------------------------------------
# Endpoints REST Existentes
# -----------------------------------------------------------------------------
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
    return semaforo.obtener_resumen()


@app.post("/api/solicitar-cruce")
async def solicitar_cruce(datos: SolicitudPeaton):
    aceptado = semaforo.solicitar_cruce(datos.tiempo_actual)
    resumen = semaforo.obtener_resumen(datos.tiempo_actual)
    # Transmitir el cambio inmediatamente a todos los dispositivos conectados
    await manager.broadcast(resumen)
    return {
        "solicitud_aceptada": aceptado,
        "resumen": resumen
    }


@app.post("/api/enviar-alerta")
def enviar_alerta(datos: SolicitudEmail):
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


@app.post("/api/chatbot/transcribir")
async def transcribir_audio(
    audio: UploadFile = File(...),
    api_key: Optional[str] = Form(None),
):
    contenido = await audio.read()
    if not contenido:
        raise HTTPException(status_code=422, detail="El archivo de audio está vacío")
    if len(contenido) > 15 * 1024 * 1024:
        raise HTTPException(
            status_code=422, detail="El archivo de audio supera los 15 MB permitidos"
        )
    if api_key and len(api_key) > 2048:
        raise HTTPException(status_code=422, detail="La API key no es válida")

    mime = audio.content_type or "audio/webm"
    try:
        texto = transcribir_audio_gemini(
            audio_bytes=contenido,
            mime_type=mime,
            api_key=api_key,
        )
    except ConfiguracionIAError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ServicioIAError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return {"texto": texto}

@app.websocket("/ws/estado")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Enviar estado inmediatamente al conectar
        await websocket.send_json(semaforo.obtener_resumen())
        while True:
            # Mantener la conexión abierta
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)