"use client";

import { useRef } from "react";
import { Thermal, ThermalSystemState } from "../physics/ThermalSystem";
import { CLOUD_BASE } from "../physics/constants";
import { Sky as DreiSky } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface SkyProps {
  thermalSystem: ThermalSystemState;
}

// Cumulus cloud marker above thermals
function ThermalCloud({ thermal }: { thermal: Thermal }) {
  const cloudRef = useRef<THREE.Group>(null);
  const time = useRef(Math.random() * 100);

  useFrame((_, delta) => {
    time.current += delta;
    if (cloudRef.current) {
      // Gentle bobbing
      cloudRef.current.position.y = CLOUD_BASE + Math.sin(time.current * 0.5) * 10;
    }
  });

  // Calculate cloud opacity based on thermal age
  const lifeFraction = thermal.age / thermal.lifetime;
  let opacity = 0.8;
  if (lifeFraction < 0.15) {
    opacity = (lifeFraction / 0.15) * 0.8;
  } else if (lifeFraction > 0.7) {
    opacity = ((1 - lifeFraction) / 0.3) * 0.8;
  }

  // Scale based on thermal strength
  const scale = 0.8 + (thermal.strength / 3.5) * 0.4;

  return (
    <group
      ref={cloudRef}
      position={[thermal.center.x, CLOUD_BASE, thermal.center.y]}
      scale={[scale, scale * 0.6, scale]}
    >
      {/* Main cloud puffs */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[80, 16, 16]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={opacity} roughness={1} />
      </mesh>
      <mesh position={[60, -10, 20]}>
        <sphereGeometry args={[60, 12, 12]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={opacity * 0.9} roughness={1} />
      </mesh>
      <mesh position={[-50, -15, 30]}>
        <sphereGeometry args={[55, 12, 12]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={opacity * 0.9} roughness={1} />
      </mesh>
      <mesh position={[30, 20, -20]}>
        <sphereGeometry args={[50, 12, 12]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={opacity * 0.85} roughness={1} />
      </mesh>
      <mesh position={[-30, 15, -30]}>
        <sphereGeometry args={[45, 12, 12]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={opacity * 0.85} roughness={1} />
      </mesh>
    </group>
  );
}

// Thermal visualization - more visible rising air column
function ThermalColumn({ thermal }: { thermal: Thermal }) {
  const columnRef = useRef<THREE.Mesh>(null);
  const time = useRef(Math.random() * 100);

  useFrame((_, delta) => {
    time.current += delta;
    if (columnRef.current) {
      // Animate opacity - pulsing effect
      const material = columnRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.12 + Math.sin(time.current * 1.5) * 0.04;
    }
  });

  // Only show column when thermal is mature
  const lifeFraction = thermal.age / thermal.lifetime;
  if (lifeFraction < 0.1 || lifeFraction > 0.85) return null;

  // Stronger thermals are more visible
  const strengthFactor = thermal.strength / 3.5;

  return (
    <mesh ref={columnRef} position={[thermal.center.x, CLOUD_BASE / 2, thermal.center.y]}>
      <cylinderGeometry args={[thermal.radius * 0.6, thermal.radius * 1.0, CLOUD_BASE, 16, 1, true]} />
      <meshBasicMaterial
        color="#ffffee"
        transparent
        opacity={0.1 + strengthFactor * 0.08}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

export function GameSky({ thermalSystem }: SkyProps) {
  return (
    <>
      {/* Sky dome */}
      <DreiSky
        distance={450000}
        sunPosition={[5000, 2000, 1000]}
        inclination={0.6}
        azimuth={0.25}
        rayleigh={0.5}
        turbidity={8}
      />

      {/* Ambient and directional lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[1000, 1000, 500]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={5000}
        shadow-camera-left={-500}
        shadow-camera-right={500}
        shadow-camera-top={500}
        shadow-camera-bottom={-500}
      />

      {/* Clouds above thermals */}
      {thermalSystem.thermals.map(thermal => (
        <ThermalCloud key={thermal.id} thermal={thermal} />
      ))}

      {/* Subtle thermal columns (optional visualization) */}
      {thermalSystem.thermals.map(thermal => (
        <ThermalColumn key={`col-${thermal.id}`} thermal={thermal} />
      ))}
    </>
  );
}

// Simple fog for depth cue
export function AtmosphericEffects() {
  return <fog attach="fog" args={["#87ceeb", 500, 8000]} />;
}
