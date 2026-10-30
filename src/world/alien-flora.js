import { W, H, TILE } from '../core/content.js';
import { seededRandom as rng } from './map-geometry.js';
export function generateAlienFlora(w) {
  w.alienFlora = [];
  if (w.generatorVersion < 11 || !w.arkAtmosphere) return;
  const r = rng(w.seed + ':alien-flora');
  for (let y = 2; y < H - 2; y += 3)
    for (let x = 2; x < W - 2; x += 3) {
      if (
        !w.arkAtmosphere[y * W + x] ||
        w.solids[y * W + x] ||
        w.roadMask[y * W + x] ||
        [2, 4, 5].includes(w.tile(x, y)) ||
        w.interiorAt({ x: x * TILE, y: y * TILE }) ||
        r() > 0.22
      )
        continue;
      w.alienFlora.push({
        x: (x + r()) * TILE,
        y: (y + r()) * TILE,
        s: 0.65 + r() * 0.65,
        species: Math.floor(r() * 3),
      });
    }
}
