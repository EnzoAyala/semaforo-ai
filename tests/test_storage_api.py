"""Pruebas de captura, almacenamiento e historial (modo memoria / API)."""

import pytest
from fastapi.testclient import TestClient

from src import api as api_module
from src import storage
from src.logic import SemaforoInteligente, ModoEstado


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setenv("SEMAFORO_MEMORY_DB", "1")
    storage._engine = None
    storage._SessionLocal = None
    storage.reset_memory_store()
    storage.init_db(force_memory=True)
    assert storage.is_memory_mode() is True

    api_module.semaforo = SemaforoInteligente(
        duracion_rojo=60.0,
        duracion_cooldown=120.0,
        tiempo_inicial=0.0,
    )
    api_module._ultimo_modo = None

    with TestClient(api_module.app) as test_client:
        yield test_client


def test_sensor_evento_pir_persiste_y_activa_cruce(client):
    response = client.post(
        "/api/sensor/evento",
        json={"source": "pir", "device_id": "arduino-uno", "tiempo_actual": 5.0},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["solicitud_aceptada"] is True
    assert body["resumen"]["modo"] == ModoEstado.TRANSICION_AMARILLO.value

    historial = client.get("/api/historial/eventos?limit=10")
    assert historial.status_code == 200
    eventos = historial.json()["eventos"]
    assert len(eventos) >= 1
    assert eventos[0]["source"] == "pir"
    assert eventos[0]["accepted"] is True


def test_sensor_evento_rechazado_en_fase(client):
    client.post(
        "/api/sensor/evento",
        json={"source": "button", "tiempo_actual": 1.0},
    )
    # Segunda solicitud inmediata debe rechazarse
    response = client.post(
        "/api/sensor/evento",
        json={"source": "button", "tiempo_actual": 1.5},
    )
    assert response.status_code == 200
    assert response.json()["solicitud_aceptada"] is False

    eventos = client.get("/api/historial/eventos").json()["eventos"]
    assert any(e["accepted"] is False for e in eventos)


def test_historial_estados_y_ui(client):
    response = client.post("/api/solicitar-cruce", json={"tiempo_actual": 2.0})
    assert response.status_code == 200
    assert response.json()["solicitud_aceptada"] is True

    estados = client.get("/api/historial/estados?limit=20").json()["estados"]
    assert len(estados) >= 1
    assert any(e["modo"] == ModoEstado.TRANSICION_AMARILLO.value for e in estados)


def test_sensor_heartbeat_salud(client):
    response = client.post(
        "/api/sensor/heartbeat",
        json={"pir": 1, "button": 0, "device_id": "arduino-uno"},
    )
    assert response.status_code == 200
    salud = client.get("/api/sensor/salud").json()
    assert salud["bridge_connected"] is True
    assert salud["pir"] == 1


def test_source_invalido(client):
    response = client.post("/api/sensor/evento", json={"source": "camara"})
    assert response.status_code == 422
