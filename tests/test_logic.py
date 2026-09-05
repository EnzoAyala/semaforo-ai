"""
Pruebas Unitarias para la Lógica del Semáforo Inteligente (SemaforoIA).
Cubre todos los casos de uso, transiciones de estado, tiempos y condiciones de borde con pytest.
"""

import pytest
from src.logic import (
    SemaforoInteligente,
    EstadoLuz,
    ModoEstado,
    controlar_semaforo_evento
)


@pytest.fixture
def semaforo():
    """Fixture que provee una instancia limpia del semáforo con tiempo inicial t=0."""
    return SemaforoInteligente(duracion_rojo=60.0, duracion_cooldown=120.0, tiempo_inicial=0.0)


def test_estado_inicial(semaforo):
    """Verifica que el semáforo inicie en estado de reposo con vía vehicular libre."""
    resumen = semaforo.obtener_resumen(tiempo_actual=0.0)
    
    assert semaforo.modo == "Modo_incorrecto"
    assert semaforo.luz_vehicular == EstadoLuz.VERDE
    assert semaforo.luz_peatonal == EstadoLuz.ROJO
    assert not semaforo.esta_en_cooldown(0.0)
    assert resumen["permite_cruce"] is False
    assert resumen["tiempo_restante_seg"] == 0.0


def test_deteccion_peaton_activa_luz_roja(semaforo):
    """Verifica que al detectar un peatón cambie a fase peatonal (rojo vehicular) por 60s."""
    t_deteccion = 10.0
    aceptado = semaforo.solicitar_cruce(tiempo_actual=t_deteccion)
    
    assert aceptado is True
    assert semaforo.modo == ModoEstado.FASE_PEATONAL
    assert semaforo.luz_vehicular == EstadoLuz.ROJO
    assert semaforo.luz_peatonal == EstadoLuz.VERDE
    assert semaforo.tiempo_fin_fase == 70.0
    assert semaforo.tiempo_restante_fase(t_deteccion) == 60.0
    
    resumen = semaforo.obtener_resumen(t_deteccion)
    assert resumen["permite_cruce"] is True
    assert resumen["en_cooldown"] is False


def test_deteccion_repetida_durante_fase_peatonal_no_reinicia_tiempo(semaforo):
    """Verifica que si otro peatón activa el sensor durante el minuto de cruce, no se reinicie el reloj."""
    t_inicio = 0.0
    semaforo.solicitar_cruce(tiempo_actual=t_inicio)
    fin_original = semaforo.tiempo_fin_fase  # 60.0
    
    # Llega otro peatón al segundo 25
    t_segundo = 25.0
    aceptado = semaforo.solicitar_cruce(tiempo_actual=t_segundo)
    
    assert aceptado is False
    assert semaforo.modo == ModoEstado.FASE_PEATONAL
    assert semaforo.tiempo_fin_fase == fin_original
    assert semaforo.tiempo_restante_fase(t_segundo) == 35.0


def test_transicion_de_fase_peatonal_a_cooldown(semaforo):
    """Verifica que al concluir los 60s, el semáforo cambie automáticamente a Cooldown vehicular (120s)."""
    semaforo.solicitar_cruce(tiempo_actual=0.0)
    
    # Al transcurrir exactamente 60 segundos
    t_fin_peatonal = 60.0
    estado = semaforo.actualizar_estado(tiempo_actual=t_fin_peatonal)
    
    assert estado == ModoEstado.COOLDOWN
    assert semaforo.luz_vehicular == EstadoLuz.VERDE
    assert semaforo.luz_peatonal == EstadoLuz.ROJO
    assert semaforo.esta_en_cooldown(t_fin_peatonal) is True
    assert semaforo.tiempo_restante_fase(t_fin_peatonal) == 120.0


def test_deteccion_durante_cooldown_es_rechazada(semaforo):
    """Verifica que durante el período de enfriamiento (120s) el sensor IoT rechace solicitudes."""
    semaforo.solicitar_cruce(tiempo_actual=0.0)
    
    # Avanzamos al tiempo en cooldown (e.g., t=90s, dentro de los 60s..180s)
    t_en_cooldown = 90.0
    aceptado = semaforo.solicitar_cruce(tiempo_actual=t_en_cooldown)
    
    assert aceptado is False
    assert semaforo.modo == ModoEstado.COOLDOWN
    assert semaforo.luz_vehicular == EstadoLuz.VERDE
    assert semaforo.luz_peatonal == EstadoLuz.ROJO
    assert semaforo.esta_en_cooldown(t_en_cooldown) is True
    # Restan 180.0 - 90.0 = 90.0 s de cooldown
    assert semaforo.tiempo_restante_fase(t_en_cooldown) == 90.0


