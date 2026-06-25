import {
  PHASES,
  ROLES,
  SYSTEMS,
  TASKS,
  DISPUTE_TOPICS,
  type SystemSeed,
} from "./migrationPlan";
import type {
  Agent,
  AgentState,
  DisputeEdge,
  FeedEvent,
  LinkKind,
  Packet,
  QueryMetric,
  QueryResult,
  Snapshot,
  Stats,
  SystemNode,
} from "./types";

const KIND_COLOR: Record<LinkKind, string> = {
  sync: "#4d8dff",
  review: "#f5b53d",
  conflict: "#fb5c6e",
  consensus: "#34e3a4",
  handoff: "#22d3a7",
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]) => arr[(Math.random() * arr.length) | 0];
const pad = (n: number) => n.toString().padStart(4, "0");

export interface SimOptions {
  fleetSize: number;
}

export class Simulation {
  systems: SystemNode[] = [];
  agents: Agent[] = [];
  packets: Packet[] = [];
  disputes: DisputeEdge[] = [];
  events: FeedEvent[] = [];

  width = 1280;
  height = 720;
  speed = 1;
  paused = false;

  /** safe field rect — keeps hubs/agents clear of the floating HUD rails */
  private fieldL = 0;
  private fieldT = 0;
  private fieldW = 1280;
  private fieldH = 720;

  private fleetSize: number;
  private agentScale = 1; // shrinks hub radii on small screens
  private packetId = 0;
  private disputeId = 0;
  private eventId = 0;
  private queryId = 0;
  private elapsed = 0;
  private msgWindow: number[] = []; // timestamps of recent messages
  private totalMessages = 0;
  private resolvedConflicts = 0;
  private reviewsPassed = 0;
  private consensusRate = 0.9;
  private spawnAccumulator = 0;

  selectedId: number | null = null;

  constructor(opts: SimOptions) {
    this.fleetSize = opts.fleetSize;
    this.initSystems();
    this.initAgents();
    this.pushEvent("info", "Aieven orchestrator online", "loading migration blueprint");
    this.pushEvent("info", `${PHASES.length}-phase plan accepted`, PHASES[0].label);
  }

  private initSystems() {
    this.systems = SYSTEMS.map((s: SystemSeed) => ({
      id: s.id,
      label: s.label,
      sub: s.sub,
      kind: s.kind,
      ax: s.ax,
      ay: s.ay,
      x: s.ax * this.width,
      y: s.ay * this.height,
      color: s.color,
      progress: 0,
      health: "nominal" as const,
    }));
  }

  private initAgents() {
    let id = 0;
    for (const seed of SYSTEMS) {
      const count = Math.max(8, Math.round(this.fleetSize * seed.share));
      const roles = ROLES[seed.id];
      const tasks = TASKS[seed.id];
      for (let i = 0; i < count; i++) {
        const ringBand = (i % 5) / 5; // layered rings around hub
        this.agents.push({
          id,
          name: `agent-${pad(id)}`,
          role: pick(roles),
          systemId: seed.id,
          state: "idle",
          confidence: rand(0.78, 0.99),
          task: pick(tasks).replace("{n}", `${(Math.random() * 9 + 1) | 0}`).replace("{m}", `${(Math.random() * 9 + 10) | 0}`),
          angle: rand(0, Math.PI * 2),
          radius: rand(34, 132) + ringBand * 26,
          drift: rand(0.05, 0.22) * (Math.random() < 0.5 ? 1 : -1),
          wobble: rand(0, Math.PI * 2),
          x: 0,
          y: 0,
          // staggered wake-up across the first ~14 seconds → fleet "boots up"
          flash: 0,
          partner: null,
        });
        // stash wake time on the object via flash field reuse later; use map
        wakeAt.set(id, rand(0.2, 14) + (seed.id === "coord" ? -0.1 : 0));
        id++;
      }
    }
  }

