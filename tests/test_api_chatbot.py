"""Pruebas del endpoint del chatbot sin consumir la API de Groq."""

import pytest
from fastapi import HTTPException

from src import api


def test_endpoint_inyecta_estado_actual(monkeypatch):
    llamada = {}

    def responder_falso(consulta, estado, proveedor, api_key):
        llamada["consulta"] = consulta
        llamada["estado"] = estado
        llamada["proveedor"] = proveedor
        llamada["api_key"] = api_key
        return "Debes esperar la luz peatonal verde."

    monkeypatch.setattr(api, "responder_consulta", responder_falso)

    resultado = api.consultar_chatbot(
        api.SolicitudChatbot(
            consulta=" ¿Puedo cruzar? ",
            proveedor="gemini",
            api_key="clave-de-prueba",
        )
    )

    assert llamada["consulta"] == "¿Puedo cruzar?"
    assert llamada["proveedor"] == "gemini"
    assert llamada["api_key"] == "clave-de-prueba"
    assert llamada["estado"]["luz_peatonal"] in {"ROJO", "VERDE"}
    assert resultado["respuesta"] == "Debes esperar la luz peatonal verde."
    assert resultado["estado_semaforo"] == llamada["estado"]


def test_endpoint_rechaza_consulta_vacia():
    with pytest.raises(HTTPException) as error:
        api.consultar_chatbot(api.SolicitudChatbot(consulta="  "))

    assert error.value.status_code == 422


def test_endpoint_confirma_conexion_gemini(monkeypatch):
    monkeypatch.setattr(
        api,
        "validar_conexion",
        lambda proveedor, api_key: "gemini-3.6-flash",
    )

    resultado = api.validar_api_key(
        api.SolicitudValidacionIA(
            proveedor="gemini",
            api_key="clave-de-prueba",
        )
    )

    assert resultado["conectado"] is True
    assert resultado["mensaje"] == "Conectado correctamente"
    assert resultado["modelo"] == "gemini-3.6-flash"
