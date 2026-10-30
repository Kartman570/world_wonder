import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { World, W, H, TILE } from '../src/core/simulation.js';
import { PathService } from '../src/core/path-service.js';
const w = new World(),
  start = { x: w.cities[0].x * TILE, y: (w.cities[0].y + 10) * TILE },
  dest = { x: w.cities[1].x * TILE, y: (w.cities[1].y + 9) * TILE },
  worker = new Worker(new URL('./worker-harness.mjs', import.meta.url));
try {
  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Background calculation exceeded 10 seconds')),
      10000,
    );
    worker.on('error', reject);
    worker.on('message', (data) => {
      if (data.type === 'ready') worker.postMessage({ type: 'path', id: 1, start, dest });
      else if (data.type === 'path') {
        clearTimeout(timeout);
        resolve(data);
      } else if (data.type === 'error') {
        clearTimeout(timeout);
        reject(new Error(data.message));
      }
    });
    worker.postMessage({
      type: 'init',
      map: { tiles: w.tiles, solids: w.solids, depth: w.depth, width: W, height: H, tile: TILE },
    });
  });
  assert.ok(result.route.length > 10);
  assert.deepEqual(result.route, w.path(start, dest));
  console.log('✓ The worker calculates the same long route through bridges and gates');
} finally {
  await worker.terminate();
}
const OriginalWorker = globalThis.Worker;
try {
  globalThis.Worker = class {
    postMessage() {}
    terminate() {}
  };
  const service = new PathService(w),
    e = w.entities.find((e) => e.caravan);
  service.ready = true;
  e.nav = { x: 548 * TILE, y: 309 * TILE };
  e.pathPending = true;
  w.pathQueue = [{ entity: e.id, dest: { ...e.nav } }];
  service.pump();
  const id = [...service.pending.keys()][0];
  service.receive({ type: 'error', id });
  assert.equal(w.pathService, null);
  assert.equal(e.pathPending, false);
  assert.equal(e.routeDest, null);
  console.log('✓ When the worker fails NPC do not stall and incremental calculation starts');
} finally {
  globalThis.Worker = OriginalWorker;
}
