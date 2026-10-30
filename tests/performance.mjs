import { World } from '../src/core/simulation.js';
const world = new World('734291'),
  times = [],
  start = performance.now();
for (let i = 0; i < 1200; i++) {
  const tick = performance.now();
  world.update(0.15);
  times.push(performance.now() - tick);
}
times.sort((a, b) => a - b);
console.log(
  JSON.stringify(
    {
      seed: world.seed,
      simulatedSeconds: 180,
      population: world.entities.length,
      computeMs: Math.round(performance.now() - start),
      stepMs: {
        median: +times[600].toFixed(2),
        p95: +times[1140].toFixed(2),
        p99: +times[1188].toFixed(2),
        max: +times.at(-1).toFixed(2),
      },
      note: 'Headless, synchronous pathfinding, full-map simulation; browser A* uses a worker.',
    },
    null,
    2,
  ),
);
