import {
  ALPHA_0,
  CD_0,
  CL_ALPHA,
  CL_MAX,
  CL_MAX_NEG,
  GRAVITY,
  K_DRAG,
  MASS,
  MAX_PITCH_RATE,
  MAX_ROLL_RATE,
  MAX_YAW_RATE,
  PITCH_DAMP,
  RHO,
  ROLL_DAMP,
  RUDDER_COORDINATION,
  SIDE_DRAG_FACTOR,
  STALL_ALPHA_NEG,
  STALL_ALPHA_POS,
  WEATHERVANE_STRENGTH,
  WING_AREA_S,
  YAW_DAMP,
} from "./constants";
import * as THREE from "three";

export interface GliderState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  quaternion: THREE.Quaternion;
  angularVelocity: THREE.Vector3;
}

export interface ControlInput {
  pitch: number; // -1 to 1 (elevator)
  roll: number; // -1 to 1 (aileron)
  yaw: number; // -1 to 1 (rudder)
}

export interface WindField {
  horizontal: THREE.Vector3;
  vertical: number; // thermal uplift
}

// Get the forward direction of the glider (nose points +Z in local space)
export function getForwardVector(quaternion: THREE.Quaternion): THREE.Vector3 {
  const forward = new THREE.Vector3(0, 0, 1);
  forward.applyQuaternion(quaternion);
  return forward;
}

// Get the up direction of the glider (wing normal)
export function getUpVector(quaternion: THREE.Quaternion): THREE.Vector3 {
  const up = new THREE.Vector3(0, 1, 0);
  up.applyQuaternion(quaternion);
  return up;
}

// Get the right direction of the glider
export function getRightVector(quaternion: THREE.Quaternion): THREE.Vector3 {
  const right = new THREE.Vector3(1, 0, 0);
  right.applyQuaternion(quaternion);
  return right;
}

// Calculate angle of attack (alpha)
export function calculateAngleOfAttack(velocity: THREE.Vector3, quaternion: THREE.Quaternion): number {
  const forward = getForwardVector(quaternion);
  const up = getUpVector(quaternion);

  // Project velocity onto the plane defined by forward and up
  const airspeed = velocity.length();
  if (airspeed < 0.1) return 0;

  const velocityNorm = velocity.clone().normalize();

  // Angle of attack is the angle between velocity and forward, projected onto the pitch plane
  // Positive alpha = nose above velocity vector (pitching up)
  const forwardComponent = velocityNorm.dot(forward);
  const upComponent = velocityNorm.dot(up);

  // AoA is positive when nose is above the relative wind
  return Math.atan2(-upComponent, forwardComponent);
}

// Calculate coefficient of lift based on angle of attack
export function calculateCL(alpha: number): number {
  // Check for stall
  if (alpha > STALL_ALPHA_POS) {
    // Post-stall: taper down
    const stallExcess = alpha - STALL_ALPHA_POS;
    const postStallFactor = Math.max(0.5, 1 - stallExcess * 3);
    return CL_MAX * postStallFactor;
  }

  if (alpha < STALL_ALPHA_NEG) {
    // Negative stall
    const stallExcess = STALL_ALPHA_NEG - alpha;
    const postStallFactor = Math.max(0.5, 1 - stallExcess * 3);
    return -CL_MAX_NEG * postStallFactor;
  }

  // Linear region
  const cl = CL_ALPHA * (alpha - ALPHA_0);
  return Math.max(-CL_MAX_NEG, Math.min(CL_MAX, cl));
}

// Calculate coefficient of drag based on CL
export function calculateCD(cl: number): number {
  return CD_0 + K_DRAG * cl * cl;
}