  resize(w: number, h: number) {
    this.width = w;
    this.height = h;
    // inset the active field so hubs/agents never sit under the HUD rails
    const padL = w > 980 ? 322 : 16;
    const padR = w > 980 ? 360 : 16;
    const padT = 100;
    const padB = 52;
    this.fieldL = padL;
    this.fieldT = padT;
    this.fieldW = Math.max(320, w - padL - padR);
    this.fieldH = Math.max(320, h - padT - padB);
    // scale orbit radius to the field's smaller dimension
    this.agentScale = Math.min(1.05, Math.min(this.fieldW, this.fieldH) / 620);
    for (const s of this.systems) {
      s.x = this.fieldL + s.ax * this.fieldW;
      s.y = this.fieldT + s.ay * this.fieldH;
    }
  }

  private hub(id: string) {
    return this.systems.find((s) => s.id === id)!;
  }

  // ---- main loop -------------------------------------------------------
  tick(dtRaw: number) {
    if (this.paused) return;
    const dt = Math.min(0.05, dtRaw) * this.speed;
    this.elapsed += dt;

    this.updateAgents(dt);
    this.updatePackets(dt);
    this.updateDisputes(dt);
    this.maybeSpawn(dt);
    this.updateProgress(dt);
    this.trimMsgWindow();
  }

  private updateAgents(dt: number) {
    const scale = this.agentScale;
    for (const a of this.agents) {
      const wt = wakeAt.get(a.id)!;
      const awake = this.elapsed >= wt;
      if (!awake) continue;
      if (a.state === "idle") a.state = "working";

      const hub = this.hub(a.systemId);
      a.angle += a.drift * dt;
      a.wobble += dt * 1.3;
      const r = a.radius * scale * (1 + Math.sin(a.wobble) * 0.04);
      a.x = hub.x + Math.cos(a.angle) * r;
      a.y = hub.y + Math.sin(a.angle) * r * 0.82;

      if (a.flash > 0) {
        a.flash -= dt;
        if (a.flash <= 0 && (a.state === "consensus" || a.state === "reviewing")) {
          a.state = "working";
          a.partner = null;
        }
      }
    }
  }

  private updatePackets(dt: number) {
    const live: Packet[] = [];
    for (const p of this.packets) {
      p.t += p.speed * dt;
      if (p.t >= 1) {
        if (p.pingpong && p.bounces > 0) {
          p.bounces -= 1;
          // swap endpoints, bounce back
          const fx = p.fromX,
            fy = p.fromY;
          p.fromX = p.toX;
          p.fromY = p.toY;
          p.toX = fx;
          p.toY = fy;
          p.t = 0;
          p.curve = -p.curve;
          live.push(p);
        }
        // else: arrived, drop
      } else {
        live.push(p);
      }
    }
    this.packets = live;
  }

  private updateDisputes(dt: number) {
    const live: DisputeEdge[] = [];
    for (const d of this.disputes) {
      d.ttl -= dt;
      const a = this.agents[d.aId];
      const b = this.agents[d.bId];
      if (d.ttl <= 0 && !d.resolved) {
        d.resolved = true;
        // consensus reached
        this.resolvedConflicts++;
        this.reviewsPassed++;
        if (a) {
          a.state = "consensus";
          a.flash = 1.1;
          a.confidence = Math.min(0.99, a.confidence + 0.02);
        }
        if (b) {
          b.state = "consensus";
          b.flash = 1.1;
          b.confidence = Math.min(0.99, b.confidence + 0.02);
        }
        if (a && b) {
          this.spawnPacket(a.x, a.y, b.x, b.y, "consensus", false);
          this.pushEvent(
            "consensus",
            `Quorum reached on ${d.topic}`,
            `${a.name} ↔ ${b.name} · 3-of-3 reviewers agree`
          );
        }
      } else if (!d.resolved) {
        // keep them disputing & throw barbs back and forth
        if (a) a.state = "disputing";
        if (b) b.state = "disputing";
        if (a && b && Math.random() < dt * 3.5) {
          this.spawnPacket(a.x, a.y, b.x, b.y, "conflict", true, 1);
        }
        live.push(d);
      }
    }
    this.disputes = live;
  }

