"use client";

import { useCallback, useRef, useState } from "react";
import { ControlInput, GliderState, createInitialState, getTelemetry, updatePhysics } from "./physics/FlightPhysics";
import { ThermalSystemState, createThermalSystem, getWindFieldAt, updateThermalSystem } from "./physics/ThermalSystem";
import { HUD } from "./ui/HUD";
import { ControlsHelp, JoystickControls, ResetButton } from "./ui/JoystickControls";
import { AtmosphericEffects, GameSky } from "./world/Sky";
import { Terrain, Water } from "./world/Terrain";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Game state manager component (runs inside Canvas)
function GameLoop({
  controls,
  gliderStateRef,
  thermalSystemRef,
  onTelemetryUpdate,
}: {
  controls: React.MutableRefObject<ControlInput>;
  gliderStateRef: React.MutableRefObject<GliderState>;
  thermalSystemRef: React.MutableRefObject<ThermalSystemState>;
  onTelemetryUpdate: (telemetry: ReturnType<typeof getTelemetry>) => void;
}) {
  const lastThermalUpdateRef = useRef(0);
  const telemetryUpdateRef = useRef(0);

  useFrame((_, delta) => {
    // Get wind at current position
    const windField = getWindFieldAt(gliderStateRef.current.position, thermalSystemRef.current);

    // Update physics - mutate the ref directly, no React re-render
    const newState = updatePhysics(gliderStateRef.current, controls.current, windField, delta);

    // Update ref values directly (no setState = no re-render)
    gliderStateRef.current.position.copy(newState.position);
    gliderStateRef.current.velocity.copy(newState.velocity);
    gliderStateRef.current.quaternion.copy(newState.quaternion);
    gliderStateRef.current.angularVelocity.copy(newState.angularVelocity);

    // Update thermals periodically
    lastThermalUpdateRef.current += delta;
    if (lastThermalUpdateRef.current > 0.5) {
      thermalSystemRef.current = updateThermalSystem(thermalSystemRef.current, lastThermalUpdateRef.current);
      lastThermalUpdateRef.current = 0;
    }

    // Update telemetry less frequently (10 times per second) to avoid re-render spam
    telemetryUpdateRef.current += delta;
    if (telemetryUpdateRef.current > 0.1) {
      const telemetry = getTelemetry(gliderStateRef.current, windField);
      onTelemetryUpdate(telemetry);
      telemetryUpdateRef.current = 0;
    }
  });

  return (
    <>
      {/* Glider - reads from ref */}
      <GliderRenderer gliderStateRef={gliderStateRef} />
      <GliderCameraController gliderStateRef={gliderStateRef} />

      {/* World */}
      <TerrainRenderer gliderStateRef={gliderStateRef} />
      <Water />
      <SkyRenderer thermalSystemRef={thermalSystemRef} />
      <AtmosphericEffects />
    </>
  );
}

// Glider renderer that reads from ref
function GliderRenderer({ gliderStateRef }: { gliderStateRef: React.MutableRefObject<GliderState> }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.copy(gliderStateRef.current.position);
      groupRef.current.quaternion.copy(gliderStateRef.current.quaternion);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Fuselage - nose points towards +Z */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.3, 8, 8]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Nose cone - at +Z */}
      <mesh position={[0, 0, 4.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.3, 1.5, 8]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Canopy - near nose */}
      <mesh position={[0, 0.3, 1.5]}>
        <sphereGeometry args={[0.5, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#3399ff" transparent opacity={0.6} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Main wing */}
      <mesh position={[0, 0.1, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[15, 0.15, 1.2]} />
        <meshStandardMaterial color="#ffffff" metalness={0.2} roughness={0.8} />
      </mesh>

      {/* Wing tips (slightly curved up) */}
      <mesh position={[-7.8, 0.4, 0]} rotation={[0, 0, 0.15]}>
        <boxGeometry args={[0.8, 0.1, 0.8]} />
        <meshStandardMaterial color="#ffffff" metalness={0.2} roughness={0.8} />
      </mesh>
      <mesh position={[7.8, 0.4, 0]} rotation={[0, 0, -0.15]}>
        <boxGeometry args={[0.8, 0.1, 0.8]} />
        <meshStandardMaterial color="#ffffff" metalness={0.2} roughness={0.8} />
      </mesh>

      {/* Horizontal stabilizer - at tail (-Z) */}
      <mesh position={[0, 0.1, -3.5]} rotation={[0, 0, 0]}>
        <boxGeometry args={[3.5, 0.08, 0.6]} />
        <meshStandardMaterial color="#ffffff" metalness={0.2} roughness={0.8} />
      </mesh>

      {/* Vertical stabilizer */}
      <mesh position={[0, 0.7, -3.2]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.08, 1.2, 0.8]} />
        <meshStandardMaterial color="#ffffff" metalness={0.2} roughness={0.8} />
      </mesh>

      {/* Tail fin top */}
      <mesh position={[0, 1.3, -3.5]} rotation={[-0.2, 0, 0]}>
        <boxGeometry args={[0.06, 0.3, 0.4]} />
        <meshStandardMaterial color="#ff3333" metalness={0.2} roughness={0.8} />
      </mesh>
    </group>
  );
}

