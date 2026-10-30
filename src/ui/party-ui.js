import { detailHelp } from './conversation-ui.js';
import { ITEMS } from '../core/content.js';
import { orderCompanion, giveCompanion, hireCompanion, hirePrice } from '../gameplay/companions.js';
const el = (tag, text, cls) => {
  const n = document.createElement(tag);
  if (text) n.textContent = text;
  if (cls) n.className = cls;
  return n;
};
export function renderPartyPanel(
  root,
  w,
  { notify, changed, refresh, surfacePresent = true, message = '', openSupplies = [] },
) {
  root.replaceChildren(el('div', 'TRAVELING PARTY · V', 'eyebrow'), el('h1', 'Companions'));
  const feedback = el('p', message, 'panel-feedback');
  feedback.setAttribute('role', 'status');
  root.append(feedback);
  const companions = w.entities.filter((e) => e.companion),
    present = companions.filter((e) => e.hp > 0),
    past = companions.filter((e) => e.hp <= 0);
  if (!companions.length)
    root.append(
      el('p', 'Hire a town hunter with reputation 10 or higher. Up to two may accompany you.'),
    );
  for (const e of present) {
    const c = e.companion,
      card = el('article', '', 'quest-entry');
    card.append(
      el('h3', e.name + ' · ' + w.factionName(e.faction)),
      el(
        'p',
        Math.ceil(e.hp) +
          ' / ' +
          e.maxHp +
          ' health · ' +
          (c.active
            ? 'more ' +
              Math.max(0, Math.ceil(c.until - w.time)) +
              ' game min. · ' +
              (c.order === 'hold' ? 'holds position' : 'follows you')
            : 'returning home'),
      ),
      el(
        'small',
        'Arrows: ' + (e.inventory.arrow || 0) + ' · medicine: ' + (e.inventory.medicine || 0),
      ),
    );
    if (!surfacePresent && c.active)
      card.append(el('p', 'Orders are available once you return to the surface.'));
    if (c.active && surfacePresent) {
      const run = (fn) => {
        const expanded = [...root.querySelectorAll('details[data-companion]')]
            .filter((d) => d.open)
            .map((d) => d.dataset.companion),
          r = fn();
        notify(r.message);
        if (r.ok) {
          changed();
          renderPartyPanel(root, w, {
            notify,
            changed,
            refresh,
            surfacePresent,
            message: r.message,
            openSupplies: expanded,
          });
        } else feedback.textContent = r.message;
      };
      const actions = el('div', '', 'actions');
      for (const [label, order] of [
        ['Follow Me', 'follow'],
        ['Hold Position', 'hold'],
        ['Release', 'dismiss'],
      ]) {
        const b = el('button', label, 'action');
        b.onclick = () => run(() => orderCompanion(w, e, order));
        actions.append(b);
      }
      card.append(actions);
      const supplies = el('details', '', 'compact-help');
      supplies.dataset.companion = String(e.id);
      supplies.open = openSupplies.includes(String(e.id));
      supplies.append(el('summary', 'Supplies and Contract Renewal'));
      const extra = el('div', '', 'actions'),
        renew = el('button', 'Renew for One Day · ' + hirePrice(w, e) + ' gold', 'action');
      renew.onclick = () => run(() => hireCompanion(w, e));
      extra.append(renew);
      for (const k of ['arrow', 'medicine', 'ration']) {
        const b = el(
          'button',
          'Hand Over ' + ITEMS[k].name + (k === 'arrow' ? ' × 10' : ''),
          'action',
        );
        b.disabled = !(w.player.inventory[k] > 0);
        b.onclick = () => run(() => giveCompanion(w, e, k));
        extra.append(b);
      }
      supplies.append(extra);
      card.append(supplies);
    }
    root.append(card);
  }
  if (past.length) {
    const history = el('details', '', 'compact-help');
    history.append(el('summary', 'Fallen Companions · ' + past.length));
    for (const e of past)
      history.append(
        el('p', e.name + ' · ' + w.factionName(e.faction) + '. Equipment remains on the body.'),
      );
    root.append(history);
  }
  detailHelp(
    root,
    'How to Hire a Companion',
    'Speak to a hunter. Requires reputation 10; up to two companions; 75 gold per day, or 60 for friends of the town. Orders carry within 700 pixels, supplies transfer nearby. Companions do not enter dungeons.',
  );
}
