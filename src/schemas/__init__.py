"""Esquemas Pydantic de entrada de la API."""

from src.schemas.requests import (
    SolicitudChatbot,
    SolicitudEmail,
    SolicitudHeartbeat,
    SolicitudPeaton,
    SolicitudSensor,
    SolicitudSuscripcionEmail,
    SolicitudValidacionIA,
)

__all__ = [
    "SolicitudPeaton",
    "SolicitudEmail",
    "SolicitudSuscripcionEmail",
    "SolicitudChatbot",
    "SolicitudValidacionIA",
    "SolicitudSensor",
    "SolicitudHeartbeat",
]
