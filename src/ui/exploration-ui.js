// Location inventory is independent of its presentation; every old map action has one home.
import { TILE } from '../core/content.js';
const node = (tag, text, cls) => {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (cls) n.className = cls;
  return n;
};
const fold = (title, count, open = false) => {
  const d = node('details', undefined, 'explore-fold');
  d.open = open;
  const s = node('summary');
  s.append(node('span', title), node('small', String(count), 'explore-count'));
  d.append(s);
  return d;
};
export function locationGroups(w) {
  const groups = [
    ['settlements', 'Settlements and Cathedral'],
    ['landmarks', 'Landmarks and Unusual Lands'],
    ['dungeons', 'Dungeons'],
    ['camps', 'Camps'],
    ['services', 'Ports and Town Locations'],
    ['debug', 'Debug'],
  ].map(([id, title]) => ({ id, title, items: [] }));
  const add = (group, item) => groups.find((g) => g.id === group).items.push(item),
    cityIds = new Set((w.cities || []).map((z) => z.id));
  for (const z of w.places || []) {
    const city = cityIds.has(z.id),
      sanctuary = z.id === 'cathedral';
    add(
      city || sanctuary
        ? 'settlements'
        : ['red', 'ash', 'thorn'].includes(z.id)
          ? 'camps'
          : 'landmarks',
      {
        id: 'place-' + z.id,
        name: z.name,
        detail: city
          ? { capital: 'Capital', town: 'Town', village: 'Village' }[z.kind] || 'Settlement'
          : sanctuary
            ? 'Sanctuary'
            : 'Landmark',
        target: { name: z.name, x: z.x * TILE, y: z.y * TILE },
        plan: city ? z : sanctuary ? 'sanctuary' : null,
      },
    );
  }
  for (const d of w.dungeonEntrances || [])
    add('dungeons', {
      id: 'dungeon-' + d.id,
      name: d.name,
      detail:
        { caves: 'Caves', catacombs: 'Catacombs', ruins: 'Ruins' }[d.template || 'caves'] +
        (d.kind === 'underwater' ? ' · underwater' : ''),
      target: { name: d.name, x: d.x, y: d.y },
    });
  for (const c of w.camps || [])
    add('camps', {
      id: 'camp-' + c.id,
      name: c.name || 'Field Camp',
      detail: 'Your Camp',
      target: c,
    });
  for (const s of w.workSites || [])
    if (['port', 'grainFarmer', 'beekeeper'].includes(s.kind))
      add('services', {
        id: 'site-' + s.id,
        name: s.name,
        detail: s.kind === 'port' ? 'Port' : w.factionName(s.city),
        target: s,
      });
  for (const [type, list] of [
    ['stable', w.stables],
    ['prison', w.prisons],
  ])
    for (const entry of list || []) {
      const b = w.buildings?.find((b) => b.id === entry.buildingId);
      if (!b?.entrance) continue;
      add('services', {
        id: type + '-' + entry.buildingId,
        name: b.name || { stable: 'Stable', prison: 'Prison' }[type],
        detail: entry.city ? w.factionName(entry.city) : '',
        target: { name: b.name, ...b.entrance },
      });
    }
  if (w.debugMode)
    for (const [resource, name] of [
      ['herb', 'Nearest Herbs'],
      ['ore', 'Nearest Ore'],
    ])
      add('debug', {
        id: 'debug-' + resource,
        name,
        detail: 'Find an Accessible Resource',
        resource,
      });
  for (const g of groups)
    g.items.sort((a, b) => {
      const distance = (i) =>
        i.target ? Math.hypot(i.target.x - w.player.x, i.target.y - w.player.y) : Infinity;
      return distance(a) - distance(b) || a.name.localeCompare(b.name, 'en');
    });
  return groups.filter((g) => g.items.length);
}
export function filterLocations(groups, query) {
  const q = query.trim().toLocaleLowerCase('en');
  return groups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => (i.name + ' ' + i.detail).toLocaleLowerCase('en').includes(q)),
    }))
    .filter((g) => g.items.length);
}
export function renderLocationCatalog(root, w, { select, plan, travel }) {
  const groups = locationGroups(w),
    outer = fold(
      'Region Locations',
      groups.reduce((n, g) => n + g.items.length, 0),
    );
  outer.classList.add('location-catalog');
  root.replaceChildren(outer);
  const search = node('input', undefined, 'panel-search');
  search.type = 'search';
  search.placeholder = 'Find a place…';
  search.setAttribute('aria-label', 'Search Map Locations');
  const body = node('div', undefined, 'location-groups');
  outer.append(search, body);
  const opened = new Set();
  function render() {
    body.replaceChildren();
    const filtered = filterLocations(groups, search.value);
    if (!filtered.length) body.append(node('p', 'Nothing found. Try another name.', 'empty'));
    for (const g of filtered) {
      const d = fold(g.title, g.items.length, !!search.value || opened.has(g.id));
      d.ontoggle = () => {
        if (!search.value) {
          if (d.open) opened.add(g.id);
          else opened.delete(g.id);
        }
      };
      const list = node('div', undefined, 'location-list');
      for (const item of g.items) {
        const row = node('div', undefined, 'location-row'),
          b = node('button', undefined, 'location-choice'),
          text = node('span');
        text.append(node('strong', item.name), node('small', item.detail));
        b.append(text);
        if (item.target) b.append(node('small', travel(item.target), 'location-distance'));
        b.onclick = () => {
          select(item);
          outer.open = false;
        };
        row.append(b);
        if (item.plan) {
          const p = node('button', 'Plan', 'location-plan');
          p.setAttribute('aria-label', 'Plan: ' + item.name);
          p.onclick = () => plan(item.plan);
          row.append(p);
        }
        list.append(row);
      }
      d.append(list);
      body.append(d);
    }
  }
  search.oninput = render;
  render();
}
export function questGroups(quests) {
  return [
    ['active', 'In progress'],
    ['completed', 'Completed'],
    ['failed', 'Failed'],
  ].map(([id, title]) => ({ id, title, items: quests.filter((q) => q.status === id) }));
}
export function renderJournal(
  root,
  w,
  {
    relics,
    returned,
    openRelics,
    openNotes,
    openCampaign,
    cityMemory,
    warrant,
    roleName,
    formatTime,
  },
) {
  root.classList.add('explore-journal');
  root.replaceChildren(node('div', 'TRAVEL JOURNAL', 'eyebrow'), node('h1', 'Traces on the Road'));
  const active = w.quests.filter((q) => q.status === 'active').length,
    overview = node(
      'p',
      active
        ? 'In progress: ' + active + ' · relics: ' + returned + ' / ' + relics
        : 'Open Roads · relics: ' + returned + ' / ' + relics,
      'journal-overview',
    );
  root.append(overview);
  const tabs = node('div', undefined, 'tabs journal-tabs'),
    body = node('div', undefined, 'journal-body');
  tabs.setAttribute('role', 'tablist');
  body.id = 'journal-tab-body';
  body.setAttribute('role', 'tabpanel');
  root.append(tabs, body);
  const pages = [
    ['quests', 'Quests'],
    ['cities', 'Towns'],
    ['chronicle', 'Chronicle'],
  ];
  const action = (label, run) => {
    const b = node('button', label, 'action');
    b.onclick = run;
    return b;
  };
  function render(id) {
    body.setAttribute('aria-labelledby', 'journal-tab-' + id);
    for (const b of tabs.children) {
      const chosen = b.dataset.page === id;
      b.classList.toggle('selected', chosen);
      b.setAttribute('aria-selected', String(chosen));
      b.tabIndex = chosen ? 0 : -1;
    }
    body.replaceChildren();
    body.scrollTop = 0;
    if (id === 'quests') {
      const focus = node('section', undefined, 'journal-focus');
      focus.append(
        node('small', 'SOPHOS’S TASK', 'eyebrow'),
        node('h3', 'Relics · ' + returned + ' / ' + relics),
        node(
          'p',
          'Return discoveries to Sophos. His search notes contain leads and the latest news.',
        ),
      );
      const actions = node('div', undefined, 'actions');
      actions.append(
        action('Open Search Notes', openRelics),
        action('Sketches and Traces', openNotes),
      );
      if (openCampaign) actions.append(action('Story and Hints', openCampaign));
      focus.append(actions);
      body.append(focus);
      for (const group of questGroups(w.quests)) {
        if (!group.items.length && group.id !== 'active') continue;
        const d = fold(group.title, group.items.length, group.id === 'active');
        if (!group.items.length)
          d.append(
            node('p', 'No accepted quests yet. Ask settlement residents for work.', 'empty'),
          );
        for (const q of group.items) {
          const card = node('details', undefined, 'journal-quest'),
            s = node('summary'),
            labels = node('span');
          labels.append(
            node('strong', q.title),
            node('small', (roleName(q.giver) || 'Quest Giver') + ' · ' + w.factionName(q.city)),
          );
          s.append(labels, node('small', q.reward + ' gold', 'quest-reward'));
          card.append(s, node('p', w.questText(q)));
          d.append(card);
        }
        body.append(d);
      }
    } else if (id === 'cities') {
      body.append(
        node(
          'p',
          'Reputation, warrants, and memories of your life, grouped by settlement.',
          'explore-caption',
        ),
      );
      for (const z of w.cities) {
        const m = cityMemory(w, z.id),
          r = warrant(w, z.id),
          d = fold(z.name, (m.reputation > 0 ? '+' : '') + m.reputation);
        if (r) {
          d.classList.add('journal-wanted');
          d.querySelector('summary').append(node('small', 'Wanted', 'wanted-tag'));
        }
        d.append(
          node(
            'p',
            r
              ? 'Wanted: ' + r.name + ' · more ' + Math.ceil(r.expires - w.time) + ' game min.'
              : 'No Warrant',
          ),
        );
        for (const h of m.history.slice(0, 5))
          d.append(
            node(
              'p',
              h.name +
                ' · ' +
                {
                  wanted: h.expires > w.time ? 'wanted' : 'forgotten',
                  fine: 'fine paid',
                  releasedWithoutMoney: 'released without payment',
                  imprisoned: 'imprisoned',
                }[h.status],
            ),
          );
        body.append(d);
      }
    } else {
      const stats = node('div', undefined, 'journal-stats');
      stats.append(
        node('p', 'Caravans Delivered · ' + w.caravanStats.arrived),
        node('p', 'Caravans Lost · ' + w.caravanStats.lost),
      );
      body.append(stats);
      const territory = fold('Territories', w.territories.length);
      for (const z of w.territories)
        territory.append(node('p', z.name + ' — ' + w.factionName(z.owner)));
      body.append(territory);
      const events = w.events.filter((e) => w.debugMode || w.eventObservable(e)).slice(0, 35),
        history = fold(
          w.debugMode ? 'World Chronicle · DEBUG' : 'Observed Events',
          events.length,
          true,
        );
      if (!events.length)
        history.append(node('p', 'Events observed nearby will appear here.', 'empty'));
      for (const e of events) {
        const row = node('p', undefined, 'journal-event');
        row.append(node('time', formatTime(e.time)), node('span', e.text));
        history.append(row);
      }
      body.append(history);
    }
  }
  pages.forEach(([id, label], index) => {
    const b = node('button', label);
    b.type = 'button';
    b.dataset.page = id;
    b.id = 'journal-tab-' + id;
    b.setAttribute('aria-controls', body.id);
    b.setAttribute('role', 'tab');
    b.onclick = () => render(id);
    b.onkeydown = (e) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const next =
        e.key === 'Home'
          ? 0
          : e.key === 'End'
            ? pages.length - 1
            : (index + (e.key === 'ArrowRight' ? 1 : -1) + pages.length) % pages.length;
      render(pages[next][0]);
      tabs.children[next].focus();
    };
    tabs.append(b);
  });
  render('quests');
}
