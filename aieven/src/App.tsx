import { useCallback, useEffect, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { clearSession, getSessionEmail } from "@/auth/accountStore";
import { backend, simulation } from "@/sim/instance";
import type { Snapshot } from "@/sim/types";
import { AuthPage } from "@/components/auth/AuthPage";
import {
  OrchestrationSetup,
  type SelectedManifestFile,
} from "@/components/setup/OrchestrationSetup";
import { SwarmCanvas } from "@/components/SwarmCanvas";
import { TopBar } from "@/components/hud/TopBar";
import { SystemsRail } from "@/components/hud/SystemsRail";
import { PhaseTracker } from "@/components/hud/PhaseTracker";
import { Inspector } from "@/components/hud/Inspector";
import { EventFeed } from "@/components/hud/EventFeed";
import { CopilotConsole } from "@/components/hud/CopilotConsole";

export default function App() {
  const sim = simulation;
  const [sessionEmail, setSessionEmail] = useState<string | null>(() => getSessionEmail());
  const [orchestrationStarted, setOrchestrationStarted] = useState(
    () => window.localStorage.getItem("aieven.orchestration.started") === "true"
  );
  const [snap, setSnap] = useState<Snapshot>(() => sim.snapshot());
  const [paused, setPaused] = useState(() => !getSessionEmail() || window.localStorage.getItem("aieven.orchestration.started") !== "true");
  const [speed, setSpeed] = useState(1);
  const simRef = useRef(sim);
  const backendRef = useRef(backend);

  useEffect(() => {
    simRef.current.paused = !sessionEmail || !orchestrationStarted || paused;
  }, [orchestrationStarted, paused, sessionEmail]);

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
    setSessionEmail(email);
    setOrchestrationStarted(false);
    setPaused(true);
    window.localStorage.removeItem("aieven.orchestration.started");
    window.localStorage.removeItem("aieven.orchestration.files");
    simRef.current.paused = true;
    void backendRef.current.getSnapshot().then((res) => setSnap(res.snapshot));
  }, []);

  const startOrchestration = useCallback((files: SelectedManifestFile[]) => {
    window.localStorage.setItem("aieven.orchestration.started", "true");
    window.localStorage.setItem("aieven.orchestration.files", JSON.stringify(files));
    setOrchestrationStarted(true);
    setPaused(false);
    simRef.current.paused = false;
    void backendRef.current.getSnapshot().then((res) => setSnap(res.snapshot));
  }, []);

  const signOut = useCallback(() => {
    clearSession();
    window.localStorage.removeItem("aieven.orchestration.started");
    window.localStorage.removeItem("aieven.orchestration.files");
    setSessionEmail(null);
    setOrchestrationStarted(false);
    setPaused(true);
    simRef.current.paused = true;
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
      {sessionEmail && !orchestrationStarted ? (
        <OrchestrationSetup
          email={sessionEmail}
          onStart={startOrchestration}
          onSignOut={signOut}
        />
      ) : null}

      {/* HUD layer */}
      <div
        className={`pointer-events-none absolute inset-0 p-3 ${
          sessionEmail && orchestrationStarted ? "" : "hidden"
        }`}
      >
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

        <div className="pointer-events-auto absolute right-4 top-20 z-30">
          <button
            type="button"
            onClick={signOut}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-accent/35 bg-void/90 px-3 text-sm font-semibold text-fg shadow-[0_0_24px_-8px_rgba(34,211,167,0.9)] backdrop-blur transition hover:border-accent hover:bg-surface"
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