  private maybeSpawn(dt: number) {
    const awakeFrac = Math.min(1, this.elapsed / 14);
    // routine communication scales with awake fleet & migration intensity
    const baseRate = 60 * awakeFrac * (0.6 + this.overallProgress() * 0.8);
    this.spawnAccumulator += baseRate * dt;
    while (this.spawnAccumulator >= 1) {
      this.spawnAccumulator -= 1;
      this.spawnRoutine();
    }

    // disputes — periodic disagreements that resolve into consensus
    if (this.disputes.length < 7 && Math.random() < dt * (0.55 + awakeFrac * 0.7)) {
      this.spawnDispute();
    }

    // occasional review-pass / commit milestones in the feed
    if (Math.random() < dt * 0.5 && this.elapsed > 4) {
      const sys = pick(this.systems.filter((s) => s.kind !== "coordinator"));
      this.reviewsPassed++;
      this.pushEvent(
        "review",
        `Peer review passed · ${sys.label}`,
        `${(Math.random() * 4 + 2) | 0} agents signed off on diff`
      );
    }
  }

  private spawnRoutine() {
    const awake = this.agents.filter((a) => this.elapsed >= wakeAt.get(a.id)!);
    if (awake.length < 2) return;
    const a = pick(awake);
    const coord = this.hub("coord");

    const roll = Math.random();
    if (roll < 0.34) {
      // agent ↔ its hub (working/sync)
      const hub = this.hub(a.systemId);
      this.spawnPacket(a.x, a.y, hub.x, hub.y, "sync", false);
    } else if (roll < 0.6) {
      // hub ↔ hub data flow (cross-system migration)
      const s1 = pick(this.systems.filter((s) => s.kind !== "coordinator"));
      let s2 = pick(this.systems);
      if (s2.id === s1.id) s2 = coord;
      this.spawnPacket(s1.x, s1.y, s2.x, s2.y, "sync", false);
    } else if (roll < 0.82) {
      // peer review request to another agent (often cross-system)
      const b = pick(awake);
      if (b.id !== a.id) {
        a.state = "reviewing";
        a.flash = Math.max(a.flash, 0.5);
        this.spawnPacket(a.x, a.y, b.x, b.y, "review", false);
      }
    } else {
      // report up to the orchestrator (handoff)
      this.spawnPacket(a.x, a.y, coord.x, coord.y, "handoff", false);
    }
  }

  private spawnDispute() {
    const awake = this.agents.filter((a) => this.elapsed >= wakeAt.get(a.id)!);
    if (awake.length < 2) return;
    const a = pick(awake);
    let b = pick(awake);
    let guard = 0;
    while (b.id === a.id && guard++ < 5) b = pick(awake);
    if (b.id === a.id) return;
    const topic = pick(DISPUTE_TOPICS);
    a.state = "disputing";
    b.state = "disputing";
    a.partner = b.id;
    b.partner = a.id;
    a.confidence = Math.max(0.55, a.confidence - rand(0.05, 0.15));
    const ttl = rand(2.2, 4.5);
    this.disputes.push({
      id: this.disputeId++,
      aId: a.id,
      bId: b.id,
      ttl,
      maxTtl: ttl,
      resolved: false,
      topic,
    });
    this.spawnPacket(a.x, a.y, b.x, b.y, "conflict", true, 2);
    this.pushEvent("conflict", `Conflict raised: ${topic}`, `${a.name} disputes ${b.name}'s proposal`);
  }

  private spawnPacket(
    fx: number,
    fy: number,
    tx: number,
    ty: number,
    kind: LinkKind,
    pingpong: boolean,
    bounces = 0
  ) {
    if (this.packets.length > 520) return; // hard cap for perf
    this.totalMessages++;
    this.msgWindow.push(this.elapsed);
    this.packets.push({
      id: this.packetId++,
      kind,
      fromX: fx,
      fromY: fy,
      toX: tx,
      toY: ty,
      t: 0,
      speed: rand(0.6, 1.25),
      curve: rand(-0.22, 0.22),
      pingpong,
      bounces,
      color: KIND_COLOR[kind],
    });
  }

