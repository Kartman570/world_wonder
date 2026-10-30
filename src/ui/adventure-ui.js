import { ITEMS } from '../core/content.js';
import { RECIPES, SKILLS, STATIONS, USE_EFFECTS } from '../gameplay/adventure-content.js';
import {
  skillLevel,
  craftDuration,
  craftProblem,
  beginCraft,
  deployCamp,
  startCampRest,
  fuelCamp,
  packCamp,
  normalizeCrafts,
} from '../gameplay/crafts.js';
import { contractOffers, CONTRACT_TYPES } from '../gameplay/contracts.js';
const node = (tag, text, cls) => {
  const e = document.createElement(tag);
  if (text) e.textContent = text;
  if (cls) e.className = cls;
  return e;
};
const button = (text, fn) => {
  const b = node('button', text, 'action');
  b.onclick = fn;
  return b;
};
export const itemText = (items) =>
  Object.entries(items)
    .map(([k, n]) => (ITEMS[k]?.icon || '◇') + ' ' + (ITEMS[k]?.name || k) + ' × ' + n)
    .join(' · ');
export function renderCraftPanel(
  root,
  w,
  { changed = () => {}, close = () => {}, notify = () => {}, filter = 'all' } = {},
) {
  normalizeCrafts(w.player);
  root.replaceChildren();
  root.append(
    node('div', 'FIELD SKILLS', 'eyebrow'),
    node('h1', 'Wanderer’s Craft'),
    node(
      'p',
      'Materials are reserved before work; items appear only when it finishes. Movement, drawn weapons, or danger interrupt crafting and return the materials.',
    ),
  );
  const skills = node('div', null, 'skill-grid');
  for (const [k, label] of Object.entries(SKILLS)) {
    const card = node('div', null, 'skill-card');
    card.append(
      node('strong', label + ' · ' + skillLevel(w.player, k)),
      node('small', (w.player.skills[k] || 0) + ' experience'),
    );
    skills.append(card);
  }
  root.append(skills);
  const tabs = node('div', null, 'tabs');
  for (const [k, label] of [['all', 'All Recipes'], ...Object.entries(SKILLS)]) {
    const b = button(label, () => renderCraftPanel(root, w, { changed, close, notify, filter: k }));
    if (k === filter) b.classList.add('selected');
    tabs.append(b);
  }
  root.append(tabs);
  const list = node('div', null, 'recipe-list');
  for (const r of RECIPES.filter((r) => filter === 'all' || r.skill === filter)) {
    const problem = craftProblem(w, r),
      card = node('article', null, 'recipe-card');
    card.append(
      node('h3', r.name),
      node('p', itemText(r.input) + ' → ' + itemText(r.output)),
      node(
        'small',
        STATIONS[r.station] +
          ' · ' +
          craftDuration(w.player, r) +
          ' sec. · ' +
          SKILLS[r.skill] +
          ' ' +
          r.level,
      ),
    );
    const start = button(problem || 'Craft', () => {
      const result = beginCraft(w, r.id);
      notify(result.message);
      if (result.ok) {
        changed();
        close();
      }
    });
    start.disabled = !!problem;
    card.append(start);
    list.append(card);
  }
  root.append(list);
  const feedback = node('p', null, 'panel-feedback');
  const actions = node('div', null, 'actions');
  actions.append(
    button('Pitch a Field Camp · ' + (w.player.inventory.campKit || 0) + ' in the bag', () => {
      const result = deployCamp(w);
      feedback.textContent = result.message;
      notify(result.message);
      if (result.ok) {
        changed();
        close();
      }
    }),
  );
  root.append(actions, feedback);
}
export function renderContracts(
  root,
  w,
  city,
  {
    changed = () => {},
    notify = () => {},
    select = () => {},
    refresh = null,
    projects = null,
    tab = 'available',
    message = '',
  } = {},
) {
  root.replaceChildren();
  const z = w.cities.find((z) => z.id === city);
  if (!z) {
    root.append(node('h1', 'Notice Board'), node('p', 'Read the settlement’s orders.'));
    return;
  }
  root.append(
    node('div', z.name + ' · TOWN WAREHOUSE', 'eyebrow'),
    node('h1', 'Orders and Expeditions'),
  );
  const keeper = w.entities.find(
      (e) => e.hp > 0 && e.role === 'quartermaster' && e.faction === city,
    ),
    toolbar = node('div', null, 'trade-header');
  toolbar.append(
    node(
      'small',
      'Treasury: ' +
        (w.warehouses[city].gold || 0) +
        ' gold · accepted ' +
        w.quests.filter((q) => q.status === 'active').length +
        '/8',
    ),
  );
  if (keeper)
    toolbar.append(
      button('Where do I turn in orders?', () =>
        select({ name: keeper.name, x: keeper.x, y: keeper.y }),
      ),
    );
  if (projects) toolbar.append(button('Town Projects', projects));
  root.append(toolbar);
  const offers = contractOffers(w, city).filter((q) => !w.quests.some((e) => e.id === q.id)),
    mine = w.quests.filter((q) => q.city === city && CONTRACT_TYPES.has(q.type)),
    active = mine.filter((q) => q.status === 'active'),
    history = mine.filter((q) => q.status !== 'active');
  const tabs = node('div', null, 'tabs');
  const redraw = (next = tab, text = '') =>
    renderContracts(root, w, city, {
      changed,
      notify,
      select,
      refresh,
      projects,
      tab: next,
      message: text,
    });
  for (const [id, label, count] of [
    ['available', 'Available', offers.length],
    ['active', 'My Orders', active.length],
    ['history', 'History', history.length],
  ]) {
    const b = button(label + ' · ' + count, () => redraw(id));
    b.classList.toggle('selected', tab === id);
    b.setAttribute('aria-pressed', String(tab === id));
    tabs.append(b);
  }
  root.append(tabs);
  const feedback = node('p', message, 'panel-feedback');
  feedback.setAttribute('role', 'status');
  root.append(feedback);
  const list = node('div', null, 'panel-list');
  root.append(list);
  const rows = tab === 'active' ? active : tab === 'history' ? history : offers;
  if (!rows.length)
    list.append(
      node(
        'p',
        tab === 'active'
          ? 'No accepted orders.'
          : tab === 'history'
            ? 'Completed quests will appear here.'
            : 'No new orders yet.',
      ),
    );
  for (const q of rows) {
    const card = node('details', null, 'compact-choice'),
      summary = node('summary', q.title + ' · ' + q.reward + ' gold');
    card.append(
      summary,
      node(
        'p',
        w.questText({
          ...q,
          craftedBaseline: q.craftedBaseline ?? w.player.crafted?.[q.item] ?? 0,
        }),
      ),
    );
    if (q.deadline)
      card.append(node('small', 'Deadline: day ' + (1 + Math.floor(q.deadline / 1440))));
    if (tab === 'available') {
      const full = w.quests.filter((q) => q.status === 'active').length >= 8,
        take = button(full ? 'Complete one of your eight orders first' : 'Accept', () => {
          const text = w.acceptQuest(q);
          changed();
          redraw(w.quests.some((e) => e.id === q.id) ? 'active' : 'available', text);
        });
      take.disabled = full;
      card.append(take);
    }
    if (q.status && q.status !== 'active')
      card.append(
        node('small', q.status === 'completed' ? 'Completed' : q.failure || 'Incomplete'),
      );
    else {
      if (q.checkpoints) card.append(button('Show Landmark', () => select(q.checkpoints[0])));
      if (q.type === 'rescue') {
        const e = w.entityById.get(q.target);
        if (e)
          card.append(
            button('Where is the captive?', () => select({ name: e.name, x: e.x, y: e.y })),
          );
      }
      if (q.status === 'active')
        card.append(
          button('Decline the Order', () => {
            q.status = 'failed';
            q.failure = 'You declined the quest';
            w.log('Quest canceled: ' + q.title);
            changed();
            redraw('active', 'Quest canceled.');
          }),
        );
    }
    list.append(card);
  }
  const help = document.createElement('details');
  help.className = 'compact-help';
  help.append(
    node('summary', 'How Orders Work'),
    node(
      'p',
      'Rewards come from the town treasury. Deliver goods and reports to the quartermaster. Timed orders can expire.',
    ),
  );
  root.append(help);
}

