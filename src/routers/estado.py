"""Estado del semáforo, reset, boletín público y WebSocket de estado."""

from pathlib import Path

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse

from src.bots.horarios_pico import leer_boletin_embebido
from src.realtime.manager import ConnectionManager
from src.services.semaforo import (
    persistir_si_cambio,
    reset_semaforo_estado,
    resumen_enriquecido,
)

BOLETIN_PATH = Path(__file__).resolve().parent.parent / "bots" / "boletin_transito.html"


def create_estado_router(manager: ConnectionManager) -> APIRouter:
    router = APIRouter(tags=["estado"])

    @router.get("/boletin/transito", response_class=HTMLResponse)
    def boletin_transito_publico():
        """Web pública que el bot visita para extraer horarios pico."""
        if BOLETIN_PATH.is_file():
            return HTMLResponse(content=BOLETIN_PATH.read_text(encoding="utf-8"))
        return HTMLResponse(content=leer_boletin_embebido())

    @router.websocket("/ws/estado")
    async def websocket_endpoint(websocket: WebSocket):
        await manager.connect(websocket)
        await websocket.send_json(resumen_enriquecido())
        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            manager.disconnect(websocket)
        except Exception:
            manager.disconnect(websocket)

    @router.get("/api/estado")
    def obtener_estado():
        resumen = resumen_enriquecido()
        persistir_si_cambio(resumen)
        return resumen

    @router.post("/api/reset")
    async def reset_semaforo():
        """Vuelve el semáforo a REPOSO (útil al reconectar el bridge)."""
        resumen = reset_semaforo_estado()
        await manager.broadcast(resumen)
        return {"status": "ok", "resumen": resumen}

    return router
