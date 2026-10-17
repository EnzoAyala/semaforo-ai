"""Persistencia PostgreSQL para eventos de sensor y cambios de estado."""

from __future__ import annotations

import os
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Dict, Generator, List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    Integer,
    String,
    create_engine,
    select,
    text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker


DEFAULT_DATABASE_URL = "postgresql+psycopg://postgres:user@localhost:5432/semaforo"


class Base(DeclarativeBase):
    pass


class SensorEvent(Base):
    __tablename__ = "sensor_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    source: Mapped[str] = mapped_column(String(32), nullable=False)
    device_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    accepted: Mapped[bool] = mapped_column(Boolean, default=False)
    modo_resultante: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)


class StateChange(Base):
    __tablename__ = "state_changes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    modo: Mapped[str] = mapped_column(String(64), nullable=False)
    luz_vehicular: Mapped[str] = mapped_column(String(32), nullable=False)
    luz_peatonal: Mapped[str] = mapped_column(String(32), nullable=False)
    tiempo_restante: Mapped[float] = mapped_column(Float, default=0.0)


class SensorHealth(Base):
    __tablename__ = "sensor_health"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    last_heartbeat: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    pir: Mapped[int] = mapped_column(Integer, default=0)
    button: Mapped[int] = mapped_column(Integer, default=0)
    bridge_connected: Mapped[bool] = mapped_column(Boolean, default=False)


_engine = None
_SessionLocal = None
_memory_mode = False
_memory_events: List[Dict[str, Any]] = []
_memory_states: List[Dict[str, Any]] = []
_memory_health: Dict[str, Any] = {
    "bridge_connected": False,
    "last_heartbeat": None,
    "pir": 0,
    "button": 0,
}
_event_id = 0
_state_id = 0


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


def _dt_iso(value: Optional[datetime]) -> Optional[str]:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.isoformat()


def registrar_evento_sensor(
    source: str,
    accepted: bool,
    modo_resultante: str,
    device_id: Optional[str] = None,
) -> Dict[str, Any]:
    global _event_id
    now = datetime.now(timezone.utc)

    if _memory_mode:
        _event_id += 1
        row = {
            "id": _event_id,
            "timestamp": _dt_iso(now),
            "source": source,
            "device_id": device_id,
            "accepted": accepted,
            "modo_resultante": modo_resultante,
        }
        _memory_events.insert(0, row)
        return row

    with session_scope() as session:
        if session is None:
            raise RuntimeError("Sesión de base de datos no disponible")
        event = SensorEvent(
            timestamp=now,
            source=source,
            device_id=device_id,
            accepted=accepted,
            modo_resultante=modo_resultante,
        )
        session.add(event)
        session.flush()
        return {
            "id": event.id,
            "timestamp": _dt_iso(event.timestamp),
            "source": event.source,
            "device_id": event.device_id,
            "accepted": event.accepted,
            "modo_resultante": event.modo_resultante,
        }


def registrar_cambio_estado(resumen: Dict[str, Any]) -> Dict[str, Any]:
    global _state_id
    now = datetime.now(timezone.utc)
    payload = {
        "timestamp": _dt_iso(now),
        "modo": resumen.get("modo"),
        "luz_vehicular": resumen.get("luz_vehicular"),
        "luz_peatonal": resumen.get("luz_peatonal"),
        "tiempo_restante": float(resumen.get("tiempo_restante_seg", 0)),
    }

    if _memory_mode:
        _state_id += 1
        row = {"id": _state_id, **payload}
        _memory_states.insert(0, row)
        return row

    with session_scope() as session:
        if session is None:
            raise RuntimeError("Sesión de base de datos no disponible")
        change = StateChange(
            timestamp=now,
            modo=payload["modo"],
            luz_vehicular=payload["luz_vehicular"],
            luz_peatonal=payload["luz_peatonal"],
            tiempo_restante=payload["tiempo_restante"],
        )
        session.add(change)
        session.flush()
        return {
            "id": change.id,
            "timestamp": _dt_iso(change.timestamp),
            "modo": change.modo,
            "luz_vehicular": change.luz_vehicular,
            "luz_peatonal": change.luz_peatonal,
            "tiempo_restante": change.tiempo_restante,
        }


