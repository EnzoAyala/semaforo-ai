import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LANES } from './Cars';
import {
  leadGap,
  pedestriansOnCrosswalk,
  publishBucket,
} from './vehicleRegistry';
import { patchSimStore, readSimStore } from './simPersistence';

const BUS_Z = LANES.westOuter;
const STOP_X = 7.2;
const START_X = 28;
const END_X = -28;
const CYCLE_GAP_S = 18;
const DWELL_S = 5.2;
const BUS_LEN = 4.6;
const HALF_LEN = BUS_LEN * 0.5;
const STOP_LINE = 3.4;
const ZEBRA_EDGE = 3.4;
const MIN_GAP = 5.2;
const MAX_SPEED = 5.2;
const ACCEL = 3.2;
const BRAKE = 8.5;

function BusVisual({ visualRef, nightLights = 0 }) {
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
    const head = 0.3 + nightLights * 1.4;
    const brake = v.braking ? 1.9 : 0.2 + nightLights * 0.3;
    if (headL.current) headL.current.material.emissiveIntensity = head;
    if (headR.current) headR.current.material.emissiveIntensity = head;
    if (brakeL.current) brakeL.current.material.emissiveIntensity = brake;
    if (brakeR.current) brakeR.current.material.emissiveIntensity = brake;
  });

  return (
    <group ref={root}>
      <mesh castShadow position={[0, 1.15, 0]}>
        <boxGeometry args={[4.4, 1.8, 1.55]} />
        <meshStandardMaterial color="#f59e0b" roughness={0.45} metalness={0.2} />
      </mesh>
      <mesh position={[0.15, 1.55, 0]}>
        <boxGeometry args={[3.5, 0.7, 1.45]} />
        <meshStandardMaterial color="#7dd3fc" transparent opacity={0.65} roughness={0.25} />
      </mesh>
      <mesh position={[-0.2, 0.9, -0.8]}>
        <boxGeometry args={[0.9, 1.3, 0.08]} />
        <meshStandardMaterial color="#0ea5e9" metalness={0.2} roughness={0.4} />
      </mesh>
      {[
        [-1.3, 0.28, 0.8],
        [1.2, 0.28, 0.8],
        [-1.3, 0.28, -0.8],
        [1.2, 0.28, -0.8],
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
              <cylinderGeometry args={[0.28, 0.28, 0.18, 12]} />
              <meshStandardMaterial color="#111827" roughness={0.8} />
            </mesh>
          </group>
        </mesh>
      ))}
      <mesh ref={headL} position={[2.2, 0.9, 0.45]}>
        <boxGeometry args={[0.12, 0.2, 0.28]} />
        <meshStandardMaterial color="#fef08a" emissive="#facc15" emissiveIntensity={0.5} />
      </mesh>
      <mesh ref={headR} position={[2.2, 0.9, -0.45]}>
        <boxGeometry args={[0.12, 0.2, 0.28]} />
        <meshStandardMaterial color="#fef08a" emissive="#facc15" emissiveIntensity={0.5} />
      </mesh>
      <mesh ref={brakeL} position={[-2.2, 0.95, 0.45]}>
        <boxGeometry args={[0.1, 0.18, 0.25]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.25} />
      </mesh>
      <mesh ref={brakeR} position={[-2.2, 0.95, -0.45]}>
        <boxGeometry args={[0.1, 0.18, 0.25]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.25} />
      </mesh>
    </group>
  );
}

export function BusStop() {
  return (
    <group position={[7.2, 0, 6.9]}>
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <boxGeometry args={[4.4, 0.16, 1.7]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.85} />
      </mesh>
      <mesh position={[-1.5, 1.4, 0.45]} castShadow>
        <cylinderGeometry args={[0.06, 0.07, 2.8, 8]} />
        <meshStandardMaterial color="#334155" metalness={0.45} roughness={0.4} />
      </mesh>
      <mesh position={[0, 2.35, 0.2]} castShadow>
        <boxGeometry args={[3.8, 0.1, 1.55]} />
        <meshStandardMaterial color="#1e3a5f" metalness={0.3} roughness={0.45} />
      </mesh>
      <mesh position={[-1.5, 1.6, 0.45]}>
        <boxGeometry args={[0.7, 0.9, 0.08]} />
        <meshStandardMaterial color="#0ea5e9" emissive="#0369a1" emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[0.3, 0.45, 0.4]}>
        <boxGeometry args={[2.2, 0.12, 0.55]} />
        <meshStandardMaterial color="#64748b" roughness={0.7} />
      </mesh>
    </group>
  );
}

