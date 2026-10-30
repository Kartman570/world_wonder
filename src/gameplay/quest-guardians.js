import { TILE, point } from '../core/content.js';
const D = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const GUARDIANS = [
  { item: 'threadSpool', place: 'red', name: 'Thread Keeper', role: 'brute', faction: 'red' },
  {
    item: 'windKnot',
    place: 'emralaan',
    name: 'Wind Tamer',
    role: 'nomadArcher',
    faction: 'emralaan',
  },
  {
    item: 'hushLens',
    place: 'silent-chapel',
    name: 'Keeper of the Voiceless Chapel',
    role: 'relicKeeper',
    faction: 'chapel',
  },
];
const layers = (w) => w.relicLayers?.() || [w];
export function artifactSources(w, item) {
  const out = [],
    seen = new Set(),
    add = (obj, kind, world) => {
      if (obj?.inventory?.[item] > 0 && !seen.has(obj.inventory)) {
        seen.add(obj.inventory);
        out.push({ obj, kind, world });
      }
    };
  const hero = w.absentPlayer || w.player;
  add(hero, 'player', w);
  for (const layer of layers(w)) {
    for (const e of layer.entities) if (e.hp > 0) add(e, 'holder', layer);
    for (const c of layer.corpses) add(c, 'body', layer);
    for (const c of [...layer.landmarks, ...(layer.camps || [])]) add(c, 'cache', layer);
    for (const [type, entries] of [
      ['guard', Object.entries(layer.storages || {})],
      ['prison', Object.entries(layer.prisonStorage || {})],
      ['warehouse', Object.entries(layer.warehouses || {})],
      ['estate', (layer.fallenEstates || []).map((e) => [e.city, e.inventory])],
    ])
      for (const [city, bag] of entries)
        if (bag?.[item] > 0 && !seen.has(bag)) {
          seen.add(bag);
          out.push({
            obj: { inventory: bag },
            kind: 'storage',
            world: layer,
            city,
            storageType: type,
          });
        }
  }
  return out;
}
export function safeCampPoint(w, z, offset = 5) {
  for (let r = offset; r < offset + 18; r++)
    for (let n = 0; n < 24; n++) {
      const a = (n * Math.PI) / 12,
        p = point(z.x + Math.cos(a) * r + 0.5, z.y + Math.sin(a) * r + 0.5);
      if (!w.blocked(p.x, p.y) && !w.interiorAt(p)) return p;
    }
  return point(z.x, z.y);
}
export function initializeGuardians(w, { audit = true } = {}) {
  if (w.dungeonSpec || w.generatorVersion < 9) return;
  w.relicIntegrity ??= { version: 1, records: {}, nextAudit: 0 };
  for (const spec of GUARDIANS) {
    const z = w.places.find((p) => p.id === spec.place);
    if (!z) continue;
    const record = (w.relicIntegrity.records[spec.item] ??= {
      place: spec.place,
      spawned: false,
      repairs: 0,
    });
    let owner = w.entities.find((e) => e.name === spec.name);
    const sources = artifactSources(w, spec.item),
      completed = w.returnedRelics.includes(spec.item) || w.relicVault[spec.item] > 0;
    // Only a genuinely absent initial spawn is created. A deceased owner never respawns.
    if (audit && !owner && !record.spawned && !sources.length && !completed) {
      const p = safeCampPoint(w, z);
      owner = w.add(
        spec.role,
        w.generatorVersion >= 11 && spec.faction === 'emralaan' ? z.faction : spec.faction,
        p.x / TILE,
        p.y / TILE,
        spec.name,
      );
      owner.inventory[spec.item] = 1;
      if (spec.role === 'nomadArcher') {
        owner.loreActor = true;
        owner.race = 'emralaan';
        owner.mounted = true;
        Object.assign(owner.inventory, { bow: 1, sword: 1, arrow: 35 });
      }
      if (spec.role === 'relicKeeper') {
        owner.loreActor = true;
        owner.work = { ...p };
        owner.inventory.hammer = 1;
      }
      record.repairs++;
    }
    if (owner) {
      if (owner.raidId) {
        const raid = w.living?.raids.find((r) => r.id === owner.raidId);
        if (raid) raid.members = raid.members.filter((id) => id !== owner.id);
        owner.raidId = null;
      }
      owner.relicGuardian = {
        item: spec.item,
        place: spec.place,
        anchor: point(z.x, z.y),
        radius: 16 * TILE,
      };
      owner.home = owner.role === 'relicKeeper' ? owner.home : point(z.x, z.y);
      record.holderId = owner.id;
      record.spawned = true;
      if (owner.hp > 0 && D(owner, owner.relicGuardian.anchor) > owner.relicGuardian.radius) {
        Object.assign(owner, safeCampPoint(w, z));
        owner.nav = null;
        owner.route = [];
        owner.routeDest = null;
        owner.pathPending = false;
      }
    }
    // Recover old off-screen guardian deaths to a visible, dry spot at their own camp.
    for (const body of w.corpses.filter((c) => c.name === spec.name)) {
      const legacy = !body.questGuardian;
      body.questGuardian = { item: spec.item, place: spec.place };
      record.bodyId = body.id;
      if ((legacy || !w.visited.includes(spec.place)) && D(body, point(z.x, z.y)) > 20 * TILE)
        Object.assign(body, safeCampPoint(w, z));
    }
  }
  if (audit) auditGuardians(w);
  else w.relicIntegrity.nextAudit = w.elapsed;
}
export function auditGuardians(w) {
  if (!w.relicIntegrity || w.dungeonSpec) return;
  for (const spec of GUARDIANS) {
    const record = w.relicIntegrity.records[spec.item];
    if (!record) continue;
    if (w.returnedRelics.includes(spec.item) || w.relicVault[spec.item] > 0) {
      record.state = 'returned';
      continue;
    }
    let sources = artifactSources(w, spec.item);
    if (!sources.length && !record.spawned && !w.entities.some((e) => e.name === spec.name)) {
      const z = w.places.find((p) => p.id === spec.place);
      if (z) {
        const p = safeCampPoint(w, z),
          e = w.add(
            spec.role,
            w.generatorVersion >= 11 && spec.faction === 'emralaan' ? z.faction : spec.faction,
            p.x / TILE,
            p.y / TILE,
            spec.name,
          );
        e.inventory[spec.item] = 1;
        e.relicGuardian = {
          item: spec.item,
          place: spec.place,
          anchor: point(z.x, z.y),
          radius: 16 * TILE,
        };
        e.hp = e.maxHp = spec.role === 'nomadArcher' ? 180 : 135;
        if (spec.role === 'nomadArcher') {
          e.loreActor = true;
          e.race = 'emralaan';
          e.mounted = true;
          Object.assign(e.inventory, { bow: 1, sword: 1, arrow: 35 });
        }
        if (spec.role === 'relicKeeper') {
          e.loreActor = true;
          e.work = { ...p };
          e.inventory.hammer = 1;
          e.inventory.armor = 1;
        }
        record.spawned = true;
        record.holderId = e.id;
        record.repairs++;
        sources = artifactSources(w, spec.item);
      }
    }
    if (!sources.length) {
      const z = w.places.find((p) => p.id === spec.place);
      if (!z) continue;
      const cache = {
        id: 'recovered-' + spec.item,
        item: spec.item,
        name: 'Abandoned Burden · ' + spec.name,
        ...safeCampPoint(w, z),
        inventory: { [spec.item]: 1 },
        questGuardian: { item: spec.item, place: spec.place },
      };
      w.landmarks.push(cache);
      sources = [{ obj: cache, kind: 'cache', world: w }];
      record.repairs++;
    }
    const source = sources[0];
    record.state = source.kind;
    record.sourceId = source.obj.id;
    record.x = source.obj.x;
    record.y = source.obj.y;
    const owner = w.entities.find((e) => e.id === record.holderId);
    if (owner?.hp <= 0 || record.bodyId) {
      const id = 'guardian-trace-' + spec.item,
        z = w.places.find((p) => p.id === spec.place);
      let trace = w.loreSites.find((p) => p.id === id);
      if (!trace) {
        trace = {
          id,
          ...safeCampPoint(w, z, 3),
          title: 'Keeper’s Traces · ' + spec.name,
          style: 'cups',
          text: '',
        };
        w.loreSites.push(trace);
      }
      trace.text =
        guardianClue(w, spec.item) ||
        'Signs of a fight remain here. Search the camp and nearby bodies.';
    }
  }
  w.relicIntegrity.nextAudit = w.elapsed + 10;
}
export function guardianAI(w, e, dt) {
  if (!e.relicGuardian) return false;
  if (e.role === 'relicKeeper') return false;
  const g = e.relicGuardian;
  if (D(e, g.anchor) > g.radius * 0.75) {
    e.state = 'guardingRelic';
    w.navigate(e, g.anchor, dt, 105);
    return true;
  }
  const corpse = w.corpses.find(
    (c) => D(e, c) < 100 && c.name !== e.name && Object.values(c.inventory).some((n) => n > 0),
  );
  if (corpse) {
    w.loot(e, corpse);
    return true;
  }
  if (!e.patrolPoint || e.timer <= 0) {
    const a = w.random() * Math.PI * 2,
      r = (3 + w.random() * 7) * TILE;
    e.patrolPoint = { x: g.anchor.x + Math.cos(a) * r, y: g.anchor.y + Math.sin(a) * r };
    e.timer = 15;
  }
  e.state = 'guardingRelic';
  w.navigate(e, e.patrolPoint, dt, e.mounted ? 100 : 70);
  return true;
}
export function guardianClue(w, item) {
  const r = w.relicIntegrity?.records[item],
    z = w.places.find((z) => z.id === r?.place);
  if (!z || !w.visited.includes(z.id)) return '';
  const source = artifactSources(w, item)[0];
  if (!source) return 'The item’s trail is lost; inspect the camp again.';
  if (source.kind === 'body' || source.kind === 'cache') {
    const dx = source.obj.x - z.x * TILE,
      dy = source.obj.y - z.y * TILE;
    return (
      'Signs of a fight remain at the camp. Look for the item ' +
      (Math.abs(dx) > Math.abs(dy)
        ? dx < 0
          ? 'to the west'
          : 'to the east'
        : dy < 0
          ? 'to the north'
          : 'to the south') +
      ' from its center, roughly ' +
      Math.max(1, Math.round(D(source.obj, point(z.x, z.y)) / TILE)) +
      ' steps.'
    );
  }
  if (source.kind === 'storage')
    return (
      'The guards collected the item: ' +
      w.factionName(source.city) +
      '. Ask the quartermaster about your discoveries.'
    );
  if (source.kind === 'holder' && source.obj.name !== GUARDIANS.find((g) => g.item === item)?.name)
    return (
      'Someone else has already taken the item: ' +
      source.obj.name +
      '. The last known camp of their faction is ' +
      (w.places.find((z) => z.id === source.obj.faction)?.name || 'unknown') +
      '.'
    );
  return '';
}
