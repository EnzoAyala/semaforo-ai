/**
 * Suelo, skyline, cerros y nubes low-poly.
 * Los cerros son montículos bajos (hemiesferas aplastadas), no esferas flotantes.
 */

function PolyCloud({ position, scale = 1, color = '#f4f8fc' }) {
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
        <mesh key={i} position={[x, y, z]} scale={s}>
          <sphereGeometry args={[1.15, 10, 8]} />
          <meshStandardMaterial
            color={color}
            emissive="#dbeafe"
            emissiveIntensity={0.55}
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
            emissiveIntensity={lit ? 0.15 + nightLights * 1.1 : 0}
            roughness={0.45}
          />
        </mesh>
      );
    }
  }
  return <group>{cells}</group>;
}

function Skyscraper({ position, size, color, nightLights }) {
  const [w, h, d] = size;
  return (
    <group position={position}>
      <mesh position={[0, h * 0.5, 0]} castShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.15} />
      </mesh>
      <mesh position={[0, h + 0.15, 0]}>
        <boxGeometry args={[w * 0.7, 0.3, d * 0.55]} />
        <meshStandardMaterial color="#334155" metalness={0.3} roughness={0.5} />
      </mesh>
      <group position={[0, h * 0.55, d * 0.5 + 0.01]}>
        <WindowGrid
          width={w * 0.85}
          height={h * 0.75}
          cols={Math.max(3, Math.floor(w))}
          rows={Math.max(4, Math.floor(h / 1.4))}
          nightLights={nightLights}
        />
      </group>
    </group>
  );
}

/**
 * Cerro low-poly: cresta ancha y poco profunda (no bola).
 * depth < 1 evita que el volumen atraviese el skyline.
 */
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

  const skyline = [
    [-28, 0, -28, 4.2, 9, 3.5, '#7b8796'],
    [-22, 0, -30, 3.2, 12, 3.2, '#8b95a5'],
    [-16, 0, -29, 5, 7.5, 4, '#6d7888'],
    [-10, 0, -31, 3.6, 14, 3.4, '#9099a8'],
    [-4, 0, -28, 4.5, 8, 3.8, '#7a8494'],
    [3, 0, -30, 3.8, 11, 3.5, '#8791a0'],
    [10, 0, -29, 5.2, 9.5, 4.2, '#738090'],
    [17, 0, -31, 3.4, 13, 3.2, '#95a0b0'],
    [24, 0, -28, 4.8, 8.5, 3.8, '#6e7a8a'],
    [30, 0, -30, 3.5, 10, 3.3, '#8490a0'],
    [-32, 0, -18, 3.5, 7, 3.2, '#768292'],
    [32, 0, -16, 4, 9, 3.5, '#8793a3'],
    [-30, 0, 18, 3.8, 8, 3.4, '#6f7c8c'],
    [28, 0, 20, 4.2, 7.2, 3.6, '#8a96a6'],
  ];

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow>
        <planeGeometry args={[140, 140]} />
        <meshStandardMaterial color={ground} roughness={1} />
      </mesh>

      {/* Cresta pegada al skyline (misma franja X que las torres) */}
      <Hill
        position={[-24, 0, -38]}
        radius={12}
        height={6.2}
        depth={0.42}
        color="#5a8f52"
        accent="#487844"
        yaw={0.12}
      />
      <Hill
        position={[-10, 0, -39]}
        radius={11}
        height={8.0}
        depth={0.4}
        color="#62985a"
        accent="#50804a"
        yaw={-0.08}
      />
      <Hill
        position={[4, 0, -38.5]}
        radius={12}
        height={7.0}
        depth={0.4}
        color="#669c5e"
        accent="#54844e"
        yaw={0.18}
      />
      <Hill
        position={[18, 0, -39]}
        radius={11.5}
        height={8.4}
        depth={0.38}
        color="#5e9256"
        accent="#4c7a46"
        yaw={-0.14}
      />
      <Hill
        position={[30, 0, -37.5]}
        radius={10.5}
        height={6.0}
        depth={0.44}
        color="#588c50"
        accent="#467444"
        yaw={0.22}
      />

      {/* Relleno bajo entre bases de edificios */}
      <Hill
        position={[-16, 0, -34]}
        radius={5.5}
        height={3.0}
        depth={0.36}
        color="#6aa462"
        accent="#588c52"
        yaw={0.2}
      />
      <Hill
        position={[0, 0, -34.5]}
        radius={6}
        height={3.4}
        depth={0.34}
        color="#70aa68"
        accent="#5e9256"
        yaw={-0.25}
      />
      <Hill
        position={[16, 0, -34]}
        radius={5.4}
        height={2.9}
        depth={0.36}
        color="#68a260"
        accent="#568a50"
        yaw={0.35}
      />

      {/* Laterales del valle */}
      <Hill
        position={[-40, 0, -33]}
        radius={10}
        height={5.0}
        depth={0.5}
        color="#52884c"
        accent="#427040"
        yaw={0.85}
      />
      <Hill
        position={[40, 0, -31]}
        radius={10.5}
        height={5.2}
        depth={0.5}
        color="#568c50"
        accent="#467444"
        yaw={-0.8}
      />

      {skyline.map(([x, , z, w, h, d, color], i) => (
        <Skyscraper
          key={i}
          position={[x, 0, z]}
          size={[w, h, d]}
          color={color}
          nightLights={nightLights}
        />
      ))}

      {/* Nubes low-poly sobre el valle */}
      <PolyCloud position={[-10, 12, -10]} scale={2.6} color="#ffffff" />
      <PolyCloud position={[5, 13, -12]} scale={3.0} color="#f8fafc" />
      <PolyCloud position={[15, 11.5, -8]} scale={2.4} color="#f1f5f9" />
      <PolyCloud position={[-18, 11, -14]} scale={2.5} color="#f8fafc" />
      <PolyCloud position={[0, 14, -16]} scale={2.2} color="#ffffff" />
      <PolyCloud position={[20, 12, -18]} scale={2.4} color="#f1f5f9" />
    </group>
  );
}