// Calculate aerodynamic forces
export function calculateAeroForces(
  velocity: THREE.Vector3,
  quaternion: THREE.Quaternion,
  windField: WindField,
): { lift: THREE.Vector3; drag: THREE.Vector3; sideForce: THREE.Vector3 } {
  // Calculate air-relative velocity
  const windVector = windField.horizontal.clone();
  windVector.y += windField.vertical;
  const airVelocity = velocity.clone().sub(windVector);
  const airspeed = airVelocity.length();

  if (airspeed < 0.5) {
    return {
      lift: new THREE.Vector3(),
      drag: new THREE.Vector3(),
      sideForce: new THREE.Vector3(),
    };
  }

  // Dynamic pressure: q = 0.5 * rho * V^2
  const q = 0.5 * RHO * airspeed * airspeed;

  // Angle of attack
  const alpha = calculateAngleOfAttack(airVelocity, quaternion);

  // Coefficients
  const cl = calculateCL(alpha);
  const cd = calculateCD(cl);

  // Lift magnitude: L = q * S * CL
  const liftMag = q * WING_AREA_S * cl;

  // Drag magnitude: D = q * S * CD
  const dragMag = q * WING_AREA_S * cd;

  // Lift direction: perpendicular to velocity in the plane of the wing
  const airVelocityNorm = airVelocity.clone().normalize();

  // Lift is perpendicular to airflow and lies in the plane containing the wing's up vector
  // Use cross product to find lift direction
  const liftDir = airVelocityNorm.clone().cross(getRightVector(quaternion)).normalize();

  // Drag direction: opposite to airflow
  const dragDir = airVelocityNorm.clone().negate();

  // Calculate side force (sideslip drag)
  const right = getRightVector(quaternion);
  const sideComponent = airVelocity.dot(right);
  const sideForceMag = q * WING_AREA_S * Math.abs(sideComponent) * 0.1 * SIDE_DRAG_FACTOR;
  const sideForceDir = right.clone().multiplyScalar(-Math.sign(sideComponent));

  return {
    lift: liftDir.multiplyScalar(liftMag),
    drag: dragDir.multiplyScalar(dragMag),
    sideForce: sideForceDir.multiplyScalar(sideForceMag),
  };
}

// Apply control inputs to angular velocity
export function applyControlInputs(
  angularVelocity: THREE.Vector3,
  controls: ControlInput,
  deltaTime: number,
): THREE.Vector3 {
  const newAngularVel = angularVelocity.clone();

  // Target rates based on input
  // Positive roll input = roll right (right wing down from pilot view)
  const targetRollRate = controls.roll * MAX_ROLL_RATE;
  // Positive pitch input = pitch up (nose rises)
  const targetPitchRate = -controls.pitch * MAX_PITCH_RATE;
  // Manual rudder input + optional auto-coordination from roll
  // Positive yaw input = nose goes right (negate because +Y rotation is CCW from above)
  const autoYaw = controls.roll * MAX_YAW_RATE * RUDDER_COORDINATION;
  const manualYaw = -controls.yaw * MAX_YAW_RATE;
  const targetYawRate = manualYaw + autoYaw;

  // Smoothly interpolate towards target rates
  const rollResponse = 5.0; // responsiveness
  const pitchResponse = 4.0;
  const yawResponse = 4.0;

  newAngularVel.z += (targetRollRate - newAngularVel.z) * rollResponse * deltaTime;
  newAngularVel.x += (targetPitchRate - newAngularVel.x) * pitchResponse * deltaTime;
  newAngularVel.y += (targetYawRate - newAngularVel.y) * yawResponse * deltaTime;

  return newAngularVel;
}

// Apply damping to angular velocity
export function applyDamping(angularVelocity: THREE.Vector3, deltaTime: number): THREE.Vector3 {
  const damped = angularVelocity.clone();

  damped.x *= 1 - PITCH_DAMP * deltaTime * 10;
  damped.y *= 1 - YAW_DAMP * deltaTime * 10;
  damped.z *= 1 - ROLL_DAMP * deltaTime * 10;

  return damped;
}

