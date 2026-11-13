const ROAD_LEN = 56;
const ROAD_W = 14;
const CURB_H = 0.16;
const SIDEWALK_Z = 8.35;
const SIDEWALK_W = 2.6;

function StopLine({ x }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.028, 0]} receiveShadow>
      <planeGeometry args={[0.35, ROAD_W - 0.4]} />
      <meshStandardMaterial color="#f8fafc" roughness={0.7} metalness={0.05} />
    </mesh>
  );
}

function Sidewalk({ zSign }) {
  const z = SIDEWALK_Z * zSign;
  return (
    <group>
      <mesh position={[0, CURB_H * 0.5, z]} castShadow receiveShadow>
        <boxGeometry args={[ROAD_LEN + 8, CURB_H, SIDEWALK_W]} />
        <meshStandardMaterial color="#9aa3b0" roughness={0.85} metalness={0.08} />
      </mesh>
      {/* Baldosas sutiles */}
      {[-20, -12, -4, 4, 12, 20].map((x) => (
        <mesh
          key={`tile-${zSign}-${x}`}
          position={[x, CURB_H + 0.005, z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[6.5, SIDEWALK_W - 0.25]} />
          <meshStandardMaterial color="#a8b0bc" roughness={0.9} metalness={0.04} />
        </mesh>
      ))}
      {/* Bordillo hacia la calzada */}
      <mesh position={[0, CURB_H * 0.55, z - zSign * (SIDEWALK_W * 0.5 - 0.08)]} castShadow>
        <boxGeometry args={[ROAD_LEN + 8, CURB_H * 1.15, 0.14]} />
        <meshStandardMaterial color="#6b7280" roughness={0.7} metalness={0.15} />
      </mesh>
    </group>
  );
}

function AccessRamp({ zSign }) {
  const zEdge = (ROAD_W * 0.5 - 0.15) * zSign;
  const rampLen = 2.8;
  const rampDepth = 1.9;
  return (
    <group>
      <mesh
        position={[0, CURB_H * 0.35, zEdge + zSign * 0.55]}
        rotation={[zSign * 0.12, 0, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[rampLen, 0.08, rampDepth]} />
        <meshStandardMaterial color="#9aa3b0" roughness={0.8} />
      </mesh>
      {/* Franjas podotáctiles amarillas */}
      {[-0.9, -0.3, 0.3, 0.9].map((ox) => (
        <mesh
          key={`podo-${zSign}-${ox}`}
          position={[ox, CURB_H + 0.01, zEdge + zSign * 0.35]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.35, 1.1]} />
          <meshStandardMaterial
            color="#facc15"
            emissive="#ca8a04"
            emissiveIntensity={0.15}
            roughness={0.6}
          />
        </mesh>
      ))}
    </group>
  );
}

function Bollard({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.9, 10]} />
        <meshStandardMaterial color="#d1d5db" metalness={0.55} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.92, 0]}>
        <sphereGeometry args={[0.09, 10, 10]} />
        <meshStandardMaterial color="#ef4444" roughness={0.4} metalness={0.2} />
      </mesh>
    </group>
  );
}

function StreetLamp({ position, nightLights = 0 }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.18, 0.22, 0.24, 10]} />
        <meshStandardMaterial color="#4b5563" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 2.4, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 4.6, 10]} />
        <meshStandardMaterial color="#374151" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0.45, 4.55, 0]} rotation={[0, 0, -0.6]}>
        <cylinderGeometry args={[0.04, 0.04, 1.1, 8]} />
        <meshStandardMaterial color="#4b5563" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0.95, 4.25, 0]}>
        <sphereGeometry args={[0.22, 12, 12]} />
        <meshStandardMaterial
          color="#fef3c7"
          emissive="#fbbf24"
          emissiveIntensity={0.15 + nightLights * 1.6}
          roughness={0.35}
          transparent
          opacity={0.9}
        />
      </mesh>
      {nightLights > 0.2 && (
        <pointLight
          position={[0.95, 4.1, 0]}
          intensity={nightLights * 2.8}
          distance={14}
          color="#ffd39a"
          castShadow={false}
        />
      )}
    </group>
  );
}

export function Road({ nightLights = 0 }) {
  const bollardZs = [SIDEWALK_Z - SIDEWALK_W * 0.42, -(SIDEWALK_Z - SIDEWALK_W * 0.42)];
  const bollardXs = [-18, -14, -10, -6, 6, 10, 14, 18];

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[ROAD_LEN, ROAD_W]} />
        <meshStandardMaterial color="#3a3f46" roughness={0.92} metalness={0.05} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-36, 0.01, 0]} receiveShadow>
        <planeGeometry args={[20, ROAD_W]} />
        <meshStandardMaterial color="#343940" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[36, 0.01, 0]} receiveShadow>
        <planeGeometry args={[20, ROAD_W]} />
        <meshStandardMaterial color="#343940" roughness={0.95} />
      </mesh>

      <Sidewalk zSign={1} />
      <Sidewalk zSign={-1} />
      <AccessRamp zSign={1} />
      <AccessRamp zSign={-1} />

      {/* Separador central */}
      {[-24, -18, -12, -6, 0, 6, 12, 18, 24].map((x) => (
        <group key={x}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, 0.12]}>
            <planeGeometry args={[2.2, 0.1]} />
            <meshStandardMaterial color="#f0e6a8" />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, -0.12]}>
            <planeGeometry args={[2.2, 0.1]} />
            <meshStandardMaterial color="#f0e6a8" />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, -2.2]}>
            <planeGeometry args={[1.5, 0.08]} />
            <meshStandardMaterial color="#d1d5db" />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, 2.2]}>
            <planeGeometry args={[1.5, 0.08]} />
            <meshStandardMaterial color="#d1d5db" />
          </mesh>
        </group>
      ))}

      {/* Paso peatonal */}
      {[-5.2, -3.5, -1.75, 0, 1.75, 3.5, 5.2].map((z, i) => (
        <mesh
          key={`cross-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.025, z]}
          receiveShadow
        >
          <planeGeometry args={[3.4, 0.55]} />
          <meshStandardMaterial color="#f5f5f5" roughness={0.75} />
        </mesh>
      ))}

      <StopLine x={-3.2} />
      <StopLine x={3.2} />

      {/* Bolardos (libre en cebra ±3 y paradero ~7.2) */}
      {bollardXs.map((x) =>
        bollardZs.map((z) => {
          if (Math.abs(x) < 3.6) return null;
          if (z > 0 && x > 5.2 && x < 9.2) return null;
          return <Bollard key={`b-${x}-${z}`} position={[x, 0, z]} />;
        })
      )}

      {/* Farolas */}
      {[
        [-12, SIDEWALK_Z - 0.2],
        [-5, SIDEWALK_Z - 0.2],
        [5, SIDEWALK_Z - 0.2],
        [12, SIDEWALK_Z - 0.2],
        [-12, -(SIDEWALK_Z - 0.2)],
        [-5, -(SIDEWALK_Z - 0.2)],
        [5, -(SIDEWALK_Z - 0.2)],
        [12, -(SIDEWALK_Z - 0.2)],
      ].map(([x, z], i) => (
        <StreetLamp key={`lamp-${i}`} position={[x, 0, z]} nightLights={nightLights} />
      ))}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, -12]} receiveShadow>
        <planeGeometry args={[70, 6]} />
        <meshStandardMaterial color="#4f7a4a" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 12]} receiveShadow>
        <planeGeometry args={[70, 5]} />
        <meshStandardMaterial color="#4f7a4a" roughness={1} />
      </mesh>
    </group>
  );
}
