"use client";

import { useRef } from "react";
import { GliderState } from "../physics/FlightPhysics";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface GliderProps {
  state: GliderState;
}

// Simple glider geometry made from primitives
export function Glider({ state }: GliderProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.copy(state.position);
      groupRef.current.quaternion.copy(state.quaternion);
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

      {/* Wing tips (slightly curved up) - positioned at wing ends */}
      <mesh position={[-7.9, 0.25, 0]} rotation={[0, 0, 0.2]}>
        <boxGeometry args={[1.0, 0.1, 0.8]} />
        <meshStandardMaterial color="#ffffff" metalness={0.2} roughness={0.8} />
      </mesh>
      <mesh position={[7.9, 0.25, 0]} rotation={[0, 0, -0.2]}>
        <boxGeometry args={[1.0, 0.1, 0.8]} />
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

// Camera that follows the glider
export function GliderCamera({ state }: GliderProps) {
  // Store smooth camera position and look target
  const smoothPosRef = useRef(new THREE.Vector3());
  const smoothLookRef = useRef(new THREE.Vector3());
  const initialized = useRef(false);

  useFrame(({ camera }) => {
    // Calculate camera position behind and above the glider
    // Behind is -Z since nose points +Z
    const offset = new THREE.Vector3(0, 4, -18);
    offset.applyQuaternion(state.quaternion);
    const targetPos = state.position.clone().add(offset);

    // Look at a point slightly ahead of the glider (+Z direction)
    const lookOffset = new THREE.Vector3(0, 1, 30);
    lookOffset.applyQuaternion(state.quaternion);
    const lookTarget = state.position.clone().add(lookOffset);

    // Initialize on first frame
    if (!initialized.current) {
      smoothPosRef.current.copy(targetPos);
      smoothLookRef.current.copy(lookTarget);
      initialized.current = true;
    }

    // Smooth camera follow with fixed lerp factor (frame-rate independent would be better but this works)
    const smoothFactor = 0.05;
    smoothPosRef.current.lerp(targetPos, smoothFactor);
    smoothLookRef.current.lerp(lookTarget, smoothFactor);

    // Apply smoothed values
    camera.position.copy(smoothPosRef.current);
    camera.lookAt(smoothLookRef.current);
  });

  return null;
}
