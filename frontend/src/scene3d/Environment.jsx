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
          roughness={0.55}
          metalness={0.18}
          fog={false}
        />
      </mesh>
      <mesh position={[0, h + 0.12, 0]}>
        <boxGeometry args={[w * 0.92, 0.28, d * 0.92]} />
        <meshStandardMaterial
          color={accent}
          metalness={0.35}
          roughness={0.45}
          fog={false}
        />
      </mesh>
      <mesh position={[0, h + 0.38, 0]}>
        <boxGeometry args={[w * 0.55, 0.35, d * 0.4]} />
        <meshStandardMaterial
          color="#1e293b"
          metalness={0.4}
          roughness={0.4}
          fog={false}
        />
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

  /**
   * Skyline como 2ª imagen: torres nítidas y coloridas DELANTE de las montañas.
   * Norte cercano (z≈-26..-31); montañas más atrás. Sin cruce con la avenida.
   */
  const skyline = [
    // —— Norte denso (primera fila, bien visible) ——
    [-28, 0, -27, 3.8, 10.5, 3.3, '#8b9aab', '#475569'],
    [-22, 0, -29, 3.2, 15.0, 3.0, '#6e9bbb', '#1e40af'],
    [-16, 0, -28, 4.6, 8.5, 3.7, '#c4a484', '#7c5a3e'],
    [-10, 0, -30, 3.4, 16.5, 3.1, '#7b6fa0', '#3b2f6b'],
    [-4, 0, -27, 4.8, 11.0, 3.8, '#a8b4c0', '#475569'],
    [2, 0, -30, 3.5, 18.0, 3.2, '#5b8fb8', '#1e3a5f'],
    [8, 0, -28, 4.2, 12.5, 3.5, '#9aa8b8', '#334155'],
    [14, 0, -30, 3.3, 14.5, 3.0, '#8fb0c4', '#1e40af'],
    [20, 0, -27, 4.7, 9.5, 3.9, '#b8957a', '#6b4423'],
    [26, 0, -29, 3.4, 13.0, 3.1, '#8799a8', '#334155'],
    [31, 0, -31, 3.6, 10.0, 3.2, '#a3b5c4', '#475569'],
    // —— Segunda fila norte ——
    [-25, 0, -34, 3.0, 12.0, 2.8, '#7d8d9c', '#334155'],
    [-13, 0, -35, 3.6, 9.0, 3.0, '#c9b29a', '#7c5a3e'],
    [-1, 0, -36, 2.9, 14.0, 2.7, '#6e9bbb', '#1e40af'],
    [11, 0, -35, 3.8, 10.5, 3.1, '#9585b0', '#4c3d7a'],
    [23, 0, -34, 3.2, 12.5, 2.9, '#9bb8c9', '#334155'],
    // —— Sur / detrás del mall (z≈24..32, x alrededor del mall) ——
    [-6, 0, 26, 3.8, 10.0, 3.3, '#8b9aab', '#475569'],
    [0, 0, 28, 3.3, 14.5, 3.0, '#6e9bbb', '#1e40af'],
    [6, 0, 26, 4.5, 9.0, 3.7, '#c4a484', '#7c5a3e'],
    [12, 0, 29, 3.4, 16.0, 3.1, '#7b6fa0', '#3b2f6b'],
    [18, 0, 27, 4.6, 11.5, 3.8, '#a8b4c0', '#475569'],
    [24, 0, 30, 3.5, 15.0, 3.2, '#5b8fb8', '#1e3a5f'],
    [30, 0, 27, 4.2, 10.5, 3.5, '#9aa8b8', '#334155'],
    [37, 0, 32, 3.3, 13.0, 3.0, '#8fb0c4', '#1e40af'],
    // Segunda fila sur (detrás del mall)
    [-2, 0, 34, 3.1, 11.5, 2.8, '#7d8d9c', '#334155'],
    [8, 0, 35, 3.7, 9.5, 3.0, '#c9b29a', '#7c5a3e'],
    [16, 0, 36, 3.0, 13.5, 2.7, '#9585b0', '#4c3d7a'],
    [26, 0, 35, 3.5, 12.0, 2.9, '#9bb8c9', '#334155'],
    [34, 0, 34, 3.2, 10.0, 2.8, '#b8957a', '#6b4423'],
    // —— Este / Oeste lejanos ——
    [44, 0, -22, 3.6, 12.0, 3.2, '#8b9aab', '#475569'],
    [45, 0, 18, 3.8, 11.0, 3.3, '#a3b5c4', '#475569'],
    [-44, 0, -22, 3.5, 12.5, 3.1, '#6e9bbb', '#1e40af'],
    [-45, 0, 18, 4.0, 10.5, 3.4, '#c2a88c', '#7c5a3e'],
    [-38, 0, 30, 3.5, 11.0, 3.2, '#8fa0b0', '#334155'],
  ];

  const clouds = [
    [-16, 21, -24, 3.0, 0.4],
    [4, 23, -28, 3.4, 0.38],
    [18, 20, -18, 2.8, 0.42],
    [-24, 22, -14, 3.1, 0.36],
    [10, 24, -8, 2.6, 0.38],
    [26, 21, -26, 2.9, 0.4],
    [-6, 22, -32, 3.2, 0.35],
    // Nubes detrás del mall / sur
    [14, 20, 22, 2.8, 0.4],
    [28, 22, 28, 3.0, 0.38],
    [6, 21, 30, 2.6, 0.36],
  ];

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow>
        <planeGeometry args={[280, 280]} />
        <meshStandardMaterial color={ground} roughness={1} />
      </mesh>

      {/* Montañas norte (detrás de torres norte) */}
      <Hill position={[-26, 0, -46]} radius={17} height={10.5} depth={0.34} color="#4f7f48" accent="#3f6840" yaw={0.08} />
      <Hill position={[-6, 0, -49]} radius={19} height={12.5} depth={0.32} color="#5a8b52" accent="#487846" yaw={-0.06} />
      <Hill position={[14, 0, -48]} radius={18} height={11.5} depth={0.32} color="#629654" accent="#50804a" yaw={0.12} />
      <Hill position={[32, 0, -45]} radius={15} height={9.5} depth={0.34} color="#568850" accent="#467244" yaw={-0.08} />
      {/* Montañas sur / detrás del mall */}
      <Hill position={[4, 0, 46]} radius={16} height={10.0} depth={0.34} color="#4f7f48" accent="#3f6840" yaw={0.1} />
      <Hill position={[18, 0, 48]} radius={18} height={11.8} depth={0.32} color="#5a8b52" accent="#487846" yaw={-0.08} />
      <Hill position={[32, 0, 46]} radius={15} height={9.8} depth={0.34} color="#629654" accent="#50804a" yaw={0.12} />
      <Hill position={[-12, 0, 45]} radius={14} height={8.5} depth={0.36} color="#568850" accent="#467244" yaw={-0.1} />
      {/* Laterales */}
      <Hill position={[-52, 0, -38]} radius={11} height={6.5} depth={0.38} color="#4d7846" accent="#3d6340" yaw={0.8} />
      <Hill position={[56, 0, -40]} radius={11} height={6.8} depth={0.38} color="#527c4a" accent="#426744" yaw={-0.75} />
      <Hill position={[-54, 0, 40]} radius={10} height={5.8} depth={0.38} color="#4a7444" accent="#3a5f3a" yaw={1.0} />
      <Hill position={[58, 0, 42]} radius={10} height={6.0} depth={0.38} color="#4e7848" accent="#3e6340" yaw={-0.95} />

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
