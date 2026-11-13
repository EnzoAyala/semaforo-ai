import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import { StreetScene } from './StreetScene';
import { StatusBanner } from '../components/StatusBanner';
import { semaforoService } from '../services/api';
import {
  makeInitialAgents,
  makeBusPassengers,
  nextTripRoute,
} from './Pedestrian';
import { AMBIENCE_OPTIONS } from './atmosphere';
import {
  hydrateSimStore,
  patchSimStore,
  readSimStore,
  subscribeSimStore,
} from './simPersistence';

const WAVE_CHECK_MS = 3500;
const STAGGER_MS = 320;
const MIN_READY_FOR_WAVE = 4;

function restoreAgentsFrom(store) {
  const saved = store?.agents;
  if (!Array.isArray(saved) || saved.length < 4) return makeInitialAgents();
  const ok = saved.every(
    (a) => a?.id && a?.phase && a?.route?.homeDoor && Array.isArray(a.route.homeDoor)
  );
  return ok ? saved : makeInitialAgents();
}

function applyStoreToUi(store, setters) {
  const { setAgents, setAuto, setAmbienceMode, posesRef } = setters;
  setAgents(restoreAgentsFrom(store));
  if (typeof store?.auto === 'boolean') setAuto(store.auto);
  if (AMBIENCE_OPTIONS.some((o) => o.id === store?.ambienceMode)) {
    setAmbienceMode(store.ambienceMode);
  }
  const poses = {};
  (store?.agents || []).forEach((a) => {
    if (a?.id && a.pos) {
      poses[a.id] = {
        pos: a.pos,
        crossStage: a.crossStage || 0,
        doorStage: a.doorStage || 0,
      };
    }
  });
  posesRef.current = poses;
}