def test_transicion_de_cooldown_a_reposo(semaforo):
    """Verifica que al concluir los 120s de enfriamiento, el semáforo vuelva a reposo."""
    semaforo.solicitar_cruce(tiempo_actual=0.0)
    
    # t = 0 (inicio rojo) + 60 (fin rojo) + 120 (fin cooldown) = 180.0s
    t_fin_cooldown = 180.0
    estado = semaforo.actualizar_estado(tiempo_actual=t_fin_cooldown)
    
    assert estado == ModoEstado.REPOSO
    assert semaforo.luz_vehicular == EstadoLuz.VERDE
    assert semaforo.luz_peatonal == EstadoLuz.ROJO
    assert semaforo.esta_en_cooldown(t_fin_cooldown) is False
    assert semaforo.tiempo_restante_fase(t_fin_cooldown) == 0.0


def test_nueva_deteccion_exitosa_post_cooldown(semaforo):
    """Verifica que tras finalizar el período de enfriamiento se pueda iniciar un nuevo ciclo de cruce."""
    semaforo.solicitar_cruce(tiempo_actual=0.0)
    
    # Pasamos el ciclo completo a t = 185.0s
    t_nuevo = 185.0
    aceptado = semaforo.solicitar_cruce(tiempo_actual=t_nuevo)
    
    assert aceptado is True
    assert semaforo.modo == ModoEstado.FASE_PEATONAL
    assert semaforo.luz_vehicular == EstadoLuz.ROJO
    assert semaforo.luz_peatonal == EstadoLuz.VERDE
    assert semaforo.tiempo_fin_fase == 185.0 + 60.0


def test_condiciones_de_borde_temporales(semaforo):
    """Evalúa la precisión de las transiciones en los límites de tiempo exactos."""
    semaforo.solicitar_cruce(tiempo_actual=0.0)
    
    # 59.99s -> Aún fase peatonal
    assert semaforo.actualizar_estado(59.99) == ModoEstado.FASE_PEATONAL
    assert semaforo.luz_vehicular == EstadoLuz.ROJO
    
    # 60.00s -> Exacto cambio a Cooldown
    assert semaforo.actualizar_estado(60.00) == ModoEstado.COOLDOWN
    assert semaforo.luz_vehicular == EstadoLuz.VERDE
    
    # 179.99s -> Aún en Cooldown
    assert semaforo.actualizar_estado(179.99) == ModoEstado.COOLDOWN
    
    # 180.00s -> Exacto cambio a Reposo
    assert semaforo.actualizar_estado(180.00) == ModoEstado.REPOSO


def test_configuracion_tiempos_personalizados():
    """Valida que los tiempos de luz roja y cooldown sean configurables."""
    semaforo_custom = SemaforoInteligente(duracion_rojo=10.0, duracion_cooldown=20.0, tiempo_inicial=0.0)
    
    semaforo_custom.solicitar_cruce(tiempo_actual=0.0)
    assert semaforo_custom.tiempo_restante_fase(0.0) == 10.0
    
    # Al pasar 10s entra a cooldown
    assert semaforo_custom.actualizar_estado(10.0) == ModoEstado.COOLDOWN
    assert semaforo_custom.tiempo_restante_fase(10.0) == 20.0
    
    # Al pasar 30s totales vuelve a reposo
    assert semaforo_custom.actualizar_estado(30.0) == ModoEstado.REPOSO


def test_controlar_semaforo_evento_helper(semaforo):
    """Prueba la función helper con eventos de sensor True / False."""
    resumen1 = controlar_semaforo_evento(semaforo, hay_peaton=True, tiempo_actual=0.0)
    assert resumen1["modo"] == "FASE_PEATONAL"
    assert resumen1["luz_vehicular"] == "ROJO"
    assert resumen1["luz_peatonal"] == "VERDE"
    
    resumen2 = controlar_semaforo_evento(semaforo, hay_peaton=False, tiempo_actual=30.0)
    assert resumen2["modo"] == "FASE_PEATONAL"
    assert resumen2["tiempo_restante_seg"] == 30.0
