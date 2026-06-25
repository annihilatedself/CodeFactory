# Aiven — Agent Orchestration Console

A front-end demo of the **Aiven** platform: a cinematic "war-room" view of
**hundreds to thousands of AI agents** collaborating on a complex database
migration across **Apache Kafka, PostgreSQL, OpenSearch, and a Schema Registry**,
coordinated by an orchestrator control plane.

The piece sells the core trust story: agents don't just run blindly — they
**propose, peer-review, disagree, and reach quorum consensus** before anything
commits. You can watch conflicts flare red and resolve to green in real time.

## What you're looking at

- **The swarm field** (center) — a live canvas of ~1,600 agents clustered around
  the five systems they're assigned to, each tinted by its system's color.
- **Signal streams** — animated packets travelling between agents and systems:
  data sync (blue) · peer review (gold) · conflict (red) · consensus (green) ·
  handoff. Disagreements pulse **back and forth** in red until a quorum resolves
  them to green.
- **Top bar** — live counters: active agents, msg/sec, consensus rate, open
  conflicts, reviews passed, overall % migrated.
- **Target Systems** (left) — per-system progress and health.
- **Migration Plan** (left) — the 5-phase blueprint with live phase progress.
- **Agent Inspector** (right) — **click any node** to see its role, current task,
  confidence, and who it's negotiating with.
- **Coordination Feed** (right) — streaming log of quorum, conflict, and review
  events.
- **Controls** — pause/resume and 1x / 2x / 4x time scaling.

## Architecture

Pure front end — no backend. A deterministic simulation produces a JSON-shaped
snapshot that the React HUD binds to, so it's trivial to swap the simulator for
a real WebSocket/SSE feed later.

```
src/
  sim/
    migrationPlan.ts   # the blueprint: systems, phases, roles, tasks (the "JSON")
    Simulation.ts      # engine: agents, packets, disputes, consensus, stats
    instance.ts        # shared singleton (canvas + HUD read the same state)
    types.ts
  components/
    SwarmCanvas.tsx    # 60fps canvas renderer for the agent swarm
    ui/                # shadcn-style primitives (Panel, Button, Badge)
    hud/               # TopBar, SystemsRail, PhaseTracker, Inspector, EventFeed, Legend
  App.tsx              # composes the full-bleed field + floating glass HUD
```

**Stack:** React 19 · Vite · TypeScript · Tailwind v4 · shadcn-style components ·
lucide-react · HTML Canvas 2D.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

Best viewed full-screen on a wide display (it's a command-center layout).
