export type SystemKind =
  | "coordinator"
  | "kafka"
  | "postgres"
  | "opensearch"
  | "registry";

export interface SystemNode {
  id: string;
  label: string;
  sub: string;
  kind: SystemKind;
  /** normalized anchor position 0..1 in the field */
  ax: number;
  ay: number;
  /** rendered position in css px (computed) */
  x: number;
  y: number;
  color: string;
  progress: number; // 0..1 migration progress
  health: "nominal" | "strained" | "degraded";
}

export type AgentState =
  | "working"
  | "reviewing"
  | "disputing"
  | "consensus"
  | "blocked"
  | "idle";

export interface Agent {
  id: number;
  name: string;
  role: string;
  systemId: string;
  state: AgentState;
  confidence: number; // 0..1
  task: string;
  // orbit params around its system hub
  angle: number;
  radius: number;
  drift: number; // angular velocity
  wobble: number;
  // rendered
  x: number;
  y: number;
  // transient highlight timers
  flash: number; // ticks remaining of state flash
  partner: number | null;
}

export type LinkKind = "sync" | "review" | "conflict" | "consensus" | "handoff";

/** A travelling packet of communication between two points. */
export interface Packet {
  id: number;
  kind: LinkKind;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  t: number; // 0..1 progress
  speed: number;
  curve: number; // bezier bow amount
  pingpong: boolean; // bounce back and forth (disagreement)
  bounces: number;
  color: string;
}

export interface DisputeEdge {
  id: number;
  aId: number;
  bId: number;
  ttl: number; // ticks
  maxTtl: number;
  resolved: boolean;
  topic: string;
}

export type EventLevel = "info" | "consensus" | "conflict" | "review" | "commit";

export interface FeedEvent {
  id: number;
  level: EventLevel;
  text: string;
  detail?: string;
  time: number; // sim seconds
}

export interface MigrationPhase {
  id: string;
  label: string;
  weight: number;
}

export interface Stats {
  activeAgents: number;
  targetAgents: number;
  messagesPerSec: number;
  totalMessages: number;
  consensusRate: number; // 0..1
  openConflicts: number;
  resolvedConflicts: number;
  migrated: number; // 0..1 overall
  reviewsPassed: number;
  elapsed: number; // seconds
}

/** Lightweight serializable snapshot exposed to React (the "JSON" the UI binds to). */
export interface Snapshot {
  systems: Pick<SystemNode, "id" | "label" | "sub" | "kind" | "color" | "progress" | "health">[];
  stats: Stats;
  phase: { current: string; index: number; total: number; phaseProgress: number };
  events: FeedEvent[];
  selected: SelectedAgentView | null;
}

export type QueryTone = "info" | "consensus" | "conflict" | "review";

export interface QueryMetric {
  label: string;
  value: string;
  tone?: "accent" | "conflict" | "review" | "sync" | "default";
}

export interface QueryResult {
  id: number;
  query: string;
  headline: string;
  detail: string;
  metrics: QueryMetric[];
  citations: string[];
  tone: QueryTone;
}

export interface SelectedAgentView {
  id: number;
  name: string;
  role: string;
  systemId: string;
  systemLabel: string;
  state: AgentState;
  confidence: number;
  task: string;
  partner: { id: number; name: string; role: string } | null;
}
