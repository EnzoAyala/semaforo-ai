"""Endpoints del bot de horarios pico."""

import asyncio

from fastapi import APIRouter

from src.bots.horarios_pico import actualizar_horarios_pico, obtener_estado_horarios_pico
from src.realtime.manager import ConnectionManager
from src.services.peak_hours import aplicar_politica_horarios_pico
from src.services.semaforo import resumen_enriquecido


def create_bot_horarios_router(manager: ConnectionManager) -> APIRouter:
    router = APIRouter(tags=["bot-horarios"])

    @router.get("/api/bot/horarios-pico")
    def bot_horarios_pico_estado():
        """Estado del bot (último scrape) y política aplicada."""
        estado = obtener_estado_horarios_pico()
        if estado is None:
            estado = actualizar_horarios_pico(permitir_fallback_local=True)
        pico = aplicar_politica_horarios_pico()
        return {
            "bot": estado.to_dict(),
            "aplicado": pico,
            "resumen": resumen_enriquecido(),
        }

    @router.post("/api/bot/horarios-pico/actualizar")
    async def bot_horarios_pico_actualizar():
        """Fuerza al bot a ingresar de nuevo a la web pública y reaplicar política."""
        estado = await asyncio.to_thread(
            lambda: actualizar_horarios_pico(permitir_fallback_local=True)
        )
        pico = aplicar_politica_horarios_pico()
        resumen = resumen_enriquecido()
        await manager.broadcast(resumen)
        return {
            "status": "ok",
            "bot": estado.to_dict(),
            "aplicado": pico,
            "resumen": resumen,
        }

    return router
