export const NORTH_HOUSES = [
  { id: 'n0', position: [-7.5, 0, -10.6], body: '#e7c7a0', roof: '#7a3030', scale: 1 },
  { id: 'n1', position: [-4.2, 0, -11.0], body: '#cfc7b8', roof: '#4a5560', scale: 0.9 },
  { id: 'n2', position: [-0.5, 0, -10.5], body: '#d8b4a0', roof: '#6b3a2a', scale: 1 },
  { id: 'n3', position: [3.4, 0, -10.9], body: '#b9c4b0', roof: '#3f5a45', scale: 1.05 },
  { id: 'n4', position: [7.2, 0, -10.4], body: '#e0c8a8', roof: '#8a3d2f', scale: 0.95 },
];

export const SOUTH_HOUSES = [
  { id: 's0', position: [-7.0, 0, 10.6], body: '#dcc4a8', roof: '#6b3a2a', scale: 1 },
  { id: 's1', position: [-3.6, 0, 10.9], body: '#c8d0c0', roof: '#3f5a45', scale: 0.95 },
  { id: 's2', position: [-0.2, 0, 10.55], body: '#e7c7a0', roof: '#7a3030', scale: 1.05 },
];

export function houseDoor(house, side) {
  const s = house.scale ?? 1;
  const [x, , z] = house.position;
  const doorZ = side === 'north' ? z + 0.95 * s : z - 0.95 * s;
  return [x, 0.55, doorZ];
}

function FramedWindow({ position, nightLights }) {
  return (
    <group position={position}>
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
      {/* Chimenea */}
      <mesh position={[0.55, 2.55, -0.2]} castShadow>
        <boxGeometry args={[0.28, 0.55, 0.28]} />
        <meshStandardMaterial color="#6b7280" roughness={0.8} />
      </mesh>
      {/* Puerta con relieve */}
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
      {/* Escalón */}
      <mesh position={[0, 0.08, 1.15]} receiveShadow>
        <boxGeometry args={[0.7, 0.12, 0.35]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.85} />
      </mesh>
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
