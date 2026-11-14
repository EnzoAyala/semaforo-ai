/**
 * Suelo circular continuo, valle urbano 360°, cerros laterales y nubes translúcidas.
 */

function PolyCloud({ position, scale = 1, color = '#ffffff', opacity = 0.22 }) {
  const puffs = [
    [0, 0, 0, 1.1],
    [1.0, 0.12, 0.15, 0.85],
    [-0.95, 0.08, -0.12, 0.8],
    [0.32, 0.44, -0.28, 0.72],
    [-0.42, 0.38, 0.32, 0.68],
    [1.55, -0.04, 0.05, 0.62],
  ];

  return (
    <group position={position} scale={scale}>
      {puffs.map(([x, y, z, s], i) => (
        <mesh key={i} position={[x, y, z]} scale={s} renderOrder={2}>
          <sphereGeometry args={[1.15, 14, 12]} />
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

function WindowGrid({ width, height, cols, rows, nightLights, litColor = '#fde68a' }) {
  const cells = [];
  const cw = width / cols;
  const ch = height / rows;

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const lit = (r * 3 + c) % 4 !== 0;
      cells.push(
        <mesh
          key={`${r}-${c}`}
          position={[
            -width * 0.5 + cw * (c + 0.5),
            -height * 0.5 + ch * (r + 0.5),
            0.02,
          ]}
        >
          <planeGeometry args={[cw * 0.6, ch * 0.54]} />
          <meshStandardMaterial
            color={lit ? litColor : '#1e293b'}
            emissive={lit ? litColor : '#000000'}
            emissiveIntensity={lit ? 0.35 + nightLights * 1.15 : 0}
            roughness={0.4}
          />
        </mesh>
      );
    }
  }
  return <group>{cells}</group>;
}

function Skyscraper({
  position,
  size,
  color,
  accent = '#334155',
  litColor = '#fde68a',
  spire = false,
  crown = false,
  nightLights = 0,
}) {
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
        <meshStandardMaterial color={color} roughness={0.62} metalness={0.14} />
      </mesh>

      {/* Cornisa superior */}
      <mesh position={[0, h + 0.14, 0]}>
        <boxGeometry args={[w * 0.96, 0.28, d * 0.96]} />
        <meshStandardMaterial color={accent} metalness={0.3} roughness={0.48} />
      </mesh>

      {/* Remate escalonado */}
      {(crown || spire) && (
        <mesh position={[0, h + 0.85, 0]}>
          <boxGeometry args={[w * 0.64, 1.25, d * 0.64]} />
          <meshStandardMaterial color={accent} metalness={0.32} roughness={0.45} />
        </mesh>
      )}

      {/* Aguja central */}
      {spire && (
        <mesh position={[0, h + 2.4, 0]}>
          <cylinderGeometry args={[0.05, 0.14, 2.1, 8]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.45} roughness={0.35} />
        </mesh>
      )}

      {/* Ventanas en las 4 caras */}
      {faces.map(([fx, , fz, yaw], i) => (
        <group key={i} position={[fx, h * 0.51, fz]} rotation={[0, yaw, 0]}>
          <WindowGrid
            width={(i < 2 ? w : d) * 0.82}
            height={h * 0.76}
            cols={i < 2 ? cols : Math.max(2, Math.floor(d))}
            rows={rows}
            nightLights={nightLights}
            litColor={litColor}
          />
        </group>
      ))}
    </group>
  );
}

function VillageHouse({ position, size, body, roof, yaw = 0, nightLights = 0 }) {
  const [w, h, d] = size;
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh position={[0, h * 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={body} roughness={0.85} />
      </mesh>
      <mesh position={[0, h + 0.5, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[Math.max(w, d) * 0.76, 1.05, 4]} />
        <meshStandardMaterial color={roof} roughness={0.8} />
      </mesh>
      {[-w * 0.23, w * 0.23].map((wx, idx) => (
        <group key={idx}>
          <mesh position={[wx, h * 0.54, d * 0.5 + 0.02]}>
            <planeGeometry args={[0.42, 0.48]} />
            <meshStandardMaterial
              color="#fef08a"
              emissive="#facc15"
              emissiveIntensity={0.45 + nightLights * 0.9}
            />
          </mesh>
          <mesh position={[wx, h * 0.54, -d * 0.5 - 0.02]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[0.42, 0.48]} />
            <meshStandardMaterial
              color="#fef08a"
              emissive="#facc15"
              emissiveIntensity={0.45 + nightLights * 0.9}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function BgTree({ position, scale = 1, leafColor = '#4a8c4a' }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.52, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.15, 1.05, 7]} />
        <meshStandardMaterial color="#6b4423" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.38, 0]} castShadow>
        <sphereGeometry args={[0.66, 10, 10]} />
        <meshStandardMaterial color={leafColor} roughness={0.85} />
      </mesh>
      <mesh position={[0.28, 1.25, 0.15]} castShadow>
        <sphereGeometry args={[0.42, 8, 8]} />
        <meshStandardMaterial color="#3d7a3d" roughness={0.88} />
      </mesh>
    </group>
  );
}

function Hill({
  position,
  radius = 8,
  height = 3.2,
  depth = 0.55,
  color = '#659c5e',
  accent = '#52854c',
  yaw = 0,
}) {
  const yScale = height / radius;

  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh scale={[1.45, yScale, depth]} position={[0, 0.02, 0]} receiveShadow>
        <sphereGeometry
          args={[radius, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.52]}
        />
        <meshStandardMaterial
          color={color}
          roughness={0.95}
          metalness={0.02}
          flatShading
        />
      </mesh>
      <mesh
        scale={[0.82, yScale * 0.86, depth * 0.9]}
        position={[radius * 0.5, 0.02, radius * depth * 0.12]}
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
    </group>
  );
}

/** Genera un clúster denso y escalonado de torres para un hemisferio (norte o sur). */
function buildDowntownCluster(zSign) {
  const z1 = zSign * 46;
  const z2 = zSign * 52;
  const z3 = zSign * 58;

  return [
    // Fila frontal del centro financiero (compacta y variada)
    [-19.5, 0, z1, 3.6, 10.5, 3.3, '#7b8fa3', '#475569', '#fde68a', false, false],
    [-14.8, 0, z1 + zSign * 1.5, 3.4, 14.2, 3.2, '#5d8aa8', '#1e3a5f', '#e0f2fe', false, false],
    [-10.2, 0, z1, 4.0, 11.4, 3.5, '#9aa8b8', '#334155', '#fde68a', false, false],
    [-5.6, 0, z1 + zSign * 2, 3.6, 16.5, 3.3, '#4e89ae', '#1e40af', '#bae6fd', false, true],
    [-1.2, 0, z1 + zSign * 0.5, 3.9, 13.0, 3.5, '#8799a8', '#334155', '#fef3c7', false, false],
    [3.4, 0, z1 + zSign * 2.5, 4.3, 21.0, 3.8, '#8f6b7c', '#583d4a', '#fef08a', true, true],
    [8.2, 0, z1 + zSign * 1, 3.8, 17.2, 3.4, '#6b8ba4', '#334155', '#e0f2fe', false, true],
    [12.8, 0, z1 + zSign * 2, 3.5, 14.4, 3.2, '#7d8d9c', '#475569', '#fde68a', false, false],
    [17.4, 0, z1, 4.0, 11.6, 3.5, '#a89584', '#6b4423', '#fef3c7', false, false],
    [22.0, 0, z1 + zSign * 1.5, 3.5, 12.6, 3.2, '#8295a6', '#334155', '#e0f2fe', false, false],

    // Segunda fila (rellena huecos y da profundidad)
    [-17.0, 0, z2, 3.8, 13.2, 3.4, '#687a8c', '#334155', '#fde68a', false, false],
    [-12.2, 0, z2 + zSign * 1, 3.6, 15.8, 3.3, '#5c7c99', '#1e3a5f', '#bae6fd', false, true],
    [-7.6, 0, z2, 4.0, 12.2, 3.4, '#8c7f75', '#574e47', '#fef3c7', false, false],
    [-3.2, 0, z2 + zSign * 1.5, 3.8, 18.4, 3.5, '#64748b', '#334155', '#e0f2fe', false, true],
    [1.4, 0, z2 + zSign * 1, 4.0, 15.6, 3.5, '#768899', '#334155', '#fde68a', false, false],
    [6.0, 0, z2 + zSign * 2, 3.9, 19.0, 3.6, '#5682a3', '#1e3a5f', '#bae6fd', false, true],
    [10.6, 0, z2, 3.7, 15.0, 3.3, '#88788c', '#4c3d52', '#fef08a', false, false],
    [15.2, 0, z2 + zSign * 1, 3.8, 13.4, 3.3, '#6e8599', '#334155', '#e0f2fe', false, false],
    [19.8, 0, z2, 3.6, 10.8, 3.2, '#9e8b7a', '#5c4d44', '#fef3c7', false, false],

    // Tercera fila (silueta trasera alta)
    [-10.0, 0, z3, 4.2, 14.5, 3.5, '#708294', '#334155', '#fde68a', false, false],
    [-2.0, 0, z3, 4.4, 17.0, 3.6, '#5c7a94', '#1e3a5f', '#e0f2fe', false, false],
    [5.5, 0, z3, 4.2, 16.2, 3.5, '#788999', '#334155', '#fde68a', false, false],
    [13.0, 0, z3, 4.0, 13.6, 3.4, '#8795a3', '#475569', '#fef3c7', false, false],
  ];
}

export function Environment({ atmosphere }) {
  const nightLights = atmosphere?.nightLights ?? 0;
  const ground = nightLights > 0.5 ? '#2f4a32' : '#669c5f';
  const horizonColor =
    atmosphere?.fogColor || (nightLights > 0.5 ? '#101b2d' : '#dce8f4');

  // Barrio residencial intermedio (ubicado a media distancia z=±26..37 para no estorbar la cámara)
  const village = [
    // Hemisferio Norte (-Z)
    [-20, 0, -26, 2.7, 2.2, 2.1, '#e6d5b8', '#8c4a3c', 0.08],
    [-13, 0, -29, 3.0, 2.6, 2.2, '#d8c4a8', '#526b56', -0.05],
    [-6, 0, -27, 2.6, 2.2, 2.0, '#e3bfb0', '#7d3f35', 0.04],
    [1, 0, -30, 3.1, 2.7, 2.3, '#d0dce2', '#455a64', 0],
    [8, 0, -28, 2.8, 2.3, 2.1, '#e8cfa6', '#7f4f24', -0.06],
    [15, 0, -30, 3.0, 2.6, 2.2, '#d6c8bd', '#5c4d44', 0.05],
    [21, 0, -26, 2.6, 2.1, 2.0, '#cad9cc', '#3d5a45', -0.04],
    [-15, 0, -36, 3.2, 2.8, 2.4, '#cfd8dc', '#455a64', 0],
    [-3, 0, -37, 3.4, 3.0, 2.5, '#dfd3c3', '#6d4c41', 0.04],
    [10, 0, -36, 3.3, 2.9, 2.4, '#c8d6ca', '#3d5a45', -0.05],

    // Hemisferio Sur (+Z, detrás del mall y casas sur)
    [-20, 0, 26, 2.7, 2.2, 2.1, '#e6d5b8', '#8c4a3c', Math.PI],
    [-13, 0, 29, 3.0, 2.6, 2.2, '#d8c4a8', '#526b56', Math.PI],
    [-6, 0, 27, 2.6, 2.2, 2.0, '#e3bfb0', '#7d3f35', Math.PI],
    [1, 0, 30, 3.1, 2.7, 2.3, '#d0dce2', '#455a64', Math.PI],
    [8, 0, 28, 2.8, 2.3, 2.1, '#e8cfa6', '#7f4f24', Math.PI],
    [15, 0, 30, 3.0, 2.6, 2.2, '#d6c8bd', '#5c4d44', Math.PI],
    [21, 0, 26, 2.6, 2.1, 2.0, '#cad9cc', '#3d5a45', Math.PI],
    [-15, 0, 36, 3.2, 2.8, 2.4, '#cfd8dc', '#455a64', Math.PI],
    [-3, 0, 37, 3.4, 3.0, 2.5, '#dfd3c3', '#6d4c41', Math.PI],
    [10, 0, 36, 3.3, 2.9, 2.4, '#c8d6ca', '#3d5a45', Math.PI],
  ];

  const bgTrees = [
    // Franja norte
    [-22, -21, 1.05], [-16, -22, 0.95], [-10, -21.5, 1.1], [-4, -22.5, 0.9],
    [2, -21.5, 1.0], [8, -22, 1.08], [14, -21.5, 0.95], [20, -21, 1.05],
    [-18, -32, 1.1], [-8, -33, 1.05], [4, -33.5, 1.1], [15, -32.5, 1.0],
    // Franja sur
    [-22, 21, 1.05], [-16, 22, 0.95], [-10, 21.5, 1.1], [-4, 22.5, 0.9],
    [2, 21.5, 1.0], [8, 22, 1.08], [14, 21.5, 0.95], [20, 21, 1.05],
    [-18, 32, 1.1], [-8, 33, 1.05], [4, 33.5, 1.1], [15, 32.5, 1.0],
  ];

  const skyline = [
    ...buildDowntownCluster(-1),
    ...buildDowntownCluster(1),
    // Flancos Este / Oeste lejanos
    [52, 0, -22, 3.8, 12.0, 3.3, '#8b9aab', '#475569', '#fde68a', false, false],
    [54, 0, 20, 3.8, 11.5, 3.3, '#9aa8b8', '#475569', '#e0f2fe', false, false],
    [-52, 0, -22, 3.8, 12.5, 3.3, '#6e9bbb', '#1e40af', '#bae6fd', false, false],
    [-54, 0, 20, 4.0, 11.0, 3.4, '#b8957a', '#6b4423', '#fef3c7', false, false],
  ];

  // Nubes translúcidas elevadas
  const clouds = [
    [-18, 21, -32, 3.2, 0.22],
    [3, 23, -36, 3.6, 0.2],
    [20, 20, -28, 3.0, 0.22],
    [-26, 22, -14, 2.9, 0.19],
    [12, 23, -12, 2.6, 0.19],
    [-18, 21, 32, 3.2, 0.22],
    [3, 23, 36, 3.6, 0.2],
    [20, 20, 28, 3.0, 0.22],
    [-26, 22, 14, 2.9, 0.19],
    [12, 23, 12, 2.6, 0.19],
  ];

  return (
    <group>
      {/* Fondo y niebla sincronizados para eliminar cortes en el horizonte */}
      <color attach="background" args={[horizonColor]} />
      <fog attach="fog" args={[horizonColor, 46, 115]} />

      {/* Suelo circular amplio (radio > fog.far) para transición suave en 360° */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow>
        <circleGeometry args={[145, 64]} />
        <meshStandardMaterial color={ground} roughness={1} />
      </mesh>

      {/* Cerros enmarcando los costados y el fondo lejano (dejan el valle central libre para el skyline) */}
      <Hill position={[-38, 0, -52]} radius={19} height={11.5} depth={0.42} color="#5b9154" accent="#497a44" yaw={0.12} />
      <Hill position={[38, 0, -52]} radius={19} height={11.5} depth={0.42} color="#669e5e" accent="#52854c" yaw={-0.12} />
      <Hill position={[0, 0, -70]} radius={24} height={10.5} depth={0.32} color="#6ea866" accent="#588f52" yaw={0} />

      <Hill position={[-38, 0, 52]} radius={19} height={11.5} depth={0.42} color="#5b9154" accent="#497a44" yaw={-0.12} />
      <Hill position={[38, 0, 52]} radius={19} height={11.5} depth={0.42} color="#669e5e" accent="#52854c" yaw={0.12} />
      <Hill position={[0, 0, 70]} radius={24} height={10.5} depth={0.32} color="#6ea866" accent="#588f52" yaw={0} />

      <Hill position={[-62, 0, -16]} radius={18} height={9.5} depth={0.45} color="#588c52" accent="#467542" yaw={1.4} />
      <Hill position={[-62, 0, 18]} radius={18} height={9.5} depth={0.45} color="#5e9457" accent="#4c7d47" yaw={1.6} />
      <Hill position={[64, 0, -16]} radius={18} height={9.5} depth={0.45} color="#588c52" accent="#467542" yaw={-1.4} />
      <Hill position={[64, 0, 18]} radius={18} height={9.5} depth={0.45} color="#5e9457" accent="#4c7d47" yaw={-1.6} />

      {/* Barrio intermedio y árboles */}
      {village.map(([x, y, z, w, h, d, body, roof, yaw], i) => (
        <VillageHouse
          key={`vh-${i}`}
          position={[x, y, z]}
          size={[w, h, d]}
          body={body}
          roof={roof}
          yaw={yaw}
          nightLights={nightLights}
        />
      ))}
      {bgTrees.map(([x, z, scale], i) => (
        <BgTree
          key={`bgt-${i}`}
          position={[x, 0, z]}
          scale={scale}
          leafColor={i % 2 === 0 ? '#4d914b' : '#3e7d3d'}
        />
      ))}

      {/* Skyline urbano denso en ambos lados */}
      {skyline.map(([x, , z, w, h, d, color, accent, litColor, spire, crown], i) => (
        <Skyscraper
          key={`sky-${i}`}
          position={[x, 0, z]}
          size={[w, h, d]}
          color={color}
          accent={accent}
          litColor={litColor}
          spire={spire}
          crown={crown}
          nightLights={nightLights}
        />
      ))}

      {/* Nubes translúcidas */}
      {clouds.map(([x, y, z, scale, opacity], i) => (
        <PolyCloud
          key={`cloud-${i}`}
          position={[x, y, z]}
          scale={scale}
          opacity={opacity}
          color="#ffffff"
        />
      ))}
    </group>
  );
}