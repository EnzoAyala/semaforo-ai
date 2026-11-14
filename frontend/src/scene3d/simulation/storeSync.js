/** Hidratación UI desde el store compartido de simulación. */

import {
  makeInitialAgents,
  clampAgents,
} from '../agents/pedestrianAgents';
import { AMBIENCE_OPTIONS } from '../atmosphere';

export function restoreAgentsFrom(store) {
  const saved = store?.agents;
  if (!Array.isArray(saved) || saved.length < 4) return makeInitialAgents();
  const ok = saved.every(
    (a) => a?.id && a?.phase && a?.route?.homeDoor && Array.isArray(a.route.homeDoor)
  );
  return ok ? clampAgents(saved) : makeInitialAgents();
}

export function applyStoreToUi(store, setters) {
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
