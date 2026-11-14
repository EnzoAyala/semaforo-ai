"""Operaciones de persistencia (Postgres o memoria)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import select

from src.storage import db
from src.storage.models import EmailSubscription, SensorEvent, SensorHealth, StateChange


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
    now = datetime.now(timezone.utc)

    if db._memory_mode:
        db._event_id += 1
        row = {
            "id": db._event_id,
            "timestamp": _dt_iso(now),
            "source": source,
            "device_id": device_id,
            "accepted": accepted,
            "modo_resultante": modo_resultante,
        }
        db._memory_events.insert(0, row)
        return row

    with db.session_scope() as session:
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
    now = datetime.now(timezone.utc)
    payload = {
        "timestamp": _dt_iso(now),
        "modo": resumen.get("modo"),
        "luz_vehicular": resumen.get("luz_vehicular"),
        "luz_peatonal": resumen.get("luz_peatonal"),
        "tiempo_restante": float(resumen.get("tiempo_restante_seg", 0)),
    }

    if db._memory_mode:
        db._state_id += 1
        row = {"id": db._state_id, **payload}
        db._memory_states.insert(0, row)
        return row

    with db.session_scope() as session:
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
    if db._memory_mode:
        rows = db._memory_events
        if desde is not None:
            desde_iso = _dt_iso(desde)
            rows = [r for r in rows if r["timestamp"] and r["timestamp"] >= desde_iso]
        return rows[:limit]

    with db.session_scope() as session:
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
    if db._memory_mode:
        return db._memory_states[:limit]

    with db.session_scope() as session:
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
    if db._memory_mode:
        db._memory_health.update(
            {
                "last_heartbeat": _dt_iso(now),
                "pir": pir,
                "button": button,
                "bridge_connected": bridge_connected,
            }
        )
        return dict(db._memory_health)

    with db.session_scope() as session:
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
    if db._memory_mode:
        return dict(db._memory_health)

    with db.session_scope() as session:
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


def _normalizar_email(email: str) -> str:
    return email.strip().lower()


def suscribir_email(email: str) -> Dict[str, Any]:
    """Alta o reactivación de una suscripción de alertas automáticas."""
    correo = _normalizar_email(email)
    if not correo or "@" not in correo:
        raise ValueError("Correo electrónico inválido")
    now = datetime.now(timezone.utc)

    if db._memory_mode:
        for row in db._memory_subscriptions:
            if row["email"] == correo:
                row["active"] = True
                row["cancelled_at"] = None
                row["created_at"] = row.get("created_at") or _dt_iso(now)
                return dict(row)
        db._sub_id += 1
        row = {
            "id": db._sub_id,
            "email": correo,
            "active": True,
            "created_at": _dt_iso(now),
            "cancelled_at": None,
        }
        db._memory_subscriptions.insert(0, row)
        return dict(row)

    with db.session_scope() as session:
        if session is None:
            raise RuntimeError("Sesión de base de datos no disponible")
        existing = session.scalar(
            select(EmailSubscription).where(EmailSubscription.email == correo)
        )
        if existing is not None:
            existing.active = True
            existing.cancelled_at = None
            session.flush()
            return {
                "id": existing.id,
                "email": existing.email,
                "active": existing.active,
                "created_at": _dt_iso(existing.created_at),
                "cancelled_at": _dt_iso(existing.cancelled_at),
            }
        sub = EmailSubscription(email=correo, active=True, created_at=now)
        session.add(sub)
        session.flush()
        return {
            "id": sub.id,
            "email": sub.email,
            "active": sub.active,
            "created_at": _dt_iso(sub.created_at),
            "cancelled_at": None,
        }


def cancelar_suscripcion_email(email: str) -> Optional[Dict[str, Any]]:
    correo = _normalizar_email(email)
    now = datetime.now(timezone.utc)

    if db._memory_mode:
        for row in db._memory_subscriptions:
            if row["email"] == correo and row["active"]:
                row["active"] = False
                row["cancelled_at"] = _dt_iso(now)
                return dict(row)
        return None

    with db.session_scope() as session:
        if session is None:
            return None
        existing = session.scalar(
            select(EmailSubscription).where(EmailSubscription.email == correo)
        )
        if existing is None or not existing.active:
            return None
        existing.active = False
        existing.cancelled_at = now
        session.flush()
        return {
            "id": existing.id,
            "email": existing.email,
            "active": existing.active,
            "created_at": _dt_iso(existing.created_at),
            "cancelled_at": _dt_iso(existing.cancelled_at),
        }


def listar_suscripciones_email(solo_activas: bool = True) -> List[Dict[str, Any]]:
    if db._memory_mode:
        rows = db._memory_subscriptions
        if solo_activas:
            rows = [r for r in rows if r.get("active")]
        return [dict(r) for r in rows]

    with db.session_scope() as session:
        if session is None:
            return []
        stmt = select(EmailSubscription).order_by(EmailSubscription.created_at.desc())
        if solo_activas:
            stmt = stmt.where(EmailSubscription.active.is_(True))
        subs = session.scalars(stmt).all()
        return [
            {
                "id": s.id,
                "email": s.email,
                "active": s.active,
                "created_at": _dt_iso(s.created_at),
                "cancelled_at": _dt_iso(s.cancelled_at),
            }
            for s in subs
        ]
