"use client";

import { useCallback, useEffect, useRef } from "react";
import { ControlInput } from "../physics/FlightPhysics";
import { Joystick } from "react-joystick-component";
import type { IJoystickUpdateEvent } from "react-joystick-component/build/lib/Joystick";

interface JoystickControlsProps {
  onControlUpdate: (controls: ControlInput) => void;
}

export function JoystickControls({ onControlUpdate }: JoystickControlsProps) {
  const controlsRef = useRef<ControlInput>({ pitch: 0, roll: 0, yaw: 0 });

  // Main stick (right) - pitch and roll
  const handleMainMove = useCallback(
    (event: IJoystickUpdateEvent) => {
      controlsRef.current = {
        ...controlsRef.current,
        roll: event.x ?? 0,
        pitch: -(event.y ?? 0), // Invert: push forward = pitch down
      };
      onControlUpdate(controlsRef.current);
    },
    [onControlUpdate],
  );

  const handleMainStop = useCallback(() => {
    controlsRef.current = {
      ...controlsRef.current,
      pitch: 0,
      roll: 0,
    };
    onControlUpdate(controlsRef.current);
  }, [onControlUpdate]);

  // Rudder stick (left) - yaw only
  const handleRudderMove = useCallback(
    (event: IJoystickUpdateEvent) => {
      controlsRef.current = {
        ...controlsRef.current,
        yaw: event.x ?? 0,
      };
      onControlUpdate(controlsRef.current);
    },
    [onControlUpdate],
  );

  const handleRudderStop = useCallback(() => {
    controlsRef.current = {
      ...controlsRef.current,
      yaw: 0,
    };
    onControlUpdate(controlsRef.current);
  }, [onControlUpdate]);

  // Keyboard controls for desktop testing
  useEffect(() => {
    const keys = new Set<string>();

    const updateFromKeyboard = () => {
      let pitch = 0;
      let roll = 0;
      let yaw = 0;

      if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) pitch = 1;
      if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) pitch = -1;
      if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) roll = -1;
      if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) roll = 1;
      if (keys.has("q") || keys.has("Q")) yaw = -1; // Rudder left
      if (keys.has("e") || keys.has("E")) yaw = 1; // Rudder right

      controlsRef.current = { pitch, roll, yaw };
      onControlUpdate(controlsRef.current);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        [
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "w",
          "a",
          "s",
          "d",
          "W",
          "A",
          "S",
          "D",
          "q",
          "e",
          "Q",
          "E",
        ].includes(e.key)
      ) {
        e.preventDefault();
        keys.add(e.key);
        updateFromKeyboard();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.key);
      updateFromKeyboard();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [onControlUpdate]);

  return (
    <>
      {/* Rudder joystick (left side) - horizontal only */}
      <div className="absolute bottom-8 left-8 flex flex-col items-center gap-2">
        <div className="relative p-3 bg-black/30 rounded-full backdrop-blur-sm">
          <Joystick
            size={100}
            baseColor="rgba(255, 255, 255, 0.15)"
            stickColor="rgba(255, 200, 100, 0.7)"
            move={handleRudderMove}
            stop={handleRudderStop}
            throttle={50}
            minDistance={10}
          />
        </div>
        <div className="text-white/50 text-xs font-mono text-center">
          <div>← Rudder →</div>
          <div className="text-[10px] text-white/30">Q / E</div>
        </div>
      </div>

      {/* Main joystick (right side) - pitch and roll */}
      <div className="absolute bottom-8 right-8 flex flex-col items-center gap-2">
        <div className="relative p-4 bg-black/30 rounded-full backdrop-blur-sm">
          <Joystick
            size={140}
            baseColor="rgba(255, 255, 255, 0.15)"
            stickColor="rgba(255, 255, 255, 0.6)"
            move={handleMainMove}
            stop={handleMainStop}
            throttle={50}
          />
        </div>
        <div className="text-white/50 text-xs font-mono text-center">
          <div>↑ Pitch Up</div>
          <div>← Roll →</div>
          <div>↓ Pitch Down</div>
        </div>
      </div>
    </>
  );
}

// Reset button component
export function ResetButton({ onReset }: { onReset: () => void }) {
  return (
    <button
      onClick={onReset}
      className="absolute top-4 right-4 px-4 py-2 bg-white/10 hover:bg-white/20 
                 text-white font-mono text-sm rounded-lg border border-white/20
                 transition-colors backdrop-blur-sm"
    >
      RESET
    </button>
  );
}

// Help overlay
export function ControlsHelp({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-900 p-6 rounded-xl max-w-md text-white" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-cyan-400">🪂 Glider Controls</h2>

        <div className="space-y-4 text-sm">
          <div>
            <h3 className="font-bold text-amber-400">Right Stick / Arrow Keys</h3>
            <ul className="ml-4 mt-1 space-y-1 text-white/80">
              <li>↑ / W - Pitch up (climb, slow down)</li>
              <li>↓ / S - Pitch down (dive, speed up)</li>
              <li>← / A - Roll left</li>
              <li>→ / D - Roll right</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-amber-400">Left Stick / Q &amp; E</h3>
            <ul className="ml-4 mt-1 space-y-1 text-white/80">
              <li>Q - Rudder left (yaw nose left)</li>
              <li>E - Rudder right (yaw nose right)</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-amber-400">Flying Tips</h3>
            <ul className="ml-4 mt-1 space-y-1 text-white/80">
              <li>• Use rudder to keep turns coordinated</li>
              <li>• Watch the variometer - green means lift!</li>
              <li>• Circle in thermals to gain altitude</li>
              <li>• Don&apos;t stall! Keep airspeed above 70 km/h</li>
            </ul>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-bold transition-colors"
        >
          START FLYING
        </button>
      </div>
    </div>
  );
}
