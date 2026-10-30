import { abandonHorse } from './horses.js';
import { ANIMALS, GUARDS } from '../core/content.js';
import { MAX_STAMINA } from './player-movement.js';
export function initializeLife(w) {
  w.life ??= {
    generation: 1,
    started: w.time,
    killsBaseline: Object.values(w.killCounts || {}).reduce((a, b) => a + b, 0),
    questsBaseline: w.quests.filter((q) => q.status === 'completed').length,
  };
  w.fallenEstates ??= [];
}
export function deathReason(w, killer) {
  if (killer?.deathReason) return killer.deathReason;
  if (!killer) return 'Unknown cause: the wanderer died in a dangerous world.';
  if (ANIMALS[killer.role]) {
    if (killer.aggressor === 'player') return 'The animal was provoked by an attack.';
    if (['wolf', 'lynx', 'caveSpider', 'caveBat'].includes(killer.role))
      return 'The predator was hunting and mistook the wanderer for prey.';
    return 'The animal was defending its territory.';
  }
  if (GUARDS.includes(killer.role)) {
    const active = w.cityMemory?.[killer.faction]?.active;
    return active
      ? 'The guards pursued this crime: ' + active.name + '.'
      : 'Died in a fight with the guards.';
  }
  return ['bandit', 'banditArcher', 'brute', 'raider'].includes(killer.role)
    ? 'The bandit attacked for loot or to defend their camp.'
    : 'Killed in combat with ' + killer.name + '.';
}
export function mortalDeath(w, killer) {
  initializeLife(w);
  const civic = w.surfaceWorld || w;
  abandonHorse(civic);
  const p = w.player,
    old = w.life,
    city = w.inCity(p),
    inventory = { ...p.inventory };
  w.deathReport = {
    generation: old.generation,
    name: p.name,
    at: w.time,
    lived: Math.max(0, w.time - old.started),
    kills: Math.max(
      0,
      Object.values(w.killCounts || {}).reduce((a, b) => a + b, 0) - old.killsBaseline,
    ),
    quests: Math.max(
      0,
      w.quests.filter((q) => q.status === 'completed').length - old.questsBaseline,
    ),
    killer: killer?.name || 'Unknown',
    reason: deathReason(w, killer),
    city: city?.name || w.dungeonSpec?.name || 'Wildlands',
    acknowledged: false,
  };
  if (city) {
    w.fallenEstates.push({ generation: old.generation, city: city.id, inventory, at: w.time });
    w.log(
      'The guards collected the dead wanderer’s property. A new person has no right to claim it.',
    );
  } else
    w.corpses.push({
      id: ++w.id,
      x: p.x,
      y: p.y,
      name: 'Body of a Fallen Wanderer',
      inventory,
      player: false,
      formerPlayer: old.generation,
      age: 0,
    });
  for (const z of civic.cities) {
    const memory = w.cityMemory[z.id];
    if (memory) {
      memory.reputation = 0;
      memory.weaponIncidents = 0;
      memory.history = [];
      memory.active = null;
    }
    const seized = { ...(w.storages[z.id] || {}) };
    for (const [k, n] of Object.entries(w.prisonStorage[z.id] || {}))
      seized[k] = (seized[k] || 0) + n;
    if (Object.values(seized).some((n) => n > 0))
      w.fallenEstates.push({
        generation: old.generation,
        city: z.id,
        inventory: seized,
        at: w.time,
      });
    w.storages[z.id] = {};
    w.prisonStorage[z.id] = {};
  }
  for (const e of [...w.entities, ...(civic !== w ? civic.entities : [])]) {
    if (e.battleAlert?.target === 'player') e.battleAlert = null;
    if (e.lastAttackerId === 'player') e.lastAttackerId = null;
    if (e.enemyId === 'player') e.enemyId = null;
    if (e.aggressor === 'player') e.aggressor = null;
    if (e.retreatFrom === 'player') e.retreatUntil = 0;
    if (e.challengeCell) e.challengeCell = null;
    if (e.pendingStrike?.targetId === 'player') e.pendingStrike = null;
    if (e.companion?.active) {
      e.companion.active = false;
      e.companion.returning = true;
    }
  }
  for (const q of w.quests)
    if (q.status === 'active') {
      q.status = 'failed';
      q.failure = 'This order belonged to the deceased wanderer';
    }
  w.detention = null;
  civic.detention = null;
  w.projectiles = w.projectiles.filter((a) => a.owner !== 'player' && a.target !== 'player');
  p.inventory = {};
  p.skills = {};
  p.crafted = {};
  p.gear = { body: null, offhand: null };
  p.companion = null;
  p.equipment = { melee: null, ranged: null };
  Object.assign(p, w.respawn);
  Object.assign(p, {
    name: 'Wanderer ' + (old.generation + 1),
    hp: 100,
    stamina: MAX_STAMINA,
    maxStamina: MAX_STAMINA,
    poison: [],
    cutterShots: 0,
    riding: null,
    wanted: null,
    imprisoned: null,
    unarmedCombat: false,
    action: null,
    weaponDrawn: false,
    pendingStrike: null,
    lockedTargetId: null,
    stunUntil: 0,
    weaponWarnings: null,
    breathSuitWorn: false,
    aggressor: null,
    cooldown: 0,
    attack: 0,
    torchUntil: 0,
  });
  w.normalizeEquipment();
  w.time += 30;
  w.life = {
    generation: old.generation + 1,
    started: w.time,
    killsBaseline: Object.values(w.killCounts || {}).reduce((a, b) => a + b, 0),
    questsBaseline: w.quests.filter((q) => q.status === 'completed').length,
  };
  w.onDeath?.(w.deathReport);
}
export function renderDeath(root, w, { continueLife }) {
  const r = w.deathReport;
  root.replaceChildren();
  const el = (tag, text) => {
    const n = document.createElement(tag);
    n.textContent = text;
    return n;
  };
  root.append(
    el('div', 'THE WANDERER’S LIFE HAS ENDED'),
    el('h1', r.name),
    el(
      'p',
      'Lived: ' +
        Math.floor(r.lived / 1440) +
        ' days ' +
        Math.floor((r.lived % 1440) / 60) +
        ' h ' +
        Math.floor(r.lived % 60) +
        ' game minutes',
    ),
    el('p', 'Kills: ' + r.kills + ' · Quests completed: ' + r.quests),
    el('h3', 'Killer: ' + r.killer),
    el('p', r.reason),
    el('p', 'Place of Death: ' + r.city),
    el(
      'p',
      'Their crimes and reputation died with them. The next wanderer is another person. The predecessor left no right to property held by the guards.',
    ),
  );
  root.append(
    el(
      'p',
      'Claim a sword, bow, and arrows at the weapon rack in the cathedral’s training hall, in the east wing, E at the rack.',
    ),
  );
  const b = el('button', 'Begin a New Wanderer’s Life');
  b.className = 'action';
  b.onclick = continueLife;
  root.append(b);
}
