"""Modelos SQLAlchemy alineados con db/init.sql."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, Integer, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


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


class EmailSubscription(Base):
    __tablename__ = "email_subscriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
