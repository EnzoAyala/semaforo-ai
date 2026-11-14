export function Mall({ nightLights = 0 }) {
  const glow = 0.2 + nightLights * 1.2;

  return (
    <group position={[11.5, 0, 11.6]}>
      <mesh position={[0, 2.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[9.5, 4.4, 5.2]} />
        <meshStandardMaterial color="#c5d0dc" roughness={0.65} metalness={0.18} />
      </mesh>
      <mesh position={[0, 3.8, -2.62]}>
        <boxGeometry args={[9.6, 0.55, 0.12]} />
        <meshStandardMaterial
          color="#1d4ed8"
          emissive="#1e3a8a"
          emissiveIntensity={0.25 + nightLights * 0.9}
          roughness={0.4}
          metalness={0.3}
        />
      </mesh>
      <mesh position={[0, 4.55, -2.55]}>
        <boxGeometry args={[4.4, 0.75, 0.22]} />
        <meshStandardMaterial color="#0f172a" metalness={0.4} roughness={0.35} />
      </mesh>
      <mesh position={[0, 4.55, -2.7]}>
        <boxGeometry args={[3.7, 0.38, 0.06]} />
        <meshStandardMaterial
          color="#f8fafc"
          emissive="#94a3b8"
          emissiveIntensity={0.2 + nightLights * 0.8}
        />
      </mesh>
      {[-2.3, 0.6].map((x) => (
        <mesh key={x} position={[x, 1.1, -2.62]}>
          <boxGeometry args={[2.1, 2.2, 0.15]} />
          <meshStandardMaterial
            color="#38bdf8"
            transparent
            opacity={0.55}
            emissive="#0284c7"
            emissiveIntensity={0.25 + nightLights * 0.7}
            roughness={0.25}
            metalness={0.2}
          />
        </mesh>
      ))}
      {[-3.8, 2.8].map((x) => (
        <group key={`win-${x}`} position={[x, 2.45, -2.62]}>
          <mesh>
            <boxGeometry args={[1.7, 1.2, 0.1]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
          <mesh position={[0, 0, 0.04]}>
            <boxGeometry args={[1.45, 0.95, 0.06]} />
            <meshStandardMaterial
              color="#7dd3fc"
              emissive="#fbbf24"
              emissiveIntensity={glow * 0.55}
              roughness={0.3}
            />
          </mesh>
        </group>
      ))}
      <mesh position={[-0.8, 2.35, -3.35]} castShadow>
        <boxGeometry args={[5.5, 0.12, 1.4]} />
        <meshStandardMaterial color="#334155" metalness={0.35} roughness={0.45} />
      </mesh>
      {[-2.8, 1.2].map((x) => (
        <mesh key={x} position={[x, 1.1, -3.7]}>
          <cylinderGeometry args={[0.08, 0.08, 2.2, 8]} />
          <meshStandardMaterial color="#64748b" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
      {[-2.2, -0.8, 0.6].map((x) => (
        <mesh key={`spot-${x}`} position={[x, 2.2, -3.5]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial
            color="#fef3c7"
            emissive="#fbbf24"
            emissiveIntensity={0.3 + nightLights * 1.5}
          />
        </mesh>
      ))}
    </group>
  );
}
