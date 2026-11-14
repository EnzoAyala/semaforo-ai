/**
 * Centro comercial detallado en 4 caras (vista 360°).
 */
export function Mall({ nightLights = 0 }) {
  const glow = 0.2 + nightLights * 1.2;
  const stripeEmissive = 0.25 + nightLights * 0.9;

  const blueStripe = (pos, size) => (
    <mesh position={pos}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color="#1d4ed8"
        emissive="#1e3a8a"
        emissiveIntensity={stripeEmissive}
        roughness={0.4}
        metalness={0.3}
      />
    </mesh>
  );

  const storefrontGlass = (x) => (
    <mesh key={`glass-${x}`} position={[x, 1.1, -2.62]}>
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
  );

  const framedWin = (key, pos) => (
    <group key={key} position={pos}>
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
  );

  return (
    <group position={[11.5, 0, 11.6]}>
      {/* Cuerpo */}
      <mesh position={[0, 2.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[9.5, 4.4, 5.2]} />
        <meshStandardMaterial color="#c5d0dc" roughness={0.65} metalness={0.18} />
      </mesh>

      {/* Franja azul perimetral superior (4 caras) */}
      {blueStripe([0, 3.8, -2.62], [9.6, 0.55, 0.12])}
      {blueStripe([0, 3.8, 2.62], [9.6, 0.55, 0.12])}
      {blueStripe([4.76, 3.8, 0], [0.12, 0.55, 5.1])}
      {blueStripe([-4.76, 3.8, 0], [0.12, 0.55, 5.1])}

      {/* Letrero frontal */}
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

      {/* Fachada frontal (-Z): vitrinas + ventanas */}
      {[-2.3, 0.6].map(storefrontGlass)}
      {framedWin('fw-f1', [-3.8, 2.45, -2.62])}
      {framedWin('fw-f2', [2.8, 2.45, -2.62])}

      {/* Alero / marquesina frontal */}
      <mesh position={[-0.8, 2.35, -3.35]} castShadow>
        <boxGeometry args={[5.5, 0.12, 1.4]} />
        <meshStandardMaterial color="#334155" metalness={0.35} roughness={0.45} />
      </mesh>
      {[-2.8, 1.2].map((x) => (
        <mesh key={`col-${x}`} position={[x, 1.1, -3.7]}>
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

      {/* Fachada posterior (+Z): alero, puertas de servicio, ventanas altas */}
      <mesh position={[0, 2.5, 2.95]} castShadow>
        <boxGeometry args={[7.2, 0.1, 1.1]} />
        <meshStandardMaterial color="#475569" metalness={0.3} roughness={0.5} />
      </mesh>
      {[-2.4, 0, 2.4].map((x) => (
        <mesh key={`svc-${x}`} position={[x, 1.05, 2.66]} castShadow>
          <boxGeometry args={[1.55, 2.1, 0.12]} />
          <meshStandardMaterial color="#64748b" metalness={0.45} roughness={0.4} />
        </mesh>
      ))}
      {[-2.4, 0, 2.4].map((x) => (
        <mesh key={`knob-${x}`} position={[x + 0.55, 1.05, 2.74]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      {framedWin('fw-b1', [-3.2, 2.85, 2.62])}
      {framedWin('fw-b2', [3.2, 2.85, 2.62])}
      {[-1.2, 1.2].map((x) => (
        <mesh key={`high-${x}`} position={[x, 3.15, 2.62]}>
          <boxGeometry args={[1.4, 0.7, 0.08]} />
          <meshStandardMaterial
            color="#67e8f9"
            transparent
            opacity={0.55}
            emissive="#0891b2"
            emissiveIntensity={0.2 + nightLights * 0.6}
            roughness={0.25}
          />
        </mesh>
      ))}

      {/* Laterales: ventanas altas */}
      {[-1.5, 1.5].map((z) => (
        <group key={`side-r-${z}`}>
          {framedWin(`fw-r-${z}`, [4.78, 2.4, z])}
        </group>
      ))}
      {[-1.5, 1.5].map((z) => (
        <group key={`side-l-${z}`}>
          <group position={[-4.78, 2.4, z]} rotation={[0, Math.PI, 0]}>
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
        </group>
      ))}

      {/* Azotea: AC + tragaluces */}
      {[
        [-2.6, 4.55, -0.8],
        [2.2, 4.55, 0.6],
        [-0.4, 4.55, 1.2],
      ].map(([x, y, z], i) => (
        <group key={`ac-${i}`} position={[x, y, z]}>
          <mesh castShadow>
            <boxGeometry args={[1.1, 0.45, 0.85]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.5} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.28, 0]}>
            <boxGeometry args={[0.7, 0.12, 0.55]} />
            <meshStandardMaterial color="#64748b" metalness={0.55} roughness={0.4} />
          </mesh>
        </group>
      ))}
      {[
        [-1.8, 4.42, 0.3],
        [1.4, 4.42, -1.0],
        [0.2, 4.42, -0.2],
      ].map(([x, y, z], i) => (
        <mesh key={`sky-${i}`} position={[x, y, z]}>
          <boxGeometry args={[1.2, 0.08, 0.9]} />
          <meshStandardMaterial
            color="#7dd3fc"
            transparent
            opacity={0.45}
            emissive="#38bdf8"
            emissiveIntensity={0.15 + nightLights * 0.5}
            roughness={0.2}
            metalness={0.15}
          />
        </mesh>
      ))}
    </group>
  );
}
