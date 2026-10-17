"""
Servidor API REST y WebSockets (FastAPI) para SemaforoIA.
Sincronización en tiempo real multi-dispositivo en la red local.
"""

import asyncio
import os
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src.ai_assistant import (
    ConfiguracionIAError,
    ServicioIAError,
    responder_consulta,
    transcribir_audio_gemini,
    validar_conexion,
)
from src.automation import enviar_correo_alerta
from src.logic import SemaforoInteligente
from src import storage

app = FastAPI(title="SemaforoIA API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

semaforo = SemaforoInteligente(duracion_rojo=60.0, duracion_cooldown=120.0)
_ultimo_modo: Optional[str] = None


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


def _persistir_si_cambio(resumen: dict) -> None:
    global _ultimo_modo
    modo = resumen.get("modo")
    if modo != _ultimo_modo:
        storage.registrar_cambio_estado(resumen)
        _ultimo_modo = modo


async def bucle_transmision_estado():
    while True:
        resumen = semaforo.obtener_resumen()
        _persistir_si_cambio(resumen)
        await manager.broadcast(resumen)
        await asyncio.sleep(1)


@app.on_event("startup")
async def startup_event():
    storage.init_db()
    resumen = semaforo.obtener_resumen()
    global _ultimo_modo
    _ultimo_modo = resumen.get("modo")
    storage.registrar_cambio_estado(resumen)
    if os.getenv("SEMAFORO_MEMORY_DB", "").strip() == "1":
        # En tests no arrancar el bucle infinito de broadcast
        return
    asyncio.create_task(bucle_transmision_estado())


@app.websocket("/ws/estado")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    await websocket.send_json(semaforo.obtener_resumen())
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


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


class SolicitudSensor(BaseModel):
    source: str = Field(..., description="pir | button | ui")
    device_id: Optional[str] = "arduino-uno"
    tiempo_actual: Optional[float] = None


class SolicitudHeartbeat(BaseModel):
    pir: int = 0
    button: int = 0
    device_id: Optional[str] = "arduino-uno"


def _procesar_solicitud_cruce(
    source: str,
    tiempo_actual: Optional[float] = None,
    device_id: Optional[str] = None,
) -> dict:
    modo_antes = semaforo.modo.value
    aceptado = semaforo.solicitar_cruce(tiempo_actual)
    resumen = semaforo.obtener_resumen(tiempo_actual)
    storage.registrar_evento_sensor(
        source=source,
        accepted=aceptado,
        modo_resultante=resumen.get("modo", modo_antes),
        device_id=device_id,
    )
    if aceptado or resumen.get("modo") != modo_antes:
        _persistir_si_cambio(resumen)
    return {"solicitud_aceptada": aceptado, "resumen": resumen}


@app.get("/api/estado")
def obtener_estado():
    resumen = semaforo.obtener_resumen()
    _persistir_si_cambio(resumen)
    return resumen


@app.post("/api/solicitar-cruce")
async def solicitar_cruce(datos: SolicitudPeaton):
    resultado = _procesar_solicitud_cruce(
        source="ui",
        tiempo_actual=datos.tiempo_actual,
        device_id="dashboard",
    )
    await manager.broadcast(resultado["resumen"])
    return resultado


@app.post("/api/sensor/evento")
async def sensor_evento(datos: SolicitudSensor):
    source = datos.source.strip().lower()
    if source not in {"pir", "button", "ui"}:
        raise HTTPException(status_code=422, detail="source debe ser pir, button o ui")
    resultado = _procesar_solicitud_cruce(
        source=source,
        tiempo_actual=datos.tiempo_actual,
        device_id=datos.device_id,
    )
    await manager.broadcast(resultado["resumen"])
    return resultado


@app.post("/api/sensor/heartbeat")
def sensor_heartbeat(datos: SolicitudHeartbeat):
    salud = storage.actualizar_salud_sensor(
        pir=datos.pir,
        button=datos.button,
        bridge_connected=True,
    )
    return {"status": "ok", "salud": salud}


@app.get("/api/sensor/salud")
def sensor_salud():
    return storage.obtener_salud_sensor()


@app.get("/api/historial/eventos")
def historial_eventos(limit: int = 50, desde: Optional[str] = None):
    desde_dt = None
    if desde:
        try:
            desde_dt = datetime.fromisoformat(desde.replace("Z", "+00:00"))
        except ValueError as exc:
            raise HTTPException(status_code=422, detail="formato 'desde' inválido") from exc
    return {"eventos": storage.listar_eventos(limit=limit, desde=desde_dt)}


@app.get("/api/historial/estados")
def historial_estados(limit: int = 50):
    return {"estados": storage.listar_estados(limit=limit)}


@app.post("/api/enviar-alerta")
def enviar_alerta(datos: SolicitudEmail):
    resumen = semaforo.obtener_resumen()
    exito = enviar_correo_alerta(
        destinatario=datos.destinatario,
        asunto=datos.asunto,
        resumen_semaforo=resumen,
        mensaje_adicional=datos.mensaje_adicional,
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
        raise HTTPException(status_code=502, detail=str(exc)) from exc

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
        raise HTTPException(status_code=401, detail=str(exc)) from exc

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