export function renderCampPanel(
  root,
  w,
  camp,
  { changed = () => {}, close = () => {}, notify = () => {} } = {},
) {
  const again = () => {
    changed();
    renderCampPanel(root, w, camp, { changed, close, notify });
  };
  root.replaceChildren();
  root.append(
    node('div', 'FIELD REST', 'eyebrow'),
    node('h1', camp.name),
    node(
      'p',
      (camp.fireUntil > w.time
        ? 'The fire will burn for ' + Math.ceil(camp.fireUntil - w.time) + ' game min.'
        : 'The fire has gone out.') +
        ' Items in the chest are not safe from bandits. Craft at C beside a campfire.',
    ),
  );
  const feedback = node('p', null, 'panel-feedback');
  const actions = node('div', null, 'actions');
  for (const [label, fn] of [
    ['Rest · 8 seconds, 1 provision', () => startCampRest(w, camp)],
    ['Add a Log · +1 hour of fire', () => fuelCamp(w, camp)],
    ['Pack Up Camp', () => packCamp(w, camp)],
  ])
    actions.append(
      button(label, () => {
        const result = fn();
        feedback.textContent = result.message;
        notify(result.message);
        if (result.ok) {
          changed();
          close();
        }
      }),
    );
  root.append(actions, feedback, node('h3', 'Chest'));
  if (Object.values(camp.inventory).some((n) => n > 0))
    root.append(
      button('Take Everything from the Chest', () => {
        w.transfer(camp.inventory, w.player.inventory);
        changed();
        close();
      }),
    );
  for (const [k, n] of Object.entries(camp.inventory).filter(([, n]) => n > 0)) {
    const row = node('div', null, 'item-row');
    row.append(
      node('span', itemText({ [k]: n })),
      button('Take', () => {
        w.player.inventory[k] = (w.player.inventory[k] || 0) + n;
        delete camp.inventory[k];
        again();
      }),
    );
    root.append(row);
  }
  root.append(node('h3', 'Deposit from Bag'));
  for (const [k, n] of Object.entries(w.player.inventory).filter(
    ([k, n]) =>
      n > 0 &&
      !['gold', 'relic', 'moonRelic', 'tideRelic', 'letter'].includes(k) &&
      !k.startsWith('jailKey_'),
  )) {
    const row = node('div', null, 'item-row');
    row.append(
      node('span', itemText({ [k]: n })),
      button('Deposit 1', () => {
        w.player.inventory[k]--;
        camp.inventory[k] = (camp.inventory[k] || 0) + 1;
        again();
      }),
    );
    root.append(row);
  }
}
