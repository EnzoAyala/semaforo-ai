import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';

const EYE_HEIGHT = 1.65;
const MOVE_SPEED = 5.2;
const SPRINT_MULT = 1.65;
const BOUNDS = { minX: -24, maxX: 24, minZ: -11.5, maxZ: 11.5 };
/** Puntos de interacción: pulsadores / PIR (ambos sentidos) */
const INTERACT_POINTS = [
  { id: 'pir-s', x: 0.15, z: 7.55, r: 2.2 },
  { id: 'pir-n', x: -0.15, z: -7.55, r: 2.2 },
  { id: 'btn-sw', x: -2.3, z: 6.3, r: 1.8 },
  { id: 'btn-se', x: 2.3, z: 6.3, r: 1.8 },
  { id: 'btn-nw', x: -2.3, z: -6.3, r: 1.8 },
  { id: 'btn-ne', x: 2.3, z: -6.3, r: 1.8 },
];

function nearInteract(x, z) {
  for (const p of INTERACT_POINTS) {
    const dx = x - p.x;
    const dz = z - p.z;
    if (dx * dx + dz * dz <= p.r * p.r) return p.id;
  }
  return null;
}

/**
 * Controlador 1ª persona: clic = pointer lock, WASD + ratón, Shift = correr, E = interactuar.
 */
export function FirstPersonPlayer({
  enabled = false,
  spawn = [0.4, EYE_HEIGHT, 8.6],
  onLockChange,
  onNearInteract,
  onInteract,
}) {
  const controls = useRef(null);
  const keys = useRef({});
  const vel = useRef(new THREE.Vector3());
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const interactId = useRef(null);
  const { camera } = useThree();
  const spawned = useRef(false);

  useEffect(() => {
    if (!enabled) {
      spawned.current = false;
      try {
        controls.current?.unlock?.();
      } catch {
        // ignore
      }
      onLockChange?.(false);
      onNearInteract?.(null);
      return undefined;
    }

    if (!spawned.current) {
      camera.position.set(spawn[0], spawn[1], spawn[2]);
      camera.rotation.set(0, 0, 0);
      spawned.current = true;
    }

    const onDown = (e) => {
      keys.current[e.code] = true;
      if (e.code === 'KeyE' && interactId.current) {
        e.preventDefault();
        onInteract?.(interactId.current);
      }
    };
    const onUp = (e) => {
      keys.current[e.code] = false;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, [enabled, camera, spawn, onLockChange, onNearInteract, onInteract]);

  useFrame((_, delta) => {
    if (!enabled) return;
    const ctrl = controls.current;
    const locked = Boolean(ctrl?.isLocked);
    const dt = Math.min(delta, 0.05);

    if (!locked) {
      vel.current.set(0, 0, 0);
      return;
    }

    const sprint = keys.current.ShiftLeft || keys.current.ShiftRight;
    const speed = MOVE_SPEED * (sprint ? SPRINT_MULT : 1);

    forward.current.set(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.current.y = 0;
    if (forward.current.lengthSq() > 1e-6) forward.current.normalize();
    right.current.set(1, 0, 0).applyQuaternion(camera.quaternion);
    right.current.y = 0;
    if (right.current.lengthSq() > 1e-6) right.current.normalize();

    const wish = new THREE.Vector3();
    if (keys.current.KeyW || keys.current.ArrowUp) wish.add(forward.current);
    if (keys.current.KeyS || keys.current.ArrowDown) wish.sub(forward.current);
    if (keys.current.KeyA || keys.current.ArrowLeft) wish.sub(right.current);
    if (keys.current.KeyD || keys.current.ArrowRight) wish.add(right.current);

    if (wish.lengthSq() > 1e-6) {
      wish.normalize().multiplyScalar(speed);
      vel.current.lerp(wish, Math.min(1, dt * 12));
    } else {
      vel.current.multiplyScalar(Math.max(0, 1 - dt * 10));
    }

    camera.position.x += vel.current.x * dt;
    camera.position.z += vel.current.z * dt;
    camera.position.y = EYE_HEIGHT;

    camera.position.x = THREE.MathUtils.clamp(
      camera.position.x,
      BOUNDS.minX,
      BOUNDS.maxX
    );
    camera.position.z = THREE.MathUtils.clamp(
      camera.position.z,
      BOUNDS.minZ,
      BOUNDS.maxZ
    );

    const near = nearInteract(camera.position.x, camera.position.z);
    if (near !== interactId.current) {
      interactId.current = near;
      onNearInteract?.(near);
    }
  });

  useEffect(() => {
    const ctrl = controls.current;
    if (!ctrl || !enabled) return undefined;
    const onLock = () => onLockChange?.(true);
    const onUnlock = () => onLockChange?.(false);
    ctrl.addEventListener('lock', onLock);
    ctrl.addEventListener('unlock', onUnlock);
    return () => {
      ctrl.removeEventListener('lock', onLock);
      ctrl.removeEventListener('unlock', onUnlock);
    };
  }, [enabled, onLockChange]);

  if (!enabled) return null;

  return <PointerLockControls ref={controls} />;
}
