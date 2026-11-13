import { useEffect, useRef, useState } from 'react';

/**
 * Cuenta atrás suave sincronizada con el servidor.
 * El WS/HTTP manda snapshots ~1/s; aquí se interpola cada 100ms para que se vea mover.
 */
export function usePhaseCountdown(estado) {
  const [secs, setSecs] = useState(() =>
    Math.max(0, Number(estado?.tiempo_restante_seg) || 0)
  );
  const endAt = useRef(null);
  const lastModo = useRef(estado?.modo);

  useEffect(() => {
    const modo = estado?.modo || 'REPOSO';
    const rem = Math.max(0, Number(estado?.tiempo_restante_seg) || 0);
    lastModo.current = modo;

    if (modo === 'REPOSO' || rem <= 0) {
      endAt.current = null;
      setSecs(0);
      return;
    }

    // Resync con el servidor (permite corrección sin saltos bruscos grandes)
    const proposed = performance.now() + rem * 1000;
    if (endAt.current == null) {
      endAt.current = proposed;
    } else {
      const drift = Math.abs(endAt.current - proposed);
      if (drift > 400) endAt.current = proposed;
    }
  }, [
    estado?.tiempo_restante_seg,
    estado?.modo,
    estado?.tiempo_actual,
    estado?.luz_peatonal,
    estado?.luz_vehicular,
  ]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (endAt.current == null) {
        setSecs((s) => (s === 0 ? s : 0));
        return;
      }
      const left = Math.max(0, (endAt.current - performance.now()) / 1000);
      setSecs((prev) => (Math.abs(prev - left) < 0.05 ? prev : left));
    }, 100);
    return () => window.clearInterval(id);
  }, []);

  return secs;
}

export function formatCountdown(secs) {
  const n = Math.max(0, Math.ceil(secs || 0));
  return n > 99 ? String(n) : String(n).padStart(2, '0');
}
