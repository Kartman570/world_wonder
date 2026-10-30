import { PathPlanner } from './pathfinding.js';
let planner;
export function handleMessage({ data }) {
  if (data.type === 'init') {
    planner = new PathPlanner(data.map);
    globalThis.postMessage({ type: 'ready' });
    return;
  }
  if (data.type === 'path') {
    try {
      const started = performance.now();
      const route = planner.find(data.start, data.dest);
      globalThis.postMessage({ type: 'path', id: data.id, route, ms: performance.now() - started });
    } catch (error) {
      globalThis.postMessage({ type: 'error', id: data.id, message: String(error) });
    }
  }
}
if (typeof self !== 'undefined') self.onmessage = handleMessage;