  private updateProgress(dt: number) {
    const awakeFrac = Math.min(1, this.elapsed / 14);
    for (const s of this.systems) {
      if (s.kind === "coordinator") {
        s.progress = this.overallProgress();
        continue;
      }
      const speed = rand(0.004, 0.012) * awakeFrac;
      s.progress = Math.min(1, s.progress + speed * dt * 1.5);
      // health reacts to nearby disputes
      const nearbyConflict = this.disputes.some(
        (d) => this.agents[d.aId]?.systemId === s.id || this.agents[d.bId]?.systemId === s.id
      );
      s.health = nearbyConflict ? (Math.random() < 0.5 ? "strained" : "nominal") : "nominal";
    }
    // consensus rate eases upward as reviews accumulate
    const target =
      this.resolvedConflicts + this.disputes.length > 0
        ? this.resolvedConflicts / (this.resolvedConflicts + this.disputes.length)
        : 0.96;
    this.consensusRate += (Math.max(0.9, target) - this.consensusRate) * Math.min(1, dt * 0.6);
  }

  private overallProgress() {
    let sum = 0;
    let w = 0;
    for (const seed of SYSTEMS) {
      if (seed.kind === "coordinator") continue;
      const s = this.hub(seed.id);
      sum += s.progress * seed.share;
      w += seed.share;
    }
    return w > 0 ? sum / w : 0;
  }

  private trimMsgWindow() {
    const cutoff = this.elapsed - 1;
    while (this.msgWindow.length && this.msgWindow[0] < cutoff) this.msgWindow.shift();
  }

  private pushEvent(level: FeedEvent["level"], text: string, detail?: string) {
    this.events.unshift({
      id: this.eventId++,
      level,
      text,
      detail,
      time: this.elapsed,
    });
    if (this.events.length > 80) this.events.length = 80;
  }

