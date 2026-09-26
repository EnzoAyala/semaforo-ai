"""Pruebas del módulo de IA sin realizar llamadas externas."""

from types import SimpleNamespace

import pytest

from src.ai_assistant import responder_consulta, validar_conexion


class CompletionsFalsas:
    def __init__(self):
        self.parametros = None

    def create(self, **parametros):
        self.parametros = parametros
        mensaje = SimpleNamespace(content="La luz peatonal está roja; espera.")
        return SimpleNamespace(choices=[SimpleNamespace(message=mensaje)])


def test_inyecta_estado_del_semaforo_en_el_prompt():
    completions = CompletionsFalsas()
    cliente = SimpleNamespace(chat=SimpleNamespace(completions=completions))
    estado = {
        "modo": "REPOSO",
        "luz_peatonal": "ROJO",
        "permite_cruce": False,
        "tiempo_restante_seg": 0,
    }

    respuesta = responder_consulta("¿Puedo cruzar?", estado, cliente=cliente)

    assert respuesta == "La luz peatonal está roja; espera."
    assert completions.parametros["model"] == "llama-3.3-70b-versatile"
    assert '"luz_peatonal": "ROJO"' in completions.parametros["messages"][0]["content"]
    assert completions.parametros["messages"][1]["content"] == "¿Puedo cruzar?"


def test_rechaza_consulta_vacia():
    with pytest.raises(ValueError, match="vacía"):
        responder_consulta("   ", {}, cliente=object())


def test_admite_responses_api_de_xai():
    responses = SimpleNamespace(
        create=lambda **_parametros: SimpleNamespace(
            output_text="Espera la señal peatonal verde."
        )
    )
    cliente = SimpleNamespace(responses=responses)

    respuesta = responder_consulta(
        "¿Puedo cruzar?",
        {"luz_peatonal": "ROJO", "permite_cruce": False},
        cliente=cliente,
        proveedor="xai",
    )

    assert respuesta == "Espera la señal peatonal verde."


def test_admite_api_de_gemini():
    models = SimpleNamespace(
        generate_content=lambda **_parametros: SimpleNamespace(
            text="El semáforo peatonal está rojo."
        )
    )
    cliente = SimpleNamespace(models=models)

    respuesta = responder_consulta(
        "¿Cuál es el estado?",
        {"luz_peatonal": "ROJO", "permite_cruce": False},
        cliente=cliente,
        proveedor="gemini",
    )

    assert respuesta == "El semáforo peatonal está rojo."


def test_valida_gemini_con_una_generacion_minima(monkeypatch):
    models = SimpleNamespace(generate_content=lambda **_parametros: SimpleNamespace(text="OK"))
    cliente = SimpleNamespace(models=models)
    monkeypatch.setattr(
        "src.ai_assistant._crear_cliente_gemini",
        lambda _api_key: cliente,
    )

    assert validar_conexion("gemini", "clave-de-prueba") == "gemini-3.6-flash"


def test_clave_aq_prueba_vertex_express_como_fallback(monkeypatch):
    class ModelsFalla:
        def generate_content(self, **_parametros):
            raise RuntimeError("401 ACCESS_TOKEN_TYPE_UNSUPPORTED")

    cliente_developer = SimpleNamespace(models=ModelsFalla())
    cliente_vertex = SimpleNamespace(
        models=SimpleNamespace(
            generate_content=lambda **_parametros: SimpleNamespace(text="OK")
        )
    )

    monkeypatch.setattr(
        "src.ai_assistant._crear_cliente_gemini",
        lambda _api_key, vertexai=False: cliente_vertex if vertexai else cliente_developer,
    )

    assert validar_conexion("gemini", "AQ.clave-de-prueba") == "gemini-3.6-flash"
