import { Text } from '@react-three/drei';
import { formatCountdown } from '../hooks/usePhaseCountdown';

function Lens({ position, color, on, radius = 0.2 }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[radius, 16, 16]} />
        <meshStandardMaterial
          color={on ? color : '#1a1f28'}
          emissive={on ? color : '#000000'}
          emissiveIntensity={on ? 2.1 : 0}
          roughness={0.25}
          metalness={0.1}
        />
      </mesh>
      <mesh position={[0, radius * 0.55, radius * 0.55]}>
        <boxGeometry args={[radius * 2.2, radius * 0.35, radius * 1.1]} />
        <meshStandardMaterial color="#0b1220" metalness={0.4} roughness={0.45} />
      </mesh>
    </group>
  );
}

function CountdownPanel({
  seconds,
  active,
  color = '#22c55e',
  position = [0, 0, 0.28],
  scale = 1,
}) {
  if (!active || seconds <= 0.05) return null;
  const label = formatCountdown(seconds);

  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[0.72, 0.55, 0.06]} />
        <meshStandardMaterial color="#030712" metalness={0.35} roughness={0.4} />
      </mesh>
      <Text
        position={[0, 0, 0.04]}
        fontSize={0.38}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.012}
        outlineColor="#000000"
      >
        {label}
      </Text>
    </group>
  );
}

/**
 * Pórtico vehicular estilizado.
 * faceX: -1 mira tráfico este (viene de -X), +1 mira oeste (viene de +X)
 */
function VehicleSignal({
  position,
  armSign = 1,
  faceX = -1,
  luzVehicular,
  tiempoRestante = 0,
  forceTimer = false,
}) {
  const armLen = 5.4;
  const armZ = armSign * (armLen * 0.5);
  const headZ = armSign * armLen;
  const headYaw = faceX > 0 ? Math.PI / 2 : -Math.PI / 2;
  const showTimer =
    forceTimer ||
    luzVehicular === 'ROJO' ||
    luzVehicular === 'AMARILLO';
  const timerColor = forceTimer
    ? '#38bdf8'
    : luzVehicular === 'AMARILLO'
      ? '#f59e0b'
      : '#ef4444';

  return (
    <group position={position}>
      <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.85, 0.56, 0.85]} />
        <meshStandardMaterial color="#9ca3af" roughness={0.9} metalness={0.05} />
      </mesh>
      <mesh position={[0, 3.5, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.16, 6.6, 12]} />
        <meshStandardMaterial color="#374151" metalness={0.55} roughness={0.35} />
      </mesh>
      <mesh position={[0, 6.35, armZ * 0.15]} castShadow>
        <boxGeometry args={[0.22, 0.22, armLen * 0.28]} />
        <meshStandardMaterial color="#4b5563" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 6.2, armZ]} castShadow>
        <boxGeometry args={[0.18, 0.18, armLen]} />
        <meshStandardMaterial color="#4b5563" metalness={0.5} roughness={0.4} />
      </mesh>
      <group position={[0, 5.9, headZ]} rotation={[0, headYaw, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.78, 2.05, 0.52]} />
          <meshStandardMaterial color="#111827" metalness={0.35} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0, -0.22]}>
          <boxGeometry args={[0.82, 2.1, 0.08]} />
          <meshStandardMaterial color="#030712" roughness={0.6} />
        </mesh>
        <Lens position={[0, 0.58, 0.22]} color="#ef4444" on={luzVehicular === 'ROJO'} radius={0.24} />
        <Lens position={[0, 0.02, 0.22]} color="#f59e0b" on={luzVehicular === 'AMARILLO'} radius={0.24} />
        <Lens position={[0, -0.54, 0.22]} color="#22c55e" on={luzVehicular === 'VERDE'} radius={0.24} />
        <CountdownPanel
          seconds={tiempoRestante}
          active={showTimer}
          color={timerColor}
          position={[0.95, 0.05, 0.1]}
          scale={0.85}
        />
      </group>
    </group>
  );
}

