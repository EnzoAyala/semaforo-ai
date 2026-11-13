"""Pruebas del bot de horarios pico (parseo web + política)."""

from datetime import datetime
from zoneinfo import ZoneInfo

import pytest
from fastapi.testclient import TestClient

from src import api as api_module
from src import storage
from src.bots.horarios_pico import (
    actualizar_horarios_pico,
    evaluar_franjas,
    parsear_boletin_html,
    parsear_pagina_atu_gob,
    reset_estado_horarios_pico,
)
from src.bots.horarios_pico import leer_boletin_embebido
from src.logic import SemaforoInteligente


HTML_MINIMO = """
<html><body>
  <span id="tz">America/Lima</span>
  <article class="horario-pico" data-nombre="Pico mañana"
    data-inicio="07:00" data-fin="09:00"
    data-duracion-rojo="45" data-duracion-cooldown="180"></article>
  <article class="horario-pico" data-nombre="Pico tarde"
    data-inicio="17:00" data-fin="19:00"
    data-duracion-rojo="45" data-duracion-cooldown="180"></article>
  <div id="politica-fuera-pico" data-duracion-rojo="60" data-duracion-cooldown="120"></div>
</body></html>
"""

HTML_ATU_GOB = """
<html><body>
  <article>
    <p>Las horas punta ahora van de 6:30 a. m. a 9:30 a. m. y de 5:00 p. m. a 8:30 p. m.,
    en días hábiles (lunes a viernes).</p>
  </article>
</body></html>
"""


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setenv("SEMAFORO_MEMORY_DB", "1")
    storage._engine = None
    storage._SessionLocal = None
    storage.reset_memory_store()
    storage.init_db(force_memory=True)
    reset_estado_horarios_pico()
    api_module.semaforo = SemaforoInteligente(
        duracion_rojo=60.0,
        duracion_cooldown=120.0,
        tiempo_inicial=0.0,
    )
    api_module._ultimo_modo = None
    api_module._ultima_franja_pico = None

    with TestClient(api_module.app) as test_client:
        yield test_client


def test_parsear_boletin_html_extrae_franjas():
    data = parsear_boletin_html(HTML_MINIMO)
    assert data["zona_horaria"] == "America/Lima"
    assert len(data["franjas"]) == 2
    assert data["franjas"][0].nombre == "Pico mañana"
    assert data["franjas"][0].inicio == "07:00"
    assert data["duracion_rojo_base"] == 60.0
    assert data["duracion_cooldown_base"] == 120.0


def test_evaluar_dentro_y_fuera_de_pico():
    parsed = parsear_boletin_html(HTML_MINIMO)
    tz = ZoneInfo("America/Lima")

    dentro = evaluar_franjas(
        parsed["franjas"],
        zona_horaria="America/Lima",
        duracion_rojo_base=60.0,
        duracion_cooldown_base=120.0,
        ahora=datetime(2026, 11, 2, 8, 15, tzinfo=tz),
    )
    assert dentro["en_hora_pico"] is True
    assert dentro["franja_activa"] == "Pico mañana"
    assert dentro["duracion_rojo_aplicada"] == 45.0
    assert dentro["duracion_cooldown_aplicada"] == 180.0

    fuera = evaluar_franjas(
        parsed["franjas"],
        zona_horaria="America/Lima",
        duracion_rojo_base=60.0,
        duracion_cooldown_base=120.0,
        ahora=datetime(2026, 11, 2, 12, 0, tzinfo=tz),
    )
    assert fuera["en_hora_pico"] is False
    assert fuera["franja_activa"] is None
    assert fuera["duracion_rojo_aplicada"] == 60.0


def test_actualizar_con_html_inyectado_aplica_pico():
    reset_estado_horarios_pico()
    tz = ZoneInfo("America/Lima")
    estado = actualizar_horarios_pico(
        html=HTML_MINIMO,
        ahora=datetime(2026, 11, 2, 17, 30, tzinfo=tz),
    )
    assert estado.en_hora_pico is True
    assert estado.franja_activa == "Pico tarde"
    assert estado.error is None


def test_boletin_publico_y_endpoint_bot(client):
    html = client.get("/boletin/transito")
    assert html.status_code == 200
    assert "horario-pico" in html.text
    assert "Pico mañana" in html.text

    # Bot con HTML embebido (sin depender de red externa)
    estado = actualizar_horarios_pico(html=leer_boletin_embebido())
    assert len(estado.franjas) >= 1

    response = client.get("/api/bot/horarios-pico")
    assert response.status_code == 200
    body = response.json()
    assert "bot" in body
    assert "aplicado" in body
    assert "en_hora_pico" in body["resumen"]


def test_estado_incluye_campos_hora_pico(client):
    actualizar_horarios_pico(html=HTML_MINIMO)
    response = client.get("/api/estado")
    assert response.status_code == 200
    data = response.json()
    assert "en_hora_pico" in data
    assert "horarios_pico" in data
    assert "duracion_rojo" in data
    assert "duracion_cooldown" in data


def test_logic_aplicar_duraciones():
    s = SemaforoInteligente(duracion_rojo=60.0, duracion_cooldown=120.0, tiempo_inicial=0.0)
    s.aplicar_duraciones(duracion_rojo=45.0, duracion_cooldown=180.0)
    assert s.duracion_rojo == 45.0
    assert s.duracion_cooldown == 180.0


def test_parsear_pagina_atu_gob_extrae_franjas_ampm():
    data = parsear_pagina_atu_gob(HTML_ATU_GOB)
    assert data["parser"] == "atu-gob-pe"
    assert len(data["franjas"]) == 2
    assert data["franjas"][0].inicio == "06:30"
    assert data["franjas"][0].fin == "09:30"
    assert data["franjas"][1].inicio == "17:00"
    assert data["franjas"][1].fin == "20:30"


def test_parsear_boletin_html_usa_parser_atu_si_no_hay_articulos():
    data = parsear_boletin_html(HTML_ATU_GOB)
    assert len(data["franjas"]) == 2
    assert data["parser"] == "atu-gob-pe"


def test_actualizar_desde_html_atu(monkeypatch):
    reset_estado_horarios_pico()
    tz = ZoneInfo("America/Lima")
    estado = actualizar_horarios_pico(
        html=HTML_ATU_GOB,
        ahora=datetime(2026, 11, 2, 7, 0, tzinfo=tz),
    )
    assert estado.en_hora_pico is True
    assert estado.franja_activa == "Pico mañana"
    assert estado.parser == "atu-gob-pe"