// Apply weathervane effect (nose tends to align with airflow)
export function applyWeathervane(
  angularVelocity: THREE.Vector3,
  velocity: THREE.Vector3,
  quaternion: THREE.Quaternion,
  deltaTime: number,
): THREE.Vector3 {
  const airspeed = velocity.length();
  if (airspeed < 5) return angularVelocity;

  const velocityNorm = velocity.clone().normalize();

  // Calculate sideslip (how much velocity is to the side of where nose points)
  const right = getRightVector(quaternion);
  const sideslip = velocityNorm.dot(right);

  // Only apply weathervane if there's significant sideslip
  if (Math.abs(sideslip) < 0.01) return angularVelocity;

  // Calculate target yaw rate to correct sideslip (proportional control)
  // Scale by airspeed - more effective at higher speeds
  const speedFactor = Math.min(1, airspeed / 30);
  const targetYawRate = -sideslip * WEATHERVANE_STRENGTH * speedFactor;

  // Blend towards target yaw rate (not accumulate)
  const newAngularVel = angularVelocity.clone();
  newAngularVel.y += (targetYawRate - newAngularVel.y) * deltaTime * 3;

  return newAngularVel;
}

// Main physics step
export function updatePhysics(
  state: GliderState,
  controls: ControlInput,
  windField: WindField,
  deltaTime: number,
): GliderState {
  // Clamp deltaTime to prevent instability
  const dt = Math.min(deltaTime, 0.05);

  // Calculate forces
  const gravity = new THREE.Vector3(0, -GRAVITY * MASS, 0);
  const aeroForces = calculateAeroForces(state.velocity, state.quaternion, windField);

  // Total force
  const totalForce = new THREE.Vector3()
    .add(gravity)
    .add(aeroForces.lift)
    .add(aeroForces.drag)
    .add(aeroForces.sideForce);

  // Acceleration
  const acceleration = totalForce.divideScalar(MASS);

  // Update velocity
  const newVelocity = state.velocity.clone().add(acceleration.multiplyScalar(dt));

  // Update position
  const newPosition = state.position.clone().add(newVelocity.clone().multiplyScalar(dt));

  // Update angular velocity with controls
  let newAngularVel = applyControlInputs(state.angularVelocity, controls, dt);
  newAngularVel = applyDamping(newAngularVel, dt);
  newAngularVel = applyWeathervane(newAngularVel, newVelocity, state.quaternion, dt);

  // Calculate air-relative velocity including thermal vertical wind
  const fullWindVector = windField.horizontal.clone();
  fullWindVector.y += windField.vertical;
  const airVelocity = state.velocity.clone().sub(fullWindVector);
  const alpha = calculateAngleOfAttack(airVelocity, state.quaternion);

  // Pitch stability: glider naturally resists changes in angle of attack
  // This prevents thermals from pitching the nose up excessively
  // Target alpha is around 4 degrees (optimal glide)
  const targetAlpha = 4 * (Math.PI / 180);
  const alphaError = alpha - targetAlpha;
  // Only apply stability correction for significant AoA deviations, and not when player is actively pitching
  if (Math.abs(alphaError) > 2 * (Math.PI / 180) && Math.abs(controls.pitch) < 0.3) {
    // Gentle pitch correction towards target alpha
    // Positive alphaError (nose too high) -> pitch down (positive angularVel.x)
    const stabilityCorrection = alphaError * 0.5; // Proportional correction
    newAngularVel.x += stabilityCorrection * dt * 3;
  }

  // Stall nose-drop: when stalled, the nose should drop to recover
  // Note: In this coordinate system, positive angularVel.x = pitch DOWN
  if (alpha > STALL_ALPHA_POS) {
    // Positive stall (nose too high) - pitch nose DOWN (positive pitch rate)
    const stallSeverity = (alpha - STALL_ALPHA_POS) / (Math.PI / 18); // ~10 degrees past stall = full effect
    const noseDropRate = 1.5 * Math.min(1, stallSeverity); // Positive = pitch down
    newAngularVel.x += noseDropRate * dt * 5;
  } else if (alpha < STALL_ALPHA_NEG) {
    // Negative stall (nose too low) - pitch nose UP (negative pitch rate)
    const stallSeverity = (STALL_ALPHA_NEG - alpha) / (Math.PI / 18);
    const noseUpRate = -1.5 * Math.min(1, stallSeverity); // Negative = pitch up
    newAngularVel.x += noseUpRate * dt * 5;
  }

  // Update orientation
  const newQuaternion = state.quaternion.clone();

  // Create rotation quaternion from angular velocity
  if (newAngularVel.length() > 0.0001) {
    // Get local axes
    const localAngular = new THREE.Vector3(newAngularVel.x, newAngularVel.y, newAngularVel.z);

    // Create rotation deltas in local space
    const pitchQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), localAngular.x * dt);
    const yawQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), localAngular.y * dt);
    const rollQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), localAngular.z * dt);

    // Apply rotations in local space
    newQuaternion.multiply(pitchQ).multiply(yawQ).multiply(rollQ);
    newQuaternion.normalize();
  }

  // Ground collision (simple)
  if (newPosition.y < 5) {
    newPosition.y = 5;
    if (newVelocity.y < 0) {
      newVelocity.y = 0;
      // Add some friction when on ground
      newVelocity.x *= 0.98;
      newVelocity.z *= 0.98;
    }
  }

  return {
    position: newPosition,
    velocity: newVelocity,
    quaternion: newQuaternion,
    angularVelocity: newAngularVel,
  };
}