  // ---- interaction -----------------------------------------------------
  pickAgent(px: number, py: number): number | null {
    let best: number | null = null;
    let bestD = 18 * 18;
    for (const a of this.agents) {
      if (this.elapsed < wakeAt.get(a.id)!) continue;
      const dx = a.x - px;
      const dy = a.y - py;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = a.id;
      }
    }
    return best;
  }

  pickSystem(px: number, py: number): string | null {
    for (const s of this.systems) {
      const dx = s.x - px;
      const dy = s.y - py;
      if (dx * dx + dy * dy < 40 * 40) return s.id;
    }
    return null;
  }

  // ---- live intelligence (the "ask the swarm" copilot) ----------------
  query(text: string): QueryResult {
    const q = text.trim().toLowerCase();
    const id = this.queryId++;
    const overall = this.overallProgress();
    const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
    const num = (x: number) => Math.round(x).toLocaleString("en-US");

    const dataSystems = this.systems.filter((s) => s.kind !== "coordinator");
    const perSystem = new Map<string, number>();
    for (const a of this.agents) perSystem.set(a.systemId, (perSystem.get(a.systemId) ?? 0) + 1);

    const wrap = (
      headline: string,
      detail: string,
      metrics: QueryMetric[],
      citations: string[],
      tone: QueryResult["tone"]
    ): QueryResult => ({ id, query: text.trim(), headline, detail, metrics, citations, tone });

    // --- specific agent? ---
    const agentMatch = q.match(/(?:agent[-\s]?|#)0*(\d{1,4})/);
    if (agentMatch) {
      const aid = parseInt(agentMatch[1], 10);
      const a = this.agents[aid];
      if (a) {
        const hub = this.hub(a.systemId);
        const partner = a.partner != null ? this.agents[a.partner] : null;
        return wrap(
          `${a.name} is ${a.state}`,
          `${a.role} on ${hub.label}, currently ${a.task}.${
            partner ? ` Negotiating with ${partner.name} (${partner.role}).` : ""
          }`,
          [
            { label: "state", value: a.state, tone: a.state === "disputing" ? "conflict" : "accent" },
            { label: "confidence", value: pct(a.confidence), tone: "accent" },
            { label: "assigned", value: hub.label },
          ],
          [`agent telemetry · #${a.id}`],
          a.state === "disputing" ? "conflict" : "info"
        );
      }
    }

    // --- which system are they asking about? ---
    const sysHit = this.systems.find((s) => {
      const k = s.kind;
      if (k === "kafka" && /(kafka|topic|partition|stream|broker)/.test(q)) return true;
      if (k === "postgres" && /(postgres|pg|sql|oltp|relational|row)/.test(q)) return true;
      if (k === "opensearch" && /(opensearch|search|index|elastic|shard|relevance)/.test(q)) return true;
      if (k === "registry" && /(registry|schema|contract|avro|protobuf|compat)/.test(q)) return true;
      if (k === "coordinator" && /(orchestrat|control plane|coordinator|quorum|planner)/.test(q)) return true;
      return false;
    });

    const conflictWords = /(conflict|disagree|dispute|argue|fight|tension|blocked)/.test(q);
    const riskWords = /(risk|blocker|concern|worst|behind|slow|stuck|attention|danger|problem|wrong)/.test(q);
    const trustWords = /(trust|safe|confiden|reliab|consensus|agree|verified|sure)/.test(q);
    const etaWords = /(eta|when|finish|done|complete|long|time left|remaining)/.test(q);

    if (sysHit) {
      const count = perSystem.get(sysHit.id) ?? 0;
      const sysConflicts = this.disputes.filter(
        (d) => this.agents[d.aId]?.systemId === sysHit.id || this.agents[d.bId]?.systemId === sysHit.id
      );
      const topics = [...new Set(sysConflicts.map((d) => d.topic))].slice(0, 3);
      return wrap(
        `${sysHit.label} — ${pct(sysHit.progress)} migrated`,
        `${num(count)} agents are assigned to ${sysHit.label} (${sysHit.sub}). Health is ${sysHit.health}.${
          topics.length ? ` Active debate: ${topics.join("; ")}.` : " No open conflicts here right now."
        }`,
        [
          { label: "progress", value: pct(sysHit.progress), tone: "accent" },
          { label: "agents", value: num(count), tone: "sync" },
          {
            label: "open conflicts",
            value: num(sysConflicts.length),
            tone: sysConflicts.length ? "conflict" : "default",
          },
          { label: "health", value: sysHit.health, tone: sysHit.health === "nominal" ? "accent" : "review" },
        ],
        [`${sysHit.label} telemetry`, "coordination feed"],
        sysConflicts.length ? "conflict" : "info"
      );
    }

    if (riskWords) {
      const slowest = [...dataSystems].sort((a, b) => a.progress - b.progress)[0];
      const strained = dataSystems.filter((s) => s.health !== "nominal").map((s) => s.label);
      const topics = [...new Set(this.disputes.map((d) => d.topic))].slice(0, 3);
      return wrap(
        this.disputes.length
          ? `${this.disputes.length} open conflict${this.disputes.length > 1 ? "s" : ""} under quorum review`
          : "No blocking risks — migration is clean",
        `${slowest.label} is the trailing system at ${pct(slowest.progress)}.${
          strained.length ? ` Watching: ${strained.join(", ")} (strained).` : ""
        }${topics.length ? ` Live debates: ${topics.join("; ")}.` : ""} All conflicts route through 3-of-3 quorum before commit.`,
        [
          { label: "open conflicts", value: num(this.disputes.length), tone: this.disputes.length ? "conflict" : "accent" },
          { label: "trailing system", value: slowest.label, tone: "review" },
          { label: "consensus rate", value: pct(this.consensusRate), tone: "accent" },
        ],
        ["risk sentinel", "quorum arbiter"],
        this.disputes.length ? "conflict" : "consensus"
      );
    }

    if (conflictWords) {
      const topics = [...new Set(this.disputes.map((d) => d.topic))];
      return wrap(
        `${this.disputes.length} active disagreement${this.disputes.length === 1 ? "" : "s"}`,
        topics.length
          ? `Agents are debating: ${topics.slice(0, 4).join("; ")}. Each resolves only when 3 independent reviewers agree — ${num(
              this.resolvedConflicts
            )} have already been settled this run.`
          : `No open disagreements right now. ${num(this.resolvedConflicts)} conflicts have been resolved by quorum so far.`,
        [
          { label: "open", value: num(this.disputes.length), tone: this.disputes.length ? "conflict" : "default" },
          { label: "resolved", value: num(this.resolvedConflicts), tone: "accent" },
          { label: "reviews passed", value: num(this.reviewsPassed), tone: "review" },
        ],
        ["coordination feed", "quorum arbiter"],
        this.disputes.length ? "conflict" : "consensus"
      );
    }

    if (trustWords) {
      return wrap(
        `Consensus holding at ${pct(this.consensusRate)}`,
        `Every change is peer-reviewed by independent agents and committed only on 3-of-3 quorum. ${num(
          this.reviewsPassed
        )} reviews passed and ${num(this.resolvedConflicts)} conflicts resolved with ${num(
          this.disputes.length
        )} still under review — nothing commits unverified.`,
        [
          { label: "consensus", value: pct(this.consensusRate), tone: "accent" },
          { label: "reviews passed", value: num(this.reviewsPassed), tone: "review" },
          { label: "unresolved", value: num(this.disputes.length), tone: this.disputes.length ? "conflict" : "accent" },
        ],
        ["quorum arbiter", "risk sentinel"],
        "consensus"
      );
    }

    if (etaWords) {
      const rate = this.elapsed > 3 && overall > 0.01 ? overall / this.elapsed : 0;
      let detail: string;
      let value: string;
      if (rate <= 0) {
        detail = "Throughput is still stabilizing — a reliable estimate will be available within a few seconds.";
        value = "calibrating";
      } else {
        const remain = Math.max(0, (1 - overall) / rate);
        const mins = Math.floor(remain / 60);
        const secs = Math.round(remain % 60);
        value = mins > 0 ? `~${mins}m ${secs}s` : `~${secs}s`;
        detail = `At the current verified throughput, the migration is projected to complete in ${value} (sim time). ${pct(
          overall
        )} is already migrated and reconciled.`;
      }
      return wrap("Projected completion", detail, [
        { label: "migrated", value: pct(overall), tone: "accent" },
        { label: "est. remaining", value, tone: "review" },
        { label: "msg / sec", value: num(this.msgWindow.length * 14), tone: "sync" },
      ], ["scheduler", "orchestrator telemetry"], "info");
    }

    if (/(how many|count|fleet|number of agent|agents)/.test(q)) {
      const breakdown = dataSystems
        .map((s) => `${s.label.split(" ").pop()} ${num(perSystem.get(s.id) ?? 0)}`)
        .join(" · ");
      return wrap(
        `${num(this.agents.length)} agents in the fleet`,
        `Distributed across ${this.systems.length} systems — ${breakdown}. Throughput is ${num(
          this.msgWindow.length * 14
        )} messages/sec.`,
        [
          { label: "total agents", value: num(this.agents.length), tone: "accent" },
          { label: "msg / sec", value: num(this.msgWindow.length * 14), tone: "sync" },
          { label: "systems", value: num(this.systems.length) },
        ],
        ["orchestrator telemetry"],
        "info"
      );
    }

    if (/(phase|plan|stage|step|next)/.test(q)) {
      const snap = this.snapshot();
      const next = snap.phase.index + 1 < snap.phase.total ? PHASES[snap.phase.index + 1].label : "cutover complete";
      return wrap(
        `Phase ${snap.phase.index + 1}/${snap.phase.total}: ${snap.phase.current}`,
        `This phase is ${pct(snap.phase.phaseProgress)} done. Up next: ${next}.`,
        [
          { label: "phase", value: `${snap.phase.index + 1}/${snap.phase.total}`, tone: "accent" },
          { label: "phase progress", value: pct(snap.phase.phaseProgress), tone: "review" },
          { label: "overall", value: pct(overall), tone: "accent" },
        ],
        ["scheduler"],
        "info"
      );
    }

    // --- default: full situation summary ---
    return wrap(
      `Migration ${pct(overall)} complete and healthy`,
      `${num(this.agentsAwake())} agents are live across Kafka, Postgres, OpenSearch and the schema registry, exchanging ${num(
        this.msgWindow.length * 14
      )} messages/sec. ${num(this.disputes.length)} conflicts are under quorum review; consensus is holding at ${pct(
        this.consensusRate
      )}.`,
      [
        { label: "migrated", value: pct(overall), tone: "accent" },
        { label: "active agents", value: num(this.agentsAwake()), tone: "sync" },
        { label: "open conflicts", value: num(this.disputes.length), tone: this.disputes.length ? "conflict" : "default" },
        { label: "consensus", value: pct(this.consensusRate), tone: "accent" },
      ],
      ["orchestrator telemetry", "coordination feed"],
      "info"
    );
  }

  private agentsAwake() {
    return this.agents.reduce((n, a) => (this.elapsed >= wakeAt.get(a.id)! ? n + 1 : n), 0);
  }

  // ---- snapshot for React ---------------------------------------------
  snapshot(): Snapshot {
    const overall = this.overallProgress();
    // phase derivation from cumulative weights
    let acc = 0;
    let phaseIndex = 0;
    let phaseProgress = 0;
    for (let i = 0; i < PHASES.length; i++) {
      const next = acc + PHASES[i].weight;
      if (overall < next || i === PHASES.length - 1) {
        phaseIndex = i;
        phaseProgress = Math.min(1, (overall - acc) / PHASES[i].weight);
        break;
      }
      acc = next;
    }

    const awakeCount = this.agents.reduce(
      (n, a) => (this.elapsed >= wakeAt.get(a.id)! ? n + 1 : n),
      0
    );

    const stats: Stats = {
      activeAgents: awakeCount,
      targetAgents: this.agents.length,
      messagesPerSec: this.msgWindow.length,
      totalMessages: this.totalMessages,
      consensusRate: this.consensusRate,
      openConflicts: this.disputes.length,
      resolvedConflicts: this.resolvedConflicts,
      migrated: overall,
      reviewsPassed: this.reviewsPassed,
      elapsed: this.elapsed,
    };

    return {
      systems: this.systems.map((s) => ({
        id: s.id,
        label: s.label,
        sub: s.sub,
        kind: s.kind,
        color: s.color,
        progress: s.progress,
        health: s.health,
      })),
      stats,
      phase: {
        current: PHASES[phaseIndex].label,
        index: phaseIndex,
        total: PHASES.length,
        phaseProgress,
      },
      events: this.events.slice(0, 40),
      selected: this.selectedView(),
    };
  }

  private selectedView() {
    if (this.selectedId == null) return null;
    const a = this.agents[this.selectedId];
    if (!a) return null;
    const partner = a.partner != null ? this.agents[a.partner] : null;
    return {
      id: a.id,
      name: a.name,
      role: a.role,
      systemId: a.systemId,
      systemLabel: this.hub(a.systemId).label,
      state: a.state as AgentState,
      confidence: a.confidence,
      task: a.task,
      partner: partner ? { id: partner.id, name: partner.name, role: partner.role } : null,
    };
  }
}

// wake schedule kept outside the agent object to keep the rendered struct lean
const wakeAt = new Map<number, number>();
