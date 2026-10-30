import { TILE } from './content.js';
import { bodyRadius, canOccupy } from './actor-collision.js';
const states = new WeakMap();
function stateFor(w, e) {
  let actors = states.get(w);
  if (!actors) {
    actors = new WeakMap();
    states.set(w, actors);
  }
  let s = actors.get(e);
  if (!s) {
    s = {
      x: e.x,
      y: e.y,
      still: 0,
      turn: 0,
      pace: 0,
      turnAt: w.elapsed + 6 + noise(e, 0) * 12,
      paceAt: w.elapsed + 18 + noise(e, 1) * 30,
    };
    actors.set(e, s);
  }
  return s;
}
// Cosmetic schedules must not consume the simulation's seeded gameplay RNG.
function noise(e, salt) {
  let h = (2166136261 ^ salt) >>> 0;
  for (const c of String(e.id)) {
    h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 2246822519) >>> 0;
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}
function danger(w, e) {
  return (
    e.enemyId ||
    e.aggressor ||
    e.pendingStrike ||
    e.attack > 0 ||
    (e.stunUntil || 0) > w.elapsed ||
    e.lawPursuit ||
    e.challengeCell ||
    e.battleAlert ||
    (e.horse?.fleeUntil || 0) > w.elapsed
  );
}
export function faceConversation(w, e) {
  if (!e || e === w.player || e.hp <= 0 || w.player.hp <= 0) return false;
  const dx = w.player.x - e.x,
    dy = w.player.y - e.y;
  if (Math.hypot(dx, dy) < 1) return false;
  const s = stateFor(w, e);
  s.facing = ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8;
  s.attentionUntil = w.elapsed + 5 + noise(e, 22) * 3;
  s.turnAt = s.attentionUntil + 6;
  s.goal = null;
  e.dir = s.facing;
  return true;
}
export function holdConversation(w, e) {
  const s = stateFor(w, e);
  if (!(s.attentionUntil > w.elapsed)) return false;
  if (
    (e.cellId && (w.prisons || []).some((p) => p.cells.some((c) => c.id === e.cellId && c.open))) ||
    danger(w, e) ||
    w.player.weaponDrawn ||
    Math.hypot(e.x - w.player.x, e.y - w.player.y) > 220
  ) {
    s.attentionUntil = 0;
    return false;
  }
  e.dir = s.facing;
  e.state = 'idle';
  return true;
}
const workingRoles = new Set([
  'smith',
  'cook',
  'herbalist',
  'tailor',
  'farmer',
  'gatherer',
  'armorer',
  'bowyer',
  'leatherworker',
]);
const idleStates = new Set([
  'idle',
  'working',
  'waitingForSupplies',
  'waitingForHarvest',
  'waitingWarehouse',
  'holdingCourt',
  'royalGuard',
  'prisonGuard',
  'imprisoned',
  'waitingForRiot',
  'patrol',
  'roadPatrol',
  'escorting',
  'ambush',
  'errands',
  'roam',
  'horseWaiting',
]);
export function updateIdleFacing(w, dt) {
  for (const e of w.entities) {
    if (e.hp <= 0 || e.role === 'dummy' || e.horse?.rider) continue;
    const s = stateFor(w, e),
      moved = Math.hypot(e.x - s.x, e.y - s.y) > 0.3;
    s.x = e.x;
    s.y = e.y;
    if (
      moved ||
      danger(w, e) ||
      !idleStates.has(e.state || 'idle') ||
      e.production ||
      e.action ||
      (e.state === 'working' && workingRoles.has(e.role))
    ) {
      s.still = 0;
      s.turnAt = Math.max(s.turnAt, w.elapsed + 5);
      continue;
    }
    s.still += dt;
    if (s.attentionUntil > w.elapsed) {
      e.dir = s.facing;
      continue;
    }
    if (s.still < 2 || w.elapsed < s.turnAt) continue;
    const direction = noise(e, 100 + s.turn++) < 0.5 ? -1 : 1;
    e.dir = ((e.dir || 0) + direction + 8) % 8;
    s.turnAt = w.elapsed + 7 + noise(e, 200 + s.turn) * 13;
  }
}
export function paceInCell(w, e, cell, dt) {
  const s = stateFor(w, e);
  if (cell.open) {
    s.goal = null;
    return;
  }
  if (w.elapsed < s.attentionUntil || danger(w, e)) return;
  if (s.goal) {
    const before = { x: e.x, y: e.y };
    w.move(e, s.goal.x, s.goal.y, 27, dt);
    if (
      Math.hypot(e.x - s.goal.x, e.y - s.goal.y) < 7 ||
      w.elapsed > s.walkUntil ||
      Math.hypot(e.x - before.x, e.y - before.y) < 0.05
    ) {
      s.goal = null;
      s.paceAt = w.elapsed + 24 + noise(e, 400 + s.pace++) * 36;
    }
    return;
  }
  if (w.elapsed < s.paceAt) return;
  const margin = bodyRadius(e) + 4,
    minX = (cell.x + 1) * TILE + margin,
    maxX = (cell.x + cell.w - 1) * TILE - margin,
    minY = (cell.y + 1) * TILE + margin,
    maxY = (cell.y + cell.h - 1) * TILE - margin;
  s.paceAt = w.elapsed + 24 + noise(e, 400 + s.pace++) * 36;
  if (maxX < minX || maxY < minY) return;
  for (let i = 0; i < 6; i++) {
    const goal = {
      x: minX + (maxX - minX) * noise(e, 600 + s.pace * 17 + i),
      y: minY + (maxY - minY) * noise(e, 800 + s.pace * 17 + i),
    };
    if (Math.hypot(goal.x - e.x, goal.y - e.y) < 18 || !canOccupy(w, e, goal.x, goal.y)) continue;
    s.goal = goal;
    s.walkUntil = w.elapsed + 3;
    break;
  }
}
