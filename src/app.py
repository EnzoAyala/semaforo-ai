"""
Script principal de simulación de SemaforoIA.
Demuestra la detección de peatones, fases de luces y enfriamiento (cooldown).
"""

import os
import sys

# Asegurar importación compatible tanto para ejecución directa como modular
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from src.logic import SemaforoInteligente, EstadoLuz, ModoEstado
except ImportError:
    from logic import SemaforoInteligente, EstadoLuz, ModoEstado


def mostrar_banner() -> None:
    print("=" * 65)
    print("🚦  SEMAFORO-IA: SISTEMA INTELIGENTE DE CONTROL PEATONAL IoT 🚦")
    print("=" * 65)
    print("  • Fase Peatonal: 1 minuto (60s) - Luz Roja Vehicular")
    print("  • Cooldown Tránsito: 2 minutos (120s) - Luz Verde Vehicular")
    print("=" * 65 + "\n")


def formatear_estado(resumen: dict) -> str:
    color_veh = "🟢 VERDE" if resumen["luz_vehicular"] == "VERDE" else "🔴 ROJO"
    color_pea = "🟢 VERDE (Paso libre)" if resumen["luz_peatonal"] == "VERDE" else "🔴 ROJO (Esperar)"
    modo_str = resumen["modo"]
    restante = resumen["tiempo_restante_seg"]
    
    return (
        f"[Modo: {modo_str:<13}] | Vehicular: {color_veh:<8} | "
        f"Peatonal: {color_pea:<20} | Restante: {restante:>5.1f}s"
    )


def simular_escenario_acelerado() -> None:
    """
    Simulación determinista acelerada para demostración rápida y pruebas.
    """
    print("--- INICIANDO SIMULACIÓN DE FLUJO COMPLETO ---")
    
    # Instanciamos el semáforo con duraciones estándar (60s rojo peatonal / 120s cooldown)
    semaforo = SemaforoInteligente(duracion_rojo=60.0, duracion_cooldown=120.0, tiempo_inicial=0.0)
    
    t = 0.0
    print(f"[t={t:>5.1f}s] Estado inicial en reposo:")
    print("  ->", formatear_estado(semaforo.obtener_resumen(t)))
    
    # 1. Llega un peatón en t = 5s
    t = 5.0
    print(f"\n[t={t:>5.1f}s] 🚶 SENSOR IoT: Peatón detectado esperando cruzar.")
    aceptado = semaforo.solicitar_cruce(t)
    print(f"  -> ¿Solicitud aceptada?: {aceptado}")
    print("  ->", formatear_estado(semaforo.obtener_resumen(t)))
    
    # 2. Peatón cruza a mitad del tiempo (t = 35s) y otro peatón presiona sensor
    t = 35.0
    print(f"\n[t={t:>5.1f}s] 🚶 SENSOR IoT: Segundo peatón detectado durante la fase peatonal activa.")
    aceptado = semaforo.solicitar_cruce(t)
    print(f"  -> ¿Solicitud aceptada?: {aceptado} (Se mantiene el ciclo en curso sin reiniciar)")
    print("  ->", formatear_estado(semaforo.obtener_resumen(t)))
    
    # 3. Fin de la fase peatonal (t = 65.0s -> 5s + 60s)
    t = 65.0
    print(f"\n[t={t:>5.1f}s] ⏱️ Fin de la fase de cruce (60s cumplidos). Iniciando Cooldown de 120s...")
    print("  ->", formatear_estado(semaforo.obtener_resumen(t)))
    
    # 4. Intento de cruce durante Cooldown (t = 90.0s)
    t = 90.0
    print(f"\n[t={t:>5.1f}s] 🚶 SENSOR IoT: Peatón intenta cruzar durante período de enfriamiento.")
    aceptado = semaforo.solicitar_cruce(t)
    print(f"  -> ¿Solicitud aceptada?: {aceptado} (Rechazada para priorizar fluidez vehicular)")
    print("  ->", formatear_estado(semaforo.obtener_resumen(t)))
    
    # 5. Fin del período de enfriamiento (t = 185.0s -> 65s + 120s)
    t = 185.0
    print(f"\n[t={t:>5.1f}s] ⏱️ Fin del Cooldown (120s cumplidos). Semáforo retorna a REPOSO.")
    print("  ->", formatear_estado(semaforo.obtener_resumen(t)))
    
    # 6. Nueva detección tras terminar el cooldown (t = 190.0s)
    t = 190.0
    print(f"\n[t={t:>5.1f}s] 🚶 SENSOR IoT: Nuevo peatón detectado tras finalizar cooldown.")
    aceptado = semaforo.solicitar_cruce(t)
    print(f"  -> ¿Solicitud aceptada?: {aceptado} (Se activa nueva fase de cruce exitosamente)")
    print("  ->", formatear_estado(semaforo.obtener_resumen(t)))
    
    print("\n" + "=" * 65)
    print("✅  SIMULACIÓN COMPLETADA CON ÉXITO")
    print("=" * 65)


def main() -> None:
    mostrar_banner()
    simular_escenario_acelerado()


if __name__ == "__main__":
    main()