def listar_eventos(limit: int = 50, desde: Optional[datetime] = None) -> List[Dict[str, Any]]:
    limit = max(1, min(limit, 500))
    if _memory_mode:
        rows = _memory_events
        if desde is not None:
            desde_iso = _dt_iso(desde)
            rows = [r for r in rows if r["timestamp"] and r["timestamp"] >= desde_iso]
        return rows[:limit]

    with session_scope() as session:
        if session is None:
            return []
        stmt = select(SensorEvent).order_by(SensorEvent.timestamp.desc()).limit(limit)
        if desde is not None:
            stmt = (
                select(SensorEvent)
                .where(SensorEvent.timestamp >= desde)
                .order_by(SensorEvent.timestamp.desc())
                .limit(limit)
            )
        events = session.scalars(stmt).all()
        return [
            {
                "id": e.id,
                "timestamp": _dt_iso(e.timestamp),
                "source": e.source,
                "device_id": e.device_id,
                "accepted": e.accepted,
                "modo_resultante": e.modo_resultante,
            }
            for e in events
        ]


def listar_estados(limit: int = 50) -> List[Dict[str, Any]]:
    limit = max(1, min(limit, 500))
    if _memory_mode:
        return _memory_states[:limit]

    with session_scope() as session:
        if session is None:
            return []
        stmt = select(StateChange).order_by(StateChange.timestamp.desc()).limit(limit)
        changes = session.scalars(stmt).all()
        return [
            {
                "id": c.id,
                "timestamp": _dt_iso(c.timestamp),
                "modo": c.modo,
                "luz_vehicular": c.luz_vehicular,
                "luz_peatonal": c.luz_peatonal,
                "tiempo_restante": c.tiempo_restante,
            }
            for c in changes
        ]


def actualizar_salud_sensor(
    pir: int = 0,
    button: int = 0,
    bridge_connected: bool = True,
) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    if _memory_mode:
        _memory_health.update(
            {
                "last_heartbeat": _dt_iso(now),
                "pir": pir,
                "button": button,
                "bridge_connected": bridge_connected,
            }
        )
        return dict(_memory_health)

    with session_scope() as session:
        if session is None:
            raise RuntimeError("Sesión de base de datos no disponible")
        health = session.get(SensorHealth, 1)
        if health is None:
            health = SensorHealth(id=1)
            session.add(health)
        health.last_heartbeat = now
        health.pir = pir
        health.button = button
        health.bridge_connected = bridge_connected
        session.flush()
        return {
            "bridge_connected": health.bridge_connected,
            "last_heartbeat": _dt_iso(health.last_heartbeat),
            "pir": health.pir,
            "button": health.button,
        }


def obtener_salud_sensor() -> Dict[str, Any]:
    if _memory_mode:
        return dict(_memory_health)

    with session_scope() as session:
        if session is None:
            return {
                "bridge_connected": False,
                "last_heartbeat": None,
                "pir": 0,
                "button": 0,
            }
        health = session.get(SensorHealth, 1)
        if health is None:
            return {
                "bridge_connected": False,
                "last_heartbeat": None,
                "pir": 0,
                "button": 0,
            }
        return {
            "bridge_connected": health.bridge_connected,
            "last_heartbeat": _dt_iso(health.last_heartbeat),
            "pir": health.pir,
            "button": health.button,
        }


def reset_memory_store() -> None:
    """Utilidad para tests en modo memoria."""
    global _event_id, _state_id
    _memory_events.clear()
    _memory_states.clear()
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


def is_memory_mode() -> bool:
    return _memory_mode
