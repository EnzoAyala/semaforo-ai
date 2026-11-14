"""Historial de eventos de sensor y cambios de estado."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException

from src import storage

router = APIRouter(tags=["historial"])


@router.get("/api/historial/eventos")
def historial_eventos(limit: int = 50, desde: Optional[str] = None):
    desde_dt = None
    if desde:
        try:
            desde_dt = datetime.fromisoformat(desde.replace("Z", "+00:00"))
        except ValueError as exc:
            raise HTTPException(status_code=422, detail="formato 'desde' inválido") from exc
    return {"eventos": storage.listar_eventos(limit=limit, desde=desde_dt)}


@router.get("/api/historial/estados")
def historial_estados(limit: int = 50):
    return {"estados": storage.listar_estados(limit=limit)}