// Camera controller that reads from ref
function GliderCameraController({ gliderStateRef }: { gliderStateRef: React.MutableRefObject<GliderState> }) {
  const smoothPosRef = useRef(new THREE.Vector3());
  const smoothLookRef = useRef(new THREE.Vector3());
  const initialized = useRef(false);

  useFrame(({ camera }) => {
    const state = gliderStateRef.current;

    // Calculate camera position behind and above the glider
    const offset = new THREE.Vector3(0, 4, -18);
    offset.applyQuaternion(state.quaternion);
    const targetPos = state.position.clone().add(offset);

    // Look at a point slightly ahead of the glider
    const lookOffset = new THREE.Vector3(0, 1, 30);
    lookOffset.applyQuaternion(state.quaternion);
    const lookTarget = state.position.clone().add(lookOffset);

    // Initialize on first frame
    if (!initialized.current) {
      smoothPosRef.current.copy(targetPos);
      smoothLookRef.current.copy(lookTarget);
      initialized.current = true;
    }

    // Smooth camera follow
    smoothPosRef.current.lerp(targetPos, 0.05);
    smoothLookRef.current.lerp(lookTarget, 0.05);

    camera.position.copy(smoothPosRef.current);
    camera.lookAt(smoothLookRef.current);
  });

  return null;
}

// Terrain that reads position from ref
function TerrainRenderer({ gliderStateRef }: { gliderStateRef: React.MutableRefObject<GliderState> }) {
  const posRef = useRef(new THREE.Vector3());

  useFrame(() => {
    posRef.current.copy(gliderStateRef.current.position);
  });

  return <Terrain playerPosition={posRef.current} />;
}

// Sky that reads thermal system from ref
function SkyRenderer({ thermalSystemRef }: { thermalSystemRef: React.MutableRefObject<ThermalSystemState> }) {
  return <GameSky thermalSystem={thermalSystemRef.current} />;
}

// Main game component
export function FlightSimGame() {
  // Control input ref
  const controlsRef = useRef<ControlInput>({ pitch: 0, roll: 0, yaw: 0 });

  // Game state as refs (no re-renders during physics!)
  const gliderStateRef = useRef<GliderState>(createInitialState(new THREE.Vector3(0, 500, 0), 0));
  const thermalSystemRef = useRef<ThermalSystemState>(createThermalSystem());

  // Reset trigger to force re-initialization
  const [resetTrigger, setResetTrigger] = useState(0);

  // Telemetry state for HUD (this can use useState since it updates less frequently)
  const [telemetry, setTelemetry] = useState({
    airspeed: 30,
    groundSpeed: 30,
    altitude: 500,
    verticalSpeed: 0,
    heading: 0,
    bankAngle: 0,
    pitchAngle: 0,
    angleOfAttack: 0,
    isStalling: false,
  });

  // UI state
  const [showHelp, setShowHelp] = useState(true);

  // Handle control updates from joystick
  const handleControlUpdate = useCallback((input: ControlInput) => {
    controlsRef.current = input;
  }, []);

  // Handle telemetry updates (throttled in GameLoop)
  const handleTelemetryUpdate = useCallback((newTelemetry: ReturnType<typeof getTelemetry>) => {
    setTelemetry(newTelemetry);
  }, []);

  // Reset game
  const handleReset = useCallback(() => {
    gliderStateRef.current = createInitialState(new THREE.Vector3(0, 500, 0), 0);
    thermalSystemRef.current = createThermalSystem();
    setResetTrigger(t => t + 1);
  }, []);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* 3D Canvas */}
      <div className="absolute inset-0">
        <Canvas
          camera={{
            fov: 60,
            near: 1,
            far: 20000,
            position: [0, 510, 20],
          }}
          gl={{
            antialias: true,
            powerPreference: "high-performance",
          }}
        >
          <GameLoop
            key={resetTrigger}
            controls={controlsRef}
            gliderStateRef={gliderStateRef}
            thermalSystemRef={thermalSystemRef}
            onTelemetryUpdate={handleTelemetryUpdate}
          />
        </Canvas>
      </div>

      {/* HUD Overlay */}
      <HUD
        airspeed={telemetry.airspeed}
        altitude={telemetry.altitude}
        verticalSpeed={telemetry.verticalSpeed}
        heading={telemetry.heading}
        isStalling={telemetry.isStalling}
        bankAngle={telemetry.bankAngle}
        pitchAngle={telemetry.pitchAngle}
      />

      {/* Joystick Controls */}
      <JoystickControls onControlUpdate={handleControlUpdate} />

      {/* Reset Button */}
      <ResetButton onReset={handleReset} />

      {/* Help Button */}
      <button
        onClick={() => setShowHelp(true)}
        className="absolute top-4 right-24 px-3 py-2 bg-white/10 hover:bg-white/20 
                   text-white font-mono text-sm rounded-lg border border-white/20
                   transition-colors backdrop-blur-sm"
      >
        ?
      </button>

      {/* Help Overlay */}
      {showHelp && <ControlsHelp onClose={() => setShowHelp(false)} />}

      {/* Crash/Ground message */}
      {telemetry.altitude < 10 && (
        <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 bg-red-900/90 text-white px-6 py-4 rounded-xl">
          <div className="text-xl font-bold text-center mb-2">Landed!</div>
          <button
            onClick={handleReset}
            className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg font-mono transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Flight time display */}
      <div className="absolute bottom-4 left-4 text-white/60 font-mono text-xs">
        <div>ALT: {Math.round(telemetry.altitude)}m</div>
        <div>
          VS: {telemetry.verticalSpeed >= 0 ? "+" : ""}
          {telemetry.verticalSpeed.toFixed(1)} m/s
        </div>
      </div>
    </div>
  );
}
