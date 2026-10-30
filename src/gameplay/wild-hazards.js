import { TILE, W, H } from '../core/content.js';
const D = (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
  delta = (a) => Math.atan2(Math.sin(a), Math.cos(a));
export function initializeHazards(w) {
  w.webs ??= {};
  if (!w.webRevision) {
    const silk = !w.dungeonSpec && w.places.find((z) => z.id === 'silk-road');
    if (silk)
      for (let y = silk.y - 8; y <= silk.y + 8; y++)
        for (let x = silk.x - 12; x <= silk.x + 12; x++)
          if (
            ((x - silk.x) / 12) ** 2 + ((y - silk.y) / 8) ** 2 < 1 &&
            !w.solids[y * W + x] &&
            ![2, 4].includes(w.tile(x, y))
          )
            w.webs[y * W + x] = { source: 'silk-road', at: 0 };
    w.webRevision = 1;
  }
  w.poisoned = new Set([w.player, ...w.entities].filter((e) => e.poison?.length).map((e) => e.id));
}
export function webAt(w, p) {
  return !!w.webs?.[Math.floor(p.y / TILE) * W + Math.floor(p.x / TILE)];
}
export function poisonBite(w, spider, victim) {
  if (victim.hp <= 0) return;
  victim.poison ??= [];
  victim.poison = victim.poison.filter((s) => s.until > w.elapsed);
  victim.poison.push({ until: w.elapsed + 6, rate: 2, attacker: spider.id, name: spider.name });
  if (victim.poison.length > 8) victim.poison.shift();
  w.poisoned ??= new Set();
  w.poisoned.add(victim.id);
  if (victim === w.player)
    w.log('The bite poisoned your blood. Poison lasts several more seconds.');
}
export function updatePoison(w, dt) {
  for (const id of w.poisoned || []) {
    const e = id === 'player' ? w.player : w.entityById.get(id);
    if (!e || e.hp <= 0 || !e.poison?.length) {
      w.poisoned.delete(id);
      continue;
    }
    let damage = 0;
    for (const s of e.poison)
      damage += s.rate * Math.max(0, Math.min(dt, s.until - (w.elapsed - dt)));
    e.poison = e.poison.filter((s) => s.until > w.elapsed);
    e.hp = Math.max(0, e.hp - damage);
    if (damage && w.elapsed >= (e.nextPoisonFx || 0)) {
      w.effects.push({ x: e.x, y: e.y - 45, text: 'POISON', life: 0.7, color: '#afc37c' });
      e.nextPoisonFx = w.elapsed + 1;
    }
    if (e.hp <= 0) {
      const s = e.poison[0];
      w.die(e, {
        role: 'caveSpider',
        name: s?.name || 'Spider Venom',
        deathReason: 'Spider venom kept working after the bite.',
      });
      w.poisoned.delete(id);
      if (e === w.player) return;
    }
    if (!e.poison.length) w.poisoned.delete(id);
  }
}
export function castWeb(w, spider, target) {
  if (
    spider.role !== 'caveSpider' ||
    w.elapsed < (spider.nextWeb || 0) ||
    D(spider, target) > 9 * TILE ||
    !w.visibleFrom(spider, target) ||
    !w.lineClear(spider, target)
  )
    return 0;
  spider.nextWeb = w.elapsed + 8;
  const angle = Math.atan2(target.y - spider.y, target.x - spider.x);
  let n = 0;
  for (let forward = 1; forward <= 3; forward++)
    for (let side = -1; side <= 1; side++) {
      const p = {
          x: spider.x + Math.cos(angle) * TILE * forward - Math.sin(angle) * TILE * side,
          y: spider.y + Math.sin(angle) * TILE * forward + Math.cos(angle) * TILE * side,
        },
        x = Math.floor(p.x / TILE),
        y = Math.floor(p.y / TILE),
        i = y * W + x;
      if (
        x < 1 ||
        y < 1 ||
        x >= W - 1 ||
        y >= H - 1 ||
        w.solids[i] ||
        [2, 4].includes(w.tile(x, y)) ||
        !w.lineClear(spider, p)
      )
        continue;
      if (!w.webs[i]) {
        w.webs[i] = { source: spider.id, at: w.time };
        n++;
      }
    }
  if (n)
    w.effects.push({ x: spider.x, y: spider.y - 50, text: 'WEBS', life: 0.8, color: '#dbdfd1' });
  return n;
}
export function cutWeb(w, actor, strike) {
  if (actor !== w.player || strike.kind !== 'sword') return 0;
  let n = 0;
  const range = strike.config.range + TILE * 0.5,
    tx = Math.floor(actor.x / TILE),
    ty = Math.floor(actor.y / TILE);
  for (let y = ty - 3; y <= ty + 3; y++)
    for (let x = tx - 3; x <= tx + 3; x++) {
      const i = y * W + x;
      if (!w.webs[i]) continue;
      const p = { x: (x + 0.5) * TILE, y: (y + 0.5) * TILE },
        d = D(actor, p);
      if (
        d <= range &&
        (d < TILE * 0.8 ||
          Math.abs(delta(Math.atan2(p.y - actor.y, p.x - actor.x) - strike.angle)) <=
            strike.config.arc) &&
        w.lineClear(actor, p)
      ) {
        delete w.webs[i];
        n++;
      }
    }
  if (n) w.log('Webs cut: ' + n + ' plots.');
  return n;
}
export function fairyDefense(w, e, dt) {
  if (e.role !== 'fairy') return false;
  const p = w.player,
    provoked =
      (e.lastAttackerId === 'player' && w.elapsed - (e.lastAttackAt || 0) < 20) ||
      e.aggressor === 'player';
  const threat = provoked ? p : w.nearby(e, 180).find((o) => o === p && p.weaponDrawn);
  if (threat && threat.hp > 0 && D(e, threat) < 1200) {
    if (provoked && D(e, p) < 175 && w.elapsed >= (e.nextElectric || 0)) {
      e.nextElectric = w.elapsed + 7;
      w.damage(e, p, 2);
      p.stunUntil = Math.max(p.stunUntil || 0, w.elapsed + 3);
      p.pendingStrike = null;
      w.effects.push({ x: e.x, y: e.y, field: 175, life: 0.65, color: '#a6d8e9' });
      w.log('The winged attendant flares with prickling light. You are stunned.');
    }
    e.flightUntil = w.elapsed + 7;
    e.fleeFrom = { x: threat.x, y: threat.y };
  }
  if ((e.flightUntil || 0) > w.elapsed && e.fleeFrom) {
    e.state = 'fairyFlight';
    const dx = e.x - e.fleeFrom.x || 1,
      dy = e.y - e.fleeFrom.y;
    const length = Math.hypot(dx, dy) || 1;
    w.move(e, e.x + (dx / length) * 1000, e.y + (dy / length) * 1000, 540, dt);
    return true;
  }
  return false;
}
export function dominance(w, e) {
  if (!['nomad', 'nomadArcher'].includes(e.role) || e.enemyId || w.elapsed < (e.nextDominance || 0))
    return;
  e.nextDominance = w.elapsed + 25 + w.random() * 45;
  const fairy = w
    .nearby(e, 130)
    .find((o) => o.role === 'fairy' && o.hp > 20 && w.canInteract(e, o, 130));
  if (!fairy) return;
  w.damage(e, fairy, Math.min(2, fairy.hp - 20));
  e.attack = 0.2;
  fairy.flightUntil = w.elapsed + 2;
  fairy.fleeFrom = { x: e.x, y: e.y };
  w.log(e.name + ' struck the winged attendant and shoved her off the road.', { at: e });
}
export function drawWebs(c, w, bounds) {
  const { left, right, top, bottom } = bounds;
  c.strokeStyle = '#d7dfd18c';
  c.lineWidth = 1;
  for (
    let y = Math.max(0, Math.floor(top / TILE));
    y <= Math.min(H - 1, Math.ceil(bottom / TILE));
    y++
  )
    for (
      let x = Math.max(0, Math.floor(left / TILE));
      x <= Math.min(W - 1, Math.ceil(right / TILE));
      x++
    )
      if (w.webs?.[y * W + x]) {
        const cx = (x + 0.5) * TILE,
          cy = (y + 0.5) * TILE;
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3;
          c.beginPath();
          c.moveTo(cx, cy);
          c.lineTo(cx + Math.cos(a) * 30, cy + Math.sin(a) * 25);
          c.stroke();
        }
        for (const r of [9, 18, 26]) {
          c.beginPath();
          for (let i = 0; i <= 6; i++) {
            const a = (i * Math.PI) / 3,
              xx = cx + Math.cos(a) * r,
              yy = cy + Math.sin(a) * r * 0.8;
            i ? c.lineTo(xx, yy) : c.moveTo(xx, yy);
          }
          c.stroke();
        }
      }
}
