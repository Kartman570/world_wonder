import { terrainMaterial } from './terrain-textures.js';
export class TerrainChunks {
  constructor(terrain) {
    this.terrain = terrain;
    this.worker = null;
    this.failed = false;
    this.pending = new Map();
    this.nextId = 1;
    this.ready = null;
  }
  get available() {
    return (
      !this.failed &&
      typeof Worker !== 'undefined' &&
      typeof OffscreenCanvas !== 'undefined' &&
      this.terrain?.ready
    );
  }
  initialize() {
    if (this.ready) return this.ready;
    this.ready = new Promise((resolve) => {
      try {
        this.worker = new Worker(new URL('./terrain-worker.js', import.meta.url), {
          type: 'module',
        });
        this.worker.onmessage = ({ data }) => {
          if (data.type === 'ready') {
            resolve(true);
            return;
          }
          if (data.error) {
            console.warn('Terrain worker:', data.error);
            this.failed = true;
            for (const done of this.pending.values()) done(null);
            this.pending.clear();
            this.worker?.terminate();
            return;
          }
          const p = this.pending.get(data.id);
          if (p) {
            this.pending.delete(data.id);
            p(data.bitmap || null);
          } else data.bitmap?.close();
        };
        this.worker.onerror = () => {
          this.failed = true;
          resolve(false);
          for (const done of this.pending.values()) done(null);
          this.pending.clear();
          this.worker?.terminate();
        };
        this.worker.postMessage({ type: 'init', materials: [...this.terrain.materials] });
      } catch {
        this.failed = true;
        resolve(false);
      }
    });
    return this.ready;
  }
  async request(w, cx, cy, lod) {
    if (!this.available || !(await this.initialize())) return null;
    const grid = Array.from({ length: 400 }, (_, i) =>
        terrainMaterial(w, cx * 16 - 2 + (i % 20), cy * 16 - 2 + Math.floor(i / 20)),
      ),
      id = this.nextId++;
    return new Promise((resolve) => {
      this.pending.set(id, resolve);
      this.worker.postMessage({ type: 'chunk', id, cx, cy, lod, grid });
    });
  }
  dispose() {
    this.failed = true;
    this.worker?.terminate();
    for (const done of this.pending.values()) done(null);
    this.pending.clear();
  }
}
