import { TILE, W, point } from '../core/content.js';
const D = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function initializeAlienEcology(w) {
  // Old saves can contain the exact zero-yield spider result, before any loot was taken.
  for (const c of w.corpses)
    if (
      c.animal === 'caveSpider' &&
      c.butchered &&
      c.inventory.meat === 0 &&
      c.inventory.hide === 0
    ) {
      delete c.inventory.meat;
      delete c.inventory.hide;
      c.inventory.spiderChitin = 2;
      c.inventory.venomGland = 1;
    }
  if (w.dungeonSpec || w.generatorVersion < 9) return;
  if (!w.alienEcology) {
    const a = w.loreGeography.ark,
      sites = [];
    const place = (id, kind, name, ox, oy, text) => {
      for (let radius = 0; radius < 24; radius += 2)
        for (let step = 0; step < (radius ? 16 : 1); step++) {
          const x = Math.round(a.x + ox + Math.cos((step * Math.PI) / 8) * radius),
            y = Math.round(a.y + oy + Math.sin((step * Math.PI) / 8) * radius),
            p = point(x + 0.5, y + 0.5);
          if (
            w.tile(x, y) !== 16 ||
            w.roadMask[y * W + x] ||
            w.blocked(p.x, p.y) ||
            w.interiorAt(p) ||
            sites.some((s) => D(s, p) < 5 * TILE) ||
            w.buildings.some(
              (b) => x > b.x - 3 && x < b.x + b.w + 3 && y > b.y - 3 && y < b.y + b.h + 3,
            )
          )
            continue;
          sites.push({
            id,
            kind,
            name,
            title: name,
            text,
            ...p,
            w: 2,
            h: 2,
            inventory: kind === 'arkGarden' ? { spore: 4 } : {},
            worked: 0,
          });
          return;
        }
    };
    for (let i = 0; i < 5; i++)
      place(
        'quarry-' + i,
        'arkRock',
        'Singing Ledge',
        -53 + i * 6,
        -17 - (i % 2) * 7,
        'The clean cut shows no pick marks. A large host grips a ringed handle; the stone breaks into identical grains.',
      );
    for (let i = 0; i < 5; i++)
      place(
        'garden-' + i,
        'arkGarden',
        'Folded Bowls',
        -17 + i * 9,
        39 + (i % 2) * 5,
        'Fleshy folds open toward an approaching hand. The hosts harvest pale nodules and carry them to tall, spongy pillars.',
      );
    for (let i = 0; i < 4; i++)
      place(
        'filter-' + i,
        'arkFilter',
        'Breathing Pillars',
        -38 + i * 23,
        10,
        'Lower folds drink the purple mist. Damp openings silently unfold above. Smooth pale nodules are pressed against them.',
      );
    for (let i = 0; i < 4; i++)
      place(
        'ring-' + i,
        'arkResonator',
        'Hanging Rings',
        -35 + i * 22,
        -42,
        'The rings do not touch. A passing host taps the lower one, listens with their chest, and turns the upper ring.',
      );
    w.alienEcology = { version: 1, sites, desertInstalled: false, toolReceipts: [], toolShots: 0 };
    const natives = w.entities.filter(
      (e) => e.race === 'arctarian' && e.role !== 'arctRescuer' && e.hp > 0,
    );
    for (const [i, e] of natives.entries()) {
      e.alienJob = i < 4 ? 'quarry' : i < 7 ? 'garden' : 'tuner';
      if (i < 4) {
        e.role = 'arctMiner';
        e.name = 'Singing Ledge Miner';
        e.inventory.arkCutter = 1;
      }
      e.alienWork = 0;
      e.alienSite = null;
    }
  }
  // One-time background remains. They are real bodies and never replenish after looting.
  if (!w.alienEcology.desertInstalled) {
    const d = w.loreGeography.desert;
    for (let y = -d.ry + 12; y < d.ry; y += 19)
      for (let x = -d.rx + 12; x < d.rx; x += 23) {
        if ((x / d.rx) ** 2 + (y / d.ry) ** 2 > 0.91) continue;
        const xx = Math.round(d.x + x + Math.sin(y * 2 + x) * 3),
          yy = Math.round(d.y + y + Math.cos(x) * 3),
          p = point(xx + 0.5, yy + 0.5);
        if (
          (w.generatorVersion < 10 && w.tile(xx, yy) !== 15) ||
          w.blocked(p.x, p.y) ||
          w.interiorAt(p) ||
          w.roadMask[yy * W + xx]
        )
          continue;
        w.corpses.push({
          id: ++w.id,
          ...p,
          name: [
            'Remains of a Foreign Traveler',
            'Dried Body by the Wreckage',
            'Bones Beneath a Foreign Banner',
          ][Math.abs(xx + yy) % 3],
          inventory: {},
          butchered: true,
          age: 0,
          desertRemains: true,
        });
      }
    w.alienEcology.desertInstalled = true;
  }
  for (const e of w.entities)
    if (e.race === 'emralaan' && e.mounted && !e.desertHardened) {
      e.desertHardened = true;
      e.maxHp += 40;
      if (e.hp > 0) {
        e.hp += 40;
        e.inventory.armor = 1;
      }
    }
}
function fx(w, a, b) {
  if (D(w.player, a) < 1600)
    w.effects.push({ x: a.x, y: a.y, tx: b.x, ty: b.y, beam: true, life: 0.3 });
}
export function alienWorkerAI(w, e, dt) {
  if (!e.alienJob || e.aggressor) return false;
  const sites = w.alienEcology?.sites || [],
    kind =
      e.alienJob === 'quarry'
        ? e.inventory.ore >= 8
          ? 'arkFilter'
          : 'arkRock'
        : e.alienJob === 'garden'
          ? e.inventory.spore > 0
            ? 'arkFilter'
            : 'arkGarden'
          : 'arkResonator';
  let site = sites.find((s) => s.id === e.alienSite && s.kind === kind);
  if (!site) {
    const choices = sites.filter((s) => s.kind === kind);
    site = choices[(Number(e.id) + Math.floor(e.alienCycles || 0)) % choices.length];
    e.alienSite = site?.id;
    e.alienWork = 0;
  }
  if (!site) return false;
  const spot = { x: site.x, y: site.y + 95 };
  e.state =
    kind === 'arkRock'
      ? 'alienMining'
      : kind === 'arkGarden'
        ? 'alienHarvest'
        : kind === 'arkFilter'
          ? 'alienFeeding'
          : 'alienTuning';
  if (D(e, spot) > 35) {
    w.navigate(e, spot, dt, 78);
    return true;
  }
  if (kind === 'arkGarden' && !(site.inventory.spore > 0)) {
    if (w.time >= (site.regrowAt || 0)) {
      site.inventory.spore = 4;
    } else {
      e.alienSite = null;
      e.state = 'quietWork';
      return true;
    }
  }
  if (kind === 'arkRock' && !(e.inventory.arkCutter > 0)) {
    e.state = 'missingTool';
    return true;
  }
  e.dir = (Math.round(Math.atan2(site.y - e.y, site.x - e.x) / (Math.PI / 4)) + 8) % 8;
  e.alienWork += dt;
  if (kind === 'arkRock' && (e.nextRipple || 0) <= w.elapsed) {
    e.nextRipple = w.elapsed + 0.7;
    fx(w, e, site);
    e.attack = 0.25;
  }
  if (e.alienWork < (kind === 'arkRock' ? 5 : 7)) return true;
  e.alienWork = 0;
  e.alienCycles = (e.alienCycles || 0) + 1;
  site.worked++;
  if (kind === 'arkRock') e.inventory.ore = (e.inventory.ore || 0) + 2;
  if (kind === 'arkGarden') {
    e.inventory.spore = (e.inventory.spore || 0) + 1;
    site.inventory.spore--;
    if (!site.inventory.spore) site.regrowAt = w.time + 45;
  }
  if (kind === 'arkFilter') {
    if (e.alienJob === 'quarry') {
      site.inventory.ore = (site.inventory.ore || 0) + e.inventory.ore;
      e.inventory.ore = 0;
    } else {
      e.inventory.spore--;
      site.inventory.spore = (site.inventory.spore || 0) + 1;
    }
    site.fedUntil = w.time + 120;
  }
  if (kind === 'arkResonator') site.phase = (site.phase || 0) + 1;
  e.alienSite = null;
  return true;
}
export function stealAlienTool(w, e) {
  const p = w.player;
  if (!e?.alienJob || e.hp <= 0 || !(e.inventory.arkCutter > 0) || !w.canInteract(p, e, 110))
    return { ok: false, message: 'Approach a miner carrying the handle.' };
  if (p.weaponDrawn) return { ok: false, message: 'Free your hands first.' };
  e.inventory.arkCutter--;
  p.inventory.arkCutter = (p.inventory.arkCutter || 0) + 1;
  e.aggressor = p.id;
  e.state = 'flee';
  e.pendingStrike = null;
  w.log('You snatch the ribbed handle. The miner pulls back and retreats.', { personal: true });
  return { ok: true, message: 'The handle is in your bag. Equip it in the ranged slot through I.' };
}
export function giveAlienTool(w, { forced = false } = {}) {
  const p = w.player,
    s = w.entities.find((e) => e.role === 'wizard' && e.hp > 0);
  if (!s || !w.canInteract(p, s, 130) || !(p.inventory.arkCutter > 0))
    return { ok: false, message: 'Approach Sophos.' };
  const count = p.inventory.arkCutter;
  delete p.inventory.arkCutter;
  s.inventory.arkCutter = (s.inventory.arkCutter || 0) + count;
  p.pendingStrike = null;
  p.lockedTargetId = null;
  if (p.equipment?.ranged === 'arkCutter') p.equipment.ranged = p.inventory.bow > 0 ? 'bow' : null;
  p.weaponDrawn = false;
  w.normalizeEquipment();
  const used = p.cutterShots > 0,
    message = forced
      ? 'You must not use magical artifacts!!! Give them to me at once!'
      : used
        ? 'Leave it to me. Never test its powers again.'
        : 'Good that you brought it to me. It must not reach the hands of... those who do not know what it is.';
  w.alienEcology.toolReceipts.push({
    at: w.time,
    count,
    forced,
    used,
    generation: w.life?.generation || 1,
  });
  s.announcement = message;
  s.speechUntil = w.elapsed + 8;
  w.log('Sophos: “' + message + '”', { personal: true });
  return { ok: true, message };
}
export function updateAlienEcology(w, dt) {
  if (!w.alienEcology || w.player.role === 'absent') return;
  const p = w.player,
    s = w.entities.find((e) => e.role === 'wizard' && e.hp > 0);
  if (!s) return;
  const held = p.inventory.arkCutter > 0 && p.weapon === 'arkCutter' && p.weaponDrawn;
  if (held && D(p, s) < 700 && w.visibleFrom(s, p) && w.lineClear(s, p)) {
    s.state = 'seizingArtifact';
    s.announcement = 'You must not use magical artifacts!!! Give them to me at once!';
    s.speechUntil = w.elapsed + 2;
    if (D(p, s) < 125) {
      const result = giveAlienTool(w, { forced: true });
      if (result.ok) w.onSophos?.(result.message);
    } else w.navigate(s, p, dt, 210);
  } else if (s.state === 'seizingArtifact' || s.state === 'returningToHall') {
    s.state = 'returningToHall';
    if (w.navigate(s, s.home, dt, 100)) s.state = 'idle';
  }
}
