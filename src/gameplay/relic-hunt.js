import { guardianClue } from './quest-guardians.js';
import { RELICS, RELIC_KEYS } from './lore-content.js';
import { TILE } from '../core/content.js';
export function relicCatalog(w) {
  return w.generatorVersion >= 9 ? RELICS : RELICS.slice(0, 3);
}
export function beginRelicHunt(w) {
  w.quest = true;
  if (w.loreState) w.loreState.commissioned = true;
  return 'Seek things unlike the work of living artisans. Do not test their power on yourself or others. Bring them intact. I have left the first leads among my tasks.';
}
export function relicAct(w) {
  return w.returnedRelics.length >= 3 ? 2 : w.returnedRelics.length >= 1 ? 1 : 0;
}
export function relicAssignments(w) {
  return relicCatalog(w).filter((r) => r.act <= relicAct(w) && !w.returnedRelics.includes(r.item));
}
export function relicWhere(w, item) {
  const holder = w.entities.find((e) => e.hp > 0 && e.inventory[item] > 0);
  if (holder) {
    const place = w.placeAt(holder),
      camp = w.places.find((z) => z.id === holder.faction);
    return { kind: 'holder', name: holder.name, area: place?.name || camp?.name || 'Wildlands' };
  }
  const chest = w.landmarks.find((l) => l.inventory[item] > 0);
  if (chest) return { kind: 'chest', name: chest.name };
  const body = w.corpses.find((c) => c.inventory[item] > 0);
  if (body) return { kind: 'body', name: body.name };
  return { kind: w.player.inventory[item] > 0 ? 'carried' : 'missing' };
}
export function depositHuntRelics(w) {
  let count = 0,
    reward = 0;
  const receipts = [];
  for (const r of relicCatalog(w))
    if (w.player.inventory[r.item] > 0 && !w.returnedRelics.includes(r.item)) {
      w.player.inventory[r.item]--;
      w.returnedRelics.push(r.item);
      w.relicVault[r.item] = (w.relicVault[r.item] || 0) + 1;
      count++;
      reward += r.reward;
      receipts.push(r.receipt);
      if (w.loreState) w.loreState.receipts.push({ item: r.item, at: w.time });
    }
  if (count) {
    w.player.inventory.gold = (w.player.inventory.gold || 0) + reward;
    w.relicReturned = w.returnedRelics.includes('relic');
    w.log(
      'Relics returned to Sophos: ' +
        w.returnedRelics.length +
        '/' +
        relicCatalog(w).length +
        '. +' +
        reward +
        ' gold.',
    );
  }
  return { count, reward, total: w.returnedRelics.length, receipts };
}
export function renderHunt(root, w, { select = () => {}, close = () => {} } = {}) {
  const el = (tag, text) => {
    const n = document.createElement(tag);
    n.textContent = text;
    return n;
  };
  root.replaceChildren();
  root.append(
    el(
      'p',
      'Sophos asks for discoveries intact. Their purpose is unknown; you cannot use them. Returned: ' +
        w.returnedRelics.length +
        '/' +
        relicCatalog(w).length +
        '.',
    ),
  );
  if (!w.quest) {
    root.append(el('p', 'Speak to Sophos about the search.'));
    return;
  }
  const list = document.createElement('div');
  list.className = 'quest-list';
  for (const r of relicAssignments(w)) {
    const d = document.createElement('details');
    d.className = 'compact-choice';
    d.append(
      el(
        'summary',
        r.title +
          (w.player.inventory[r.item] > 0 ? ' · IN YOUR BAG' : '') +
          ' · ' +
          r.reward +
          ' gold',
      ),
    );
    const originId = { hushLens: 'silent-chapel', threadSpool: 'red', windKnot: 'emralaan' }[
        r.item
      ],
      origin = w.places.find((z) => z.id === originId);
    d.append(el('p', r.clue));
    if (origin) d.append(el('p', 'Latest Report: ' + origin.name + '.'));
    const trace = guardianClue(w, r.item);
    if (trace) d.append(el('p', trace));
    const clue = el('p', 'Item sought: ' + r.name + '. ' + r.description);
    d.append(clue);
    // No live GPS for a stolen artifact. Its present holder must be found in the world.
    const source =
      w.landmarks.find((l) => l.item === r.item) ||
      (origin ? { name: origin.name, x: origin.x * TILE, y: origin.y * TILE } : null);
    if (source) {
      const b = el(
        'button',
        origin ? 'Remember the location of the latest report' : 'Remember the Search Location',
      );
      b.onclick = () => {
        select({ name: source.name, x: source.x, y: source.y });
        close();
      };
      d.append(b);
    }
    list.append(d);
  }
  root.append(list);
  if (w.returnedRelics.length) {
    const d = document.createElement('details');
    d.className = 'compact-help';
    d.append(el('summary', 'Returned Discoveries'));
    for (const r of relicCatalog(w).filter((r) => w.returnedRelics.includes(r.item)))
      d.append(el('p', r.name + ' · on the pedestal'));
    root.append(d);
  }
  if (w.returnedRelics.length === relicCatalog(w).length)
    root.append(
      el(
        'p',
        'All tasks are complete. Sophos has closed the inner door. Ordinary footsteps sound in the courtyard again. The roads remain open.',
      ),
    );
}

export function releaseRelicUnderPressure(w, e) {
  if (
    w.generatorVersion < 9 ||
    e === w.player ||
    e.hp <= 0 ||
    e.hp / e.maxHp > 0.24 ||
    e.relicDropped
  )
    return false;
  const item = RELIC_KEYS.find((k) => e.inventory[k] > 0);
  if (!item) return false;
  const count = e.inventory[item];
  delete e.inventory[item];
  e.relicDropped = true;
  w.landmarks.push({
    id: 'dropped-relic-' + e.id,
    item,
    name: 'Dropped Item · ' + relicCatalog(w).find((r) => r.item === item).name,
    x: e.x,
    y: e.y,
    inventory: { [item]: count },
  });
  e.retreatUntil = w.elapsed + 10;
  e.retreatFrom = 'player';
  e.enemyId = null;
  w.log(e.name + ' drops their burden and tries to retreat.', { at: e });
  return true;
}

export function reconcileCarriedRelics(w) {
  for (const item of RELIC_KEYS)
    if (w.player.inventory[item] > 0) {
      w.player.inventory[item] = 1;
      for (const source of [...w.landmarks, ...w.entities]) delete source.inventory[item];
    }
}
