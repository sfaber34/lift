import {
  CLOUD_BASE,
  THERMAL_CORE_RADIUS,
  THERMAL_COUNT,
  THERMAL_DRIFT_FACTOR,
  THERMAL_OUTER_RADIUS,
  THERMAL_SINK_PEAK_RADIUS,
  THERMAL_SINK_WIDTH,
  THERMAL_TURBULENCE_AMPLITUDE,
  THERMAL_W_MAX,
  THERMAL_W_MIN,
  WIND_DIRECTION,
  WIND_SPEED,
  WORLD_SIZE,
} from "./constants";
import * as THREE from "three";

export interface Thermal {
  id: string;
  center: THREE.Vector2;
  radius: number;
  strength: number;
  age: number;
  lifetime: number;
}

export interface ThermalSystemState {
  thermals: Thermal[];
  wind: THREE.Vector3;
  time: number;
}

// Create a new thermal at a random position
function createThermal(existingThermals: Thermal[]): Thermal {
  // Try to find a position not too close to existing thermals
  let center: THREE.Vector2;
  let attempts = 0;

  do {
    center = new THREE.Vector2((Math.random() - 0.5) * WORLD_SIZE * 0.8, (Math.random() - 0.5) * WORLD_SIZE * 0.8);
    attempts++;
  } while (attempts < 10 && existingThermals.some(t => t.center.distanceTo(center) < THERMAL_OUTER_RADIUS * 2));

  // Vary the strength and size
  const strength = THERMAL_W_MIN + Math.random() * (THERMAL_W_MAX - THERMAL_W_MIN);
  const radius = THERMAL_CORE_RADIUS * (0.8 + Math.random() * 0.4);

  return {
    id: Math.random().toString(36).substring(7),
    center,
    radius,
    strength,
    age: 0,
    lifetime: 180 + Math.random() * 300, // 3-8 minutes
  };
}

// Initialize thermal system
export function createThermalSystem(): ThermalSystemState {
  const thermals: Thermal[] = [];

  for (let i = 0; i < THERMAL_COUNT; i++) {
    thermals.push(createThermal(thermals));
  }

  // Horizontal wind
  const wind = new THREE.Vector3(Math.sin(WIND_DIRECTION) * WIND_SPEED, 0, Math.cos(WIND_DIRECTION) * WIND_SPEED);

  return {
    thermals,
    wind,
    time: 0,
  };
}

// Update thermal system (drift, spawn/despawn)
export function updateThermalSystem(state: ThermalSystemState, deltaTime: number): ThermalSystemState {
  const newTime = state.time + deltaTime;

  // Update thermal positions (drift with wind)
  const driftX = state.wind.x * THERMAL_DRIFT_FACTOR * deltaTime;
  const driftZ = state.wind.z * THERMAL_DRIFT_FACTOR * deltaTime;

  const updatedThermals: Thermal[] = [];

  for (const thermal of state.thermals) {
    const newAge = thermal.age + deltaTime;

    // Check if thermal should die
    if (newAge > thermal.lifetime) {
      continue;
    }

    // Update position with drift
    const newCenter = thermal.center.clone();
    newCenter.x += driftX;
    newCenter.y += driftZ;

    // Wrap around world bounds
    const halfWorld = WORLD_SIZE / 2;
    if (newCenter.x > halfWorld) newCenter.x -= WORLD_SIZE;
    if (newCenter.x < -halfWorld) newCenter.x += WORLD_SIZE;
    if (newCenter.y > halfWorld) newCenter.y -= WORLD_SIZE;
    if (newCenter.y < -halfWorld) newCenter.y += WORLD_SIZE;

    updatedThermals.push({
      ...thermal,
      center: newCenter,
      age: newAge,
    });
  }

  // Spawn new thermals if needed
  while (updatedThermals.length < THERMAL_COUNT) {
    updatedThermals.push(createThermal(updatedThermals));
  }

  return {
    thermals: updatedThermals,
    wind: state.wind,
    time: newTime,
  };
}

