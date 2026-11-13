"""Pruebas de suscripciones de correo (modo memoria)."""

import pytest
from fastapi.testclient import TestClient

from src import api as api_module
from src import storage
from src.logic import SemaforoInteligente


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setenv("SEMAFORO_MEMORY_DB", "1")
    storage._engine = None
    storage._SessionLocal = None
    storage.reset_memory_store()
    storage.init_db(force_memory=True)
    api_module.semaforo = SemaforoInteligente(
        duracion_rojo=60.0,
        duracion_cooldown=120.0,
        tiempo_inicial=0.0,
    )
    api_module._ultimo_modo = None

    with TestClient(api_module.app) as test_client:
        yield test_client


def test_suscribir_listar_y_cancelar(client):
    alta = client.post("/api/suscripciones/email", json={"email": "a@test.com"})
    assert alta.status_code == 200
    assert alta.json()["suscripcion"]["active"] is True

    lista = client.get("/api/suscripciones/email")
    assert lista.status_code == 200
    emails = [s["email"] for s in lista.json()["suscripciones"]]
    assert "a@test.com" in emails

    baja = client.request(
        "DELETE",
        "/api/suscripciones/email",
        json={"email": "a@test.com"},
    )
    assert baja.status_code == 200
    assert baja.json()["suscripcion"]["active"] is False

    lista2 = client.get("/api/suscripciones/email").json()["suscripciones"]
    assert all(s["email"] != "a@test.com" for s in lista2)


def test_varios_correos(client):
    client.post("/api/suscripciones/email", json={"email": "uno@mail.com"})
    client.post("/api/suscripciones/email", json={"email": "dos@mail.com"})
    lista = client.get("/api/suscripciones/email").json()["suscripciones"]
    assert len(lista) >= 2


def test_email_invalido(client):
    res = client.post("/api/suscripciones/email", json={"email": "sin-arroba"})
    assert res.status_code == 422
