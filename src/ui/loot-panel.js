import { ITEMS, TILE } from '../core/content.js';
import { nearbyLootSources, takeLoot, takeAllNearbyLoot } from '../gameplay/loot.js';
export function renderLootPanel(
  root,
  world,
  anchor,
  { onChange = () => {}, onButcher = () => {}, onTakeAll = null } = {},
) {
  root.replaceChildren();
  const sources = nearbyLootSources(world, anchor),
    element = (tag, text, cls) => {
      const el = document.createElement(tag);
      if (text) el.textContent = text;
      if (cls) el.className = cls;
      return el;
    },
    button = (text, fn) => {
      const b = element('button', text, 'action');
      b.onclick = fn;
      return b;
    };
  root.append(
    element('div', 'NEARBY LOOT', 'eyebrow'),
    element(
      'h1',
      sources.length > 1 ? 'Loot Sources: ' + sources.length : sources[0]?.obj.name || 'Loot',
    ),
    element('p', 'Items are grouped by owner. Only accessible nearby sources are shown.'),
  );
  const changed = () => {
    onChange();
    renderLootPanel(root, world, anchor, { onChange, onButcher, onTakeAll });
  };
  if (!sources.length) root.append(element('p', 'No accessible loot remains nearby.', 'empty'));
  for (const [index, source] of sources.entries()) {
    const { obj } = source,
      section = element('section', null, 'loot-source'),
      heading = element('div', null, 'loot-source-heading');
    heading.append(
      element('h3', obj.name || 'Source ' + (index + 1)),
      element(
        'small',
        (obj.player
          ? 'Your Belongings'
          : source.kind === 'woodPile'
            ? 'Logging Site'
            : source.kind === 'landmark'
              ? 'Cache'
              : obj.animal
                ? 'Animal Carcass'
                : 'Body') +
          ' · ' +
          Math.round((source.distance / TILE) * 10) / 10 +
          ' tiles',
      ),
    );
    section.append(heading);
    const entries = Object.entries(obj.inventory || {}).filter(([, n]) => n > 0);
    for (const [key, count] of entries) {
      const row = element('div', null, 'item-row');
      row.append(
        element(
          'span',
          (ITEMS[key]?.icon || '◇') + ' ' + (ITEMS[key]?.name || key) + ' × ' + count,
        ),
        button('Take', () => {
          takeLoot(world, source, key);
          changed();
        }),
      );
      if (ITEMS[key]?.description) {
        const desc = element('small', ITEMS[key].description, 'item-description');
        row.firstChild.append(desc);
      }
      section.append(row);
    }
    if (!entries.length)
      section.append(
        element(
          'p',
          source.needsButchering
            ? 'Butcher the carcass to obtain usable materials.'
            : 'No items remain.',
          'empty',
        ),
      );
    const actions = element('div', null, 'actions');
    if (source.needsButchering)
      actions.append(
        button(world.debugMode ? 'Butcher Carcass · instantly' : 'Butcher Carcass · 3 sec.', () =>
          onButcher(source),
        ),
      );
    if (entries.length)
      actions.append(
        button('Take from This Source', () => {
          takeLoot(world, source);
          changed();
        }),
      );
    section.append(actions);
    root.append(section);
  }
  if (sources.some((s) => Object.values(s.obj.inventory || {}).some((n) => n > 0))) {
    const actions = element('div', null, 'actions loot-all');
    actions.append(
      button('Take All Nearby', () => {
        takeAllNearbyLoot(world, anchor);
        if (onTakeAll) {
          onChange();
          onTakeAll();
        } else changed();
      }),
    );
    root.append(actions);
  }
}