// Calculate vertical wind velocity at a position
export function getVerticalWindAt(position: THREE.Vector3, thermalSystem: ThermalSystemState): number {
  let totalW = 0;
  const pos2D = new THREE.Vector2(position.x, position.z);

  // Base sink rate (air generally sinks outside thermals)
  const baseSink = -0.3;
  totalW += baseSink;

  for (const thermal of thermalSystem.thermals) {
    const r = pos2D.distanceTo(thermal.center);

    // Height fade (thermals weaken above cloud base)
    let heightFactor = 1;
    if (position.y > CLOUD_BASE) {
      heightFactor = Math.max(0, 1 - (position.y - CLOUD_BASE) / 400);
    }
    // Also fade near ground (thermals need altitude to develop)
    if (position.y < 100) {
      heightFactor *= position.y / 100;
    }

    // Age factor (thermals ramp up and then die)
    const lifeFraction = thermal.age / thermal.lifetime;
    let ageFactor = 1;
    if (lifeFraction < 0.1) {
      ageFactor = lifeFraction / 0.1; // Ramp up
    } else if (lifeFraction > 0.8) {
      ageFactor = (1 - lifeFraction) / 0.2; // Fade out
    }

    // Updraft (Gaussian core)
    const coreW = thermal.strength * Math.exp(-(r * r) / (thermal.radius * thermal.radius));

    // Sink ring around thermal
    const sinkW =
      thermal.strength *
      0.4 *
      Math.exp(-Math.pow(r - THERMAL_SINK_PEAK_RADIUS, 2) / (THERMAL_SINK_WIDTH * THERMAL_SINK_WIDTH));

    // Total contribution from this thermal
    const thermalContribution = (coreW - sinkW) * heightFactor * ageFactor;
    totalW += thermalContribution;
  }

  // Add small turbulence
  const turbulence =
    Math.sin(thermalSystem.time * 2 + position.x * 0.01) *
    Math.cos(thermalSystem.time * 1.5 + position.z * 0.01) *
    THERMAL_TURBULENCE_AMPLITUDE;
  totalW += turbulence;

  return totalW;
}

// Get full wind field at a position (including thermals)
export function getWindFieldAt(
  position: THREE.Vector3,
  thermalSystem: ThermalSystemState,
): { horizontal: THREE.Vector3; vertical: number } {
  // Horizontal wind with slight altitude shear
  const shearFactor = 1 + (position.y / 1000) * 0.1;
  const horizontal = thermalSystem.wind.clone().multiplyScalar(shearFactor);

  const vertical = getVerticalWindAt(position, thermalSystem);

  return { horizontal, vertical };
}

// Get thermal strength indicator for HUD/audio cues
export function getThermalStrengthAt(
  position: THREE.Vector3,
  thermalSystem: ThermalSystemState,
): { strength: number; inCore: boolean } {
  const verticalWind = getVerticalWindAt(position, thermalSystem);

  return {
    strength: verticalWind,
    inCore: verticalWind > 1.5,
  };
}

// Find nearest thermal center for navigation hints
export function findNearestThermal(
  position: THREE.Vector3,
  thermalSystem: ThermalSystemState,
): { distance: number; direction: THREE.Vector2; thermal: Thermal | null } {
  if (thermalSystem.thermals.length === 0) {
    return {
      distance: Infinity,
      direction: new THREE.Vector2(),
      thermal: null,
    };
  }

  const pos2D = new THREE.Vector2(position.x, position.z);
  let nearestDist = Infinity;
  let nearestThermal: Thermal | null = null;

  for (const thermal of thermalSystem.thermals) {
    const dist = pos2D.distanceTo(thermal.center);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestThermal = thermal;
    }
  }

  const direction = nearestThermal ? nearestThermal.center.clone().sub(pos2D).normalize() : new THREE.Vector2();

  return {
    distance: nearestDist,
    direction,
    thermal: nearestThermal,
  };
}
