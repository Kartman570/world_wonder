import { foodStock } from '../gameplay/world-events.js';
import { ANIMALS } from '../core/content.js';
const el = (tag, text, cls) => {
  const n = document.createElement(tag);
  n.textContent = text;
  if (cls) n.className = cls;
  return n;
};
export function renderLivingPanel(root, w) {
  root.replaceChildren(
    el('div', 'PEOPLE AND EVENTS', 'eyebrow'),
    el('h1', 'Region Pulse'),
    el(
      'p',
      'Day ' +
        (1 + Math.floor(w.time / 1440)) +
        ' · shows warehouses, sickness, and patrols. Towns keep living while you explore underground.',
    ),
  );
  for (const z of w.cities) {
    const state = w.living?.cities[z.id],
      store = w.warehouses[z.id] || {},
      card = el('article', '', 'quest-entry');
    card.append(
      el('h3', z.name),
      el(
        'p',
        'Food: ' +
          foodStock(store) +
          ' · medicine: ' +
          (store.medicine || 0) +
          ' · treasury: ' +
          (store.gold || 0) +
          ' gold',
      ),
    );
    const sick = w.entities.filter((e) => e.hp > 0 && e.faction === z.id && e.sickness).length;
    card.append(
      el(
        'p',
        (state?.hunger >= 3 ? 'Food Shortage' : 'Supplies Are Stable') +
          ' · sick: ' +
          sick +
          ' · healed: ' +
          (state?.treated || 0),
      ),
    );
    const raid = w.living?.raids.find((r) => r.city === z.id && r.status === 'active');
    if (raid)
      card.append(
        el(
          'p',
          '⚔ Raid: ' +
            w.factionName(raid.camp) +
            ' · ' +
            (raid.phase === 'returning' ? 'retreating' : 'heading to the warehouse') +
            ' · living: ' +
            raid.members.filter((id) => w.entityById.get(id)?.hp > 0).length,
        ),
      );
    root.append(card);
  }
  const history = el('div', '', 'codex');
  for (const e of (w.living?.history || []).slice(0, 20))
    history.append(el('p', 'Day ' + (1 + Math.floor(e.time / 1440)) + ' · ' + e.text));
  root.append(el('h3', 'Town News'), history);
  if (w.ecology) {
    const alive = w.entities.filter((e) => e.hp > 0 && ANIMALS[e.role]).length;
    root.append(
      el('h3', 'Regional Wildlife'),
      el(
        'p',
        'Animals: ' +
          alive +
          ' · new young: ' +
          (w.ecology.births || 0) +
          ' · trees restored: ' +
          (w.ecology.regrown || 0),
      ),
    );
  }
}
