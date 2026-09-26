"""
Módulo de Lógica del Semáforo Peatonal Inteligente (SemaforoIA).
Soporta las luces VERDE, AMARILLO y ROJO con cálculo determinista de transiciones.
"""

from enum import Enum
import time
from typing import Dict, Any, Optional


class EstadoLuz(str, Enum):
    VERDE = "VERDE"
    AMARILLO = "AMARILLO"
    ROJO = "ROJO"


class ModoEstado(str, Enum):
    REPOSO = "REPOSO"                        # Vehículos en verde, peatones en rojo
    TRANSICION_AMARILLO = "TRANSICION_AMARILLO" # Advertencia vehicular (3s)
    FASE_PEATONAL = "FASE_PEATONAL"         # Vehículos en rojo (60s), peatones en verde
    COOLDOWN = "COOLDOWN"                  # Vehículos en verde (120s), sensor bloqueado


class SemaforoInteligente:
    DURACION_ROJO_DEFAULT = 60.0
    DURACION_COOLDOWN_DEFAULT = 120.0
    DURACION_AMARILLO_DEFAULT = 3.0

    def __init__(
        self,
        duracion_rojo: float = DURACION_ROJO_DEFAULT,
        duracion_cooldown: float = DURACION_COOLDOWN_DEFAULT,
        tiempo_inicial: Optional[float] = None
    ) -> None:
        self.duracion_rojo = float(duracion_rojo)
        self.duracion_cooldown = float(duracion_cooldown)
        self.duracion_amarillo = float(self.DURACION_AMARILLO_DEFAULT)
        
        self.modo: ModoEstado = ModoEstado.REPOSO
        self.tiempo_inicio_fase: Optional[float] = None
        self.tiempo_fin_fase: Optional[float] = None
        
        self.luz_vehicular: EstadoLuz = EstadoLuz.VERDE
        self.luz_peatonal: EstadoLuz = EstadoLuz.ROJO
        self._ultimo_tiempo_registrado: float = tiempo_inicial if tiempo_inicial is not None else time.time()

    def _obtener_tiempo(self, tiempo_actual: Optional[float]) -> float:
        if tiempo_actual is not None:
            self._ultimo_tiempo_registrado = float(tiempo_actual)
            return self._ultimo_tiempo_registrado
        return time.time()

    def esta_en_cooldown(self, tiempo_actual: Optional[float] = None) -> bool:
        """Verifica si el semáforo se encuentra en estado de cooldown."""
        self.actualizar_estado(tiempo_actual)
        return self.modo == ModoEstado.COOLDOWN

    def solicitar_cruce(self, tiempo_actual: Optional[float] = None) -> bool:
        """
        Procesa la señal del sensor PIR.
        En estado REPOSO transiciona inmediatamente a TRANSICION_AMARILLO por 3s.
        """
        t = self._obtener_tiempo(tiempo_actual)
        self.actualizar_estado(t)

        if self.modo == ModoEstado.REPOSO:
            self.modo = ModoEstado.TRANSICION_AMARILLO
            self.luz_vehicular = EstadoLuz.AMARILLO
            self.luz_peatonal = EstadoLuz.ROJO
            self.tiempo_inicio_fase = t
            self.tiempo_fin_fase = t + self.duracion_amarillo
            return True
        
        return False

    def actualizar_estado(self, tiempo_actual: Optional[float] = None) -> ModoEstado:
        """
        Cadena de transiciones temporales:
        REPOSO -> TRANSICION_AMARILLO (3s) -> FASE_PEATONAL (60s) -> COOLDOWN (120s) -> REPOSO
        """
        t = self._obtener_tiempo(tiempo_actual)

        # Transición de Amarillo (3s) a Fase Peatonal (60s)
        if self.modo == ModoEstado.TRANSICION_AMARILLO:
            if self.tiempo_fin_fase is not None and t >= self.tiempo_fin_fase:
                self.modo = ModoEstado.FASE_PEATONAL
                self.luz_vehicular = EstadoLuz.ROJO
                self.luz_peatonal = EstadoLuz.VERDE
                self.tiempo_inicio_fase = self.tiempo_fin_fase
                self.tiempo_fin_fase = self.tiempo_fin_fase + self.duracion_rojo

        # Transición de Fase Peatonal (60s) a Cooldown (120s)
        if self.modo == ModoEstado.FASE_PEATONAL:
            if self.tiempo_fin_fase is not None and t >= self.tiempo_fin_fase:
                self.modo = ModoEstado.COOLDOWN
                self.luz_vehicular = EstadoLuz.VERDE
                self.luz_peatonal = EstadoLuz.ROJO
                self.tiempo_inicio_fase = self.tiempo_fin_fase
                self.tiempo_fin_fase = self.tiempo_fin_fase + self.duracion_cooldown

        # Transición de Cooldown (120s) a Reposo
        if self.modo == ModoEstado.COOLDOWN:
            if self.tiempo_fin_fase is not None and t >= self.tiempo_fin_fase:
                self.modo = ModoEstado.REPOSO
                self.luz_vehicular = EstadoLuz.VERDE
                self.luz_peatonal = EstadoLuz.ROJO
                self.tiempo_inicio_fase = None
                self.tiempo_fin_fase = None

        return self.modo

    def tiempo_restante_fase(self, tiempo_actual: Optional[float] = None) -> float:
        t = self._obtener_tiempo(tiempo_actual)
        self.actualizar_estado(t)
        if self.tiempo_fin_fase is None or self.modo == ModoEstado.REPOSO:
            return 0.0
        return max(0.0, self.tiempo_fin_fase - t)

    def obtener_resumen(self, tiempo_actual: Optional[float] = None) -> Dict[str, Any]:
        t = self._obtener_tiempo(tiempo_actual)
        self.actualizar_estado(t)
        return {
            "modo": self.modo.value,
            "luz_vehicular": self.luz_vehicular.value,
            "luz_peatonal": self.luz_peatonal.value,
            "en_cooldown": self.modo == ModoEstado.COOLDOWN,
            "permite_cruce": self.luz_peatonal == EstadoLuz.VERDE,
            "tiempo_restante_seg": round(self.tiempo_restante_fase(t), 2),
            "tiempo_actual": t
        }


def controlar_semaforo_evento(
    semaforo: SemaforoInteligente,
    hay_peaton: bool,
    tiempo_actual: float
) -> Dict[str, Any]:
    """
    Función helper que procesa eventos de detección del sensor PIR.
    """
    if hay_peaton:
        semaforo.solicitar_cruce(tiempo_actual=tiempo_actual)
    else:
        semaforo.actualizar_estado(tiempo_actual=tiempo_actual)
    
    return semaforo.obtener_resumen(tiempo_actual=tiempo_actual)