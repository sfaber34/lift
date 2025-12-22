"use client";

import { useMemo } from "react";
import { WORLD_SIZE } from "../physics/constants";
import * as THREE from "three";

interface TerrainProps {
  playerPosition: THREE.Vector3;
}

// Simple noise function for terrain generation
function noise2D(x: number, z: number, seed: number = 0): number {
  const X = Math.floor(x) & 255;
  const Z = Math.floor(z) & 255;

  // Simple hash
  const n = X + Z * 57 + seed;
  const hash = Math.sin(n * 12.9898 + n * 78.233) * 43758.5453;
  return (hash - Math.floor(hash)) * 2 - 1;
}

// Interpolated noise
function smoothNoise(x: number, z: number, seed: number = 0): number {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const fx = x - x0;
  const fz = z - z0;

  // Smoothstep
  const sx = fx * fx * (3 - 2 * fx);
  const sz = fz * fz * (3 - 2 * fz);

  const n00 = noise2D(x0, z0, seed);
  const n10 = noise2D(x0 + 1, z0, seed);
  const n01 = noise2D(x0, z0 + 1, seed);
  const n11 = noise2D(x0 + 1, z0 + 1, seed);

  const nx0 = n00 * (1 - sx) + n10 * sx;
  const nx1 = n01 * (1 - sx) + n11 * sx;

  return nx0 * (1 - sz) + nx1 * sz;
}

// Multi-octave noise for more natural terrain
function fbm(x: number, z: number, octaves: number = 4): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += smoothNoise(x * frequency, z * frequency, i * 100) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / maxValue;
}

// Get terrain height at a point
export function getTerrainHeight(x: number, z: number): number {
  const scale = 0.002; // Base terrain scale
  const height = fbm(x * scale, z * scale, 5);

  // Add some larger features
  const largeScale = 0.0005;
  const largeFeatures = fbm(x * largeScale, z * largeScale, 3) * 2;

  // Combine and scale
  const combinedHeight = (height + largeFeatures) * 80;

  // Add a base level
  return Math.max(0, combinedHeight + 20);
}

// Terrain chunk component
function TerrainChunk({
  chunkX,
  chunkZ,
  size,
  resolution,
}: {
  chunkX: number;
  chunkZ: number;
  size: number;
  resolution: number;
}) {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(size, size, resolution, resolution);
    const positions = geo.attributes.position.array as Float32Array;
    const colors = new Float32Array(positions.length);

    for (let i = 0; i < positions.length; i += 3) {
      const localX = positions[i];
      const localZ = positions[i + 1];

      const worldX = chunkX * size + localX;
      const worldZ = chunkZ * size + localZ;

      const height = getTerrainHeight(worldX, worldZ);
      positions[i + 2] = height;

      // Color based on height
      const normalizedHeight = Math.max(0, Math.min(1, height / 150));

      // Gradient from green valleys to brown/grey peaks
      if (normalizedHeight < 0.3) {
        // Low: green grass
        colors[i] = 0.2 + normalizedHeight * 0.3;
        colors[i + 1] = 0.5 + normalizedHeight * 0.2;
        colors[i + 2] = 0.15;
      } else if (normalizedHeight < 0.6) {
        // Mid: brownish
        const t = (normalizedHeight - 0.3) / 0.3;
        colors[i] = 0.35 + t * 0.2;
        colors[i + 1] = 0.55 - t * 0.15;
        colors[i + 2] = 0.15 + t * 0.1;
      } else {
        // High: rocky grey
        const t = (normalizedHeight - 0.6) / 0.4;
        colors[i] = 0.5 + t * 0.2;
        colors[i + 1] = 0.45 + t * 0.15;
        colors[i + 2] = 0.35 + t * 0.2;
      }
    }

    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    return geo;
  }, [chunkX, chunkZ, size, resolution]);

  return (
    <mesh
      geometry={geometry}
      position={[chunkX * size, 0, chunkZ * size]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <meshStandardMaterial vertexColors flatShading />
    </mesh>
  );
}

// Main terrain component with chunking
export function Terrain({ playerPosition }: TerrainProps) {
  const chunkSize = 500;
  const viewDistance = 3; // Number of chunks in each direction
  const resolution = 64;

  // Pre-calculate chunk coordinates for dependency array
  const centerChunkX = Math.round(playerPosition.x / chunkSize);
  const centerChunkZ = Math.round(playerPosition.z / chunkSize);

  // Calculate which chunks are visible
  const chunks = useMemo(() => {
    const visibleChunks: Array<{ x: number; z: number }> = [];

    for (let dx = -viewDistance; dx <= viewDistance; dx++) {
      for (let dz = -viewDistance; dz <= viewDistance; dz++) {
        visibleChunks.push({
          x: centerChunkX + dx,
          z: centerChunkZ + dz,
        });
      }
    }

    return visibleChunks;
  }, [centerChunkX, centerChunkZ]);

  return (
    <group>
      {chunks.map(chunk => (
        <TerrainChunk
          key={`${chunk.x}-${chunk.z}`}
          chunkX={chunk.x}
          chunkZ={chunk.z}
          size={chunkSize}
          resolution={resolution}
        />
      ))}
    </group>
  );
}

// Water plane for visual reference
export function Water() {
  return (
    <mesh position={[0, -5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[WORLD_SIZE * 2, WORLD_SIZE * 2]} />
      <meshStandardMaterial color="#1a4d7c" transparent opacity={0.8} metalness={0.6} roughness={0.3} />
    </mesh>
  );
}
