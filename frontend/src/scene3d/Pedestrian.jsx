import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { MALL_DOOR, MALL_ENTRANCE } from './mallLayout';
import {
  publishPedestrian,
  vehicleBlocksCrosswalk,
} from './vehicleRegistry';

const Y = 0.55;
const ARRIVE = 0.2;


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
