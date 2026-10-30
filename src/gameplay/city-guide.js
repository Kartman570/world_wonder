import { TILE, point } from '../core/content.js';
import { roomName } from '../render/interiors.js';
const compass = (dx, dy) => {
  if (Math.hypot(dx, dy) < 70) return 'very close';
  const a = Math.atan2(dy, dx),
    dirs = [
      'to the east',
      'to the southeast',
      'to the south',
      'to the southwest',
      'to the west',
      'to the northwest',
      'to the north',
      'to the northeast',
    ];
  return dirs[(Math.round(a / (Math.PI / 4)) + 8) % 8];
};
export function cityDestinations(w, speaker) {
  const city = w.cities.find((z) => z.id === speaker.faction) || w.inCity(speaker);
  if (!city) return [];
  const result = [];
  for (const [role, label] of Object.entries({
    groom: 'Groom',
    quartermaster: 'Quartermaster',
    king: 'King',
    mayor: 'Mayor / Elder',
    healer: 'Healer',
    smith: 'Blacksmith',
    cook: 'Innkeeper',
    herbalist: 'Herbalist',
    tailor: 'Seamstress',
    farmerTrader: 'Food Merchant',
    armorer: 'Armorer',
    bowyer: 'Bowyer',
    herald: 'Herald',
    hunter: 'Hunter for Hire',
    carpenter: 'Carpenter',
  })) {
    const e = w.entities.find((e) => e.hp > 0 && e.faction === city.id && e.role === role);
    if (e) result.push({ label, target: e, person: true, city });
  }
  for (const [type, label] of Object.entries({
    stable: 'Stable',
    warehouse: 'Town Warehouse',
    inn: 'Inn',
    castle: 'Castle',
    townhall: 'Town Hall',
    barracks: 'Barracks',
    prison: 'Prison',
    cage: 'Detention Cage',
    smith: 'Smithy',
    apothecary: 'Herb and Medicine Shop',
  })) {
    const b = w.buildings.find((b) => b.city === city.id && b.type === type);
    if (b) result.push({ label, target: { ...b.workSpot, building: b }, city });
  }
  result.push({ label: 'Central Square', target: point(city.x, city.y), city });
  for (const s of w.workSites.filter(
    (s) =>
      s.city === city.id &&
      ['logging', 'fishing', 'port', 'grainFarmer', 'beekeeper'].includes(s.kind),
  ))
    result.push({ label: s.name, target: s, city });
  if (city.primaryGate)
    result.push({
      label: 'Main Gate',
      target: point(city.primaryGate.x + 0.5, city.primaryGate.y + 0.5),
      city,
    });
  return result;
}
export function describeDestination(w, speaker, entry) {
  const { target, city, person } = entry,
    b = target.building || w.interiorAt(target),
    same = w.interiorAt(speaker),
    distance = Math.hypot(target.x - speaker.x, target.y - speaker.y);
  if (person && target === speaker) return 'That’s me. You’re already talking to me.';
  if (
    person &&
    same &&
    b?.id === same.id &&
    w.visibleFrom(speaker, target) &&
    w.lineClear(speaker, target) &&
    distance < 260
  )
    return (
      'In this same room, ' +
      (distance < 85
        ? 'standing near us'
        : 'standing ' + compass(target.x - speaker.x, target.y - speaker.y)) +
      ': ' +
      target.name +
      '.'
    );
  const dx = target.x / TILE - city.x,
    dy = target.y / TILE - city.y,
    rx = city.rx || 25,
    ry = city.ry || 25;
  let district =
    Math.abs(dx) < rx * 0.25 && Math.abs(dy) < ry * 0.25
      ? 'in the settlement’s center'
      : Math.abs(dx / rx) > Math.abs(dy / ry)
        ? dx > 0
          ? 'in the east, near the eastern edge'
          : 'in the west, near the western edge'
        : dy > 0
          ? 'in the settlement’s south'
          : 'in the settlement’s north';
  if (Math.abs(dx) > rx * 0.65 && city.kind !== 'village')
    district = dx > 0 ? 'by the east wall' : 'by the west wall';
  else if (Math.abs(dy) > ry * 0.65 && city.kind !== 'village')
    district = dy > 0 ? 'by the south wall' : 'by the north wall';
  const where = b ? 'in the building “' + roomName(b) + '”' : 'outside';
  return (
    (person ? target.name + ' is currently ' + where : entry.label) +
    (person && target.state === 'sleep' ? ' resting at home' : '') +
    ' — ' +
    compass(target.x - speaker.x, target.y - speaker.y) +
    ' from here, ' +
    district +
    '.' +
    (b ? ' Entrance on the building’s south side.' : '') +
    (distance > Math.max(rx, ry) * TILE * 1.2 ? ' That lies outside the residential wards.' : '')
  );
}
export function renderCityGuide(root, w, speaker) {
  root.replaceChildren();
  const p = document.createElement('p');
  p.className = 'reply';
  p.textContent = 'Which person or place are you looking for?';
  p.setAttribute('role', 'status');
  root.append(p);
  const tabs = document.createElement('div');
  tabs.className = 'tabs';
  const search = document.createElement('input');
  search.className = 'panel-search';
  search.placeholder = 'Find a Person or Place';
  search.setAttribute('aria-label', 'Search the Town');
  const list = document.createElement('div');
  list.className = 'destination-grid';
  const entries = cityDestinations(w, speaker);
  let category = 'people';
  const outside = new Set(['logging', 'fishing', 'port', 'grainFarmer', 'beekeeper']);
  const categoryOf = (entry) =>
    entry.person ? 'people' : outside.has(entry.target.kind) ? 'outside' : 'places';
  const paint = () => {
    list.replaceChildren();
    for (const b of tabs.children) {
      b.classList.toggle('selected', b.dataset.category === category);
      b.setAttribute('aria-pressed', String(b.dataset.category === category));
    }
    const query = search.value.toLowerCase().trim(),
      filtered = entries.filter(
        (e) => (query || categoryOf(e) === category) && e.label.toLowerCase().includes(query),
      );
    for (const entry of filtered) {
      const b = document.createElement('button');
      b.textContent = entry.label;
      b.onclick = () => (p.textContent = describeDestination(w, speaker, entry));
      list.append(b);
    }
    if (!filtered.length) {
      const empty = document.createElement('p');
      empty.textContent = 'Nothing found. Try another name.';
      list.append(empty);
    }
  };
  for (const [id, label] of [
    ['people', 'People'],
    ['places', 'Places'],
    ['outside', 'Outside Town'],
  ]) {
    const b = document.createElement('button');
    b.textContent = label;
    b.dataset.category = id;
    b.onclick = () => {
      category = id;
      search.value = '';
      paint();
    };
    tabs.append(b);
  }
  search.oninput = paint;
  root.append(tabs, search, list);
  paint();
}
