import { catalogEntry } from './sprite-sheets.js';
import { TILE } from '../core/content.js';
const snake = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
export function buildingSpriteId(b) {
  if (b.sprite) return b.sprite;
  if (b.type === 'loreTent') return 'building_nomad_tent';
  if (b.type === 'prison') return 'building_prison_' + (b.w >= 12 ? 'large' : 'small');
  if (b.type === 'dungeonGate')
    return b.ruined ? 'building_ruins_entrance' : 'building_catacomb_entrance';
  return 'building_' + snake(b.type);
}
// Destination rects are fractions of the footprint; source anchors remain normalized PNG coordinates.
export function componentRect(b, part) {
  const r = part.rect || [0, 0, 1, 1];
  if (part.origin === 'door') {
    const d = b.door || { x: b.x + (b.w - 1) / 2, y: b.y + b.h - 1 };
    return [(d.x + r[0]) * TILE, (d.y + r[1]) * TILE, r[2] * TILE, r[3] * TILE];
  }
  return [
    (b.x + r[0] * b.w) * TILE,
    (b.y + r[1] * b.h) * TILE,
    r[2] * b.w * TILE,
    r[3] * b.h * TILE,
  ];
}
export function assemblyPlan(manifest, b, inside = false) {
  const entry = catalogEntry(manifest, buildingSpriteId(b)),
    a = entry?.assembly;
  if (!a) return null;
  const shape = b.type === 'arkVault' ? 'ellipse' : 'rect',
    variant = a.variants?.[shape];
  if (!variant) return null;
  const result = [];
  for (const part of variant.parts) {
    if ((part.visibility === 'outside' && inside) || (part.visibility === 'inside' && !inside))
      continue;
    let id = part.asset;
    if (part.states)
      id = part.states[b.doorState || (inside ? 'open' : 'closed')] || part.states.closed;
    const [owner, key] = id.split('#'),
      asset = catalogEntry(manifest, owner),
      config = key ? asset?.components?.[key] : asset;
    if (!config?.spriteReady) {
      if (part.required !== false) return null;
      continue;
    }
    result.push({ ...part, id, config });
  }
  return result;
}
export class BuildingSprites {
  constructor(sheets) {
    this.sheets = sheets;
    this.boundsCache = new WeakMap();
  }
  plan(b, inside) {
    return assemblyPlan(this.sheets.manifest, b, inside);
  }
  bounds(b) {
    const key = [b.x, b.y, b.w, b.h, b.type, b.sprite, b.doorState, b.door?.x, b.door?.y].join(':');
    const cached = this.boundsCache.get(b);
    if (cached?.manifest === this.sheets.manifest && cached.key === key) return cached.value;
    const plan = this.plan(b, false);
    if (!plan) {
      const value = {
        left: (b.x - b.w * 0.25) * TILE,
        right: (b.x + b.w * 1.25) * TILE,
        top: (b.y - b.h) * TILE,
        bottom: (b.y + b.h * 1.25) * TILE,
      };
      this.boundsCache.set(b, { key, manifest: this.sheets.manifest, value });
      return value;
    }
    const result = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
    for (const p of plan) {
      const [x, y, w, h] = componentRect(b, p),
        a = p.config.anchor || [0, 0];
      result.left = Math.min(result.left, x - a[0] * w);
      result.right = Math.max(result.right, x + (1 - a[0]) * w);
      result.top = Math.min(result.top, y - a[1] * h);
      result.bottom = Math.max(result.bottom, y + (1 - a[1]) * h);
    }
    this.boundsCache.set(b, { key, manifest: this.sheets.manifest, value: result });
    return result;
  }
  visible(b, view) {
    const a = this.bounds(b);
    return a.left < view.right && a.right > view.left && a.top < view.bottom && a.bottom > view.top;
  }
  prepare(buildings, view) {
    for (const b of buildings)
      if (this.visible(b, view))
        for (const inside of [false, true])
          for (const p of this.plan(b, inside) || []) void this.sheets.load(p.id, 0);
  }

  draw(c, b, inside, phase) {
    const plan = this.plan(b, inside);
    if (!plan) return false;
    // Atomic cutover: keep the procedural building until every visible required module is decoded.
    let ready = true;
    for (const p of plan) {
      const e = this.sheets.assets.get(p.id);
      if (!e?.image) {
        void this.sheets.load(p.id);
        if (p.required !== false) ready = false;
      }
    }
    if (!ready) return false;
    for (const p of plan) {
      if (p.phase !== phase) continue;
      const e = this.sheets.assets.get(p.id);
      if (!e?.image) continue;
      if (e.resource) e.resource.used = this.sheets.now();
      const [x, y, w, h] = componentRect(b, p),
        anchor = p.config.anchor || [0, 0];
      c.save();
      if (p.doorCutout && b.door) {
        c.beginPath();
        c.rect(x, y, w, h);
        c.rect(b.door.x * TILE, (b.door.y - 0.5) * TILE, TILE, TILE * 1.5);
        c.clip('evenodd');
      }
      c.imageSmoothingEnabled = false;
      c.drawImage(e.image, x - anchor[0] * w, y - anchor[1] * h, w, h);
      c.restore();
    }
    return true;
  }
}