export function BusFleet({
  luzVehicular = 'VERDE',
  luzPeatonal = 'ROJO',
  modo = '',
  onPassengersAlight,
  nightLights = 0,
}) {
  const savedBus = useMemo(() => readSimStore().bus, []);
  const ref = useRef();
  const visual = useRef({ pitch: 0, wheelSpin: 0, braking: false });
  const phase = useRef(savedBus?.phase || 'wait');
  const x = useRef(
    typeof savedBus?.x === 'number' ? savedBus.x : START_X
  );
  const speed = useRef(typeof savedBus?.speed === 'number' ? savedBus.speed : 0);
  const dwellLeft = useRef(
    typeof savedBus?.dwellLeft === 'number' ? savedBus.dwellLeft : 0
  );
  const waitUntil = useRef(0);
  const waitRemaining = useRef(
    typeof savedBus?.waitRemaining === 'number'
      ? savedBus.waitRemaining
      : 4
  );
  const alighted = useRef(Boolean(savedBus?.alighted));
  const clockSynced = useRef(false);
  const saveAcc = useRef(0);
  const [visible, setVisible] = useState(
    () => Boolean(savedBus && savedBus.phase && savedBus.phase !== 'wait')
  );

  useEffect(() => {
    // Solo arranque en frío si no había estado guardado
    if (savedBus?.phase) return;
    waitRemaining.current = 4;
    phase.current = 'wait';
    x.current = START_X;
  }, [savedBus?.phase]);

  useFrame((state, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    const now = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.05);
    if (!clockSynced.current) {
      clockSynced.current = true;
      waitUntil.current = now + Math.max(0, waitRemaining.current);
    }
    const dir = -1;

    const restrictedLight =
      luzVehicular === 'ROJO' ||
      luzVehicular === 'AMARILLO' ||
      luzPeatonal === 'VERDE' ||
      modo === 'FASE_PEATONAL' ||
      modo === 'TRANSICION_AMARILLO';
    const pedsOnCross = pedestriansOnCrosswalk();
    const mustYield = restrictedLight || pedsOnCross;

    const publish = (active) => {
      publishBucket(
        'bus',
        active
          ? [{ id: 'bus', x: x.current, z: BUS_Z, len: BUS_LEN, halfW: 0.85, dir }]
          : []
      );
    };

    if (phase.current === 'wait') {
      mesh.visible = false;
      speed.current = 0;
      publish(false);
      if (now >= waitUntil.current) {
        phase.current = 'approach';
        x.current = START_X;
        alighted.current = false;
        mesh.visible = true;
        setVisible(true);
      }
      return;
    }

    mesh.visible = true;
    const gap = leadGap(x.current, BUS_Z, dir, 'bus');
    const blockedByCar = gap < MIN_GAP;

    let targetSpeed = MAX_SPEED;

    if (phase.current === 'approach') {
      if (blockedByCar) targetSpeed = 0;
      if (x.current < STOP_X + 4) targetSpeed = Math.min(targetSpeed, 2.2);
      const rate = targetSpeed < speed.current ? BRAKE : ACCEL;
      speed.current += Math.sign(targetSpeed - speed.current) * rate * dt;
      if (Math.abs(targetSpeed - speed.current) < 0.05) speed.current = targetSpeed;
      speed.current = Math.max(0, speed.current);
      x.current += dir * speed.current * dt;
      if (x.current <= STOP_X) {
        x.current = STOP_X;
        speed.current = 0;
        phase.current = 'dwell';
        dwellLeft.current = DWELL_S;
      }
    } else if (phase.current === 'dwell') {
      x.current = STOP_X;
      speed.current = 0;
      dwellLeft.current -= dt;
      if (!alighted.current && dwellLeft.current < DWELL_S - 0.7) {
        alighted.current = true;
        onPassengersAlight?.({
          at: [STOP_X + 0.6, 0.55, BUS_Z + 1.4],
          count: 3 + Math.floor(Math.random() * 2),
        });
      }
      if (dwellLeft.current <= 0) phase.current = 'leave';
    } else if (phase.current === 'leave') {
      const frontX = x.current + dir * HALF_LEN;
      const rearX = x.current - dir * HALF_LEN;
      const beforeStop = frontX >= STOP_LINE - 0.02;
      const clearedZebra = rearX < -ZEBRA_EDGE;

      if (mustYield && !clearedZebra) {
        if (beforeStop) targetSpeed = 0;
        else targetSpeed = Math.max(MAX_SPEED, 4.2); // ya entró → despejar
      }
      if (blockedByCar && !(mustYield && !beforeStop && !clearedZebra)) {
        targetSpeed = 0;
      }

      const rate = targetSpeed < speed.current ? BRAKE : ACCEL;
      speed.current += Math.sign(targetSpeed - speed.current) * rate * dt;
      if (Math.abs(targetSpeed - speed.current) < 0.05) speed.current = targetSpeed;
      speed.current = Math.max(0, speed.current);
      x.current += dir * speed.current * dt;

      if (mustYield && beforeStop) {
        const minCenter = STOP_LINE + HALF_LEN;
        if (x.current < minCenter) {
          x.current = minCenter;
          speed.current = 0;
        }
      }

      if (x.current <= END_X) {
        phase.current = 'wait';
        waitUntil.current = now + CYCLE_GAP_S;
        setVisible(false);
        publish(false);
        return;
      }
    }

    visual.current.braking = speed.current < MAX_SPEED * 0.5;
    visual.current.wheelSpin -= dir * speed.current * dt * 2.1;
    const desiredPitch = visual.current.braking
      ? 0.04
      : speed.current > 0.5
        ? -0.02
        : 0;
    visual.current.pitch += (desiredPitch - visual.current.pitch) * Math.min(1, dt * 5);

    mesh.position.set(x.current, 0.4, BUS_Z);
    mesh.rotation.y = Math.PI;
    publish(true);

    saveAcc.current += dt;
    if (saveAcc.current >= 1.25) {
      saveAcc.current = 0;
      patchSimStore({
        bus: {
          phase: phase.current,
          x: x.current,
          speed: speed.current,
          dwellLeft: dwellLeft.current,
          waitRemaining:
            phase.current === 'wait'
              ? Math.max(0, waitUntil.current - now)
              : 0,
          alighted: alighted.current,
        },
      });
    }
  });

  return (
    <group
      ref={ref}
      position={[x.current, 0.4, BUS_Z]}
      visible={visible}
    >
      <BusVisual visualRef={visual} nightLights={nightLights} />
    </group>
  );
}
