/** Rutas, presets y factories de agentes peatonales (sin mesh R3F). */

import {
  NORTH_HOUSES,
  SOUTH_HOUSES,
  houseDoor,
} from '../houseLayout';
import { MALL_DOOR } from '../mallLayout';

const Y = 0.55;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

const COLORS = [
  '#3b82f6', '#ec4899', '#f97316', '#eab308', '#f43f5e', '#0ea5e9',
  '#14b8a6', '#a855f7', '#84cc16', '#6366f1', '#d946ef', '#22c55e',
  '#fb7185', '#2dd4bf', '#818cf8',
];

export function buildRoute(fromSide, homeIdx, targetIdx, laneX, waitDepth = 0, opts = {}) {
  const { targetKind = 'house', goal = 'cross', startPos = null } = opts;
  const homes = fromSide === 'south' ? SOUTH_HOUSES : NORTH_HOUSES;
  const targets = fromSide === 'south' ? NORTH_HOUSES : SOUTH_HOUSES;
  const home = homes[homeIdx % homes.length];
  const target = targets[targetIdx % targets.length];
  const dir = fromSide === 'south' ? 'north' : 'south';

  const homeDoor = startPos || houseDoor(home, fromSide);
  let targetDoor;
  if (targetKind === 'mall') {
    targetDoor = [...MALL_DOOR];
  } else {
    const targetSide = fromSide === 'south' ? 'north' : 'south';
    targetDoor = houseDoor(target, targetSide);
  }

  const curbOutZ = fromSide === 'south' ? 8.8 : -8.8;
  const waitZ =
    fromSide === 'south'
      ? 7.85 + waitDepth * 0.45
      : -7.85 - waitDepth * 0.45;
  const farCurbZ = fromSide === 'south' ? -7.85 : 7.85;

  const farCurb =
    targetKind === 'mall' && fromSide === 'north'
      ? [laneX, Y, 7.85]
      : [laneX, Y, farCurbZ];

  return {
    dir,
    goal,
    targetKind,
    homeDoor,
    curbOut: startPos
      ? [startPos[0], Y, fromSide === 'south' ? 8.8 : -8.8]
      : [homeDoor[0], Y, curbOutZ],
    wait: [laneX, Y, waitZ],
    farCurb,
    targetDoor,
    triggersSensor: fromSide === 'south',
  };
}

export const MAX_PEDESTRIANS = 15;

export const PEDESTRIAN_PRESETS = [
  { id: 'p1', color: '#3b82f6', speed: 1.7, fromSide: 'south', homeIdx: 2, targetIdx: 2, laneX: -0.15, waitDepth: 0, targetKind: 'house' },
  { id: 'p2', color: '#ec4899', speed: 1.5, fromSide: 'south', homeIdx: 1, targetIdx: 3, laneX: 0.55, waitDepth: 0, targetKind: 'house' },
  { id: 'p3', color: '#f97316', speed: 1.45, fromSide: 'south', homeIdx: 0, targetIdx: 1, laneX: 1.15, waitDepth: 1, targetKind: 'mall' },
  { id: 'p4', color: '#eab308', speed: 1.6, fromSide: 'south', homeIdx: 0, targetIdx: 0, laneX: -0.75, waitDepth: 0, targetKind: 'house' },
  { id: 'p5', color: '#f43f5e', speed: 1.4, fromSide: 'north', homeIdx: 1, targetIdx: 1, laneX: 0.2, waitDepth: 1, targetKind: 'mall' },
  { id: 'p6', color: '#0ea5e9', speed: 1.55, fromSide: 'south', homeIdx: 2, targetIdx: 4, laneX: 1.35, waitDepth: 0, targetKind: 'house' },
  { id: 'p7', color: '#14b8a6', speed: 1.65, fromSide: 'north', homeIdx: 1, targetIdx: 1, laneX: -0.5, waitDepth: 0, targetKind: 'house' },
  { id: 'p8', color: '#a855f7', speed: 1.5, fromSide: 'north', homeIdx: 4, targetIdx: 2, laneX: 0.4, waitDepth: 0, targetKind: 'house' },
  { id: 'p9', color: '#84cc16', speed: 1.58, fromSide: 'north', homeIdx: 0, targetIdx: 0, laneX: 1.0, waitDepth: 1, targetKind: 'mall' },
  { id: 'p10', color: '#6366f1', speed: 1.42, fromSide: 'north', homeIdx: 3, targetIdx: 2, laneX: -1.1, waitDepth: 0, targetKind: 'house' },
  { id: 'p11', color: '#d946ef', speed: 1.52, fromSide: 'north', homeIdx: 2, targetIdx: 0, laneX: 0.05, waitDepth: 1, targetKind: 'house' },
  { id: 'p12', color: '#22c55e', speed: 1.48, fromSide: 'south', homeIdx: 1, targetIdx: 3, laneX: -1.35, waitDepth: 1, targetKind: 'mall' },
  { id: 'p13', color: '#fb7185', speed: 1.53, fromSide: 'north', homeIdx: 4, targetIdx: 1, laneX: -0.9, waitDepth: 0, targetKind: 'house' },
  { id: 'p14', color: '#2dd4bf', speed: 1.47, fromSide: 'south', homeIdx: 2, targetIdx: 4, laneX: 0.9, waitDepth: 1, targetKind: 'house' },
  { id: 'p15', color: '#fbbf24', speed: 1.5, fromSide: 'south', homeIdx: 1, targetIdx: 2, laneX: -0.35, waitDepth: 0, targetKind: 'house' },
];

