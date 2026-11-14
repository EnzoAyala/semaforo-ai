import { NORTH_HOUSES, SOUTH_HOUSES } from './houseLayout';

function FramedWindow({ position, nightLights, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh>
        <boxGeometry args={[0.48, 0.42, 0.08]} />
        <meshStandardMaterial color="#4b5563" roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0, 0.04]}>
        <boxGeometry args={[0.36, 0.3, 0.04]} />
        <meshStandardMaterial
          color="#9fd3ff"
          emissive="#fbbf24"
          emissiveIntensity={0.05 + nightLights * 1.35}
          roughness={0.35}
          metalness={0.1}
        />
      </mesh>
      <mesh position={[0, 0, 0.06]}>
        <boxGeometry args={[0.02, 0.3, 0.02]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>
      <mesh position={[0, 0, 0.06]}>
        <boxGeometry args={[0.36, 0.02, 0.02]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>
    </group>
  );
}

function House({
  position,
  body = '#d9b48f',
  roof = '#8b3a3a',
  scale = 1,
  face = 'south',
  nightLights = 0,
}) {
  const yaw = face === 'south' ? 0 : Math.PI;

  return (
    <group position={position} scale={scale} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0.95, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.3, 1.9, 1.9]} />
        <meshStandardMaterial color={body} roughness={0.85} metalness={0.05} />
      </mesh>
      <mesh position={[0, 2.2, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.75, 1.25, 4]} />
        <meshStandardMaterial color={roof} roughness={0.75} metalness={0.1} />
      </mesh>

      {/* Chimenea + remate */}
      <mesh position={[0.55, 2.55, -0.2]} castShadow>
        <boxGeometry args={[0.28, 0.55, 0.28]} />
        <meshStandardMaterial color="#6b7280" roughness={0.8} />
      </mesh>
      <mesh position={[0.55, 2.86, -0.2]}>
        <boxGeometry args={[0.34, 0.08, 0.34]} />
        <meshStandardMaterial color="#4b5563" roughness={0.75} />
      </mesh>

      {/* Fachada frontal */}
      <mesh position={[0, 0.55, 0.96]} castShadow>
        <boxGeometry args={[0.52, 0.95, 0.1]} />
        <meshStandardMaterial color="#5c4030" roughness={0.7} metalness={0.08} />
      </mesh>
      <mesh position={[0.16, 0.55, 1.02]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.15, 0.97]}>
        <boxGeometry args={[0.7, 0.08, 0.12]} />
        <meshStandardMaterial color="#4b5563" />
      </mesh>
      <FramedWindow position={[-0.6, 1.2, 0.96]} nightLights={nightLights} />
      <FramedWindow position={[0.6, 1.2, 0.96]} nightLights={nightLights} />
      <mesh position={[0, 0.08, 1.15]} receiveShadow>
        <boxGeometry args={[0.7, 0.12, 0.35]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.85} />
      </mesh>

      {/* Fachada posterior (+ detalle 180°) */}
      <mesh position={[0, 0.55, -0.96]} castShadow>
        <boxGeometry args={[0.42, 0.85, 0.08]} />
        <meshStandardMaterial color="#4a3728" roughness={0.75} metalness={0.08} />
      </mesh>
      <mesh position={[-0.12, 0.55, -1.01]}>
        <sphereGeometry args={[0.035, 8, 8]} />
        <meshStandardMaterial color="#d4d4d8" metalness={0.6} roughness={0.35} />
      </mesh>
      <FramedWindow position={[-0.55, 1.15, -0.96]} nightLights={nightLights} />
      <FramedWindow position={[0.55, 1.15, -0.96]} nightLights={nightLights} />
      <mesh position={[0, 0.08, -1.12]} receiveShadow>
        <boxGeometry args={[0.55, 0.1, 0.28]} />
        <meshStandardMaterial color="#64748b" roughness={0.85} />
      </mesh>

      {/* Laterales */}
      <group position={[1.16, 1.15, 0.25]} rotation={[0, Math.PI / 2, 0]}>
        <FramedWindow position={[0, 0, 0]} nightLights={nightLights} scale={0.85} />
      </group>
      <group position={[-1.16, 1.15, -0.2]} rotation={[0, -Math.PI / 2, 0]}>
        <FramedWindow position={[0, 0, 0]} nightLights={nightLights} scale={0.85} />
      </group>
    </group>
  );
}

export function Houses({ nightLights = 0 }) {
  return (
    <group>
      {NORTH_HOUSES.map((h) => (
        <House
          key={h.id}
          position={h.position}
          body={h.body}
          roof={h.roof}
          scale={h.scale}
          face="south"
          nightLights={nightLights}
        />
      ))}
      {SOUTH_HOUSES.map((h) => (
        <House
          key={h.id}
          position={h.position}
          body={h.body}
          roof={h.roof}
          scale={h.scale}
          face="north"
          nightLights={nightLights}
        />
      ))}
    </group>
  );
}
