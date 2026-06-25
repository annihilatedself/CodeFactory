import { useCallback, useEffect, useRef, useState } from "react";
import { simulation } from "@/sim/instance";
import type { Snapshot } from "@/sim/types";
import { SwarmCanvas } from "@/components/SwarmCanvas";
import { TopBar } from "@/components/hud/TopBar";
import { SystemsRail } from "@/components/hud/SystemsRail";
import { PhaseTracker } from "@/components/hud/PhaseTracker";
import { Inspector } from "@/components/hud/Inspector";
import { EventFeed } from "@/components/hud/EventFeed";
import { CopilotConsole } from "@/components/hud/CopilotConsole";

export default function App() {
  const sim = simulation;
  const [snap, setSnap] = useState<Snapshot>(() => sim.snapshot());
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const simRef = useRef(sim);

  // poll the simulation snapshot for the React HUD (~8 fps is plenty for text)
  useEffect(() => {
    const id = setInterval(() => setSnap(simRef.current.snapshot()), 120);
    return () => clearInterval(id);
  }, []);

  const onSelect = useCallback(() => {
    // selection already written to sim by the canvas; refresh HUD immediately
    setSnap(simRef.current.snapshot());
  }, []);

  const togglePause = useCallback(() => {
    setPaused((p) => {
      simRef.current.paused = !p;
      return !p;
    });
  }, []);

  const cycleSpeed = useCallback(() => {
    setSpeed((s) => {
      const next = s >= 4 ? 1 : s * 2;
      simRef.current.speed = next;
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    simRef.current.selectedId = null;
    setSnap(simRef.current.snapshot());
  }, []);

  const ask = useCallback((q: string) => simRef.current.query(q), []);

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-void">
      {/* living swarm field */}
      <div className="absolute inset-0">
        <SwarmCanvas sim={sim} onSelect={onSelect} />
      </div>

      {/* vignette to seat the HUD over the field */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(6,9,18,0.7)_100%)]" />

      {/* HUD layer */}
      <div className="pointer-events-none absolute inset-0 p-3">
        {/* top bar */}
        <div className="pointer-events-auto absolute inset-x-3 top-3">
          <TopBar
            snap={snap}
            paused={paused}
            speed={speed}
            onTogglePause={togglePause}
            onCycleSpeed={cycleSpeed}
          />
        </div>

        {/* left rail */}
        <div className="pointer-events-auto absolute bottom-3 left-3 top-[88px] flex w-[290px] flex-col gap-3 overflow-hidden">
          <SystemsRail snap={snap} />
          <div className="min-h-0 flex-1 overflow-hidden">
            <PhaseTracker snap={snap} />
          </div>
        </div>

        {/* right rail */}
        <div className="pointer-events-auto absolute bottom-3 right-3 top-[88px] flex w-[336px] flex-col gap-3 overflow-hidden">
          <Inspector snap={snap} onClose={clearSelection} />
          <EventFeed snap={snap} />
        </div>

        {/* live intelligence copilot */}
        <div className="pointer-events-auto absolute bottom-3 left-1/2 -translate-x-1/2">
          <CopilotConsole ask={ask} />
        </div>
      </div>
    </div>
  );
}
