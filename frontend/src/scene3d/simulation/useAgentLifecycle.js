/**
 * Máquina de fases de cada peatón + descenso del bus.
 */
import { useCallback, useEffect } from 'react';
import {
  clampAgents,
  makeBusPassengers,
  MAX_PEDESTRIANS,
  nextTripRoute,
} from '../agents/pedestrianAgents';

export function useAgentLifecycle({
  crossingAllowed,
  modo,
  agentsRef,
  setAgents,
  setAgentPhase,
  scheduleNextWave,
  requestCrossing,
  onNotificar,
}) {
  useEffect(() => {
    if (modo !== 'FASE_PEATONAL') return;
    const waiting = agentsRef.current.filter(
      (a) => a.phase === 'wait' || a.phase === 'toWait'
    );
    if (!waiting.length) return;
    setAgents((prev) =>
      prev.map((a) =>
        a.phase === 'wait' || a.phase === 'toWait' ? { ...a, phase: 'cross' } : a
      )
    );
    onNotificar?.('Verde peatonal: peatones en espera cruzan');
  }, [modo, onNotificar, agentsRef, setAgents]);

  const finishAgentTrip = useCallback(
    (id) => {
      setAgents((prev) => {
        const agent = prev.find((a) => a.id === id);
        if (!agent) return prev;
        if (agent.ephemeral) {
          return prev.filter((a) => a.id !== id);
        }
        return prev.map((a) => (a.id === id ? nextTripRoute(a) : a));
      });
      scheduleNextWave(800);
    },
    [scheduleNextWave, setAgents]
  );

  const onPhaseEvent = useCallback(
    (id, event) => {
      if (event === 'exited') {
        setAgentPhase(id, 'toWait');
        return;
      }
      if (event === 'goMall') {
        setAgentPhase(id, 'toMall');
        return;
      }
      if (event === 'atWait') {
        if (crossingAllowed) {
          setAgentPhase(id, 'cross');
          onNotificar?.('Llegó con verde: cruza');
        } else {
          setAgentPhase(id, 'wait');
          requestCrossing();
        }
        return;
      }
      if (event === 'canCross' && crossingAllowed) {
        setAgents((prev) => {
          const agent = prev.find((a) => a.id === id);
          if (!agent || (agent.phase !== 'wait' && agent.phase !== 'toWait')) {
            return prev;
          }
          return prev.map((a) =>
            a.id === id && (a.phase === 'wait' || a.phase === 'toWait')
              ? { ...a, phase: 'cross' }
              : a
          );
        });
        return;
      }
      if (event === 'crossed') {
        const agent = agentsRef.current.find((a) => a.id === id);
        if (agent?.route?.targetKind === 'mall') {
          setAgentPhase(id, 'toMall');
        } else {
          setAgentPhase(id, 'toDoor');
        }
        return;
      }
      if (event === 'atDoor') {
        setAgentPhase(id, 'enter');
        return;
      }
      if (event === 'entered') {
        finishAgentTrip(id);
      }
    },
    [
      crossingAllowed,
      finishAgentTrip,
      onNotificar,
      requestCrossing,
      setAgentPhase,
      setAgents,
      agentsRef,
    ]
  );

  const onPassengersAlight = useCallback(
    ({ at, count }) => {
      let notice = null;
      setAgents((prev) => {
        const room = Math.max(0, MAX_PEDESTRIANS - prev.length);
        if (room <= 0) {
          notice = `Bus: sin cupo (máx. ${MAX_PEDESTRIANS} peatones)`;
          return prev;
        }
        const n = Math.min(count, room);
        const passengers = makeBusPassengers(at, n);
        notice = `Bus: bajan ${n} — unos al mall, otros a cruzar (máx. ${MAX_PEDESTRIANS})`;
        return clampAgents([...prev, ...passengers]);
      });
      if (notice) {
        queueMicrotask(() => onNotificar?.(notice));
      }
      window.setTimeout(() => {
        requestCrossing();
      }, 1800);
    },
    [onNotificar, requestCrossing, setAgents]
  );

  return { onPhaseEvent, onPassengersAlight, finishAgentTrip };
}
