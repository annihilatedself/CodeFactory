import type { MigrationPhase, SystemKind } from "./types";

/**
 * The migration blueprint. In a real deployment this JSON is produced by the
 * Commander planner and streamed from the backend — here it seeds the simulation.
 */

export interface SystemSeed {
  id: string;
  label: string;
  sub: string;
  kind: SystemKind;
  ax: number;
  ay: number;
  color: string;
  /** share of the agent fleet assigned to this system */
  share: number;
}

export const SYSTEMS: SystemSeed[] = [
  {
    id: "coord",
    label: "Orchestrator",
    sub: "Commander control plane",
    kind: "coordinator",
    ax: 0.5,
    ay: 0.46,
    color: "#22d3a7",
    share: 0.08,
  },
  {
    id: "kafka",
    label: "Apache Kafka",
    sub: "event backbone · 412 topics",
    kind: "kafka",
    ax: 0.2,
    ay: 0.26,
    color: "#a06bff",
    share: 0.22,
  },
  {
    id: "pg",
    label: "PostgreSQL",
    sub: "primary OLTP · 1.4 TB",
    kind: "postgres",
    ax: 0.8,
    ay: 0.27,
    color: "#4d8dff",
    share: 0.3,
  },
  {
    id: "os",
    label: "OpenSearch",
    sub: "search & analytics · 96 indices",
    kind: "opensearch",
    ax: 0.74,
    ay: 0.78,
    color: "#ff7ac4",
    share: 0.24,
  },
  {
    id: "reg",
    label: "Schema Registry",
    sub: "contracts · Avro/Protobuf",
    kind: "registry",
    ax: 0.24,
    ay: 0.76,
    color: "#f5b53d",
    share: 0.16,
  },
];

export const PHASES: MigrationPhase[] = [
  { id: "discover", label: "Schema discovery & dependency graph", weight: 0.12 },
  { id: "contracts", label: "Contract negotiation & dual-write setup", weight: 0.18 },
  { id: "backfill", label: "Historical backfill & CDC streaming", weight: 0.34 },
  { id: "verify", label: "Row-level verification & reconciliation", weight: 0.22 },
  { id: "cutover", label: "Consensus cutover & traffic shift", weight: 0.14 },
];

export const ROLES: Record<string, string[]> = {
  coord: ["Planner", "Scheduler", "Quorum Arbiter", "Risk Sentinel", "Rollback Warden"],
  kafka: [
    "Topic Mapper",
    "Partition Rebalancer",
    "Offset Auditor",
    "Consumer-Lag Watcher",
    "Dead-Letter Triage",
  ],
  pg: [
    "Schema Diff",
    "Index Strategist",
    "Constraint Validator",
    "Dual-Write Shim",
    "Vacuum Planner",
    "FK Resolver",
  ],
  os: [
    "Index Designer",
    "Analyzer Tuner",
    "Mapping Migrator",
    "Shard Balancer",
    "Relevance QA",
  ],
  reg: ["Contract Author", "Compat Checker", "Version Pinner", "Breaking-Change Sentinel"],
};

export const TASKS: Record<string, string[]> = {
  coord: [
    "scheduling phase fan-out",
    "arbitrating quorum vote #{n}",
    "reweighting risk budget",
    "holding rollback checkpoint",
  ],
  kafka: [
    "remapping topic orders.v3 → orders.v4",
    "rebalancing 64 partitions",
    "auditing consumer offsets",
    "draining dead-letter queue",
    "verifying exactly-once delivery",
  ],
  pg: [
    "diffing public.orders ↔ target",
    "planning covering index on (tenant, ts)",
    "validating 14 FK constraints",
    "backfilling rows {n}M–{m}M",
    "reconciling NULL → DEFAULT migration",
  ],
  os: [
    "designing index orders-2026.06",
    "tuning edge-ngram analyzer",
    "migrating mapping v2 → v3",
    "rebalancing 18 shards",
    "scoring relevance regression",
  ],
  reg: [
    "authoring Avro contract v7",
    "checking backward compatibility",
    "pinning schema version",
    "flagging breaking field removal",
  ],
};

export const DISPUTE_TOPICS = [
  "nullable timestamp coercion",
  "partition key cardinality",
  "index fill-factor tradeoff",
  "Avro union ordering",
  "shard count for hot tenant",
  "dual-write conflict resolution",
  "FK cascade vs restrict",
  "analyzer tokenization rule",
  "offset reset policy",
  "decimal precision downcast",
];
