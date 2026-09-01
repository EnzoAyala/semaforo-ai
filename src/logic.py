"""
Módulo de Lógica del Semáforo Peatonal Inteligente (SemaforoIA).

Controla la temporización de luces vehiculares y peatonales ante la
detección de peatones por sensores IoT (PIR/Arduino), aplicando:
- Luz roja vehicular (verde peatonal) durante 1 minuto (60 s).
- Período de enfriamiento (cooldown) vehicular durante 2 minutos (120 s).
"""

from enum import Enum
import time
from typing import Dict, Any, Optional


class EstadoLuz(str, Enum):
    VERDE = "VERDE"
    ROJO = "ROJO"
    AMARILLO = "AMARILLO"


class ModoEstado(str, Enum):
    REPOSO = "REPOSO"              # Vehículos en verde, peatones en rojo, esperando sensor
    FASE_PEATONAL = "FASE_PEATONAL" # Vehículos en rojo (60s), peatones en verde
    COOLDOWN = "COOLDOWN"          # Vehículos en verde (120s), sensor bloqueado


class SemaforoInteligente:
    """
    Controlador del estado del semáforo inteligente.
    Permite inyección de tiempo para pruebas deterministas y ejecución en tiempo real.
    """

    DURACION_ROJO_DEFAULT = 60.0    # 1 minuto
    DURACION_COOLDOWN_DEFAULT = 120.0 # 2 minutos

    def __init__(
        self,
        duracion_rojo: float = DURACION_ROJO_DEFAULT,
        duracion_cooldown: float = DURACION_COOLDOWN_DEFAULT,
        tiempo_inicial: Optional[float] = None
    ) -> None:
        self.duracion_rojo = float(duracion_rojo)
        self.duracion_cooldown = float(duracion_cooldown)
        
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

    def solicitar_cruce(self, tiempo_actual: Optional[float] = None) -> bool:
        """
        Procesa una señal de detección de peatón por sensor PIR.
        Retorna True si la solicitud fue aceptada e inició el cambio a rojo vehicular,
        o False si fue rechazada (por estar ya en fase peatonal o en cooldown).
        """
        t = self._obtener_tiempo(tiempo_actual)
        self.actualizar_estado(t)

        if self.modo == ModoEstado.REPOSO:
            self.modo = ModoEstado.FASE_PEATONAL
            self.luz_vehicular = EstadoLuz.ROJO
            self.luz_peatonal = EstadoLuz.VERDE
            self.tiempo_inicio_fase = t
            self.tiempo_fin_fase = t + self.duracion_rojo
            return True
        
        # En FASE_PEATONAL o en COOLDOWN no se acepta una nueva solicitud
        return False

    def actualizar_estado(self, tiempo_actual: Optional[float] = None) -> ModoEstado:
        """
        Evalúa el paso del tiempo y realiza las transiciones de estado:
        FASE_PEATONAL -> COOLDOWN -> REPOSO.
        """
        t = self._obtener_tiempo(tiempo_actual)

        if self.modo == ModoEstado.FASE_PEATONAL:
            if self.tiempo_fin_fase is not None and t >= self.tiempo_fin_fase:
                # Termina el minuto de cruce peatonal -> Inicia Cooldown
                self.modo = ModoEstado.COOLDOWN
                self.luz_vehicular = EstadoLuz.VERDE
                self.luz_peatonal = EstadoLuz.ROJO
                self.tiempo_inicio_fase = self.tiempo_fin_fase
                self.tiempo_fin_fase = self.tiempo_fin_fase + self.duracion_cooldown

        if self.modo == ModoEstado.COOLDOWN:
            if self.tiempo_fin_fase is not None and t >= self.tiempo_fin_fase:
                # Termina el período de enfriamiento -> Vuelve a reposo
                self.modo = ModoEstado.REPOSO
                self.luz_vehicular = EstadoLuz.VERDE
                self.luz_peatonal = EstadoLuz.ROJO
                self.tiempo_inicio_fase = None
                self.tiempo_fin_fase = None

        return self.modo

    def esta_en_cooldown(self, tiempo_actual: Optional[float] = None) -> bool:
        """Retorna True si el semáforo está en período de enfriamiento."""
        self.actualizar_estado(tiempo_actual)
        return self.modo == ModoEstado.COOLDOWN

    def tiempo_restante_fase(self, tiempo_actual: Optional[float] = None) -> float:
        """Retorna los segundos restantes de la fase activa o cooldown, o 0.0 si está en reposo."""
        t = self._obtener_tiempo(tiempo_actual)
        self.actualizar_estado(t)
        
        if self.tiempo_fin_fase is None or self.modo == ModoEstado.REPOSO:
            return 0.0
        return max(0.0, self.tiempo_fin_fase - t)

    def obtener_resumen(self, tiempo_actual: Optional[float] = None) -> Dict[str, Any]:
        """Devuelve un diccionario estructurado con el estado actual del semáforo."""
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
    tiempo_actual: Optional[float] = None
) -> Dict[str, Any]:
    """
    Función envoltorio para procesar un evento de sensor IoT.
    """
    if hay_peaton:
        semaforo.solicitar_cruce(tiempo_actual)
    else:
        semaforo.actualizar_estado(tiempo_actual)
    return semaforo.obtener_resumen(tiempo_actual)
