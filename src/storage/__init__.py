"""
Persistencia PostgreSQL (o memoria en tests).

API pública estable: mismos nombres que el antiguo storage.py.
"""

from src.storage.db import (
    DEFAULT_DATABASE_URL,
    get_database_url,
    init_db,
    is_memory_mode,
    reset_memory_store,
    session_scope,
)
from src.storage.models import (
    Base,
    EmailSubscription,
    SensorEvent,
    SensorHealth,
    StateChange,
)
from src.storage.repository import (
    actualizar_salud_sensor,
    cancelar_suscripcion_email,
    listar_estados,
    listar_eventos,
    listar_suscripciones_email,
    obtener_salud_sensor,
    registrar_cambio_estado,
    registrar_evento_sensor,
    suscribir_email,
)

__all__ = [
    "DEFAULT_DATABASE_URL",
    "Base",
    "SensorEvent",
    "StateChange",
    "SensorHealth",
    "EmailSubscription",
    "get_database_url",
    "init_db",
    "session_scope",
    "registrar_evento_sensor",
    "registrar_cambio_estado",
    "listar_eventos",
    "listar_estados",
    "actualizar_salud_sensor",
    "obtener_salud_sensor",
    "suscribir_email",
    "cancelar_suscripcion_email",
    "listar_suscripciones_email",
    "reset_memory_store",
    "is_memory_mode",
]
