import { Simulation } from "./Simulation";

/**
 * Single shared simulation. Defined at module scope so the canvas RAF loop and
 * the React snapshot poll always read the exact same state, even through
 * StrictMode's double-mount in development.
 */
export const simulation = new Simulation({ fleetSize: 1600 });