export function SimulationView({
  estado,
  tiempoRestante = 0,
  mensaje,
  onNotificar,
  onEstado,
}) {
  const [ready, setReady] = useState(false);
  const [simEpoch, setSimEpoch] = useState(0);
  const [agents, setAgents] = useState(() => makeInitialAgents());
  const [auto, setAuto] = useState(true);
  const [ambienceMode, setAmbienceMode] = useState('day');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const viewRef = useRef(null);
  const agentsRef = useRef(agents);
  const posesRef = useRef({});
  const waveLockRef = useRef(false);
  const triggerFiredRef = useRef(false);
  const nextWaveTimer = useRef(null);
  const autoRef = useRef(auto);
  const ambienceRef = useRef(ambienceMode);
  const iniciarRef = useRef(() => false);
  const applyingRemote = useRef(false);

  useEffect(() => {
    let cancelled = false;
    hydrateSimStore().then((store) => {
      if (cancelled) return;
      applyStoreToUi(store, {
        setAgents,
        setAuto,
        setAmbienceMode,
        posesRef,
      });
      setSimEpoch((n) => n + 1);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Otros dispositivos en la red → rehidratar escena
  useEffect(() => {
    if (!ready) return undefined;
    return subscribeSimStore((store) => {
      applyingRemote.current = true;
      applyStoreToUi(store, {
        setAgents,
        setAuto,
        setAmbienceMode,
        posesRef,
      });
      setSimEpoch((n) => n + 1);
      window.setTimeout(() => {
        applyingRemote.current = false;
      }, 800);
      onNotificar?.('Simulación sincronizada desde la red');
    });
  }, [ready, onNotificar]);

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

  // Persistencia continua (local + servidor compartido en la LAN)
  useEffect(() => {
    if (!ready) return undefined;
    const persist = () => {
      if (applyingRemote.current) return;
      const agentsWithPose = agentsRef.current.map((a) => ({
        ...a,
        ...(posesRef.current[a.id] || {}),
      }));
      patchSimStore({
        agents: agentsWithPose,
        auto: autoRef.current,
        ambienceMode: ambienceRef.current,
      });
    };
    const id = window.setInterval(persist, 1000);
    window.addEventListener('beforeunload', persist);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('beforeunload', persist);
      persist();
    };
  }, [ready]);

  const crossingAllowed = estado?.modo === 'FASE_PEATONAL';

  const setAgentPhase = useCallback((id, phase) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === id ? { ...a, phase } : a))
    );
  }, []);

  // Pose sin re-render; se mezcla al persistir / al sync de agents
  const onPose = useCallback((id, pose) => {
    posesRef.current[id] = {
      pos: pose.pos,
      crossStage: pose.crossStage,
      doorStage: pose.doorStage,
    };
  }, []);

  const scheduleNextWave = useCallback((delay = 1200) => {
    if (!autoRef.current) return;
    if (nextWaveTimer.current) window.clearTimeout(nextWaveTimer.current);
    nextWaveTimer.current = window.setTimeout(() => {
      waveLockRef.current = false;
      iniciarRef.current(true);
    }, delay);
  }, []);

  const iniciarOleada = useCallback(
    (fromScheduler = false) => {
      if (estado?.modo && estado.modo !== 'REPOSO' && !fromScheduler) {
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
      triggerFiredRef.current = false;

      const batch = readyAgents.slice(0, Math.min(8, readyAgents.length));
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
    [estado?.modo, onNotificar, scheduleNextWave, setAgentPhase]
  );

  useEffect(() => {
    iniciarRef.current = iniciarOleada;
  }, [iniciarOleada]);

  useEffect(() => {
    if (!ready) return undefined;
    // Si ya hay peatones a mitad de ciclo (tras F5 / red), no reiniciar oleada
    const inProgress = agentsRef.current.some((a) => a.phase !== 'hidden');
    if (inProgress) {
      if (agentsRef.current.some((a) => a.phase === 'wait' || a.phase === 'cross')) {
        triggerFiredRef.current = true;
      }
      return undefined;
    }
    const t = window.setTimeout(() => {
      if (autoRef.current) iniciarRef.current();
    }, 1400);
    return () => {
      window.clearTimeout(t);
      if (nextWaveTimer.current) window.clearTimeout(nextWaveTimer.current);
    };
  }, [ready]);

  useEffect(() => {
    if (!ready || !auto) return undefined;
    const id = window.setInterval(() => {
      if (
        (estado?.modo === 'REPOSO' || !estado?.modo) &&
        agentsRef.current.filter((a) => a.phase === 'hidden' && !a.ephemeral)
          .length >= MIN_READY_FOR_WAVE
      ) {
        iniciarRef.current(true);
      }
    }, WAVE_CHECK_MS);
    return () => window.clearInterval(id);
  }, [ready, auto, estado?.modo]);

  // Al volver a REPOSO se puede volver a pedir cruce (antes quedaba bloqueado)
  useEffect(() => {
    if (estado?.modo === 'REPOSO') {
      triggerFiredRef.current = false;
    }
  }, [estado?.modo]);

  const requestCrossing = useCallback(async () => {
    if (triggerFiredRef.current) return;
    triggerFiredRef.current = true;
    onNotificar?.('Sensor PIR: peatones esperando');

    const res = await semaforoService.enviarEventoSensor('pir', 'sim-3d');
    if (!res) {
      triggerFiredRef.current = false;
      onNotificar?.('No se pudo contactar la API del semáforo');
      return;
    }
    if (res.resumen) onEstado?.(res.resumen);
    if (res.solicitud_aceptada) {
      onNotificar?.('Cruce aceptado → amarillo → peatonal → cooldown');
    } else {
      onNotificar?.(
        `Esperan luz (${res.resumen?.modo || estado?.modo || 'ocupado'})`
      );
      // Reintentar cuando termine la fase ocupada
      window.setTimeout(() => {
        triggerFiredRef.current = false;
      }, 2500);
    }
  }, [estado?.modo, onNotificar, onEstado]);

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
    [scheduleNextWave]
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
        setAgentPhase(id, 'wait');
        requestCrossing();
        return;
      }
      if (event === 'canCross' && crossingAllowed) {
        setAgents((prev) => {
          const agent = prev.find((a) => a.id === id);
          if (!agent || agent.phase !== 'wait') return prev;
          const anyAlready = prev.some((a) => a.phase === 'cross');
          if (!anyAlready) {
            onNotificar?.('Verde peatonal: el grupo cruza (cebra libre)');
          }
          return prev.map((a) =>
            a.id === id && a.phase === 'wait' ? { ...a, phase: 'cross' } : a
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
    [crossingAllowed, finishAgentTrip, onNotificar, requestCrossing, setAgentPhase]
  );

  const onPassengersAlight = useCallback(
    ({ at, count }) => {
      const passengers = makeBusPassengers(at, count);
      onNotificar?.(`Bus: bajan ${count} — unos al mall, otros a cruzar`);
      setAgents((prev) => [...prev, ...passengers]);
      window.setTimeout(() => {
        requestCrossing();
      }, 1800);
    },
    [onNotificar, requestCrossing]
  );

  const pulsarBoton = async () => {
    onNotificar?.('Pulsador peatonal (manual)');
    const res = await semaforoService.enviarEventoSensor('button', 'sim-3d');
    if (!res) {
      onNotificar?.('No se pudo contactar la API');
      return;
    }
    if (res.resumen) onEstado?.(res.resumen);
    if (res.solicitud_aceptada) {
      triggerFiredRef.current = true;
      onNotificar?.('Pulsador aceptado → secuencia del semáforo');
    } else {
      onNotificar?.(
        `Pulsador rechazado (${res.resumen?.modo || 'activo'})`
      );
    }
  };

  const readyCount = agents.filter(
    (a) => a.phase === 'hidden' && !a.ephemeral
  ).length;

  useEffect(() => {
    const onFsChange = () => {
      const el = viewRef.current;
      const active =
        document.fullscreenElement === el ||
        document.webkitFullscreenElement === el;
      setIsFullscreen(Boolean(active));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = viewRef.current;
    if (!el) return;
    try {
      const active =
        document.fullscreenElement === el ||
        document.webkitFullscreenElement === el;
      if (active) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      } else if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      }
    } catch {
      onNotificar?.('No se pudo activar pantalla completa');
    }
  }, [onNotificar]);

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
            <strong>{estado?.modo || '—'}</strong>
            {tiempoRestante > 0.05 ? (
              <>
                {' · '}
                <strong className="sim3d-timer">
                  {Math.ceil(tiempoRestante).toString().padStart(2, '0')}s
                </strong>
              </>
            ) : null}
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
          key={simEpoch}
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
