import type { QueryResult, Snapshot } from "@/sim/types";
import { backendBootMessages, backendConfig } from "./fixtures";
import type { AuditEvent, BackendHealth, BackendRoute } from "./contracts";

const randomBetween = (min: number, max: number) =>
  Math.round(min + Math.random() * (max - min));

const nowIso = () => new Date().toISOString();

export class BackendStore {
  private bootedAt = Date.now();
  private audits: AuditEvent[] = [];
  private requestCounter = 0;
  private lastSnapshot: Snapshot | null = null;
  private lastSnapshotAt: string | null = null;
  private queryCache = new Map<string, QueryResult>();
  private queueDepth = 0;

  nextRequestId(prefix = "req") {
    this.requestCounter += 1;
    return `${prefix}_${this.requestCounter.toString(36).padStart(5, "0")}`;
  }

  latency() {
    return randomBetween(backendConfig.minLatencyMs, backendConfig.maxLatencyMs);
  }

  async wait(latencyMs = this.latency()) {
    this.queueDepth += 1;
    await new Promise((resolve) => window.setTimeout(resolve, latencyMs));
    this.queueDepth = Math.max(0, this.queueDepth - 1);
    return latencyMs;
  }

  health(latencyMs = this.latency()): BackendHealth {
    return {
      status: this.queueDepth > 8 ? "degraded" : "online",
      region: backendConfig.region,
      build: backendConfig.build,
      uptimeMs: Date.now() - this.bootedAt,
      latencyMs,
      queueDepth: this.queueDepth,
      lastSnapshotAt: this.lastSnapshotAt,
    };
  }

  saveSnapshot(snapshot: Snapshot) {
    this.lastSnapshot = snapshot;
    this.lastSnapshotAt = nowIso();
  }

  snapshot() {
    return this.lastSnapshot;
  }

  getCachedQuery(question: string) {
    return this.queryCache.get(this.cacheKey(question)) ?? null;
  }

  saveQuery(question: string, result: QueryResult) {
    this.queryCache.set(this.cacheKey(question), result);
  }

  record(route: BackendRoute, status: number, latencyMs: number, summary: string) {
    this.audits.unshift({
      id: this.nextRequestId("audit"),
      route,
      method: route === "/copilot/query" ? "POST" : "GET",
      status,
      latencyMs,
      at: nowIso(),
      summary,
    });
    if (this.audits.length > backendConfig.maxAuditEvents) {
      this.audits.length = backendConfig.maxAuditEvents;
    }
  }

  auditTrail() {
    return this.audits.slice();
  }

  bootLog() {
    return backendBootMessages.map((summary, index) => ({
      id: `boot_${index.toString().padStart(2, "0")}`,
      route: "/health" as const,
      method: "GET" as const,
      status: 200,
      latencyMs: 0,
      at: new Date(this.bootedAt + index * 120).toISOString(),
      summary,
    }));
  }

  private cacheKey(question: string) {
    return question.trim().toLowerCase().replace(/\s+/g, " ");
  }
}

export const backendStore = new BackendStore();