/**
 * Sensor PIR físico (caja + cúpula Fresnel + LED de estado).
 * faceSign: +1 mira hacia +Z (sur), -1 mira hacia -Z (norte).
 */
function PirSensor({ position, yaw = 0, active = true }) {
  const ledColor = active ? '#22c55e' : '#ef4444';
  const ledGlow = active ? 1.6 : 0.55;

  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {/* Pedestal */}
      <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.16, 0.2, 0.24, 10]} />
        <meshStandardMaterial color="#6b7280" metalness={0.35} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.07, 1.0, 10]} />
        <meshStandardMaterial color="#374151" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Cabezal / carcasa */}
      <group position={[0, 1.28, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.42, 0.36, 0.28]} />
          <meshStandardMaterial color="#111827" metalness={0.4} roughness={0.35} />
        </mesh>
        {/* Visera */}
        <mesh position={[0, 0.14, 0.12]} castShadow>
          <boxGeometry args={[0.46, 0.06, 0.22]} />
          <meshStandardMaterial color="#0b1220" metalness={0.45} roughness={0.4} />
        </mesh>
        {/* Cúpula / lente Fresnel */}
        <mesh position={[0, 0.02, 0.16]} castShadow>
          <sphereGeometry args={[0.13, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshStandardMaterial
            color="#fde68a"
            emissive="#f59e0b"
            emissiveIntensity={active ? 0.55 : 0.12}
            transparent
            opacity={0.85}
            roughness={0.25}
            metalness={0.05}
          />
        </mesh>
        {/* Anillo del sensor */}
        <mesh position={[0, 0.02, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.135, 0.018, 8, 20]} />
          <meshStandardMaterial color="#4b5563" metalness={0.5} roughness={0.4} />
        </mesh>
        {/* LED estado: verde = PIR activo (REPOSO), rojo = bloqueado */}
        <mesh position={[0.14, 0.12, 0.15]}>
          <sphereGeometry args={[0.035, 10, 10]} />
          <meshStandardMaterial
            color={ledColor}
            emissive={ledColor}
            emissiveIntensity={ledGlow}
            roughness={0.2}
          />
        </mesh>
        {/* Etiqueta PIR */}
        <mesh position={[0, -0.1, 0.145]}>
          <boxGeometry args={[0.28, 0.08, 0.02]} />
          <meshStandardMaterial color="#1e293b" roughness={0.6} />
        </mesh>
        <Text
          position={[0, -0.1, 0.16]}
          fontSize={0.055}
          color="#e2e8f0"
          anchorX="center"
          anchorY="middle"
        >
          PIR
        </Text>
      </group>
    </group>
  );
}

