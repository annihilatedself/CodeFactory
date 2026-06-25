import type { Simulation } from "@/sim/Simulation";
import type {
  AuditEvent,
  BackendHealth,
  CopilotQueryRequest,
  CopilotQueryResponse,
  SnapshotResponse,
} from "./contracts";
import { backendStore, type BackendStore } from "./store";

export class BackendApi {
  private readonly simulation: Simulation;
  private readonly store: BackendStore;

  constructor(simulation: Simulation, store: BackendStore = backendStore) {
    this.simulation = simulation;
    this.store = store;
  }

  async health(): Promise<BackendHealth> {
    const latencyMs = await this.store.wait();
    const health = this.store.health(latencyMs);
    this.store.record("/health", 200, latencyMs, `health ${health.status}`);
    return health;
  }

  async snapshot(): Promise<SnapshotResponse> {
    const requestId = this.store.nextRequestId("snap");
    const latencyMs = await this.store.wait();
    const snapshot = this.simulation.snapshot();
    this.store.saveSnapshot(snapshot);
    this.store.record(
      "/telemetry/snapshot",
      200,
      latencyMs,
      `${snapshot.stats.activeAgents}/${snapshot.stats.targetAgents} agents active`
    );
    return {
      snapshot,
      requestId,
      generatedAt: new Date().toISOString(),
    };
  }

  async copilotQuery(request: CopilotQueryRequest): Promise<CopilotQueryResponse> {
    const question = request.question.trim();
    const requestId = this.store.nextRequestId("ask");
    const cached = this.store.getCachedQuery(question);
    const latencyMs = await this.store.wait(cached ? 18 : undefined);

    if (cached) {
      this.store.record("/copilot/query", 200, latencyMs, `cache hit: ${question}`);
      return { result: cached, requestId, servedFrom: "cache" };
    }

    const result = this.simulation.query(question);
    this.store.saveQuery(question, result);
    this.store.record("/copilot/query", 200, latencyMs, `answered: ${question}`);
    return { result, requestId, servedFrom: "simulation-core" };
  }

  async auditEvents(): Promise<AuditEvent[]> {
    const latencyMs = await this.store.wait(12);
    this.store.record("/audit/events", 200, latencyMs, "audit trail fetched");
    return [...this.store.bootLog(), ...this.store.auditTrail()];
  }
}
