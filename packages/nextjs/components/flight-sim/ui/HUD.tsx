"use client";

import { useMemo } from "react";

interface HUDProps {
  airspeed: number;
  altitude: number;
  verticalSpeed: number;
  heading: number;
  isStalling: boolean;
  bankAngle: number;
  pitchAngle: number;
}

// Variometer component - shows vertical speed
function Variometer({ verticalSpeed }: { verticalSpeed: number }) {
  // Clamp display range
  const displayVS = Math.max(-10, Math.min(10, verticalSpeed));
  const percentage = ((displayVS + 10) / 20) * 100;

  // Color based on lift/sink
  const getColor = () => {
    if (verticalSpeed > 2) return "#22c55e"; // Strong lift - green
    if (verticalSpeed > 0.5) return "#86efac"; // Weak lift - light green
    if (verticalSpeed > -1) return "#fbbf24"; // Neutral - yellow
    if (verticalSpeed > -3) return "#f97316"; // Sink - orange
    return "#ef4444"; // Strong sink - red
  };

  // Generate tick marks
  const ticks = useMemo(() => {
    const marks = [];
    for (let i = -10; i <= 10; i += 2) {
      marks.push(i);
    }
    return marks;
  }, []);

  return (
    <div className="relative h-48 w-12 bg-black/70 rounded-lg border border-white/30 overflow-hidden">
      {/* Title */}
      <div className="absolute top-1 left-0 right-0 text-center text-[8px] text-white/60 font-mono">VARIO</div>

      {/* Scale */}
      <div className="absolute top-5 bottom-5 left-1 right-6 flex flex-col justify-between">
        {ticks.reverse().map(tick => (
          <div key={tick} className="flex items-center gap-1">
            <div className="w-2 h-px bg-white/40" />
            <span className="text-[7px] text-white/60 font-mono w-4 text-right">{tick > 0 ? `+${tick}` : tick}</span>
          </div>
        ))}
      </div>

      {/* Indicator bar */}
      <div className="absolute top-5 bottom-5 right-1 w-2 bg-white/10 rounded">
        <div
          className="absolute bottom-1/2 right-0 w-full transition-all duration-100"
          style={{
            height: `${Math.abs(percentage - 50)}%`,
            bottom: verticalSpeed >= 0 ? "50%" : "auto",
            top: verticalSpeed < 0 ? "50%" : "auto",
            backgroundColor: getColor(),
            borderRadius: "2px",
          }}
        />
        {/* Zero line */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-white/60" />
      </div>

      {/* Digital readout */}
      <div
        className="absolute bottom-1 left-0 right-0 text-center font-mono text-xs font-bold"
        style={{ color: getColor() }}
      >
        {verticalSpeed >= 0 ? "+" : ""}
        {verticalSpeed.toFixed(1)}
      </div>
    </div>
  );
}

// Airspeed indicator
function AirspeedIndicator({ airspeed, isStalling }: { airspeed: number; isStalling: boolean }) {
  const stallSpeed = 18; // m/s
  const maxSpeed = 70;

  // Convert to km/h for display
  const speedKmh = airspeed * 3.6;

  // Color coding
  const getColor = () => {
    if (airspeed < stallSpeed * 1.1) return "#ef4444"; // Near stall - red
    if (airspeed < stallSpeed * 1.3) return "#f97316"; // Low - orange
    if (airspeed > 55) return "#f97316"; // High - orange
    return "#22c55e"; // Good - green
  };

  return (
    <div className="relative h-32 w-16 bg-black/70 rounded-lg border border-white/30 p-2">
      {/* Title */}
      <div className="text-center text-[8px] text-white/60 font-mono mb-1">AIRSPEED</div>

      {/* Speed arc visualization */}
      <div className="relative w-full h-16">
        <svg viewBox="0 0 60 40" className="w-full h-full">
          {/* Background arc */}
          <path d="M 5 35 A 25 25 0 0 1 55 35" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
          {/* Stall zone */}
          <path d="M 5 35 A 25 25 0 0 1 15 15" fill="none" stroke="#ef4444" strokeWidth="4" />
          {/* Good zone */}
          <path d="M 15 15 A 25 25 0 0 1 45 15" fill="none" stroke="#22c55e" strokeWidth="4" />
          {/* High speed zone */}
          <path d="M 45 15 A 25 25 0 0 1 55 35" fill="none" stroke="#f97316" strokeWidth="4" />
          {/* Needle */}
          <line
            x1="30"
            y1="35"
            x2={30 + Math.cos(Math.PI - (airspeed / maxSpeed) * Math.PI) * 20}
            y2={35 + Math.sin(Math.PI - (airspeed / maxSpeed) * Math.PI) * -20}
            stroke={getColor()}
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Center dot */}
          <circle cx="30" cy="35" r="3" fill={getColor()} />
        </svg>
      </div>

      {/* Digital readout */}
      <div
        className={`text-center font-mono text-sm font-bold ${isStalling ? "animate-pulse" : ""}`}
        style={{ color: getColor() }}
      >
        {Math.round(speedKmh)}
        <span className="text-[8px] text-white/60 ml-0.5">km/h</span>
      </div>

      {/* Stall warning */}
      {isStalling && <div className="absolute inset-0 border-2 border-red-500 rounded-lg animate-pulse" />}
    </div>
  );
}