// Get telemetry data for HUD
export function getTelemetry(
  state: GliderState,
  windField: WindField,
): {
  airspeed: number;
  groundSpeed: number;
  altitude: number;
  verticalSpeed: number;
  heading: number;
  bankAngle: number;
  pitchAngle: number;
  angleOfAttack: number;
  isStalling: boolean;
} {
  const windVector = windField.horizontal.clone();
  windVector.y += windField.vertical;
  const airVelocity = state.velocity.clone().sub(windVector);
  const airspeed = airVelocity.length();

  const forward = getForwardVector(state.quaternion);
  const right = getRightVector(state.quaternion);

  // Heading (yaw angle from north, +Z is north)
  const heading = Math.atan2(forward.x, forward.z) * (180 / Math.PI);

  // Bank angle: how much the right wing points up or down (independent of heading)
  // Positive = right wing down = right bank
  const bankAngle = Math.asin(right.y) * (180 / Math.PI);

  // Pitch angle (positive = nose up)
  const pitchAngle = Math.asin(forward.y) * (180 / Math.PI);

  const alpha = calculateAngleOfAttack(airVelocity, state.quaternion);
  const isStalling = alpha > STALL_ALPHA_POS || alpha < STALL_ALPHA_NEG;

  return {
    airspeed,
    groundSpeed: Math.sqrt(state.velocity.x ** 2 + state.velocity.z ** 2),
    altitude: state.position.y,
    verticalSpeed: state.velocity.y,
    heading: (heading + 360) % 360,
    bankAngle,
    pitchAngle,
    angleOfAttack: alpha * (180 / Math.PI),
    isStalling,
  };
}

// Create initial glider state
export function createInitialState(position?: THREE.Vector3, heading?: number): GliderState {
  const pos = position || new THREE.Vector3(0, 500, 0);
  const quat = new THREE.Quaternion();

  if (heading !== undefined) {
    quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), heading);
  }

  // Start with some forward velocity (30 m/s)
  const initialSpeed = 30;
  const forward = new THREE.Vector3(0, 0, initialSpeed);
  forward.applyQuaternion(quat);

  return {
    position: pos,
    velocity: forward,
    quaternion: quat,
    angularVelocity: new THREE.Vector3(),
  };
}