export function makeInitialAgents() {
  return PEDESTRIAN_PRESETS.slice(0, MAX_PEDESTRIANS).map((p) => ({
    ...p,
    phase: 'hidden',
    ephemeral: false,
    route: buildRoute(
      p.fromSide,
      p.homeIdx,
      p.targetIdx,
      p.laneX,
      p.waitDepth ?? 0,
      { targetKind: p.targetKind || 'house', goal: 'cross' }
    ),
    trip: 0,
  }));
}

/** Recorta la lista a 15; prioriza no-efímeros si hay que descartar. */
export function clampAgents(list) {
  if (!Array.isArray(list)) return makeInitialAgents();
  if (list.length <= MAX_PEDESTRIANS) return list;
  const permanent = list.filter((a) => !a.ephemeral);
  const ephemeral = list.filter((a) => a.ephemeral);
  if (permanent.length >= MAX_PEDESTRIANS) {
    return permanent.slice(0, MAX_PEDESTRIANS);
  }
  return [...permanent, ...ephemeral].slice(0, MAX_PEDESTRIANS);
}

export function nextTripRoute(agent) {
  if (agent.route?.targetKind === 'mall' || agent.fromSide === 'mall') {
    const fromSide = 'south';
    const laneX = clamp((Math.random() - 0.5) * 2.6, -1.4, 1.4);
    const waitDepth = Math.random() < 0.4 ? 1 : 0;
    const targetKind = Math.random() < 0.35 ? 'mall' : 'house';
    const homeIdx = Math.floor(Math.random() * SOUTH_HOUSES.length);
    const targetIdx = Math.floor(Math.random() * NORTH_HOUSES.length);
    return {
      ...agent,
      fromSide,
      homeIdx,
      targetIdx,
      laneX,
      waitDepth,
      targetKind,
      trip: agent.trip + 1,
      ephemeral: false,
      route: buildRoute(fromSide, homeIdx, targetIdx, laneX, waitDepth, {
        targetKind,
        goal: 'cross',
        startPos: [...MALL_DOOR],
      }),
      phase: 'hidden',
    };
  }

  const fromSide = agent.route.dir === 'north' ? 'north' : 'south';
  const homeIdx =
    agent.targetIdx %
    (fromSide === 'north' ? NORTH_HOUSES.length : SOUTH_HOUSES.length);
  const targetIdx = agent.homeIdx;
  const laneX = clamp(
    -agent.laneX * 0.7 + (Math.random() - 0.5) * 0.35,
    -1.5,
    1.5
  );
  const waitDepth = Math.random() < 0.45 ? 1 : 0;
  const targetKind =
    fromSide === 'north' && Math.random() < 0.4
      ? 'mall'
      : Math.random() < 0.2
        ? 'mall'
        : 'house';

  return {
    ...agent,
    fromSide,
    homeIdx,
    targetIdx,
    laneX,
    waitDepth,
    targetKind,
    trip: agent.trip + 1,
    route: buildRoute(fromSide, homeIdx, targetIdx, laneX, waitDepth, {
      targetKind,
      goal: 'cross',
    }),
    phase: 'hidden',
  };
}

let busPassengerSeq = 0;

export function makeBusPassengers(at, count) {
  const list = [];
  for (let i = 0; i < count; i += 1) {
    busPassengerSeq += 1;
    const goMall = Math.random() < 0.55;
    const laneX = clamp(
      -1.2 + i * 0.45 + Math.random() * 0.2,
      -1.4,
      1.4
    );
    const start = [
      at[0] + (Math.random() - 0.5) * 0.4,
      Y,
      at[2] + Math.random() * 0.3,
    ];
    const id = `bus-${busPassengerSeq}`;
    list.push({
      id,
      color: COLORS[busPassengerSeq % COLORS.length],
      speed: 1.35 + Math.random() * 0.35,
      fromSide: 'south',
      homeIdx: 0,
      targetIdx: Math.floor(Math.random() * NORTH_HOUSES.length),
      laneX,
      waitDepth: i % 2,
      targetKind: goMall ? 'mall' : 'house',
      trip: 0,
      ephemeral: true,
      phase: 'alight',
      route: buildRoute('south', 0, 1, laneX, i % 2, {
        targetKind: goMall ? 'mall' : 'house',
        goal: goMall ? 'mallDirect' : 'cross',
        startPos: start,
      }),
    });
  }
  return list;
}

