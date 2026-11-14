"""Ingest de sensor (PIR/botón/UI) y solicitud de cruce."""

from fastapi import APIRouter, HTTPException

from src import storage
from src.realtime.manager import ConnectionManager
from src.schemas.requests import SolicitudHeartbeat, SolicitudPeaton, SolicitudSensor
from src.services.semaforo import procesar_solicitud_cruce


def create_sensors_router(manager: ConnectionManager) -> APIRouter:
    router = APIRouter(tags=["sensors"])

    @router.post("/api/solicitar-cruce")
    async def solicitar_cruce(datos: SolicitudPeaton):
        resultado = procesar_solicitud_cruce(
            source="ui",
            tiempo_actual=datos.tiempo_actual,
            device_id="dashboard",
        )
        await manager.broadcast(resultado["resumen"])
        return resultado

    @router.post("/api/sensor/evento")
    async def sensor_evento(datos: SolicitudSensor):
        source = datos.source.strip().lower()
        if source not in {"pir", "button", "ui"}:
            raise HTTPException(status_code=422, detail="source debe ser pir, button o ui")
        resultado = procesar_solicitud_cruce(
            source=source,
            tiempo_actual=datos.tiempo_actual,
            device_id=datos.device_id,
        )
        await manager.broadcast(resultado["resumen"])
        return resultado

    @router.post("/api/sensor/heartbeat")
    def sensor_heartbeat(datos: SolicitudHeartbeat):
        salud = storage.actualizar_salud_sensor(
            pir=datos.pir,
            button=datos.button,
            bridge_connected=True,
        )
        return {"status": "ok", "salud": salud}

    @router.get("/api/sensor/salud")
    def sensor_salud():
        return storage.obtener_salud_sensor()

    return router
