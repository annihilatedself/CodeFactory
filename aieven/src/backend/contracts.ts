import type { QueryResult, Snapshot } from "@/sim/types";

export type BackendRoute =
  | "/health"
  | "/telemetry/snapshot"
  | "/copilot/query"
  | "/audit/events";

export type BackendStatus = "online" | "degraded" | "offline";

export interface BackendHealth {
  status: BackendStatus;
  region: string;
  build: string;
  uptimeMs: number;
  latencyMs: number;
  queueDepth: number;
  lastSnapshotAt: string | null;
}

export interface AuditEvent {
  id: string;
  route: BackendRoute;
  method: "GET" | "POST";
  status: number;
  latencyMs: number;
  at: string;
  summary: string;
}

export interface CopilotQueryRequest {
  question: string;
}

export interface CopilotQueryResponse {
  result: QueryResult;
  requestId: string;
  servedFrom: "simulation-core" | "cache";
}

export interface SnapshotResponse {
  snapshot: Snapshot;
  requestId: string;
  generatedAt: string;
}

export interface BackendConfig {
  region: string;
  build: string;
  minLatencyMs: number;
  maxLatencyMs: number;
  maxAuditEvents: number;
}

