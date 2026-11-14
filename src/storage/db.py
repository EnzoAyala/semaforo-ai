"""Motor SQLAlchemy, sesiones y modo memoria para tests."""

from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Any, Dict, Generator, List, Optional

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from src.storage.models import Base, SensorHealth

DEFAULT_DATABASE_URL = "postgresql+psycopg://postgres:user@localhost:5432/semaforo"

_engine = None
_SessionLocal = None
_memory_mode = False
_memory_events: List[Dict[str, Any]] = []
_memory_states: List[Dict[str, Any]] = []
_memory_subscriptions: List[Dict[str, Any]] = []
_memory_health: Dict[str, Any] = {
    "bridge_connected": False,
    "last_heartbeat": None,
    "pir": 0,
    "button": 0,
}
_event_id = 0
_state_id = 0
_sub_id = 0


def get_database_url() -> str:
    return os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)


def init_db(database_url: Optional[str] = None, *, force_memory: bool = False) -> None:
    """Inicializa el motor. Si no hay Postgres, usa almacenamiento en memoria."""
    global _engine, _SessionLocal, _memory_mode

    if force_memory or os.getenv("SEMAFORO_MEMORY_DB", "").strip() == "1":
        _engine = None
        _SessionLocal = None
        _memory_mode = True
        return

    url = database_url or get_database_url()
    try:
        engine = create_engine(
            url,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 2},
        )
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        Base.metadata.create_all(bind=engine)
        _engine = engine
        _SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
        _memory_mode = False
        with _SessionLocal() as session:
            health = session.get(SensorHealth, 1)
            if health is None:
                session.add(SensorHealth(id=1, bridge_connected=False))
                session.commit()
    except Exception:
        _engine = None
        _SessionLocal = None
        _memory_mode = True


@contextmanager
def session_scope() -> Generator[Optional[Session], None, None]:
    if _memory_mode or _SessionLocal is None:
        yield None
        return
    session = _SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def is_memory_mode() -> bool:
    return _memory_mode


def reset_memory_store() -> None:
    """Utilidad para tests en modo memoria."""
    global _event_id, _state_id, _sub_id
    _memory_events.clear()
    _memory_states.clear()
    _memory_subscriptions.clear()
    _memory_health.update(
        {
            "bridge_connected": False,
            "last_heartbeat": None,
            "pir": 0,
            "button": 0,
        }
    )
    _event_id = 0
    _state_id = 0
    _sub_id = 0
