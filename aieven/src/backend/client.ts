import type { AuditEvent, BackendHealth, CopilotQueryResponse, SnapshotResponse } from "./contracts";
import type { BackendApi } from "./api";

export class BackendClient {
  private readonly api: BackendApi;

  constructor(api: BackendApi) {
    this.api = api;
  }

  getHealth(): Promise<BackendHealth> {
    return this.api.health();
  }

  getSnapshot(): Promise<SnapshotResponse> {
    return this.api.snapshot();
  }

  askCopilot(question: string): Promise<CopilotQueryResponse> {
    return this.api.copilotQuery({ question });
  }

  getAuditEvents(): Promise<AuditEvent[]> {
    return this.api.auditEvents();
  }
}

