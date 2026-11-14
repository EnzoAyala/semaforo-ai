/**
 * Puente simulación ↔ API: PIR, pulsador y anuncios de fase del semáforo.
 */
import { useCallback, useEffect, useRef } from 'react';
import { semaforoService } from '../../services/api';
import {
  descripcionModo,
  labelModo,
  modoTieneContador,
  sensorPirActivo,
} from '../../utils/modoLabels';

export function useCrossingBridge({
  ready,
  estado,
  tiempoRestante,
  agentsRef,
  onNotificar,
  onEstado,
}) {
  const triggerFiredRef = useRef(false);
  const prevModoRef = useRef(estado?.modo);

  const requestCrossing = useCallback(async () => {
    if (!sensorPirActivo(estado?.modo)) return;
    if (triggerFiredRef.current) return;
    triggerFiredRef.current = true;
    onNotificar?.('PIR: peatón detectado → inicia ciclo');

    const res = await semaforoService.enviarEventoSensor('pir', 'sim-3d');
    if (!res) {
      triggerFiredRef.current = false;
      onNotificar?.('No se pudo contactar la API del semáforo');
      return;
    }
    if (res.resumen) onEstado?.(res.resumen);
    if (res.solicitud_aceptada) {
      onNotificar?.('Ciclo: AMARILLO 3s → PEATONAL 60s → COOLDOWN 120s');
    } else {
      onNotificar?.(
        `PIR ignorado (${labelModo(res.resumen?.modo || estado?.modo)})`
      );
      window.setTimeout(() => {
        triggerFiredRef.current = false;
      }, 2500);
    }
  }, [estado?.modo, onNotificar, onEstado]);

  useEffect(() => {
    const prev = prevModoRef.current;
    const modo = estado?.modo;
    prevModoRef.current = modo;
    if (!modo || modo === prev) return;

    if (modo === 'TRANSICION_AMARILLO') {
      onNotificar?.('AMARILLO 3s — advertencia vehicular');
      return;
    }
    if (modo === 'FASE_PEATONAL') {
      onNotificar?.('PEATONAL 60s — vehicular ROJO · peatonal VERDE');
      return;
    }
    if (modo === 'COOLDOWN') {
      triggerFiredRef.current = true;
      onNotificar?.(
        `COOLDOWN ${Math.round(estado?.duracion_cooldown || 120)}s — PIR bloqueado`
      );
      return;
    }
    if (modo === 'REPOSO' && prev === 'COOLDOWN') {
      triggerFiredRef.current = false;
      const waiting = agentsRef.current.some(
        (a) => a.phase === 'wait' || a.phase === 'toWait'
      );
      if (waiting) {
        onNotificar?.('REPOSO: PIR reactivado → detecta gente en espera');
        window.setTimeout(() => {
          triggerFiredRef.current = false;
          requestCrossing();
        }, 400);
      } else {
        onNotificar?.('REPOSO: PIR activo, sin peatones → permanece en reposo');
      }
      return;
    }
    if (modo === 'REPOSO') {
      triggerFiredRef.current = false;
    }
  }, [
    estado?.modo,
    estado?.duracion_cooldown,
    onNotificar,
    requestCrossing,
    agentsRef,
  ]);

  useEffect(() => {
    if (!ready) return undefined;
    const id = window.setInterval(() => {
      if (!sensorPirActivo(estado?.modo)) return;
      const waiting = agentsRef.current.some(
        (a) => a.phase === 'wait' || a.phase === 'toWait'
      );
      if (waiting) requestCrossing();
    }, 2800);
    return () => window.clearInterval(id);
  }, [ready, estado?.modo, requestCrossing, agentsRef]);

  const pulsarBoton = useCallback(async () => {
    if (!sensorPirActivo(estado?.modo)) {
      onNotificar?.(
        `Pulsador ignorado — ${descripcionModo(estado?.modo, estado?.duracion_cooldown || 120)}` +
          (modoTieneContador(estado?.modo)
            ? ` (${Math.ceil(tiempoRestante || 0)}s)`
            : '')
      );
      return;
    }
    onNotificar?.('Pulsador peatonal (manual)');
    const res = await semaforoService.enviarEventoSensor('button', 'sim-3d');
    if (!res) {
      onNotificar?.('No se pudo contactar la API');
      return;
    }
    if (res.resumen) onEstado?.(res.resumen);
    if (res.solicitud_aceptada) {
      triggerFiredRef.current = true;
      onNotificar?.('Pulsador OK → AMARILLO 3s → PEATONAL 60s → COOLDOWN 120s');
    } else {
      onNotificar?.(
        `Pulsador rechazado (${labelModo(res.resumen?.modo || estado?.modo)})`
      );
    }
  }, [
    estado?.modo,
    estado?.duracion_cooldown,
    tiempoRestante,
    onNotificar,
    onEstado,
  ]);

  return { triggerFiredRef, requestCrossing, pulsarBoton };
}
