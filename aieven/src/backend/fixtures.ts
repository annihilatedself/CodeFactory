import type { BackendConfig } from "./contracts";

export const backendConfig: BackendConfig = {
  region: "local-sim-1",
  build: "backend.2026.06",
  minLatencyMs: 35,
  maxLatencyMs: 160,
  maxAuditEvents: 80,
};

export const backendBootMessages = [
  "api gateway mounted",
  "in-memory telemetry store warmed",
  "copilot query bridge connected",
  "audit trail retention set to volatile",
] as const;

