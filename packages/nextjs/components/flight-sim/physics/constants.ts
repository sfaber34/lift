// Physics Constants for Glider Flight Simulation

// Atmosphere
export const RHO = 1.225; // kg/m³ (air density at sea level)
export const GRAVITY = 9.81; // m/s²

// Glider airframe
export const MASS = 420; // kg (pilot + glider)
export const WING_AREA_S = 16.0; // m²
export const WINGSPAN_B = 15.0; // m
export const ASPECT_RATIO_AR = (WINGSPAN_B * WINGSPAN_B) / WING_AREA_S; // ~14.06

// Lift curve (C_L vs alpha)
export const ALPHA_0 = -2 * (Math.PI / 180); // zero-lift angle in radians
export const CL_ALPHA = 5.5; // per radian (typical)
export const CL_MAX = 1.2; // pre-stall peak
export const CL_MAX_NEG = 0.9; // negative stall max
export const STALL_ALPHA_POS = 12 * (Math.PI / 180); // +12° in radians
export const STALL_ALPHA_NEG = -10 * (Math.PI / 180); // -10° in radians

// Drag polar
export const CD_0 = 0.018; // parasitic drag (clean glider)
export const K_DRAG = 0.045; // induced drag coefficient
// Alternative: OSWALD_E = 0.85, K_DRAG = 1 / (Math.PI * OSWALD_E * ASPECT_RATIO_AR)

// Damping (for stability without full aero derivatives)
export const SIDE_DRAG_FACTOR = 2.5;
export const ROLL_DAMP = 0.15;
export const PITCH_DAMP = 0.12;
export const YAW_DAMP = 0.25; // Increased to stabilize yaw
export const WEATHERVANE_STRENGTH = 0.3; // Reduced to prevent yaw oscillation

// Control effectiveness
export const MAX_ROLL_RATE = 70 * (Math.PI / 180); // rad/s
export const MAX_PITCH_RATE = 35 * (Math.PI / 180); // rad/s
export const MAX_YAW_RATE = 25 * (Math.PI / 180); // rad/s
export const RUDDER_COORDINATION = 0; // Auto-rudder mix ratio (yaw per roll input)

// Thermal defaults
export const THERMAL_COUNT = 20;
export const THERMAL_CORE_RADIUS = 350; // m
export const THERMAL_OUTER_RADIUS = 600; // m
export const THERMAL_W_MAX = 20; // m/s (strong thermal)
export const THERMAL_W_MIN = 10; // m/s (weak thermal)
export const THERMAL_SINK_PEAK_RADIUS = 250; // m
export const THERMAL_SINK_WIDTH = 120; // m
export const CLOUD_BASE = 1200; // m AGL
export const THERMAL_TURBULENCE_AMPLITUDE = 0.3; // m/s

// Wind
export const WIND_SPEED = 6; // m/s (~12 knots)
export const WIND_DIRECTION = Math.PI / 4; // radians (NE wind)
export const THERMAL_DRIFT_FACTOR = 0.7; // thermals move at 0.7 * windSpeed

// World bounds
export const WORLD_SIZE = 10000; // m
export const TERRAIN_SCALE = 100; // height multiplier for terrain
