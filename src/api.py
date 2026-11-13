"""
Servidor API REST y WebSockets (FastAPI) para SemaforoIA.
Sincronización en tiempo real multi-dispositivo en la red local.
"""

import asyncio
import os
import time
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

from src.ai_assistant import (
    ConfiguracionIAError,
    ConsultaFueraDeAmbitoError,
    ServicioIAError,
    responder_consulta,
    transcribir_audio_gemini,
    validar_conexion,
)
from src.automation import enviar_correo_alerta
from src.bots.horarios_pico import (
    actualizar_horarios_pico,
    leer_boletin_embebido,
    obtener_estado_horarios_pico,
    url_boletin_default,
)
from src.logic import SemaforoInteligente
from src import sim_store, storage

app = FastAPI(title="SemaforoIA API", version="3.0.0")

BOLETIN_PATH = Path(__file__).resolve().parent / "bots" / "boletin_transito.html"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

semaforo = SemaforoInteligente(duracion_rojo=60.0, duracion_cooldown=120.0)
_ultimo_modo: Optional[str] = None
_ultima_franja_pico: Optional[str] = None
_notif_task: Optional[asyncio.Task] = None


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
sim_manager = ConnectionManager()


def _notificar_suscriptores_sync(resumen: dict) -> None:
    """Envía el estado actual a todos los correos suscritos (bloqueante)."""
    asunto = f"Cambio de estado → {resumen.get('modo', 'N/A')}"
    mensaje = (
        f"El semáforo cambió a {resumen.get('modo')}. "
        f"Vehicular: {resumen.get('luz_vehicular')} · "
        f"Peatonal: {resumen.get('luz_peatonal')} · "
        f"Restante: {resumen.get('tiempo_restante_seg', 0)}s."
    )
    for sub in storage.listar_suscripciones_email(solo_activas=True):
        try:
            ok = enviar_correo_alerta(
                destinatario=sub["email"],
                asunto=asunto,
                resumen_semaforo=resumen,
                mensaje_adicional=mensaje,
            )
            print(f"[email-sub] {sub['email']} → {'ok' if ok else 'fail'}")
        except Exception as exc:
            print(f"[email-sub] error {sub['email']}: {exc}")


def _programar_notificacion_suscriptores(resumen: dict) -> None:
    """Dispara el envío en background sin bloquear el event loop."""
    global _notif_task
    if os.getenv("SEMAFORO_MEMORY_DB", "").strip() == "1":
        return
    if os.getenv("EMAIL_SUB_AUTO", "1").strip() == "0":
        return

    async def _run():
        await asyncio.to_thread(_notificar_suscriptores_sync, resumen)

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return
    _notif_task = loop.create_task(_run())


def _persistir_si_cambio(resumen: dict) -> None:
    """Persiste cambios de fase y notifica por correo automáticamente."""
    global _ultimo_modo
    modo = resumen.get("modo")
    if modo == _ultimo_modo:
        return
    modo_anterior = _ultimo_modo
    storage.registrar_cambio_estado(resumen)
    _ultimo_modo = modo
    # Evita correo en el arranque (modo_anterior None); sí en cada fase siguiente
    if modo_anterior is not None:
        _programar_notificacion_suscriptores(resumen)


def _aplicar_politica_horarios_pico() -> dict:
    """Lee el último scrape del bot y ajusta duraciones del FSM."""
    global _ultima_franja_pico
    estado_bot = obtener_estado_horarios_pico()
    if estado_bot is None:
        return {
            "en_hora_pico": False,
            "franja_activa": None,
            "fuente_url": url_boletin_default(),
            "hora_local": None,
            "error": None,
        }

    semaforo.aplicar_duraciones(
        duracion_rojo=estado_bot.duracion_rojo_aplicada,
        duracion_cooldown=estado_bot.duracion_cooldown_aplicada,
    )

    franja_key = estado_bot.franja_activa if estado_bot.en_hora_pico else "__fuera__"
    if franja_key != _ultima_franja_pico:
        _ultima_franja_pico = franja_key

    return {
        "en_hora_pico": estado_bot.en_hora_pico,
        "franja_activa": estado_bot.franja_activa,
        "fuente_url": estado_bot.fuente_url,
        "hora_local": estado_bot.hora_local,
        "actualizado_en": estado_bot.actualizado_en,
        "error": estado_bot.error,
        "franjas": [
            {
                "nombre": f.nombre,
                "inicio": f.inicio,
                "fin": f.fin,
                "duracion_rojo": f.duracion_rojo,
                "duracion_cooldown": f.duracion_cooldown,
            }
            for f in estado_bot.franjas
        ],
    }


