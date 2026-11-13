import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  leadGap,
  pedestriansOnCrosswalk,
  publishBucket,
} from './vehicleRegistry';
import { patchSimStore, readSimStore } from './simPersistence';

const MIN_GAP = 4.2;
const TRACK_MIN = -26;
const TRACK_MAX = 26;
const RESPAWN_GAP_S = 2.8;
const ACCEL = 3.8;
const BRAKE = 9.5;
const HALF_LEN = 0.95;
/** Zona de cebra entre líneas de detención ±3.4 */
const ZEBRA_EDGE = 3.4;

export const LANES = {
  eastOuter: -4.4,
  eastInner: -2.0,
  westInner: 2.0,
  westOuter: 4.4,
};

function CarVisual({ color, visualRef }) {
  const root = useRef();
  const wheels = useRef([]);
  const headL = useRef();
  const headR = useRef();
  const brakeL = useRef();
  const brakeR = useRef();

  useFrame(() => {
    const v = visualRef.current;
    if (!v || !root.current) return;
    root.current.rotation.x = v.pitch;
    wheels.current.forEach((w) => {
      if (w) w.rotation.z = v.wheelSpin;
    });
    const head = 0.25 + v.nightLights * 1.5;
    const brake = v.braking ? 1.85 : 0.15 + v.nightLights * 0.35;
    if (headL.current) headL.current.material.emissiveIntensity = head;
    if (headR.current) headR.current.material.emissiveIntensity = head;
    if (brakeL.current) brakeL.current.material.emissiveIntensity = brake;
    if (brakeR.current) brakeR.current.material.emissiveIntensity = brake;
  });

  return (
    <group ref={root}>
      <mesh castShadow position={[0, 0.35, 0]}>
        <boxGeometry args={[1.7, 0.45, 0.9]} />
        <meshStandardMaterial color={color} roughness={0.45} metalness={0.25} />
      </mesh>
      <mesh castShadow position={[0.1, 0.72, 0]}>
        <boxGeometry args={[1.0, 0.4, 0.82]} />
        <meshStandardMaterial color="#dce8f5" transparent opacity={0.82} roughness={0.25} metalness={0.15} />
      </mesh>
      <mesh ref={headL} position={[0.88, 0.35, 0.28]}>
        <boxGeometry args={[0.08, 0.16, 0.2]} />
        <meshStandardMaterial color="#fef08a" emissive="#facc15" emissiveIntensity={0.4} />
      </mesh>
      <mesh ref={headR} position={[0.88, 0.35, -0.28]}>
        <boxGeometry args={[0.08, 0.16, 0.2]} />
        <meshStandardMaterial color="#fef08a" emissive="#facc15" emissiveIntensity={0.4} />
      </mesh>
      <mesh ref={brakeL} position={[-0.88, 0.38, 0.28]}>
        <boxGeometry args={[0.07, 0.14, 0.18]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.2} />
      </mesh>
      <mesh ref={brakeR} position={[-0.88, 0.38, -0.28]}>
        <boxGeometry args={[0.07, 0.14, 0.18]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.2} />
      </mesh>
      {[
        [-0.5, 0.18, 0.5],
        [0.5, 0.18, 0.5],
        [-0.5, 0.18, -0.5],
        [0.5, 0.18, -0.5],
      ].map((p, i) => (
        <mesh
          key={i}
          ref={(el) => {
            wheels.current[i] = el;
          }}
          position={p}
        >
          <group rotation={[Math.PI / 2, 0, 0]}>
            <mesh>
              <cylinderGeometry args={[0.17, 0.17, 0.14, 12]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
            </mesh>
          </group>
        </mesh>
      ))}
    </group>
  );
}

function restoreLane(registryKey, cars) {
  const saved = readSimStore().lanes?.[registryKey];
  if (!saved || !Array.isArray(saved.xs) || saved.xs.length !== cars.length) {
    return null;
  }
  return saved;
}

function LaneFleet({
  cars,
  laneZ,
  direction,
  restrictedLight,
  registryKey,
  nightLights = 0,
}) {
  const restored = useMemo(() => restoreLane(registryKey, cars), [registryKey, cars]);
  const refs = useRef([]);
  const visuals = useRef(cars.map(() => ({ pitch: 0, wheelSpin: 0, braking: false, nightLights })));
  const xs = useRef(restored?.xs ? [...restored.xs] : cars.map((c) => c.startX));
  const speeds = useRef(
    restored?.speeds?.length === cars.length
      ? [...restored.speeds]
      : cars.map(() => 0)
  );
  const active = useRef(
    restored?.active?.length === cars.length
      ? [...restored.active]
      : cars.map(() => true)
  );
  const respawnAt = useRef(cars.map(() => 0));
  const respawnRemaining = useRef(
    restored?.respawnIn?.length === cars.length
      ? [...restored.respawnIn]
      : cars.map(() => 0)
  );
  const clockSynced = useRef(false);
  const saveAcc = useRef(0);
  const stopLine = direction > 0 ? -3.4 : 3.4;

  useFrame((state, delta) => {
    const now = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.05);
    if (!clockSynced.current) {
      clockSynced.current = true;
      for (let i = 0; i < cars.length; i += 1) {
        if (!active.current[i]) {
          respawnAt.current[i] = now + Math.max(0, respawnRemaining.current[i] || 0);
        }
      }
    }
    const next = [...xs.current];
    const pedsOnCross = pedestriansOnCrosswalk();
    const mustYield = restrictedLight || pedsOnCross;

    for (let i = 0; i < cars.length; i += 1) {
      visuals.current[i].nightLights = nightLights;

      if (!active.current[i]) {
        speeds.current[i] = 0;
        if (now >= respawnAt.current[i]) {
          let spawn = direction > 0 ? TRACK_MIN : TRACK_MAX;
          for (let j = 0; j < next.length; j += 1) {
            if (j === i || !active.current[j]) continue;
            if (direction > 0 && next[j] < TRACK_MIN + MIN_GAP * 3) {
              spawn = Math.min(spawn, next[j] - MIN_GAP);
            }
            if (direction < 0 && next[j] > TRACK_MAX - MIN_GAP * 3) {
              spawn = Math.max(spawn, next[j] + MIN_GAP);
            }
          }
          next[i] = spawn;
          active.current[i] = true;
          speeds.current[i] = 0;
        }
        continue;
      }

      const frontX = next[i] + direction * HALF_LEN;
      const rearX = next[i] - direction * HALF_LEN;
      const beforeStop =
        direction > 0 ? frontX <= stopLine + 0.02 : frontX >= stopLine - 0.02;
      // Ya despejó por completo el paso peatonal
      const clearedZebra =
        direction > 0 ? rearX > ZEBRA_EDGE : rearX < -ZEBRA_EDGE;

      const gapAhead = leadGap(
        next[i],
        laneZ,
        direction,
        `${registryKey}-${cars[i].id}`
      );
      const blockedByTraffic = gapAhead < MIN_GAP;

      let target = cars[i].speed;
      if (mustYield && !clearedZebra) {
        if (beforeStop) {
          // Rojo / fase peatonal: frenar ANTES de la línea, nunca en la cebra
          target = 0;
        } else {
          // Ya cruzó la línea por accidente → seguir y despejar el paso
          target = Math.max(cars[i].speed, 3.8);
        }
      }
      // No encimar al de adelante, salvo si estamos despejando la cebra
      if (blockedByTraffic && !(mustYield && !beforeStop && !clearedZebra)) {
        target = 0;
      }

      const rate = target < speeds.current[i] ? BRAKE : ACCEL;
      speeds.current[i] += Math.sign(target - speeds.current[i]) * rate * dt;
      if (Math.abs(target - speeds.current[i]) < 0.05) speeds.current[i] = target;
      speeds.current[i] = Math.max(0, speeds.current[i]);

      next[i] += direction * speeds.current[i] * dt;

      // Clamp: no entrar a la cebra mientras deba ceder y aún no la cruzó
      if (mustYield && beforeStop) {
        if (direction > 0) {
          const maxCenter = stopLine - HALF_LEN;
          if (next[i] > maxCenter) {
            next[i] = maxCenter;
            speeds.current[i] = 0;
          }
        } else {
          const minCenter = stopLine + HALF_LEN;
          if (next[i] < minCenter) {
            next[i] = minCenter;
            speeds.current[i] = 0;
          }
        }
      }

      visuals.current[i].wheelSpin -= direction * speeds.current[i] * dt * 2.4;

      const braking = speeds.current[i] < cars[i].speed * 0.55;
      visuals.current[i].braking = braking || speeds.current[i] < 0.12;
      const desiredPitch = braking
        ? 0.055 * (1 - speeds.current[i] / Math.max(0.1, cars[i].speed))
        : speeds.current[i] > 0.4
          ? -0.022
          : 0;
      visuals.current[i].pitch += (desiredPitch - visuals.current[i].pitch) * Math.min(1, dt * 6);
    }

    const order = next
      .map((x, i) => ({ x, i }))
      .filter((o) => active.current[o.i])
      .sort((a, b) => (direction > 0 ? b.x - a.x : a.x - b.x));

    for (let k = 1; k < order.length; k += 1) {
      const lead = order[k - 1];
      const follow = order[k];
      if (direction > 0) {
        if (next[follow.i] > next[lead.i] - MIN_GAP) {
          next[follow.i] = next[lead.i] - MIN_GAP;
          speeds.current[follow.i] = Math.min(speeds.current[follow.i], speeds.current[lead.i]);
        }
      } else if (next[follow.i] < next[lead.i] + MIN_GAP) {
        next[follow.i] = next[lead.i] + MIN_GAP;
        speeds.current[follow.i] = Math.min(speeds.current[follow.i], speeds.current[lead.i]);
      }
    }

    for (let i = 0; i < cars.length; i += 1) {
      if (!active.current[i]) continue;
      if ((direction > 0 && next[i] > TRACK_MAX) || (direction < 0 && next[i] < TRACK_MIN)) {
        active.current[i] = false;
        respawnAt.current[i] = now + RESPAWN_GAP_S + cars[i].spawnDelay;
        next[i] = direction > 0 ? TRACK_MIN - 4 : TRACK_MAX + 4;
        speeds.current[i] = 0;
      }
    }

    xs.current = next;
    const snap = [];
    next.forEach((x, i) => {
      const g = refs.current[i];
      if (!g) return;
      if (!active.current[i]) {
        g.visible = false;
        return;
      }
      g.visible = true;
      g.position.set(x, 0.22, laneZ);
      g.rotation.y = direction > 0 ? 0 : Math.PI;
      snap.push({
        id: `${registryKey}-${cars[i].id}`,
        x,
        z: laneZ,
        len: 1.9,
        halfW: 0.55,
        dir: direction,
      });
    });
    publishBucket(registryKey, snap);

    saveAcc.current += dt;
    if (saveAcc.current >= 1.25) {
      saveAcc.current = 0;
      const prev = readSimStore().lanes || {};
      patchSimStore({
        lanes: {
          ...prev,
          [registryKey]: {
            xs: [...xs.current],
            speeds: [...speeds.current],
            active: [...active.current],
            respawnIn: respawnAt.current.map((t, i) =>
              active.current[i] ? 0 : Math.max(0, t - now)
            ),
          },
        },
      });
    }
  });

  return (
    <group>
      {cars.map((car, i) => (
        <group
          key={car.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
          position={[xs.current[i] ?? car.startX, 0.22, laneZ]}
        >
          <CarVisual color={car.color} visualRef={{ current: visuals.current[i] }} />
        </group>
      ))}
    </group>
  );
}

export function Cars({
  luzVehicular = 'VERDE',
  luzPeatonal = 'ROJO',
  modo = '',
  nightLights = 0,
}) {
  const restrictedLight =
    luzVehicular === 'ROJO' ||
    luzVehicular === 'AMARILLO' ||
    luzPeatonal === 'VERDE' ||
    modo === 'FASE_PEATONAL' ||
    modo === 'TRANSICION_AMARILLO';

  const eastOuter = useMemo(
    () => [
      { id: 'eo1', speed: 3.1, color: '#ef4444', startX: -24, spawnDelay: 0.2 },
      { id: 'eo2', speed: 2.8, color: '#f97316', startX: -16, spawnDelay: 0.6 },
      { id: 'eo3', speed: 2.9, color: '#eab308', startX: -8, spawnDelay: 1.1 },
    ],
    []
  );
  const eastInner = useMemo(
    () => [
      { id: 'ei1', speed: 3.3, color: '#3b82f6', startX: -22, spawnDelay: 0.4 },
      { id: 'ei2', speed: 3.0, color: '#06b6d4', startX: -13, spawnDelay: 0.9 },
      { id: 'ei3', speed: 2.7, color: '#f472b6', startX: -5, spawnDelay: 1.4 },
    ],
    []
  );
  const westInner = useMemo(
    () => [
      { id: 'wi1', speed: 3.2, color: '#22c55e', startX: 24, spawnDelay: 0.3 },
      { id: 'wi2', speed: 2.85, color: '#a855f7', startX: 15, spawnDelay: 0.8 },
      { id: 'wi3', speed: 2.95, color: '#14b8a6', startX: 7, spawnDelay: 1.3 },
    ],
    []
  );
  const westOuter = useMemo(
    () => [
      { id: 'wo1', speed: 3.0, color: '#84cc16', startX: 22, spawnDelay: 0.5 },
      { id: 'wo2', speed: 2.75, color: '#6366f1', startX: 12, spawnDelay: 1.0 },
      { id: 'wo3', speed: 2.8, color: '#d946ef', startX: 4, spawnDelay: 1.5 },
    ],
    []
  );

  return (
    <group>
      <LaneFleet cars={eastOuter} laneZ={LANES.eastOuter} direction={1} restrictedLight={restrictedLight} registryKey="eo" nightLights={nightLights} />
      <LaneFleet cars={eastInner} laneZ={LANES.eastInner} direction={1} restrictedLight={restrictedLight} registryKey="ei" nightLights={nightLights} />
      <LaneFleet cars={westInner} laneZ={LANES.westInner} direction={-1} restrictedLight={restrictedLight} registryKey="wi" nightLights={nightLights} />
      <LaneFleet cars={westOuter} laneZ={LANES.westOuter} direction={-1} restrictedLight={restrictedLight} registryKey="wo" nightLights={nightLights} />
    </group>
  );
}
