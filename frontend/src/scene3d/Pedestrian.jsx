import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  NORTH_HOUSES,
  SOUTH_HOUSES,
  houseDoor,
} from './Houses';
import { MALL_DOOR, MALL_ENTRANCE } from './Mall';
import {
  publishPedestrian,
  vehicleBlocksCrosswalk,
} from './vehicleRegistry';

const Y = 0.55;
const ARRIVE = 0.2;

const COLORS = [
  '#3b82f6', '#ec4899', '#f97316', '#eab308', '#f43f5e', '#0ea5e9',
  '#14b8a6', '#a855f7', '#84cc16', '#6366f1', '#d946ef', '#22c55e',
  '#fb7185', '#2dd4bf', '#818cf8',
];

function PedestrianBody({ color, animRef }) {
  const leftArm = useRef();
  const rightArm = useRef();
  const leftLeg = useRef();
  const rightLeg = useRef();
  const torso = useRef();

  useFrame(() => {
    const a = animRef.current;
    if (!a) return;
    const swing = a.walking ? Math.sin(a.phase) * 0.55 : Math.sin(a.phase * 0.5) * 0.08;
    const breath = Math.sin(a.phase * 0.35) * 0.015;
    if (leftArm.current) leftArm.current.rotation.x = swing;
    if (rightArm.current) rightArm.current.rotation.x = -swing;
    if (leftLeg.current) leftLeg.current.rotation.x = -swing * 0.9;
    if (rightLeg.current) rightLeg.current.rotation.x = swing * 0.9;
    if (torso.current) torso.current.position.y = 0.55 + breath + (a.walking ? Math.abs(Math.sin(a.phase)) * 0.03 : 0);
  });

  return (
    <group>
      <group ref={torso} position={[0, 0.55, 0]}>
        <mesh castShadow position={[0, 0.15, 0]}>
          <capsuleGeometry args={[0.16, 0.28, 4, 8]} />
          <meshStandardMaterial color={color} roughness={0.55} metalness={0.08} />
        </mesh>
        <mesh castShadow position={[0, 0.52, 0]}>
          <sphereGeometry args={[0.15, 12, 12]} />
          <meshStandardMaterial color="#f0c7a0" roughness={0.65} />
        </mesh>
        <group ref={leftArm} position={[-0.22, 0.22, 0]}>
          <mesh castShadow position={[0, -0.18, 0]}>
            <capsuleGeometry args={[0.05, 0.22, 3, 6]} />
            <meshStandardMaterial color={color} roughness={0.55} />
          </mesh>
        </group>
        <group ref={rightArm} position={[0.22, 0.22, 0]}>
          <mesh castShadow position={[0, -0.18, 0]}>
            <capsuleGeometry args={[0.05, 0.22, 3, 6]} />
            <meshStandardMaterial color={color} roughness={0.55} />
          </mesh>
        </group>
      </group>
      <group ref={leftLeg} position={[-0.09, 0.28, 0]}>
        <mesh castShadow position={[0, -0.18, 0]}>
          <capsuleGeometry args={[0.06, 0.24, 3, 6]} />
          <meshStandardMaterial color="#1e3a5f" roughness={0.7} />
        </mesh>
      </group>
      <group ref={rightLeg} position={[0.09, 0.28, 0]}>
        <mesh castShadow position={[0, -0.18, 0]}>
          <capsuleGeometry args={[0.06, 0.24, 3, 6]} />
          <meshStandardMaterial color="#1e3a5f" roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
}

export function Pedestrian({
  id,
  color = '#3b82f6',
  speed = 1.6,
  route,
  phase,
  crossingAllowed,
  onPhaseEvent,
  resumePos = null,
  resumeCrossStage = 0,
  resumeDoorStage = 0,
  onPose = null,
}) {
  const ref = useRef();
  const phaseRef = useRef(phase);
  const eventSent = useRef(false);
  const pauseUntil = useRef(0);
  const crossStage = useRef(resumeCrossStage || 0);
  const doorStage = useRef(resumeDoorStage || 0);
  const didInit = useRef(false);
  const poseAcc = useRef(0);
  const facing = useRef(new THREE.Quaternion());
  const anim = useRef({ phase: 0, walking: false });
  const tmpDir = useMemo(() => new THREE.Vector3(), []);
  const tmpQuat = useMemo(() => new THREE.Quaternion(), []);
  const forward = useMemo(() => new THREE.Vector3(0, 0, 1), []);
  const startPos = useMemo(() => {
    if (
      Array.isArray(resumePos) &&
      resumePos.length >= 3 &&
      phase !== 'hidden' &&
      phase !== 'exit' &&
      phase !== 'alight'
    ) {
      return [resumePos[0], Y, resumePos[2]];
    }
    return route.homeDoor;
  }, [resumePos, phase, route.homeDoor]);

  const points = useMemo(() => {
    const homeDoor = new THREE.Vector3(...route.homeDoor);
    const curbOut = new THREE.Vector3(...route.curbOut);
    const wait = new THREE.Vector3(...route.wait);
    const mid = new THREE.Vector3(route.wait[0], Y, 0);
    const farCurb = new THREE.Vector3(...route.farCurb);
    const curbDest = new THREE.Vector3(route.targetDoor[0], Y, route.farCurb[2]);
    const targetDoor = new THREE.Vector3(...route.targetDoor);
    const inside = targetDoor.clone();
    if (route.targetKind === 'mall') {
      inside.copy(new THREE.Vector3(...MALL_DOOR));
      inside.z += 1.2;
    } else {
      inside.z += route.dir === 'north' ? -0.6 : 0.6;
    }
    const mallApproach = new THREE.Vector3(...MALL_ENTRANCE);
    return {
      homeDoor,
      curbOut,
      wait,
      mid,
      farCurb,
      curbDest,
      targetDoor,
      inside,
      mallApproach,
    };
  }, [route]);

  useEffect(() => {
    phaseRef.current = phase;
    eventSent.current = false;
    if (!didInit.current) {
      didInit.current = true;
      if (phase !== 'cross') publishPedestrian(id, null);
      return;
    }
    if (phase === 'exit' || phase === 'alight') {
      pauseUntil.current = 0;
      crossStage.current = 0;
      doorStage.current = 0;
    }
    if (phase === 'cross') crossStage.current = 0;
    if (phase === 'toDoor' || phase === 'toMall') doorStage.current = 0;
    if (phase !== 'cross') publishPedestrian(id, null);
  }, [phase, id]);

  useEffect(
    () => () => {
      publishPedestrian(id, null);
    },
    [id]
  );

  useFrame((state, delta) => {
    const mesh = ref.current;
    if (!mesh) return;

    const now = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.05);
    const pos = mesh.position;
    const p = phaseRef.current;

    try {
      if (now < pauseUntil.current) return;

      // Publicar peatones en calzada / fase cross para que autos/bus esperen
      if (p === 'cross' || Math.abs(pos.z) < 7.2) {
        if (p === 'cross' || (mesh.visible && Math.abs(pos.z) < 7.2 && Math.abs(pos.x) < 3.2)) {
          publishPedestrian(id, { id, x: pos.x, z: pos.z });
        }
      } else {
        publishPedestrian(id, null);
      }

      const faceToward = (target) => {
        tmpDir.set(target.x - pos.x, 0, target.z - pos.z);
        if (tmpDir.lengthSq() < 0.0001) return;
        tmpDir.normalize();
        tmpQuat.setFromUnitVectors(forward, tmpDir);
        facing.current.slerp(tmpQuat, Math.min(1, dt * 8));
        mesh.quaternion.copy(facing.current);
      };

      const moveTowards = (target) => {
        tmpDir.set(target.x - pos.x, 0, target.z - pos.z);
        const dist = tmpDir.length();
        if (dist < ARRIVE) {
          pos.x = target.x;
          pos.z = target.z;
          pos.y = Y;
          anim.current.walking = false;
          return true;
        }
        tmpDir.multiplyScalar(1 / dist);
        const step = Math.min(dist, speed * dt);
        pos.x += tmpDir.x * step;
        pos.z += tmpDir.z * step;
        pos.y = Y;
        faceToward(target);
        anim.current.walking = true;
        anim.current.phase += dt * speed * 6.5;
        return false;
      };

      const emit = (event) => {
        if (eventSent.current) return;
        eventSent.current = true;
        onPhaseEvent?.(id, event);
      };

      if (p === 'hidden') {
        pos.copy(points.homeDoor);
        mesh.visible = false;
        anim.current.walking = false;
        publishPedestrian(id, null);
        return;
      }

      if (p === 'enter') {
        mesh.visible = true;
        if (moveTowards(points.inside)) {
          mesh.visible = false;
          emit('entered');
        }
        return;
      }

      mesh.visible = true;

      if (p === 'exit' || p === 'alight') {
        if (pauseUntil.current === 0) {
          pos.copy(points.homeDoor);
          pauseUntil.current = now + (p === 'alight' ? 0.25 : 0.35);
          anim.current.walking = false;
          return;
        }
        if (route.goal === 'mallDirect') {
          if (moveTowards(points.curbOut)) emit('goMall');
        } else if (moveTowards(points.curbOut)) {
          emit('exited');
        }
        return;
      }

      if (p === 'toWait') {
        if (moveTowards(points.wait)) emit('atWait');
        return;
      }

      if (p === 'wait') {
        pos.copy(points.wait);
        faceToward(points.mid);
        anim.current.walking = false;
        anim.current.phase += dt * 2.2;
        publishPedestrian(id, null);
        // En verde peatonal: cruzar ya (los autos deben ceder / despejar)
        if (crossingAllowed) emit('canCross');
        return;
      }

      if (p === 'cross') {
        const onRoad = Math.abs(pos.z) < 7.2;
        // Solo frenar ante un auto muy cerca en el carril; no bloquear toda la cebra
        const lookAhead = pos.clone().lerp(
          crossStage.current === 0 ? points.mid : points.farCurb,
          0.35
        );
        const blocked = vehicleBlocksCrosswalk(lookAhead.x, lookAhead.z, 0.85);
        // Si el verde se apaga y aún no entró a la calzada, se queda en borde
        if (!onRoad && !crossingAllowed) {
          faceToward(points.mid);
          anim.current.walking = false;
          anim.current.phase += dt * 2;
          return;
        }
        if (blocked && !onRoad) {
          faceToward(points.mid);
          anim.current.walking = false;
          anim.current.phase += dt * 2;
          return;
        }
        if (crossStage.current === 0) {
          if (moveTowards(points.mid)) crossStage.current = 1;
          return;
        }
        if (moveTowards(points.farCurb)) {
          publishPedestrian(id, null);
          emit('crossed');
        }
        return;
      }

      if (p === 'toMall') {
        if (doorStage.current === 0) {
          if (moveTowards(points.mallApproach)) doorStage.current = 1;
          return;
        }
        if (moveTowards(points.targetDoor)) emit('atDoor');
        return;
      }

      if (p === 'toDoor') {
        if (route.targetKind === 'mall') {
          if (doorStage.current === 0) {
            if (moveTowards(points.mallApproach)) doorStage.current = 1;
            return;
          }
          if (moveTowards(points.targetDoor)) emit('atDoor');
          return;
        }
        if (doorStage.current === 0) {
          if (moveTowards(points.curbDest)) doorStage.current = 1;
          return;
        }
        if (moveTowards(points.targetDoor)) emit('atDoor');
      }
    } finally {
      if (onPose && p !== 'hidden') {
        poseAcc.current += dt;
        if (poseAcc.current >= 0.9) {
          poseAcc.current = 0;
          onPose(id, {
            pos: [pos.x, pos.y, pos.z],
            crossStage: crossStage.current,
            doorStage: doorStage.current,
          });
        }
      }
    }
  });

  return (
    <group
      ref={ref}
      position={startPos}
      visible={phase !== 'hidden'}
    >
      <PedestrianBody color={color} animRef={anim} />
    </group>
  );
}

function buildRoute(fromSide, homeIdx, targetIdx, laneX, waitDepth = 0, opts = {}) {
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
    const laneX = THREE.MathUtils.clamp((Math.random() - 0.5) * 2.6, -1.4, 1.4);
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
  const laneX = THREE.MathUtils.clamp(
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
    const laneX = THREE.MathUtils.clamp(
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

export { buildRoute };
