import { Simulation } from "./Simulation";
import { BackendApi } from "@/backend/api";
import { BackendClient } from "@/backend/client";

/**
 * Single shared simulation. Defined at module scope so the canvas RAF loop and
 * the React snapshot poll always read the exact same state, even through
 * StrictMode's double-mount in development.
 */
export const simulation = new Simulation({ fleetSize: 1600 });
export const backend = new BackendClient(new BackendApi(simulation));
