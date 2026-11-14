"""Aplica la política de horarios pico del bot al FSM del semáforo."""

from __future__ import annotations

from typing import Optional

from src.bots.horarios_pico import (
    obtener_estado_horarios_pico,
    url_boletin_default,
)

_ultima_franja_pico: Optional[str] = None


def aplicar_politica_horarios_pico() -> dict:
    """Lee el último scrape del bot y ajusta duraciones del FSM."""
    global _ultima_franja_pico
    from src.services import semaforo as semaforo_svc

    estado_bot = obtener_estado_horarios_pico()
    if estado_bot is None:
        return {
            "en_hora_pico": False,
            "franja_activa": None,
            "fuente_url": url_boletin_default(),
            "hora_local": None,
            "error": None,
        }

    semaforo_svc.semaforo.aplicar_duraciones(
        duracion_rojo=estado_bot.duracion_rojo_aplicada,
        duracion_cooldown=estado_bot.duracion_cooldown_aplicada,
    )

    franja_key = estado_bot.franja_activa if estado_bot.en_hora_pico else "__fuera__"
    if franja_key != _ultima_franja_pico:
        _ultima_franja_pico = franja_key

    return {
        "en_hora_pico": estado_bot.en_hora_pico,
        "franja_activa": estado_bot.franja_activa,
        "fuente_url": estado_bot.fuente_url,
        "hora_local": estado_bot.hora_local,
        "actualizado_en": estado_bot.actualizado_en,
        "error": estado_bot.error,
        "franjas": [
            {
                "nombre": f.nombre,
                "inicio": f.inicio,
                "fin": f.fin,
                "duracion_rojo": f.duracion_rojo,
                "duracion_cooldown": f.duracion_cooldown,
            }
            for f in estado_bot.franjas
        ],
    }
