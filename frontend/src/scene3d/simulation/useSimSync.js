/**
 * Carga inicial + sync LAN del store 3D y persistencia periódica.
 */
import { useEffect, useRef } from 'react';
import {
  hydrateSimStore,
  patchSimStore,
  subscribeSimStore,
} from '../persistence/simPersistence';
import { applyStoreToUi } from './storeSync';

export function useSimSync({
  ready,
  setReady,
  setAgents,
  setAuto,
  setAmbienceMode,
  posesRef,
  agentsRef,
  autoRef,
  ambienceRef,
  onNotificar,
}) {
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
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [posesRef, setAgents, setAmbienceMode, setAuto, setReady]);

  useEffect(() => {
    if (!ready) return undefined;
    return subscribeSimStore((store) => {
      // Actualizar estado sin remount del Canvas (evita spam THREE.Clock)
      applyingRemote.current = true;
      applyStoreToUi(store, {
        setAgents,
        setAuto,
        setAmbienceMode,
        posesRef,
      });
      window.setTimeout(() => {
        applyingRemote.current = false;
      }, 800);
      onNotificar?.('Simulación sincronizada desde la red');
    });
  }, [
    ready,
    onNotificar,
    posesRef,
    setAgents,
    setAmbienceMode,
    setAuto,
  ]);

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
  }, [ready, agentsRef, ambienceRef, autoRef, posesRef]);

  return { applyingRemote };
}
