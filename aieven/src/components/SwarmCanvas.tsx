import { useEffect, useRef } from "react";
import type { Simulation } from "@/sim/Simulation";
import type { Agent, LinkKind } from "@/sim/types";

const STATE_COLOR: Record<string, string> = {
  working: "#7f8fb3",
  reviewing: "#f5b53d",
  disputing: "#fb5c6e",
  consensus: "#34e3a4",
  blocked: "#fb5c6e",
  idle: "#3a4458",
};

const KIND_GLOW: Record<LinkKind, number> = {
  sync: 0.5,
  review: 0.7,
  conflict: 1,
  consensus: 1,
  handoff: 0.6,
};

interface Props {
  sim: Simulation;
  onSelect: (id: number | null) => void;
}

/** Quadratic bezier point with a perpendicular bow. */
function bezier(
  fx: number,
  fy: number,
  tx: number,
  ty: number,
  curve: number,
  t: number
): [number, number] {
  const mx = (fx + tx) / 2;
  const my = (fy + ty) / 2;
  const dx = tx - fx;
  const dy = ty - fy;
  const cx = mx - dy * curve;
  const cy = my + dx * curve;
  const u = 1 - t;
  const x = u * u * fx + 2 * u * t * cx + t * t * tx;
  const y = u * u * fy + 2 * u * t * cy + t * t * ty;
  return [x, y];
}

