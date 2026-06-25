import { useCallback, useEffect, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { backend, simulation } from "@/sim/instance";
import type { Snapshot } from "@/sim/types";
import { AuthPage } from "@/components/auth/AuthPage";
import { SwarmCanvas } from "@/components/SwarmCanvas";
import { TopBar } from "@/components/hud/TopBar";
import { SystemsRail } from "@/components/hud/SystemsRail";
import { PhaseTracker } from "@/components/hud/PhaseTracker";
import { Inspector } from "@/components/hud/Inspector";
import { EventFeed } from "@/components/hud/EventFeed";
import { CopilotConsole } from "@/components/hud/CopilotConsole";

export default function App() {
  const sim = simulation;
  const [sessionEmail, setSessionEmail] = useState<string | null>(() =>
    window.localStorage.getItem("aieven.session.email")
  );
  const [snap, setSnap] = useState<Snapshot>(() => sim.snapshot());
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const simRef = useRef(sim);
  const backendRef = useRef(backend);

  // poll the backend for the React HUD
  useEffect(() => {
    let disposed = false;
    let inFlight = false;

    const refresh = () => {
      if (inFlight) return;
      inFlight = true;
      backendRef.current
        .getSnapshot()
        .then((res) => {
          if (!disposed) setSnap(res.snapshot);
        })
        .finally(() => {
          inFlight = false;
        });
    };

    refresh();
    const id = setInterval(refresh, 180);
    return () => {
      disposed = true;
      clearInterval(id);
    };
  }, []);

  const onSelect = useCallback(() => {
    // selection already written to sim by the canvas; refresh HUD through the backend
    void backendRef.current.getSnapshot().then((res) => setSnap(res.snapshot));
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
    void backendRef.current.getSnapshot().then((res) => setSnap(res.snapshot));
  }, []);

  const ask = useCallback(
    async (q: string) => (await backendRef.current.askCopilot(q)).result,
    []
  );

  const completeAuth = useCallback((email: string) => {
    window.localStorage.setItem("aieven.session.email", email);
    setSessionEmail(email);
  }, []);

  const signOut = useCallback(() => {
    window.localStorage.removeItem("aieven.session.email");
    setSessionEmail(null);
  }, []);

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-void">
      {/* living swarm field */}
      <div className="absolute inset-0">
        <SwarmCanvas sim={sim} onSelect={onSelect} />
      </div>

      {/* vignette to seat the HUD over the field */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(6,9,18,0.7)_100%)]" />

      {!sessionEmail ? <AuthPage onComplete={completeAuth} /> : null}

      {/* HUD layer */}
      <div className={`pointer-events-none absolute inset-0 p-3 ${sessionEmail ? "" : "hidden"}`}>
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

        <div className="pointer-events-auto absolute right-3 top-[72px]">
          <button
            type="button"
            onClick={signOut}
            className="glass glass-sheen inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-faint transition hover:text-fg"
          >
            <LogOut size={14} />
            Sign out
          </button>
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
