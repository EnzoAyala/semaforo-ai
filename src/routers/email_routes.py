"""Alertas SMTP puntuales y suscripciones de correo."""

import asyncio

from fastapi import APIRouter, HTTPException

from src import storage
from src.automation import enviar_correo_alerta
from src.schemas.requests import SolicitudEmail, SolicitudSuscripcionEmail
from src.services.notifications import notificar_suscriptores_sync
from src.services.semaforo import resumen_enriquecido

router = APIRouter(tags=["email"])


@router.post("/api/enviar-alerta")
def enviar_alerta(datos: SolicitudEmail):
    resumen = resumen_enriquecido()
    exito = enviar_correo_alerta(
        destinatario=datos.destinatario,
        asunto=datos.asunto,
        resumen_semaforo=resumen,
        mensaje_adicional=datos.mensaje_adicional,
    )
    if not exito:
        raise HTTPException(status_code=500, detail="Error al procesar el envío del correo")
    return {"status": "ok", "mensaje": f"Correo enviado a {datos.destinatario}"}


@router.get("/api/suscripciones/email")
def listar_suscripciones():
    return {"suscripciones": storage.listar_suscripciones_email(solo_activas=True)}


@router.post("/api/suscripciones/email")
def suscribir_email(datos: SolicitudSuscripcionEmail):
    try:
        sub = storage.suscribir_email(datos.email)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {
        "status": "ok",
        "mensaje": f"Suscrito: {sub['email']}. Recibirá alertas en cada cambio de estado.",
        "suscripcion": sub,
    }


@router.delete("/api/suscripciones/email")
def cancelar_suscripcion(datos: SolicitudSuscripcionEmail):
    sub = storage.cancelar_suscripcion_email(datos.email)
    if sub is None:
        raise HTTPException(status_code=404, detail="No hay una suscripción activa con ese correo")
    return {
        "status": "ok",
        "mensaje": f"Suscripción cancelada: {sub['email']}",
        "suscripcion": sub,
    }


@router.post("/api/suscripciones/email/notificar")
async def notificar_suscriptores_ahora():
    """Envía el estado actual a todos los suscritos (manual)."""
    resumen = resumen_enriquecido()
    await asyncio.to_thread(notificar_suscriptores_sync, resumen)
    return {
        "status": "ok",
        "mensaje": "Notificación enviada a suscriptores activos",
        "total": len(storage.listar_suscripciones_email(solo_activas=True)),
    }