function PedSignal({
  position,
  yaw = 0,
  luzPeatonal,
  tiempoRestante = 0,
  sensorActivo = true,
}) {
  const showTimer = luzPeatonal === 'VERDE';

  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.12, 0.14, 0.4, 10]} />
        <meshStandardMaterial color="#6b7280" metalness={0.4} roughness={0.45} />
      </mesh>
      <mesh position={[0, 1.7, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 3.2, 10]} />
        <meshStandardMaterial color="#374151" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 3.4, 0]} castShadow>
        <boxGeometry args={[0.64, 1.3, 0.36]} />
        <meshStandardMaterial color="#111827" metalness={0.3} roughness={0.4} />
      </mesh>
      <Lens position={[0, 3.72, 0.14]} color="#ef4444" on={luzPeatonal === 'ROJO'} radius={0.18} />
      <Lens position={[0, 3.12, 0.14]} color="#22c55e" on={luzPeatonal === 'VERDE'} radius={0.18} />
      <CountdownPanel
        seconds={tiempoRestante}
        active={showTimer}
        color="#4ade80"
        position={[0.55, 3.4, 0.12]}
        scale={0.72}
      />
      {/* Pulsador peatonal (aparte del PIR) */}
      <mesh position={[0.22, 1.15, 0.12]} castShadow>
        <boxGeometry args={[0.26, 0.32, 0.16]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.35} roughness={0.45} />
      </mesh>
      <mesh position={[0.22, 1.15, 0.21]}>
        <cylinderGeometry args={[0.065, 0.065, 0.05, 12]} />
        <meshStandardMaterial
          color="#facc15"
          emissive="#eab308"
          emissiveIntensity={0.45}
          roughness={0.35}
        />
      </mesh>
      {/* Mini PIR en el poste, mirando a la vereda de espera */}
      <group position={[-0.28, 1.35, 0.05]}>
        <mesh castShadow>
          <boxGeometry args={[0.2, 0.18, 0.16]} />
          <meshStandardMaterial color="#1f2937" metalness={0.4} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.01, 0.09]}>
          <sphereGeometry args={[0.07, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
          <meshStandardMaterial
            color="#fde68a"
            emissive="#f59e0b"
            emissiveIntensity={sensorActivo ? 0.5 : 0.1}
            transparent
            opacity={0.8}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[0.07, 0.06, 0.09]}>
          <sphereGeometry args={[0.022, 8, 8]} />
          <meshStandardMaterial
            color={sensorActivo ? '#22c55e' : '#ef4444'}
            emissive={sensorActivo ? '#22c55e' : '#ef4444'}
            emissiveIntensity={sensorActivo ? 1.4 : 0.5}
          />
        </mesh>
      </group>
    </group>
  );
}

export function TrafficLights3D({
  luzVehicular = 'VERDE',
  luzPeatonal = 'ROJO',
  tiempoRestante = 0,
  modo = '',
  sensorActivo = true,
}) {
  // En cooldown el vehicular está verde: igual mostramos cuenta atrás
  const vehicleSeconds =
    modo === 'COOLDOWN' || luzVehicular === 'ROJO' || luzVehicular === 'AMARILLO'
      ? tiempoRestante
      : 0;
  const vehicleForceTimer = modo === 'COOLDOWN';
  const pedSeconds = luzPeatonal === 'VERDE' ? tiempoRestante : 0;

  return (
    <group>
      <VehicleSignal
        position={[-3.4, 0, -7.15]}
        armSign={1}
        faceX={-1}
        luzVehicular={luzVehicular}
        tiempoRestante={vehicleSeconds}
        forceTimer={vehicleForceTimer}
      />
      <VehicleSignal
        position={[3.4, 0, 7.15]}
        armSign={-1}
        faceX={1}
        luzVehicular={luzVehicular}
        tiempoRestante={vehicleSeconds}
        forceTimer={vehicleForceTimer}
      />

      <PedSignal
        position={[-2.3, 0, 6.3]}
        yaw={0}
        luzPeatonal={luzPeatonal}
        tiempoRestante={pedSeconds}
        sensorActivo={sensorActivo}
      />
      <PedSignal
        position={[2.3, 0, 6.3]}
        yaw={0}
        luzPeatonal={luzPeatonal}
        tiempoRestante={pedSeconds}
        sensorActivo={sensorActivo}
      />
      <PedSignal
        position={[-2.3, 0, -6.3]}
        yaw={Math.PI}
        luzPeatonal={luzPeatonal}
        tiempoRestante={pedSeconds}
        sensorActivo={sensorActivo}
      />
      <PedSignal
        position={[2.3, 0, -6.3]}
        yaw={Math.PI}
        luzPeatonal={luzPeatonal}
        tiempoRestante={pedSeconds}
        sensorActivo={sensorActivo}
      />

      {/* PIR independientes en ambos sentidos del cruce (sur + norte) */}
      <PirSensor
        position={[0.15, 0, 7.55]}
        yaw={0}
        active={sensorActivo}
      />
      <PirSensor
        position={[-0.15, 0, -7.55]}
        yaw={Math.PI}
        active={sensorActivo}
      />
    </group>
  );
}
