/**
 * Suelo amplio, skyline 360°, cerros y nubes translúcidas.
 */

function PolyCloud({ position, scale = 1, color = '#f4f8fc', opacity = 0.36 }) {
  const puffs = [
    [0, 0, 0, 1],
    [0.95, 0.12, 0.15, 0.8],
    [-0.9, 0.08, -0.12, 0.75],
    [0.3, 0.42, -0.3, 0.68],
    [-0.4, 0.38, 0.35, 0.62],
    [1.5, -0.05, 0, 0.58],
  ];
  return (
    <group position={position} scale={scale}>
      {puffs.map(([x, y, z, s], i) => (
        <mesh key={i} position={[x, y, z]} scale={s} renderOrder={2}>
          <sphereGeometry args={[1.15, 12, 10]} />
          <meshStandardMaterial
            color={color}
            transparent
            opacity={opacity}
            depthWrite={false}
            roughness={1}
            metalness={0}
            fog={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function WindowGrid({ width, height, cols, rows, nightLights }) {
  const cells = [];
  const cw = width / cols;
  const ch = height / rows;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const lit = (r + c) % 3 !== 0;
      cells.push(
        <mesh
          key={`${r}-${c}`}
          position={[
            -width * 0.5 + cw * (c + 0.5),
            -height * 0.5 + ch * (r + 0.5),
            0.02,
          ]}
        >
          <planeGeometry args={[cw * 0.62, ch * 0.55]} />
          <meshStandardMaterial
            color={lit ? '#fde68a' : '#1e293b'}
            emissive={lit ? '#fbbf24' : '#000000'}
            emissiveIntensity={lit ? 0.18 + nightLights * 1.15 : 0}
            roughness={0.45}
          />
        </mesh>
      );
    }
  }
  return <group>{cells}</group>;
}

function Skyscraper({ position, size, color, accent = '#334155', nightLights }) {
  const [w, h, d] = size;
  const cols = Math.max(3, Math.floor(w));
  const rows = Math.max(4, Math.floor(h / 1.35));
  const faces = [
    [0, 0, d * 0.5 + 0.02, 0],
    [0, 0, -d * 0.5 - 0.02, Math.PI],
    [w * 0.5 + 0.02, 0, 0, Math.PI / 2],
    [-w * 0.5 - 0.02, 0, 0, -Math.PI / 2],
  ];

  return (
    <group position={position}>
      <mesh position={[0, h * 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={color}
          roughness={0.62}
          metalness={0.22}
        />
      </mesh>
      {/* Marco / cornisa de azotea */}
      <mesh position={[0, h + 0.12, 0]}>
        <boxGeometry args={[w * 0.92, 0.28, d * 0.92]} />
        <meshStandardMaterial color={accent} metalness={0.35} roughness={0.45} />
      </mesh>
      <mesh position={[0, h + 0.38, 0]}>
        <boxGeometry args={[w * 0.55, 0.35, d * 0.4]} />
        <meshStandardMaterial color="#1e293b" metalness={0.4} roughness={0.4} />
      </mesh>
      {faces.map(([fx, , fz, yaw], i) => (
        <group
          key={i}
          position={[fx, h * 0.52, fz]}
          rotation={[0, yaw, 0]}
        >
          <WindowGrid
            width={(i < 2 ? w : d) * 0.82}
            height={h * 0.72}
            cols={i < 2 ? cols : Math.max(2, Math.floor(d))}
            rows={rows}
            nightLights={nightLights}
          />
        </group>
      ))}
    </group>
  );
}

function Hill({
  position,
  radius = 8,
  height = 3.2,
  depth = 0.55,
  color = '#5f8f58',
  accent = '#4d7a48',
  yaw = 0,
}) {
  const yScale = height / radius;

  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh
        scale={[1.45, yScale, depth]}
        position={[0, 0.02, 0]}
        castShadow
        receiveShadow
      >
        <sphereGeometry
          args={[radius, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.52]}
        />
        <meshStandardMaterial
          color={color}
          roughness={0.95}
          metalness={0.02}
          flatShading
        />
      </mesh>
      <mesh
        scale={[0.78, yScale * 0.88, depth * 0.9]}
        position={[radius * 0.48, 0.02, radius * depth * 0.15]}
        castShadow
        receiveShadow
      >
        <sphereGeometry
          args={[radius * 0.68, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52]}
        />
        <meshStandardMaterial
          color={accent}
          roughness={0.96}
          metalness={0.02}
          flatShading
        />
      </mesh>
      <mesh
        scale={[0.58, yScale * 0.58, depth * 0.85]}
        position={[-radius * 0.4, 0.02, -radius * depth * 0.1]}
        castShadow
        receiveShadow
      >
        <sphereGeometry
          args={[radius * 0.52, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5]}
        />
        <meshStandardMaterial
          color={accent}
          roughness={1}
          metalness={0}
          flatShading
        />
      </mesh>
    </group>
  );
}

export function Environment({ atmosphere }) {
  const nightLights = atmosphere?.nightLights ?? 0;
  const ground = nightLights > 0.5 ? '#2f4a32' : '#5a8f55';

  // Anillo lejano 360°: |z| > 26 o |x| > 24 — sin edificios en primer plano sur
  const skyline = [
    // Norte
    [-26, 0, -34, 4.4, 10, 3.6, '#7b8796', '#475569'],
    [-18, 0, -36, 3.4, 14, 3.2, '#8fa4b8', '#334155'],
    [-10, 0, -35, 5.2, 8.5, 4.0, '#c4a484', '#7c5a3e'],
    [-2, 0, -37, 3.8, 16, 3.4, '#6d8aa8', '#1e3a5f'],
    [6, 0, -35, 4.6, 11, 3.8, '#a8b4c0', '#475569'],
    [14, 0, -36, 3.5, 13, 3.2, '#9bb8c9', '#334155'],
    [22, 0, -34, 5.0, 9, 4.1, '#b8957a', '#6b4423'],
    [30, 0, -35, 3.6, 12, 3.3, '#7a8fa0', '#334155'],
    // Este
    [36, 0, -22, 4.0, 11, 3.5, '#8b9aab', '#475569'],
    [38, 0, -10, 3.5, 15, 3.2, '#6e9bbb', '#1e40af'],
    [37, 0, 4, 4.8, 9.5, 3.8, '#c9b29a', '#7c5a3e'],
    [36, 0, 16, 3.8, 12.5, 3.4, '#7f8f9e', '#334155'],
    [38, 0, 28, 4.2, 8, 3.6, '#a3b5c4', '#475569'],
    // Sur (lejano, no tapa el cruce)
    [28, 0, 36, 4.5, 10, 3.5, '#8a96a6', '#334155'],
    [16, 0, 38, 3.4, 13, 3.2, '#9eb6c8', '#1e3a5f'],
    [4, 0, 37, 5.0, 9, 4.0, '#b89b7c', '#6b4423'],
    [-8, 0, 38, 3.7, 14, 3.3, '#748a9c', '#475569'],
    [-20, 0, 36, 4.3, 11, 3.6, '#a8b8c6', '#334155'],
    [-30, 0, 35, 3.6, 8.5, 3.4, '#7c8c9a', '#475569'],
    // Oeste
    [-38, 0, 22, 4.1, 12, 3.5, '#8fa0b0', '#334155'],
    [-37, 0, 8, 3.5, 15, 3.2, '#6d9ab0', '#1e40af'],
    [-38, 0, -6, 4.6, 9, 3.8, '#c2a88c', '#7c5a3e'],
    [-36, 0, -20, 3.8, 11.5, 3.4, '#8090a0', '#475569'],
  ];

  const clouds = [
    [-14, 20, -12, 2.8, 0.36],
    [6, 22, -16, 3.2, 0.34],
    [18, 19, -6, 2.5, 0.38],
    [-22, 21, 4, 2.9, 0.35],
    [0, 24, 10, 2.4, 0.33],
    [24, 20, 14, 2.7, 0.37],
    [-8, 23, -22, 3.0, 0.34],
    [12, 18, 22, 2.6, 0.36],
    [-26, 22, -28, 2.8, 0.32],
    [28, 21, -24, 2.5, 0.38],
  ];

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow>
        <planeGeometry args={[280, 280]} />
        <meshStandardMaterial color={ground} roughness={1} />
      </mesh>

      {/* Cerros norte */}
      <Hill position={[-24, 0, -42]} radius={13} height={6.5} depth={0.4} color="#5a8f52" accent="#487844" yaw={0.12} />
      <Hill position={[-6, 0, -44]} radius={12} height={8.2} depth={0.38} color="#62985a" accent="#50804a" yaw={-0.1} />
      <Hill position={[12, 0, -43]} radius={12.5} height={7.4} depth={0.38} color="#669c5e" accent="#54844e" yaw={0.16} />
      <Hill position={[28, 0, -41]} radius={11} height={6.2} depth={0.42} color="#5e9256" accent="#4c7a46" yaw={-0.12} />
      {/* Cerros laterales / sur lejanos */}
      <Hill position={[-44, 0, -20]} radius={11} height={5.2} depth={0.48} color="#52884c" accent="#427040" yaw={0.9} />
      <Hill position={[44, 0, -14]} radius={11.5} height={5.4} depth={0.48} color="#568c50" accent="#467444" yaw={-0.85} />
      <Hill position={[-40, 0, 30]} radius={10} height={4.6} depth={0.5} color="#4f8548" accent="#3f6e3c" yaw={1.1} />
      <Hill position={[38, 0, 32]} radius={10.5} height={4.8} depth={0.5} color="#558a4e" accent="#457244" yaw={-1.0} />
      <Hill position={[0, 0, 44]} radius={12} height={5.0} depth={0.42} color="#5c9054" accent="#4c7848" yaw={0.2} />

      {skyline.map(([x, , z, w, h, d, color, accent], i) => (
        <Skyscraper
          key={i}
          position={[x, 0, z]}
          size={[w, h, d]}
          color={color}
          accent={accent}
          nightLights={nightLights}
        />
      ))}

      {clouds.map(([x, y, z, scale, opacity], i) => (
        <PolyCloud
          key={`cloud-${i}`}
          position={[x, y, z]}
          scale={scale}
          opacity={opacity}
          color="#f8fbff"
        />
      ))}
    </group>
  );
}