export function SwarmCanvas({ sim, onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoverRef = useRef<{ id: number | null; x: number; y: number }>({
    id: null,
    x: 0,
    y: 0,
  });
  const labelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    let raf = 0;
    let last = performance.now();
    let dpr = Math.min(2, window.devicePixelRatio || 1);

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    function resize() {
      const parent = canvas.parentElement!;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sim.resize(w, h);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);

    function drawBackground(w: number, h: number, time: number) {
      ctx.fillStyle = "#060912";
      ctx.fillRect(0, 0, w, h);

      // faint dot grid
      ctx.fillStyle = "rgba(120,150,200,0.05)";
      const gap = 38;
      for (let x = gap; x < w; x += gap) {
        for (let y = gap; y < h; y += gap) {
          ctx.fillRect(x, y, 1, 1);
        }
      }

      // hub ambient blooms
      ctx.globalCompositeOperation = "lighter";
      for (const s of sim.systems) {
        const pr = 150 + Math.sin(time / 1400 + s.x) * 12;
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, pr);
        g.addColorStop(0, hexA(s.color, 0.16));
        g.addColorStop(1, hexA(s.color, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, pr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    }

    function drawBackbone() {
      const coord = sim.systems.find((s) => s.kind === "coordinator")!;
      ctx.lineWidth = 1;
      // coordinator → every system
      for (const s of sim.systems) {
        if (s.id === coord.id) continue;
        ctx.strokeStyle = "rgba(90,120,170,0.16)";
        ctx.beginPath();
        ctx.moveTo(coord.x, coord.y);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
      }
      // ring among the data systems
      const ring = sim.systems.filter((s) => s.kind !== "coordinator");
      ctx.strokeStyle = "rgba(90,120,170,0.1)";
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i];
        const b = ring[(i + 1) % ring.length];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    function drawAgents() {
      const sel = sim.selectedId;
      // tint base/working agents by their system hue for cohesive clusters
      const sysColor: Record<string, string> = {};
      for (const s of sim.systems) sysColor[s.id] = s.color;
      for (const a of sim.agents) {
        if (a.x === 0 && a.y === 0) continue; // not yet woken
        const flashing = a.flash > 0 && (a.state === "consensus" || a.state === "disputing");
        const c =
          a.state === "working" || a.state === "idle"
            ? sysColor[a.systemId] ?? "#7f8fb3"
            : STATE_COLOR[a.state] ?? "#7f8fb3";
        const r = a.state === "disputing" || a.state === "consensus" ? 2.7 : 2.1;

        if (flashing) {
          ctx.globalCompositeOperation = "lighter";
          const g = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, 11);
          g.addColorStop(0, hexA(c, 0.85));
          g.addColorStop(1, hexA(c, 0));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(a.x, a.y, 11, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalCompositeOperation = "source-over";
        }

        const base = a.state === "working" || a.state === "idle";
        ctx.fillStyle = base ? hexA(c, 0.78) : c;
        ctx.beginPath();
        ctx.arc(a.x, a.y, r, 0, Math.PI * 2);
        ctx.fill();

        if (a.id === sel) drawSelectedRing(a);
      }
    }

    function drawSelectedRing(a: Agent) {
      ctx.strokeStyle = "#22d3a7";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(a.x, a.y, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(34,211,167,0.35)";
      ctx.beginPath();
      ctx.arc(a.x, a.y, 14, 0, Math.PI * 2);
      ctx.stroke();
      // tie line to partner
      if (a.partner != null) {
        const b = sim.agents[a.partner];
        if (b) {
          ctx.strokeStyle = "rgba(251,92,110,0.5)";
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }

    function drawPackets() {
      ctx.globalCompositeOperation = "lighter";
      for (const p of sim.packets) {
        const [x, y] = bezier(p.fromX, p.fromY, p.toX, p.toY, p.curve, p.t);
        const tailT = Math.max(0, p.t - 0.14);
        const [tx, ty] = bezier(p.fromX, p.fromY, p.toX, p.toY, p.curve, tailT);
        const glow = KIND_GLOW[p.kind];

        const grad = ctx.createLinearGradient(tx, ty, x, y);
        grad.addColorStop(0, hexA(p.color, 0));
        grad.addColorStop(1, hexA(p.color, 0.85 * glow));
        ctx.strokeStyle = grad;
        ctx.lineWidth = p.kind === "conflict" ? 2 : 1.4;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(x, y);
        ctx.stroke();

        // head
        ctx.fillStyle = hexA(p.color, 0.95);
        ctx.beginPath();
        ctx.arc(x, y, p.kind === "conflict" ? 2.6 : 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    }

    function drawHubs(time: number) {
      for (const s of sim.systems) {
        const isCoord = s.kind === "coordinator";
        const baseR = isCoord ? 26 : 20;

        // pulse ring
        if (!reduceMotion) {
          const pt = (time / 1600 + s.x * 0.01) % 1;
          ctx.strokeStyle = hexA(s.color, (1 - pt) * 0.4);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(s.x, s.y, baseR + pt * 26, 0, Math.PI * 2);
          ctx.stroke();
        }

        // glow core
        ctx.globalCompositeOperation = "lighter";
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, baseR + 14);
        g.addColorStop(0, hexA(s.color, 0.55));
        g.addColorStop(1, hexA(s.color, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, baseR + 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";

        // disc
        ctx.fillStyle = "#0b1120";
        ctx.beginPath();
        ctx.arc(s.x, s.y, baseR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(s.x, s.y, baseR, 0, Math.PI * 2);
        ctx.stroke();

        // progress arc
        ctx.strokeStyle = hexA(s.color, 0.9);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(s.x, s.y, baseR + 6, -Math.PI / 2, -Math.PI / 2 + s.progress * Math.PI * 2);
        ctx.stroke();

        // label
        ctx.fillStyle = "#eef3fb";
        ctx.font = "600 13px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(s.label, s.x, s.y + baseR + 24);
        ctx.fillStyle = "#7f8fb3";
        ctx.font = "500 10px 'JetBrains Mono', monospace";
        ctx.fillText(`${Math.round(s.progress * 100)}% migrated`, s.x, s.y + baseR + 39);
      }
    }

    function drawHover(w: number) {
      const hv = hoverRef.current;
      const label = labelRef.current!;
      if (hv.id == null) {
        label.style.opacity = "0";
        return;
      }
      const a = sim.agents[hv.id];
      if (!a) {
        label.style.opacity = "0";
        return;
      }
      ctx.strokeStyle = "rgba(241,245,251,0.7)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(a.x, a.y, 7, 0, Math.PI * 2);
      ctx.stroke();
      label.style.opacity = "1";
      label.style.transform = `translate(${Math.min(hv.x + 14, w - 180)}px, ${hv.y + 14}px)`;
      label.textContent = `${a.name} · ${a.role}`;
    }

    function frame(now: number) {
      const dt = (now - last) / 1000;
      last = now;
      sim.tick(dt);

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      drawBackground(w, h, now);
      drawBackbone();
      drawPackets();
      drawAgents();
      drawHubs(now);
      drawHover(w);

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    // ---- interaction ----
    function toLocal(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    function onMove(e: MouseEvent) {
      const { x, y } = toLocal(e);
      const id = sim.pickAgent(x, y);
      hoverRef.current = { id, x, y };
      canvas.style.cursor = id != null || sim.pickSystem(x, y) ? "pointer" : "default";
    }
    function onClick(e: MouseEvent) {
      const { x, y } = toLocal(e);
      const id = sim.pickAgent(x, y);
      sim.selectedId = id;
      onSelect(id);
    }
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("click", onClick);
    };
  }, [sim, onSelect]);

  return (
    <div className="relative h-full w-full">
      <canvas ref={canvasRef} className="block h-full w-full" />
      <div
        ref={labelRef}
        className="pointer-events-none absolute left-0 top-0 z-10 rounded-md border border-border-bright bg-surface-2/90 px-2 py-1 font-mono text-[11px] text-fg opacity-0 backdrop-blur transition-opacity"
        style={{ willChange: "transform" }}
      />
    </div>
  );
}

/** hex (#rrggbb) + alpha → rgba string */
function hexA(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
