"""Modelos de request HTTP usados por los routers."""

from typing import Optional

from pydantic import BaseModel, Field


class SolicitudPeaton(BaseModel):
    tiempo_actual: Optional[float] = None


class SolicitudEmail(BaseModel):
    destinatario: str
    asunto: str
    mensaje_adicional: Optional[str] = ""


class SolicitudSuscripcionEmail(BaseModel):
    email: str


class SolicitudChatbot(BaseModel):
    consulta: str
    proveedor: str = "groq"
    api_key: Optional[str] = None


class SolicitudValidacionIA(BaseModel):
    proveedor: str
    api_key: str


class SolicitudSensor(BaseModel):
    source: str = Field(..., description="pir | button | ui")
    device_id: Optional[str] = "arduino-uno"
    tiempo_actual: Optional[float] = None


class SolicitudHeartbeat(BaseModel):
    pir: int = 0
    button: int = 0
    device_id: Optional[str] = "arduino-uno"
