function Tree({ position, scale = 1, trunk = '#6b4423', leaves = '#3f8f4a', variant = 0 }) {
  const leafA = leaves;
  const leafB = variant % 2 === 0 ? '#2f7a3c' : '#4aad55';
  const leafC = variant % 3 === 0 ? '#1f6b34' : '#5bbf66';

  return (
    <group position={position} scale={scale}>
      <mesh castShadow position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.11, 0.18, 1.2, 8]} />
        <meshStandardMaterial color={trunk} roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, 1.45, 0]}>
        <sphereGeometry args={[0.7, 12, 12]} />
        <meshStandardMaterial color={leafA} roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0.28, 1.7, 0.12]}>
        <sphereGeometry args={[0.42, 10, 10]} />
        <meshStandardMaterial color={leafB} roughness={0.85} />
      </mesh>
      <mesh castShadow position={[-0.25, 1.65, -0.18]}>
        <sphereGeometry args={[0.38, 10, 10]} />
        <meshStandardMaterial color={leafC} roughness={0.85} />
      </mesh>
      {variant % 2 === 1 && (
        <mesh castShadow position={[0.05, 2.05, -0.05]}>
          <sphereGeometry args={[0.32, 10, 10]} />
          <meshStandardMaterial color={leafA} roughness={0.85} />
        </mesh>
      )}
    </group>
  );
}

function Bush({ position, color = '#3d8f4a', scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow position={[0, 0.28, 0]}>
        <sphereGeometry args={[0.35, 10, 10]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0.22, 0.22, 0.1]}>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshStandardMaterial color="#2f7a3c" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[-0.18, 0.2, -0.08]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color="#4aad55" roughness={0.9} />
      </mesh>
    </group>
  );
}

/**
 * Vegetación solo en zonas verdes: |z| >= 9.8, |x| > 3.5,
 * lejos de casas, mall, paradero y cebra.
 */
export function Trees() {
  const spots = [
    // Norte (detrás / entre casas, z -10.2 .. -13.5)
    [-12.5, 0, -12.8, 1.1, 0],
    [-9.8, 0, -13.2, 0.95, 1],
    [-5.8, 0, -12.6, 1.0, 2],
    [5.6, 0, -12.9, 0.9, 0],
    [9.8, 0, -13.1, 1.05, 1],
    [12.8, 0, -12.4, 0.95, 2],
    [-14.5, 0, -11.0, 1.15, 0],
    [14.2, 0, -11.2, 1.05, 1],
    // Sur (fuera del mall y casas, z 10.2 .. 13.5)
    [-12.2, 0, 12.6, 1.0, 2],
    [-9.5, 0, 13.1, 0.9, 0],
    [-5.6, 0, 12.8, 0.95, 1],
    [17.5, 0, 12.4, 1.05, 0],
    [19.2, 0, 13.2, 0.9, 2],
    [15.8, 0, 10.8, 0.85, 1],
  ];

  const bushes = [
    [-11.2, 0, -11.8, 0.95],
    [-8.8, 0, -12.4, 0.85],
    [8.6, 0, -12.0, 1.0],
    [11.5, 0, -12.6, 0.9],
    [-11.0, 0, 12.2, 0.95],
    [-8.2, 0, 13.0, 0.85],
    [18.0, 0, 11.5, 0.9],
    [20.0, 0, 12.8, 0.8],
  ];

  return (
    <group>
      {spots.map(([x, y, z, s, v], i) => (
        <Tree
          key={`t-${i}`}
          position={[x, y, z]}
          scale={s}
          variant={v}
          leaves={i % 2 === 0 ? '#3f8f4a' : '#2f7a3c'}
        />
      ))}
      {bushes.map(([x, y, z, s], i) => (
        <Bush key={`b-${i}`} position={[x, y, z]} scale={s} />
      ))}
    </group>
  );
}
