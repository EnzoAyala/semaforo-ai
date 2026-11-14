/**
 * Orquestador UI de la simulación 3D.
 * La lógica vive en ./simulation/* (sync, oleadas, PIR, fases).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import { StreetScene } from './StreetScene';
import { StatusBanner } from '../components/layout/StatusBanner';
import { makeInitialAgents } from './agents/pedestrianAgents';
import { AMBIENCE_OPTIONS } from './atmosphere';
import {
  labelModo,
  modoTieneContador,
  sensorPirActivo,
} from '../utils/modoLabels';
import { useAgentLifecycle } from './simulation/useAgentLifecycle';
import { useCrossingBridge } from './simulation/useCrossingBridge';
import { useFullscreen } from './simulation/useFullscreen';
import { useSimSync } from './simulation/useSimSync';
import { useWaveScheduler } from './simulation/useWaveScheduler';

export function SimulationView({
  estado,
  tiempoRestante = 0,
  mensaje,
  onNotificar,
  onEstado,
}) {
  const [ready, setReady] = useState(false);
  const [agents, setAgents] = useState(() => makeInitialAgents());
  const [auto, setAuto] = useState(true);
  const [ambienceMode, setAmbienceMode] = useState('day');

  const viewRef = useRef(null);
  const agentsRef = useRef(agents);
  const posesRef = useRef({});
  const autoRef = useRef(auto);
  const ambienceRef = useRef(ambienceMode);

  // Evita setState en App durante el render de SimulationView
  const notify = useCallback(
    (msg) => {
      if (!msg) return;
      queueMicrotask(() => onNotificar?.(msg));
    },
    [onNotificar]
  );

  useEffect(() => {
    agentsRef.current = agents.map((a) => ({
      ...a,
      ...(posesRef.current[a.id] || {}),
    }));
  }, [agents]);

  useEffect(() => {
    autoRef.current = auto;
  }, [auto]);

  useEffect(() => {
    ambienceRef.current = ambienceMode;
  }, [ambienceMode]);

  useSimSync({
    ready,
    setReady,
    setAgents,
    setAuto,
    setAmbienceMode,
    posesRef,
    agentsRef,
    autoRef,
    ambienceRef,
    onNotificar: notify,
  });

  const setAgentPhase = useCallback((id, phase) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === id ? { ...a, phase } : a))
    );
  }, []);

  const onPose = useCallback((id, pose) => {
    posesRef.current[id] = {
      pos: pose.pos,
      crossStage: pose.crossStage,
      doorStage: pose.doorStage,
    };
  }, []);

  const { triggerFiredRef, requestCrossing, pulsarBoton } = useCrossingBridge({
    ready,
    estado,
    tiempoRestante,
    agentsRef,
    onNotificar: notify,
    onEstado,
  });

  const { scheduleNextWave, iniciarOleada } = useWaveScheduler({
    ready,
    auto,
    modo: estado?.modo,
    agentsRef,
    autoRef,
    triggerFiredRef,
    setAgentPhase,
    onNotificar: notify,
  });

  const crossingAllowed = estado?.modo === 'FASE_PEATONAL';

  const { onPhaseEvent, onPassengersAlight } = useAgentLifecycle({
    crossingAllowed,
    modo: estado?.modo,
    agentsRef,
    setAgents,
    setAgentPhase,
    scheduleNextWave,
    requestCrossing,
    onNotificar: notify,
  });

  const { isFullscreen, toggleFullscreen } = useFullscreen(viewRef, notify);

  const readyCount = agents.filter(
    (a) => a.phase === 'hidden' && !a.ephemeral
  ).length;

  return (
    <section
      ref={viewRef}
      className={`sim3d-view${isFullscreen ? ' is-fullscreen' : ''}`}
    >
      <div className="sim3d-toolbar">
        <div>
          <h2>Cruce peatonal IoT</h2>
          <p>
            Flujo continuo · bus · mall · Modo:{' '}
            <strong>{labelModo(estado?.modo)}</strong>
            {modoTieneContador(estado?.modo) && tiempoRestante > 0.05 ? (
              <>
                {' · '}
                <strong className="sim3d-timer">
                  {Math.ceil(tiempoRestante).toString().padStart(2, '0')}s
                </strong>
              </>
            ) : null}
            {' · PIR '}
            {sensorPirActivo(estado?.modo) ? 'activo' : 'bloqueado'}
            {auto ? ' · AUTO ON' : ' · AUTO OFF'}
          </p>
        </div>
        <div className="sim3d-actions">
          <label className="sim3d-ambience">
            <span>Ambiente</span>
            <select
              value={ambienceMode}
              onChange={(e) => setAmbienceMode(e.target.value)}
            >
              {AMBIENCE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={`btn ${auto ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setAuto((v) => !v)}
          >
            {auto ? 'Auto: ON' : 'Auto: OFF'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => iniciarOleada()}
            disabled={readyCount < 2}
          >
            Oleada ahora
          </button>
          <button type="button" className="btn btn-secondary" onClick={pulsarBoton}>
            Pulsador
          </button>
          <button
            type="button"
            className="btn btn-secondary sim3d-fs-btn"
            onClick={toggleFullscreen}
            title={
              isFullscreen
                ? 'Salir de pantalla completa (Esc)'
                : 'Pantalla completa'
            }
            aria-label={
              isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'
            }
          >
            {isFullscreen ? (
              <Minimize size={18} strokeWidth={2.25} aria-hidden />
            ) : (
              <Maximize size={18} strokeWidth={2.25} aria-hidden />
            )}
          </button>
        </div>
      </div>

      {ready ? (
        <StreetScene
          estado={estado}
          tiempoRestante={tiempoRestante}
          agents={agents}
          onPhaseEvent={onPhaseEvent}
          onPose={onPose}
          onPassengersAlight={onPassengersAlight}
          ambienceMode={ambienceMode}
        />
      ) : (
        <div className="sim3d-canvas sim3d-loading">
          Sincronizando simulación con la red…
        </div>
      )}

      <StatusBanner mensaje={mensaje} />
      <p className="sim3d-hint">
        Escena compartida en la LAN · F5 y otros dispositivos retoman el mismo
        estado vía API/WebSocket.
      </p>
    </section>
  );
}
