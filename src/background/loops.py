"""Bucles periódicos de la API: estado WebSocket y scrape de horarios pico."""

from __future__ import annotations

import asyncio
import os

from src.bots.horarios_pico import actualizar_horarios_pico
from src.realtime.manager import ConnectionManager
from src.services.peak_hours import aplicar_politica_horarios_pico
from src.services.semaforo import persistir_si_cambio, resumen_enriquecido


async def bucle_transmision_estado(manager: ConnectionManager) -> None:
    while True:
        resumen = resumen_enriquecido()
        persistir_si_cambio(resumen)
        await manager.broadcast(resumen)
        await asyncio.sleep(1)


async def bucle_bot_horarios_pico(manager: ConnectionManager) -> None:
    """Automatiza el ingreso periódico a la web pública del boletín."""
    intervalo = float(os.getenv("BOT_HORARIOS_INTERVALO_SEG", "300"))
    while True:
        try:
            await asyncio.to_thread(actualizar_horarios_pico)
            aplicar_politica_horarios_pico()
            await manager.broadcast(resumen_enriquecido())
        except Exception as exc:
            print(f"[bot-horarios] error: {exc}")
        await asyncio.sleep(max(30.0, intervalo))