// Altimeter
function Altimeter({ altitude }: { altitude: number }) {
  return (
    <div className="relative h-20 w-20 bg-black/70 rounded-lg border border-white/30 p-2">
      {/* Title */}
      <div className="text-center text-[8px] text-white/60 font-mono">ALTITUDE</div>

      {/* Digital readout */}
      <div className="text-center font-mono text-xl font-bold text-cyan-400 mt-2">
        {Math.round(altitude)}
        <span className="text-xs text-white/60 ml-1">m</span>
      </div>

      {/* Ground proximity warning */}
      {altitude < 100 && <div className="text-center text-[8px] text-yellow-400 font-mono animate-pulse">LOW ALT</div>}
    </div>
  );
}

// Heading indicator
function HeadingIndicator({ heading }: { heading: number }) {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const dirIndex = Math.round(heading / 45) % 8;

  return (
    <div className="relative h-12 w-24 bg-black/70 rounded-lg border border-white/30 p-1">
      {/* Compass rose */}
      <div className="flex items-center justify-center gap-2">
        <div className="text-lg font-bold text-amber-400 font-mono">{directions[dirIndex]}</div>
        <div className="text-sm text-white/80 font-mono">{Math.round(heading)}°</div>
      </div>
    </div>
  );
}

// Bank angle indicator (artificial horizon simplified)
function AttitudeIndicator({ bankAngle, pitchAngle }: { bankAngle: number; pitchAngle: number }) {
  return (
    <div className="relative h-20 w-20 bg-black/70 rounded-full border border-white/30 overflow-hidden">
      {/* Sky/Ground */}
      <div
        className="absolute inset-0"
        style={{
          transform: `rotate(${-bankAngle}deg)`,
          background: `linear-gradient(to bottom, 
            #4a90d9 0%, 
            #4a90d9 ${50 - pitchAngle}%, 
            #8b6914 ${50 - pitchAngle}%, 
            #8b6914 100%)`,
        }}
      />

      {/* Horizon line */}
      <div
        className="absolute left-2 right-2 h-0.5 bg-white top-1/2"
        style={{
          transform: `rotate(${-bankAngle}deg) translateY(${pitchAngle}px)`,
        }}
      />

      {/* Aircraft symbol (fixed) */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          {/* Wings */}
          <div className="absolute top-1/2 left-1/2 w-8 h-0.5 bg-yellow-400 -translate-x-1/2 -translate-y-1/2" />
          {/* Nose */}
          <div className="absolute top-1/2 left-1/2 w-0.5 h-2 bg-yellow-400 -translate-x-1/2 -translate-y-full" />
          {/* Center dot */}
          <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-yellow-400 rounded-full -translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Bank markers */}
      <div className="absolute top-1 left-1/2 w-px h-2 bg-white -translate-x-1/2" />
      <div
        className="absolute top-2 left-1/2 w-px h-1.5 bg-white/60 origin-bottom"
        style={{ transform: "translateX(-50%) rotate(-30deg)" }}
      />
      <div
        className="absolute top-2 left-1/2 w-px h-1.5 bg-white/60 origin-bottom"
        style={{ transform: "translateX(-50%) rotate(30deg)" }}
      />
    </div>
  );
}

// Main HUD component
export function HUD({ airspeed, altitude, verticalSpeed, heading, isStalling, bankAngle, pitchAngle }: HUDProps) {
  return (
    <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none select-none">
      {/* Top row */}
      <div className="flex gap-2 items-start">
        <AttitudeIndicator bankAngle={bankAngle} pitchAngle={pitchAngle} />
        <div className="flex flex-col gap-1">
          <HeadingIndicator heading={heading} />
          <Altimeter altitude={altitude} />
        </div>
      </div>

      {/* Bottom row */}
      <div className="flex gap-2">
        <AirspeedIndicator airspeed={airspeed} isStalling={isStalling} />
        <Variometer verticalSpeed={verticalSpeed} />
      </div>

      {/* Stall warning overlay */}
      {isStalling && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-red-600/90 text-white font-bold text-lg px-4 py-2 rounded animate-pulse">STALL</div>
        </div>
      )}
    </div>
  );
}
