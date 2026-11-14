"""
Entrypoint FastAPI de SemaforoIA (`uvicorn src.api:app`).

Monta routers, arranca tareas en background y reexporta símbolos
que los tests y scripts externos siguen importando desde `src.api`.
"""

from __future__ import annotations

import asyncio
import os
import sys
from types import ModuleType

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src import storage
from src.background.loops import bucle_bot_horarios_pico, bucle_transmision_estado
from src.bots.horarios_pico import actualizar_horarios_pico, leer_boletin_embebido
from src.realtime.manager import ConnectionManager
from src.routers.bot_horarios import create_bot_horarios_router
from src.routers.chatbot import consultar_chatbot  # noqa: F401 — reexport tests
from src.routers.email_routes import router as email_router
from src.routers.estado import create_estado_router
from src.routers.historial import router as historial_router
from src.routers.sensors import create_sensors_router
from src.routers.sim import create_sim_router
from src.routers import chatbot as chatbot_router_module
from src.schemas.requests import SolicitudChatbot  # noqa: F401 — reexport tests
from src.services import peak_hours as peak_hours_svc
from src.services import semaforo as semaforo_svc
from src.services.semaforo import marcar_modo_inicial, resumen_enriquecido

manager = ConnectionManager()
sim_manager = ConnectionManager()


def create_app() -> FastAPI:
    application = FastAPI(title="SemaforoIA API", version="3.0.0")
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(historial_router)
    application.include_router(email_router)
    application.include_router(chatbot_router_module.router)
    application.include_router(create_bot_horarios_router(manager))
    application.include_router(create_sim_router(sim_manager))
    application.include_router(create_sensors_router(manager))
    application.include_router(create_estado_router(manager))

    @application.on_event("startup")
    async def startup_event() -> None:
        storage.init_db()
        try:
            actualizar_horarios_pico(html=leer_boletin_embebido())
        except Exception as exc:
            print(f"[bot-horarios] inicio: {exc}")
        resumen = resumen_enriquecido()
        marcar_modo_inicial(resumen.get("modo"))
        storage.registrar_cambio_estado(resumen)
        if os.getenv("SEMAFORO_MEMORY_DB", "").strip() == "1":
            return
        asyncio.create_task(bucle_transmision_estado(manager))
        asyncio.create_task(bucle_bot_horarios_pico(manager))

    return application


app = create_app()


class _ApiModule(ModuleType):
    """Proxy: asignar api.semaforo / _ultimo_modo actualiza el servicio real."""

    def __getattr__(self, name: str):
        if name == "semaforo":
            return semaforo_svc.semaforo
        if name == "_ultimo_modo":
            return semaforo_svc._ultimo_modo
        if name == "_ultima_franja_pico":
            return peak_hours_svc._ultima_franja_pico
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

    def __setattr__(self, name: str, value) -> None:
        if name == "semaforo":
            semaforo_svc.semaforo = value
            return
        if name == "_ultimo_modo":
            semaforo_svc._ultimo_modo = value
            return
        if name == "_ultima_franja_pico":
            peak_hours_svc._ultima_franja_pico = value
            return
        super().__setattr__(name, value)


# Sustituye este módulo por el proxy para que los tests puedan mutar el FSM.
_module = sys.modules[__name__]
_proxy = _ApiModule(__name__)
_proxy.__dict__.update(_module.__dict__)
sys.modules[__name__] = _proxy
