import { purpleAt } from '../world/lore-world.js';
import { TILE, W } from '../core/content.js';
// Grass is not canopy. Only slow, deep forest outside settlements casts this shade.
export function forestShade(world, p = world.player) {
  if (world.dungeonSpec || world.inCity(p) || world.interiorAt(p)) return 0;
  const x = Math.floor(p.x / TILE),
    y = Math.floor(p.y / TILE),
    tile = world.tile(x, y),
    depth = Math.min(18, world.depth[y * W + x] || 0),
    terrain = world.terrain(p);
  if (![0, 9].includes(tile) || depth <= 11 || terrain.speed > 0.7) return 0;
  return Math.min(0.18, ((depth - 11) / 7) * 0.18);
}

export const AIR_GRACE = 12,
  AIR_DAMAGE = 4;
export function atmospherePressure(w) {
  if (w.dungeonSpec || !w.loreGeography) return 0;
  const p = w.player,
    a = w.loreGeography.ark;
  if (!purpleAt(w, p)) return 0;
  const d = ((p.x / TILE - a.x) / a.rx) ** 2 + ((p.y / TILE - a.y) / a.ry) ** 2;
  return 0.28 + Math.max(0, 1 - d / 0.4) * 0.28;
}
export function breathingDanger(w) {
  return (
    !w.dungeonSpec &&
    purpleAt(w, w.player) &&
    !(w.player.inventory.breathSuit > 0 && w.player.breathSuitWorn) &&
    w.player.race !== 'arctarian'
  );
}
export function drawEdgePressure(c, w, width, height, forest = forestShade(w), time = w.elapsed) {
  const purple = atmospherePressure(w),
    danger = breathingDanger(w),
    exposure = w.loreState?.exposure || 0;
  const pulse = danger ? Math.pow((1 + Math.sin(time * 5.8)) / 2, 5) : 0;
  const strength = Math.max(forest * 3, purple),
    panic = danger ? Math.min(1, 0.15 + exposure / 24) : 0;
  if (!strength && !panic) return;
  c.save();
  c.translate(width / 2, height / 2);
  c.scale(width / 2, height / 2);
  const g = c.createRadialGradient(0, 0, 0.04, 0, 0, 1.42),
    rgb = purple || panic ? '57,20,83' : '3,15,13';
  g.addColorStop(0, `rgba(${rgb},0)`);
  g.addColorStop(0.25, `rgba(${rgb},${panic * pulse * 0.23})`);
  g.addColorStop(0.55, `rgba(${rgb},${Math.min(0.62, strength * 0.16 + panic * pulse * 0.55)})`);
  g.addColorStop(
    0.85,
    `rgba(${rgb},${Math.min(0.9, strength * 0.68 + panic * (0.22 + pulse * 0.6))})`,
  );
  g.addColorStop(1, `rgba(${rgb},${Math.min(0.96, strength + panic * 0.6)})`);
  c.fillStyle = g;
  c.fillRect(-1, -1, 2, 2);
  c.restore();
  if (danger) {
    c.save();
    c.textAlign = 'center';
    c.font = 'bold 16px system-ui';
    c.fillStyle = '#f1cdf9';
    c.shadowColor = '#351544';
    c.shadowBlur = 9;
    c.fillText(
      exposure < AIR_GRACE
        ? 'NO AIR TO BREATHE · leave the mist or put on the garment'
        : 'SUFFOCATING · put on the sealed-breath garment',
      width / 2,
      Math.max(85, height * 0.17),
    );
    c.font = '12px system-ui';
    c.fillText(
      exposure < AIR_GRACE
        ? 'Air remaining: ' + Math.ceil(AIR_GRACE - exposure) + ' sec.'
        : 'Health Is Falling',
      width / 2,
      Math.max(105, height * 0.17 + 23),
    );
    c.restore();
  }
}
