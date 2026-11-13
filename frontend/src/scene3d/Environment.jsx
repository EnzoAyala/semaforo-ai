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
      {/* Azotea */}
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

function Hill({ position, radius, color }) {
  return (
    <mesh position={position} castShadow>
      <sphereGeometry args={[radius, 16, 12]} />
      <meshStandardMaterial color={color} roughness={1} flatShading />
    </mesh>
  );
}

export function Environment({ atmosphere }) {
  const nightLights = atmosphere?.nightLights ?? 0;
  const ground = nightLights > 0.5 ? '#2f4a32' : '#5a8f55';

  const skyline = [
    [-28, 0, -30, 4.2, 9, 3.5, '#7b8796'],
    [-22, 0, -32, 3.2, 12, 3.2, '#8b95a5'],
    [-16, 0, -31, 5, 7.5, 4, '#6d7888'],
    [-10, 0, -33, 3.6, 14, 3.4, '#9099a8'],
    [-4, 0, -30, 4.5, 8, 3.8, '#7a8494'],
    [3, 0, -32, 3.8, 11, 3.5, '#8791a0'],
    [10, 0, -31, 5.2, 9.5, 4.2, '#738090'],
    [17, 0, -33, 3.4, 13, 3.2, '#95a0b0'],
    [24, 0, -30, 4.8, 8.5, 3.8, '#6e7a8a'],
    [30, 0, -32, 3.5, 10, 3.3, '#8490a0'],
    // anillo lateral
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

      <Hill position={[-20, 1.0, -26]} radius={7} color="#5f8f58" />
      <Hill position={[-6, 0.7, -28]} radius={5.5} color="#6b9a62" />
      <Hill position={[12, 1.2, -27]} radius={7.5} color="#6fa86a" />
      <Hill position={[24, 0.8, -24]} radius={6} color="#628f5c" />

      {skyline.map(([x, , z, w, h, d, color], i) => (
        <Skyscraper
          key={i}
          position={[x, 0, z]}
          size={[w, h, d]}
          color={color}
          nightLights={nightLights}
        />
      ))}
    </group>
  );
}
