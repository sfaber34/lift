"use client";

import dynamic from "next/dynamic";
import type { NextPage } from "next";

// Dynamic import to avoid SSR issues with Three.js
const FlightSimGame = dynamic(() => import("~~/components/flight-sim").then(mod => mod.FlightSimGame), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen bg-gradient-to-b from-sky-400 to-sky-600 flex items-center justify-center">
      <div className="text-white text-center">
        <div className="text-4xl mb-4">🪂</div>
        <div className="text-xl font-mono">Loading Glider Sim...</div>
        <div className="mt-4 w-48 h-1 bg-white/30 rounded-full overflow-hidden">
          <div className="h-full bg-white animate-pulse" style={{ width: "60%" }} />
        </div>
      </div>
    </div>
  ),
});

const Home: NextPage = () => {
  return (
    <div className="w-full h-screen overflow-hidden">
      <FlightSimGame />
    </div>
  );
};

export default Home;