def _tiempo_seguro(tiempo_actual: Optional[float]) -> Optional[float]:
    """
    Evita que un cliente mande un reloj simulado (p. ej. 0, 5, Date.now()
    mal convertido) y rompa las fases del FSM en memoria.
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
    # Solo acepta tiempos cercanos al wall-clock (±2 h)
    if abs(t - time.time()) > 7200:
        return None
    return t


def _resumen_enriquecido(tiempo_actual: Optional[float] = None) -> dict:
    resumen = semaforo.obtener_resumen(_tiempo_seguro(tiempo_actual))
    pico = _aplicar_politica_horarios_pico()
    resumen["en_hora_pico"] = pico["en_hora_pico"]
    resumen["franja_activa"] = pico["franja_activa"]
    resumen["horarios_pico"] = pico
    return resumen


async def bucle_transmision_estado():
    while True:
        resumen = _resumen_enriquecido()
        _persistir_si_cambio(resumen)
        await manager.broadcast(resumen)
        await asyncio.sleep(1)


async def bucle_bot_horarios_pico():
    """Automatiza el ingreso periódico a la web pública del boletín."""
    intervalo = float(os.getenv("BOT_HORARIOS_INTERVALO_SEG", "300"))
    while True:
        try:
            await asyncio.to_thread(actualizar_horarios_pico)
            _aplicar_politica_horarios_pico()
            await manager.broadcast(_resumen_enriquecido())
        except Exception as exc:
            print(f"[bot-horarios] error: {exc}")
        await asyncio.sleep(max(30.0, intervalo))


@app.on_event("startup")
async def startup_event():
    storage.init_db()
    # Primera pasada: HTML embebido (evita HTTP a sí misma antes de estar lista)
    try:
        actualizar_horarios_pico(html=leer_boletin_embebido())
    except Exception as exc:
        print(f"[bot-horarios] inicio: {exc}")
    resumen = _resumen_enriquecido()
    global _ultimo_modo
    _ultimo_modo = resumen.get("modo")
    storage.registrar_cambio_estado(resumen)
    if os.getenv("SEMAFORO_MEMORY_DB", "").strip() == "1":
        # En tests no arrancar bucles infinitos
        return
    asyncio.create_task(bucle_transmision_estado())
    asyncio.create_task(bucle_bot_horarios_pico())


@app.get("/boletin/transito", response_class=HTMLResponse)
def boletin_transito_publico():
    """Web pública que el bot visita para extraer horarios pico."""
    if BOLETIN_PATH.is_file():
        return HTMLResponse(content=BOLETIN_PATH.read_text(encoding="utf-8"))
    return HTMLResponse(content=leer_boletin_embebido())


@app.websocket("/ws/estado")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    await websocket.send_json(_resumen_enriquecido())
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


@app.websocket("/ws/sim")
async def websocket_sim(websocket: WebSocket):
    """Snapshot compartido de la escena 3D para todos los clientes de la red."""
    await sim_manager.connect(websocket)
    await websocket.send_json({"type": "sim", "state": sim_store.get_state()})
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        sim_manager.disconnect(websocket)
    except Exception:
        sim_manager.disconnect(websocket)


@app.get("/api/sim")
def obtener_sim():
    return sim_store.get_state()


@app.put("/api/sim")
async def actualizar_sim(payload: dict):
    """Actualiza el estado 3D compartido y lo emite por WebSocket."""
    client_id = payload.get("clientId") if isinstance(payload, dict) else None
    state, accepted = sim_store.patch_state(
        payload if isinstance(payload, dict) else {}, writer_id=client_id
    )
    if accepted:
        await sim_manager.broadcast({"type": "sim", "state": state})
    return state


@app.delete("/api/sim")
async def borrar_sim():
    state = sim_store.clear_state()
    await sim_manager.broadcast({"type": "sim", "state": state})
    return state


class SolicitudPeaton(BaseModel):
    tiempo_actual: Optional[float] = None


class SolicitudEmail(BaseModel):
    destinatario: str
    asunto: str
    mensaje_adicional: Optional[str] = ""


class SolicitudSuscripcionEmail(BaseModel):
    email: str


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
    t = _tiempo_seguro(tiempo_actual)
    modo_antes = semaforo.modo.value
    aceptado = semaforo.solicitar_cruce(t)
    resumen = _resumen_enriquecido(t)
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
    resumen = _resumen_enriquecido()
    _persistir_si_cambio(resumen)
    return resumen


@app.get("/api/bot/horarios-pico")
def bot_horarios_pico_estado():
    """Estado del bot (último scrape) y política aplicada."""
    estado = obtener_estado_horarios_pico()
    if estado is None:
        estado = actualizar_horarios_pico(permitir_fallback_local=True)
    pico = _aplicar_politica_horarios_pico()
    return {
        "bot": estado.to_dict(),
        "aplicado": pico,
        "resumen": _resumen_enriquecido(),
    }


@app.post("/api/bot/horarios-pico/actualizar")
async def bot_horarios_pico_actualizar():
    """Fuerza al bot a ingresar de nuevo a la web pública y reaplicar política."""
    estado = await asyncio.to_thread(
        lambda: actualizar_horarios_pico(permitir_fallback_local=True)
    )
    pico = _aplicar_politica_horarios_pico()
    resumen = _resumen_enriquecido()
    await manager.broadcast(resumen)
    return {
        "status": "ok",
        "bot": estado.to_dict(),
        "aplicado": pico,
        "resumen": resumen,
    }


@app.post("/api/reset")
async def reset_semaforo():
    """Vuelve el semáforo a REPOSO (útil al reconectar el bridge)."""
    global semaforo, _ultimo_modo
    estado_bot = obtener_estado_horarios_pico()
    rojo = estado_bot.duracion_rojo_aplicada if estado_bot else 60.0
    cool = estado_bot.duracion_cooldown_aplicada if estado_bot else 120.0
    semaforo = SemaforoInteligente(duracion_rojo=rojo, duracion_cooldown=cool)
    resumen = _resumen_enriquecido()
    _ultimo_modo = resumen.get("modo")
    storage.registrar_cambio_estado(resumen)
    await manager.broadcast(resumen)
    return {"status": "ok", "resumen": resumen}


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
    resumen = _resumen_enriquecido()
    exito = enviar_correo_alerta(
        destinatario=datos.destinatario,
        asunto=datos.asunto,
        resumen_semaforo=resumen,
        mensaje_adicional=datos.mensaje_adicional,
    )
    if not exito:
        raise HTTPException(status_code=500, detail="Error al procesar el envío del correo")
    return {"status": "ok", "mensaje": f"Correo enviado a {datos.destinatario}"}


@app.get("/api/suscripciones/email")
def listar_suscripciones():
    return {"suscripciones": storage.listar_suscripciones_email(solo_activas=True)}


@app.post("/api/suscripciones/email")
def suscribir_email(datos: SolicitudSuscripcionEmail):
    try:
        sub = storage.suscribir_email(datos.email)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {
        "status": "ok",
        "mensaje": f"Suscrito: {sub['email']}. Recibirá alertas en cada cambio de estado.",
        "suscripcion": sub,
    }


@app.delete("/api/suscripciones/email")
def cancelar_suscripcion(datos: SolicitudSuscripcionEmail):
    sub = storage.cancelar_suscripcion_email(datos.email)
    if sub is None:
        raise HTTPException(status_code=404, detail="No hay una suscripción activa con ese correo")
    return {
        "status": "ok",
        "mensaje": f"Suscripción cancelada: {sub['email']}",
        "suscripcion": sub,
    }


@app.post("/api/suscripciones/email/notificar")
async def notificar_suscriptores_ahora():
    """Envía el estado actual a todos los suscritos (manual)."""
    resumen = _resumen_enriquecido()
    await asyncio.to_thread(_notificar_suscriptores_sync, resumen)
    return {
        "status": "ok",
        "mensaje": "Notificación enviada a suscriptores activos",
        "total": len(storage.listar_suscripciones_email(solo_activas=True)),
    }


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
    # La clave solo vive en el servidor (.env). Se ignora cualquier api_key del cliente.
    estado = _resumen_enriquecido()
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
):
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
