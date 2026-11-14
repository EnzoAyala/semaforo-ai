"""Estado compartido de la simulación 3D (REST + WebSocket)."""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from src import sim_store
from src.realtime.manager import ConnectionManager


def create_sim_router(sim_manager: ConnectionManager) -> APIRouter:
    router = APIRouter(tags=["sim"])

    @router.websocket("/ws/sim")
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

    @router.get("/api/sim")
    def obtener_sim():
        return sim_store.get_state()

    @router.put("/api/sim")
    async def actualizar_sim(payload: dict):
        """Actualiza el estado 3D compartido y lo emite por WebSocket."""
        client_id = payload.get("clientId") if isinstance(payload, dict) else None
        state, accepted = sim_store.patch_state(
            payload if isinstance(payload, dict) else {}, writer_id=client_id
        )
        if accepted:
            await sim_manager.broadcast({"type": "sim", "state": state})
        return state

    @router.delete("/api/sim")
    async def borrar_sim():
        state = sim_store.clear_state()
        await sim_manager.broadcast({"type": "sim", "state": state})
        return state

    return router
