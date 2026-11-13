import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Cloud, OrbitControls, Sky } from '@react-three/drei';
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

function ToneMappingSetup() {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.05;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl]);
  return null;
}

function AtmosphereRig({ ambienceMode, onAtmosphere }) {
  const phaseRef = useRef(0);
  const accRef = useRef(0);
  const lightRef = useRef();
  const hemiRef = useRef();
  const ambRef = useRef();
  const [atm, setAtm] = useState(() =>
    sampleAtmosphere(ambienceMode === 'auto' ? 'day' : ambienceMode)
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
      setAtm(next);
      onAtmosphere?.(next);
    }
  });

  useEffect(() => {
    if (ambienceMode === 'auto') return;
    const next = sampleAtmosphere(ambienceMode);
    setAtm(next);
    onAtmosphere?.(next);
    applyLive(next);
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
        shadow-camera-far={70}
        shadow-camera-left={-28}
        shadow-camera-right={28}
        shadow-camera-top={28}
        shadow-camera-bottom={-28}
        shadow-bias={-0.00025}
      />
      <Cloud
        seed={2}
        position={[-18, 28, -36]}
        speed={0.08}
        opacity={atm.cloudOpacity}
        segments={14}
        bounds={[12, 2.2, 3]}
        volume={6}
        color="#f4f8fc"
      />
      <Cloud
        seed={7}
        position={[10, 30, -42]}
        speed={0.06}
        opacity={atm.cloudOpacity * 0.9}
        segments={12}
        bounds={[10, 2, 2.5]}
        volume={5}
        color="#eef4fa"
      />
      <Cloud
        seed={14}
        position={[22, 27, -28]}
        speed={0.05}
        opacity={atm.cloudOpacity * 0.85}
        segments={10}
        bounds={[9, 1.8, 2.2]}
        volume={4.5}
        color="#f7fafc"
      />
      <Cloud
        seed={21}
        position={[-8, 32, -48]}
        speed={0.07}
        opacity={atm.cloudOpacity * 0.75}
        segments={10}
        bounds={[8, 1.6, 2]}
        volume={4}
        color="#f0f5fa"
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
  // Luces derivadas del modo (fuente de verdad) por si el snapshot llega inconsistente
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
      <ToneMappingSetup />
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
        minDistance={10}
        maxDistance={42}
        maxPolarAngle={Math.PI / 2.12}
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
        shadows
        camera={{ position: [14, 10, 16], fov: 42 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
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
