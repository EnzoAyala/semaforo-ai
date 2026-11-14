/**
 * Oleadas automáticas de peatones (scheduler + lock).
 */
import { useCallback, useEffect, useRef } from 'react';
import {
  MIN_READY_FOR_WAVE,
  STAGGER_MS,
  WAVE_CHECK_MS,
} from './constants';

export function useWaveScheduler({
  ready,
  auto,
  modo,
  agentsRef,
  autoRef,
  triggerFiredRef,
  setAgentPhase,
  onNotificar,
}) {
  const waveLockRef = useRef(false);
  const nextWaveTimer = useRef(null);
  const iniciarRef = useRef(() => false);

  const scheduleNextWave = useCallback((delay = 1200) => {
    if (!autoRef.current) return;
    if (nextWaveTimer.current) window.clearTimeout(nextWaveTimer.current);
    nextWaveTimer.current = window.setTimeout(() => {
      waveLockRef.current = false;
      iniciarRef.current(true);
    }, delay);
  }, [autoRef]);

  const iniciarOleada = useCallback(
    (fromScheduler = false) => {
      if (modo && modo !== 'REPOSO' && !fromScheduler) {
        scheduleNextWave(2500);
        return false;
      }

      const current = agentsRef.current;
      const readyAgents = current.filter(
        (a) => a.phase === 'hidden' && !a.ephemeral
      );
      if (readyAgents.length < MIN_READY_FOR_WAVE) {
        if (autoRef.current) scheduleNextWave(WAVE_CHECK_MS);
        return false;
      }

      if (waveLockRef.current) return false;
      waveLockRef.current = true;
      if (triggerFiredRef) triggerFiredRef.current = false;

      const batch = readyAgents.slice(0, Math.min(6, readyAgents.length));
      onNotificar?.(
        `Nueva oleada: ${batch.length} personas hacia el cruce / mall`
      );

      batch.forEach((a, i) => {
        window.setTimeout(() => {
          setAgentPhase(a.id, 'exit');
        }, 120 + i * STAGGER_MS);
      });

      window.setTimeout(
        () => {
          waveLockRef.current = false;
          if (autoRef.current) scheduleNextWave(WAVE_CHECK_MS + 1200);
        },
        120 + batch.length * STAGGER_MS + 800
      );

      return true;
    },
    [
      modo,
      onNotificar,
      scheduleNextWave,
      setAgentPhase,
      agentsRef,
      autoRef,
      triggerFiredRef,
    ]
  );

  useEffect(() => {
    iniciarRef.current = iniciarOleada;
  }, [iniciarOleada]);

  useEffect(() => {
    if (!ready) return undefined;
    const inProgress = agentsRef.current.some((a) => a.phase !== 'hidden');
    if (inProgress) return undefined;
    const t = window.setTimeout(() => {
      if (autoRef.current) iniciarRef.current();
    }, 1400);
    return () => {
      window.clearTimeout(t);
      if (nextWaveTimer.current) window.clearTimeout(nextWaveTimer.current);
    };
  }, [ready, agentsRef, autoRef]);

  useEffect(() => {
    if (!ready || !auto) return undefined;
    const id = window.setInterval(() => {
      if (
        (modo === 'REPOSO' || !modo) &&
        agentsRef.current.filter((a) => a.phase === 'hidden' && !a.ephemeral)
          .length >= MIN_READY_FOR_WAVE
      ) {
        iniciarRef.current(true);
      }
    }, WAVE_CHECK_MS);
    return () => window.clearInterval(id);
  }, [ready, auto, modo, agentsRef]);

  return {
    waveLockRef,
    scheduleNextWave,
    iniciarOleada,
    iniciarRef,
  };
}
