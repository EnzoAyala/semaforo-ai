import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sky } from '@react-three/drei';
import * as THREE from 'three';
import { Houses } from './Houses';
import { Road } from './Road';
import { TrafficLights3D } from './TrafficLights3D';
import { Pedestrian } from './Pedestrian';
import { Cars } from './Cars';
import { Trees } from './Trees';
import { Environment } from './Environment';
import { Mall } from './Mall';
import { BusFleet, BusStop } from './BusSystem';
import {
  sampleAtmosphere,
  sunPositionFromAtmosphere,
} from './atmosphere';

const AUTO_CYCLE_SECONDS = 90;

function AtmosphereRig({ ambienceMode, onAtmosphere }) {
  const phaseRef = useRef(0);
  const accRef = useRef(0);
  const lightRef = useRef();
  const hemiRef = useRef();
  const ambRef = useRef();
  // Solo el modo "auto" escribe estado desde useFrame; el resto se deriva.
  const [autoAtm, setAutoAtm] = useState(() => sampleAtmosphere('day'));

  const atm = useMemo(
    () =>
      ambienceMode === 'auto'
        ? autoAtm
        : sampleAtmosphere(ambienceMode),
    [ambienceMode, autoAtm]
  );

  const applyLive = (next) => {
    if (ambRef.current) ambRef.current.intensity = next.ambient;
    if (hemiRef.current) {
      hemiRef.current.intensity = next.hemiIntensity;
      hemiRef.current.color.set(next.hemiSky);
      hemiRef.current.groundColor.set(next.hemiGround);
    }
    if (lightRef.current) {
      const sunPos = sunPositionFromAtmosphere(next);
      lightRef.current.position.set(...sunPos);
      lightRef.current.intensity = next.dirIntensity;
      lightRef.current.color.set(next.dirColor);
    }
  };

  useFrame((_, delta) => {
    if (ambienceMode !== 'auto') return;
    phaseRef.current = (phaseRef.current + delta / AUTO_CYCLE_SECONDS) % 1;
    const next = sampleAtmosphere('auto', phaseRef.current);
    applyLive(next);
    accRef.current += delta;
    if (accRef.current > 0.35) {
      accRef.current = 0;
      setAutoAtm(next);
      onAtmosphere?.(next);
    }
  });

  useEffect(() => {
    if (ambienceMode === 'auto') return undefined;
    const next = sampleAtmosphere(ambienceMode);
    // Aviso al padre en callback diferido (no setState local síncrono).
    const t = window.setTimeout(() => {
      onAtmosphere?.(next);
      applyLive(next);
    }, 0);
    return () => window.clearTimeout(t);
  }, [ambienceMode, onAtmosphere]);

  const sunPos = useMemo(() => sunPositionFromAtmosphere(atm), [atm]);

  return (
    <>
      <color attach="background" args={[atm.bg]} />
      <fog attach="fog" args={[atm.fog, atm.fogNear, atm.fogFar]} />
      <Sky
        sunPosition={sunPos}
        turbidity={atm.skyTurbidity}
        rayleigh={atm.skyRayleigh}
        mieCoefficient={0.004}
        mieDirectionalG={0.75}
      />
      <ambientLight ref={ambRef} intensity={atm.ambient} />
      <hemisphereLight
        ref={hemiRef}
        args={[atm.hemiSky, atm.hemiGround, atm.hemiIntensity]}
      />
      <directionalLight
        ref={lightRef}
        castShadow
        position={sunPos}
        intensity={atm.dirIntensity}
        color={atm.dirColor}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={90}
        shadow-camera-left={-32}
        shadow-camera-right={32}
        shadow-camera-top={32}
        shadow-camera-bottom={-32}
        shadow-bias={-0.00025}
      />
    </>
  );
}

function SceneContent({
  estado,
  tiempoRestante = 0,
  agents,
  onPhaseEvent,
  onPose,
  onPassengersAlight,
  ambienceMode,
}) {
  const modo = estado?.modo || 'REPOSO';
  // Luces = diagrama README (modo es la fuente de verdad)
  // REPOSO/COOLDOWN: veh VERDE, pea ROJO | AMARILLO: veh AMARILLO | PEATONAL: veh ROJO, pea VERDE
  const luzVehicular =
    modo === 'TRANSICION_AMARILLO'
      ? 'AMARILLO'
      : modo === 'FASE_PEATONAL'
        ? 'ROJO'
        : 'VERDE';
  const luzPeatonal = modo === 'FASE_PEATONAL' ? 'VERDE' : 'ROJO';
  const crossingAllowed = luzPeatonal === 'VERDE';
  const [atmosphere, setAtmosphere] = useState(() =>
    sampleAtmosphere(ambienceMode === 'auto' ? 'day' : ambienceMode)
  );
  const nightLights = atmosphere.nightLights;

  return (
    <>
      <AtmosphereRig ambienceMode={ambienceMode} onAtmosphere={setAtmosphere} />

      <Environment atmosphere={atmosphere} />
      <Road nightLights={nightLights} />
      <Houses nightLights={nightLights} />
      <Mall nightLights={nightLights} />
      <BusStop />
      <Trees />
      <Cars
        luzVehicular={luzVehicular}
        luzPeatonal={luzPeatonal}
        modo={modo}
        nightLights={nightLights}
      />
      <BusFleet
        luzVehicular={luzVehicular}
        luzPeatonal={luzPeatonal}
        modo={modo}
        onPassengersAlight={onPassengersAlight}
        nightLights={nightLights}
      />
      <TrafficLights3D
        luzVehicular={luzVehicular}
        luzPeatonal={luzPeatonal}
        tiempoRestante={tiempoRestante}
        modo={modo}
        sensorActivo={modo === 'REPOSO'}
      />

      {agents.map((a) => (
        <Pedestrian
          key={`${a.id}-${a.trip}`}
          id={a.id}
          color={a.color}
          speed={a.speed}
          route={a.route}
          phase={a.phase}
          crossingAllowed={crossingAllowed}
          onPhaseEvent={onPhaseEvent}
          resumePos={a.pos}
          resumeCrossStage={a.crossStage || 0}
          resumeDoorStage={a.doorStage || 0}
          onPose={onPose}
        />
      ))}

      <mesh position={[0.2, 0.175, 7.85]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.9, 24]} />
        <meshStandardMaterial
          color="#2dd4bf"
          transparent
          opacity={0.28}
          emissive="#2dd4bf"
          emissiveIntensity={0.3}
        />
      </mesh>

      <OrbitControls
        enablePan={false}
        minDistance={8}
        maxDistance={55}
        minPolarAngle={0.12}
        maxPolarAngle={Math.PI / 2.05}
        target={[0, 0.8, 0]}
      />
    </>
  );
}

export function StreetScene({
  estado,
  tiempoRestante = 0,
  agents,
  onPhaseEvent,
  onPose,
  onPassengersAlight,
  ambienceMode = 'day',
}) {
  return (
    <div className="sim3d-canvas">
      <Canvas
        shadows="percentage"
        camera={{ position: [14, 10, 16], fov: 42 }}
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
      >
        <SceneContent
          estado={estado}
          tiempoRestante={tiempoRestante}
          agents={agents}
          onPhaseEvent={onPhaseEvent}
          onPose={onPose}
          onPassengersAlight={onPassengersAlight}
          ambienceMode={ambienceMode}
        />
      </Canvas>
    </div>
  );
}
