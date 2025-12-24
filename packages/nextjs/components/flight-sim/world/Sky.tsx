"use client";

import { useMemo, useRef } from "react";
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

// Rising particles inside thermal
function ThermalParticles({ thermal, radius }: { thermal: Thermal; radius: number }) {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = 150; // More particles for better visibility

  // Create particle positions
  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      // Random position within cylinder
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * radius * 0.9;
      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = Math.random() * CLOUD_BASE - CLOUD_BASE / 2;
      pos[i * 3 + 2] = Math.sin(angle) * r;
    }
    return pos;
  }, [radius]);

  useFrame((_, delta) => {
    if (particlesRef.current) {
      const posArray = particlesRef.current.geometry.attributes.position.array as Float32Array;
      const riseSpeed = thermal.strength * 8; // Rise speed based on thermal strength

      for (let i = 0; i < particleCount; i++) {
        // Move particles up
        posArray[i * 3 + 1] += riseSpeed * delta;

        // Reset particles that go above cloud base
        if (posArray[i * 3 + 1] > CLOUD_BASE / 2) {
          posArray[i * 3 + 1] = -CLOUD_BASE / 2 + Math.random() * 100;
          // Randomize horizontal position when resetting
          const angle = Math.random() * Math.PI * 2;
          const r = Math.random() * radius * 0.9;
          posArray[i * 3] = Math.cos(angle) * r;
          posArray[i * 3 + 2] = Math.sin(angle) * r;
        }
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#cc88ff" size={10} transparent opacity={0.7} sizeAttenuation depthWrite={false} />
    </points>
  );
}

// Thermal visualization - symmetrical rising air column with interior fill and particles
function ThermalColumn({ thermal }: { thermal: Thermal }) {
  // Refs for shading meshes (currently disabled)
  // const columnRef = useRef<THREE.Mesh>(null);
  // const fillRef = useRef<THREE.Mesh>(null);
  // const time = useRef(Math.random() * 100);

  // Animation for shading (currently disabled)
  // useFrame((_, delta) => {
  //   time.current += delta;
  //   if (columnRef.current) {
  //     // Animate opacity - pulsing effect
  //     const material = columnRef.current.material as THREE.MeshBasicMaterial;
  //     material.opacity = 0.15 + Math.sin(time.current * 1.5) * 0.05;
  //   }
  //   if (fillRef.current) {
  //     // Interior fill pulses gently
  //     const material = fillRef.current.material as THREE.MeshBasicMaterial;
  //     material.opacity = 0.04 + Math.sin(time.current * 2) * 0.02;
  //   }
  // });

  // Only show column when thermal is mature
  const lifeFraction = thermal.age / thermal.lifetime;
  if (lifeFraction < 0.1 || lifeFraction > 0.85) return null;

  // Stronger thermals are more visible
  const strengthFactor = thermal.strength / 3.5;
  const radius = thermal.radius * 0.8; // Symmetrical cylinder

  // Keep strengthFactor used to avoid lint warning
  void strengthFactor;

  return (
    <group position={[thermal.center.x, CLOUD_BASE / 2, thermal.center.y]}>
      {/* Outer boundary (visible edge) - DISABLED */}
      {/* <mesh ref={columnRef}>
        <cylinderGeometry args={[radius, radius, CLOUD_BASE, 24, 1, true]} />
        <meshBasicMaterial
          color="#ffffcc"
          transparent
          opacity={0.12 + strengthFactor * 0.06}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh> */}
      {/* Interior fill (visible when inside) - DISABLED */}
      {/* <mesh ref={fillRef}>
        <cylinderGeometry args={[radius * 0.95, radius * 0.95, CLOUD_BASE, 16]} />
        <meshBasicMaterial color="#ffeeaa" transparent opacity={0.05 + strengthFactor * 0.03} depthWrite={false} />
      </mesh> */}
      {/* Rising particles - ENABLED */}
      <ThermalParticles thermal={thermal} radius={radius} />
    </group>
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
