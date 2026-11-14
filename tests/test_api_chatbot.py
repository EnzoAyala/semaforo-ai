"""Pruebas del endpoint del chatbot sin consumir la API de Groq."""

import pytest
from fastapi import HTTPException

from src.routers import chatbot as chatbot_api
from src.schemas.requests import SolicitudChatbot, SolicitudValidacionIA


def test_endpoint_inyecta_estado_actual(monkeypatch):
    llamada = {}

    def responder_falso(consulta, estado, proveedor, api_key):
        llamada["consulta"] = consulta
        llamada["estado"] = estado
        llamada["proveedor"] = proveedor
        llamada["api_key"] = api_key
        return "Debes esperar la luz peatonal verde."

    monkeypatch.setattr(chatbot_api, "responder_consulta", responder_falso)

    resultado = chatbot_api.consultar_chatbot(
        SolicitudChatbot(
            consulta=" ¿Puedo cruzar? ",
            proveedor="gemini",
            api_key="clave-que-el-cliente-envie-se-ignora",
        )
    )

    assert llamada["consulta"] == "¿Puedo cruzar?"
    assert llamada["proveedor"] == "gemini"
    assert llamada["api_key"] is None
    assert llamada["estado"]["luz_peatonal"] in {"ROJO", "VERDE"}
    assert resultado["respuesta"] == "Debes esperar la luz peatonal verde."
    assert resultado["estado_semaforo"] == llamada["estado"]


def test_endpoint_rechaza_consulta_vacia():
    with pytest.raises(HTTPException) as error:
        chatbot_api.consultar_chatbot(SolicitudChatbot(consulta="  "))

    assert error.value.status_code == 422


def test_endpoint_responde_fuera_de_ambito_sin_proveedor(monkeypatch):
    from src.ai_assistant import ConsultaFueraDeAmbitoError, MENSAJE_FUERA_DE_AMBITO

    def responder_ambito(*_args, **_kwargs):
        raise ConsultaFueraDeAmbitoError(MENSAJE_FUERA_DE_AMBITO)

    monkeypatch.setattr(chatbot_api, "responder_consulta", responder_ambito)

    resultado = chatbot_api.consultar_chatbot(
        SolicitudChatbot(
            consulta="Cuéntame un chiste de políticos",
            proveedor="gemini",
            api_key="clave",
        )
    )

    assert resultado["fuera_de_ambito"] is True
    assert "SemaforoIA" in resultado["respuesta"]


def test_endpoint_confirma_conexion_gemini(monkeypatch):
    monkeypatch.setattr(
        chatbot_api,
        "validar_conexion",
        lambda proveedor, api_key: "gemini-3.6-flash",
    )

    resultado = chatbot_api.validar_api_key(
        SolicitudValidacionIA(
            proveedor="gemini",
            api_key="clave-de-prueba",
        )
    )

    assert resultado["conectado"] is True
    assert resultado["mensaje"] == "Conectado correctamente"
    assert resultado["modelo"] == "gemini-3.6-flash"
