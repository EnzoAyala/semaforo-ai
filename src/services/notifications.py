"""Alertas por correo a suscriptores activos."""

from __future__ import annotations

import asyncio
import os
from typing import Optional

from src.automation import enviar_correo_alerta
from src import storage

_notif_task: Optional[asyncio.Task] = None


def notificar_suscriptores_sync(resumen: dict) -> None:
    """Envía el estado actual a todos los correos suscritos (bloqueante)."""
    asunto = f"Cambio de estado → {resumen.get('modo', 'N/A')}"
    mensaje = (
        f"El semáforo cambió a {resumen.get('modo')}. "
        f"Vehicular: {resumen.get('luz_vehicular')} · "
        f"Peatonal: {resumen.get('luz_peatonal')} · "
        f"Restante: {resumen.get('tiempo_restante_seg', 0)}s."
    )
    for sub in storage.listar_suscripciones_email(solo_activas=True):
        try:
            ok = enviar_correo_alerta(
                destinatario=sub["email"],
                asunto=asunto,
                resumen_semaforo=resumen,
                mensaje_adicional=mensaje,
            )
            print(f"[email-sub] {sub['email']} → {'ok' if ok else 'fail'}")
        except Exception as exc:
            print(f"[email-sub] error {sub['email']}: {exc}")


def programar_notificacion_suscriptores(resumen: dict) -> None:
    """Dispara el envío en background sin bloquear el event loop."""
    global _notif_task
    if os.getenv("SEMAFORO_MEMORY_DB", "").strip() == "1":
        return
    if os.getenv("EMAIL_SUB_AUTO", "1").strip() == "0":
        return

    async def _run() -> None:
        await asyncio.to_thread(notificar_suscriptores_sync, resumen)

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return
    _notif_task = loop.create_task(_run())
