import { RELICS, LORE_ITEMS, LORE_ROLES } from '../gameplay/lore-content.js';
export const TILE = 48,
  W = 1280,
  H = 960,
  VERSION = 3;
export const point = (x, y) => ({ x: x * TILE, y: y * TILE });
export const PLACES = [
  { id: 'cathedral', name: 'Cathedral of the Last Light', x: 300, y: 300, r: 12 },
  { id: 'oak', name: 'Oakmarch', x: 88, y: 300, r: 30, faction: 'oak', specialty: 'log' },
  {
    id: 'salt',
    name: 'Salt Quay',
    x: 548,
    y: 300,
    r: 30,
    faction: 'salt',
    specialty: 'fish',
  },
  { id: 'north', name: 'Northwatch', x: 316, y: 58, r: 30, faction: 'north', specialty: 'ore' },
  { id: 'red', name: 'Red Foxes Stronghold', x: 177, y: 198, r: 10, faction: 'red' },
  { id: 'ash', name: 'Ash Hounds Camp', x: 446, y: 203, r: 10, faction: 'ash' },
  { id: 'thorn', name: 'Bandit Pass', x: 339, y: 407, r: 9, faction: 'thorn' },
  { id: 'ruins', name: 'Forgotten Ruins', x: 121, y: 423, r: 8 },
  { id: 'barrow', name: 'Barrow of the Nameless', x: 459, y: 74, r: 7 },
  { id: 'shrine', name: 'Sunken Shrine', x: 471, y: 389, r: 7 },
  { id: 'lake', name: 'Lake of Still Waters', x: 510, y: 369, r: 19 },
  { id: 'cross', name: 'Old Wayside Inn', x: 304, y: 207, r: 8 },
  { id: 'quarry', name: 'Northern Quarries', x: 365, y: 106, r: 8 },
  { id: 'grove', name: 'Heart of the Ancient Forest', x: 205, y: 356, r: 7 },
];
export const CITIES = PLACES.filter((z) => ['oak', 'salt', 'north'].includes(z.id));
export const FACTIONS = {
  oak: 'Oakmarch',
  salt: 'Salt Quay',
  north: 'Northwatch',
  red: 'Red Foxes',
  ash: 'Ash Hounds',
  thorn: 'Thorn Alliance',
};
export const ITEMS = {
  ale: { name: 'Tavern Ale', icon: '♜', price: 4 },
  armor: { name: 'Guard’s Armor', icon: '▣', price: 90 },
  hammer: { name: 'War Hammer', icon: '⚒', price: 48 },
  fiber: { name: 'Flax Fiber', icon: '≋', price: 3 },
  cloth: { name: 'Cloth', icon: '▤', price: 14 },
  coat: { name: 'Traveling Cloak', icon: '♧', price: 40 },
  gold: { name: 'Gold', icon: '◉', price: 1 },
  fish: { name: 'River Fish', icon: '🐟', price: 5 },
  hide: { name: 'Hide', icon: '◈', price: 12 },
  meat: { name: 'Fresh Meat', icon: '◆', price: 6 },
  ration: { name: 'Travel Rations', icon: '▧', price: 8 },
  sword: { name: 'Iron Sword', icon: '⚔', price: 35 },
  bow: { name: 'Hunting Bow', icon: '➶', price: 30 },
  arrow: { name: 'Arrows', icon: '↗', price: 2 },
  log: { name: 'Log', icon: '▰', price: 7 },
  ore: { name: 'Iron Ore', icon: '⬟', price: 10 },
  axe: { name: 'Forest Axe', icon: '⚒', price: 26 },
  herb: { name: 'Medicinal Herbs', icon: '✿', price: 9 },
  bait: { name: 'Bait', icon: '∿', price: 1 },
  relic: { name: 'Dawn Shard', icon: '✧', price: 0 },
  moonRelic: { name: 'Moon Seal', icon: '☾', price: 0 },
  tideRelic: { name: 'Heart of the Tide', icon: '❖', price: 0 },
  supply: { name: 'Stolen Supplies', icon: '▣', price: 0 },
  letter: { name: 'Sealed Letter', icon: '✉', price: 0 },
};
export const ANIMALS = {
  caveSpider: {
    name: 'Cave Spider',
    hp: 38,
    speed: 115,
    damage: 8,
    meat: 0,
    hide: 0,
    drops: { spiderChitin: 2, venomGland: 1 },
    size: 14,
    color: '#71645b',
    aggressive: true,
  },
  caveBat: {
    name: 'Cave Bat',
    hp: 23,
    speed: 150,
    damage: 5,
    meat: 1,
    hide: 0,
    size: 10,
    color: '#93829b',
    aggressive: true,
  },
  deer: { name: 'Deer', hp: 45, speed: 110, meat: 3, hide: 2, size: 18, color: '#ad8c62' },
  hare: { name: 'Hare', hp: 18, speed: 145, meat: 1, hide: 1, size: 8, color: '#b1aa8c' },
  wolf: {
    name: 'Wolf',
    hp: 55,
    speed: 130,
    damage: 10,
    meat: 2,
    hide: 1,
    size: 16,
    color: '#858c7c',
    aggressive: true,
  },
  bear: {
    name: 'Brown Bear',
    hp: 155,
    speed: 82,
    damage: 22,
    meat: 5,
    hide: 3,
    size: 25,
    color: '#615a42',
    aggressive: true,
  },
  boar: {
    name: 'Wild Boar',
    hp: 85,
    speed: 115,
    damage: 15,
    meat: 4,
    hide: 2,
    size: 19,
    color: '#74634e',
    aggressive: true,
  },
  fox: { name: 'Fox', hp: 26, speed: 125, meat: 1, hide: 2, size: 11, color: '#bc8253' },
  elk: { name: 'Elk', hp: 100, speed: 105, meat: 5, hide: 3, size: 25, color: '#8b7757' },
  lynx: {
    name: 'Lynx',
    hp: 65,
    speed: 145,
    damage: 13,
    meat: 2,
    hide: 2,
    size: 14,
    color: '#b4a071',
    aggressive: true,
  },
  goat: { name: 'Mountain Goat', hp: 40, speed: 108, meat: 2, hide: 1, size: 13, color: '#bab6a0' },
  badger: { name: 'Badger', hp: 35, speed: 78, meat: 1, hide: 1, size: 11, color: '#777c70' },
};
export const ROLES = {
  prisoner: 'Prisoner',
  drunkard: 'Drunkard',
  farmerTrader: 'Farmer',
  armorer: 'Armorer',
  bowyer: 'Bowyer',
  leatherworker: 'Leatherworker',
  provisioner: 'Provisions Merchant',
  king: 'King',
  herald: 'Herald',
  tailor: 'Seamstress',
  farmer: 'Flax Farmer',
  wizard: 'Wizard Sophos',
  dummy: 'Training Dummy',
  guard: 'Town Guard',
  archer: 'Town Archer',
  escort: 'Caravan Swordsman',
  escortArcher: 'Caravan Archer',
  bandit: 'Bandit',
  banditArcher: 'Bandit Archer',
  brute: 'Bandit Brute',
  raider: 'Raider',
  fisher: 'Fisher',
  hunter: 'Hunter',
  forester: 'Forester',
  smith: 'Blacksmith',
  cook: 'Innkeeper',
  herbalist: 'Herbalist',
  mayor: 'Mayor',
  quartermaster: 'Quartermaster',
  citizen: 'Townsfolk',
  merchant: 'Caravanner',
  miner: 'Miner',
  gatherer: 'Herb Gatherer',
};
export const BANDITS = ['bandit', 'banditArcher', 'brute', 'raider'];
export const GUARDS = ['guard', 'archer', 'escort', 'escortArcher'];
export const RANGED = ['archer', 'escortArcher', 'banditArcher', 'hunter'];
export const TRADE = {
  farmerTrader: {
    buys: ['fiber', 'meat', 'herb'],
    sells: ['ration', 'fiber', 'meat'],
    text: 'I sell crops, fiber, and farm produce.',
  },
  armorer: {
    buys: ['hammer', 'sword', 'axe', 'ore', 'hide'],
    sells: ['hammer', 'sword', 'axe', 'coat'],
    text: 'Blades, traveling armor, and axes.',
  },
  bowyer: {
    buys: ['log', 'bow', 'arrow'],
    sells: ['bow', 'arrow'],
    text: 'Bows and arrows. I buy timber.',
  },
  leatherworker: {
    buys: ['hide', 'cloth'],
    sells: ['hide', 'coat', 'cloth'],
    text: 'I tan hides and sew cloaks.',
  },
  provisioner: {
    buys: ['ration', 'herb', 'bait'],
    sells: ['ration', 'herb', 'bait'],
    text: 'Supplies for the long road.',
  },
  tailor: {
    buys: ['fiber', 'cloth', 'hide'],
    sells: ['cloth', 'coat'],
    text: 'I weave flax into cloth and sew cloaks. I buy fiber, cloth, and hides.',
  },
  smith: {
    buys: ['hammer', 'sword', 'bow', 'arrow', 'axe', 'ore', 'log', 'hide'],
    sells: ['hammer', 'sword', 'bow', 'arrow', 'axe', 'ore'],
    text: 'Weapons, ore, and wood. Visit the inn for provisions.',
  },
  cook: {
    buys: ['fish', 'meat', 'herb', 'ration'],
    sells: ['ration', 'fish', 'meat'],
    text: 'I buy fish and meat, then cook for residents and travelers.',
  },
  herbalist: { buys: ['herb'], sells: ['herb'], text: 'Medicinal herbs are my only trade.' },
  fisher: {
    buys: ['bait'],
    sells: ['fish'],
    text: 'I sell my catch and buy bait. Swords are no use to me.',
  },
  forester: {
    buys: ['axe'],
    sells: ['log', 'hide', 'meat'],
    text: 'I gather timber and butcher game. A good axe always finds work.',
  },
  merchant: {
    buys: [
      'fish',
      'meat',
      'hide',
      'ration',
      'sword',
      'bow',
      'arrow',
      'axe',
      'ore',
      'log',
      'herb',
      'bait',
    ],
    sells: [
      'fish',
      'meat',
      'hide',
      'ration',
      'sword',
      'bow',
      'arrow',
      'axe',
      'ore',
      'log',
      'herb',
      'bait',
    ],
    text: 'We carry goods between towns. All our cargo is here in the wagon.',
  },
};
export const LANDMARKS = [
  { id: 'relic', place: 'ruins', item: 'relic', name: 'Dawn Casket' },
  { id: 'moon', place: 'barrow', item: 'moonRelic', name: 'Barrow Seal' },
  { id: 'tide', place: 'shrine', item: 'tideRelic', name: 'Shrine Chest' },
  { id: 'supply', place: 'red', item: 'supply', name: 'Stolen Cargo' },
];
export function questOffers(e) {
  const city = CITIES.find((z) => z.id === e.faction);
  if (!city) return [];
  const base = { city: city.id, giver: e.role };
  const q = (id, title, type, extra, reward) => ({
    ...base,
    id: city.id + '-' + id,
    title,
    type,
    ...extra,
    reward,
  });
  switch (e.role) {
    case 'mayor':
      return [
        q('wolves', 'Wolf Trails', 'kill', { role: 'wolf', count: 4 }, 95),
        q('bandits', 'Peace on the Road', 'kill', { role: 'bandits', count: 5 }, 160),
        q(
          'courier',
          'A Letter Beyond the Far Gate',
          'courier',
          { destination: CITIES[(CITIES.indexOf(city) + 1) % 3].id, count: 1 },
          135,
        ),
        q('grove', 'Where the Roads Fall Silent', 'visit', { place: 'grove' }, 110),
        q('supply', 'Missing Caravan', 'collect', { item: 'supply', count: 1 }, 150),
      ];
    case 'smith':
      return [
        q('ore', 'Iron for the Garrison', 'collect', { item: 'ore', count: 8 }, 130),
        q('wood', 'Coals for the Forge', 'collect', { item: 'log', count: 8 }, 105),
        q('archers', 'Eliminate the Archers', 'kill', { role: 'banditArcher', count: 3 }, 140),
      ];
    case 'cook':
      return [
        q('fish', 'Supper at the Inn', 'collect', { item: 'fish', count: 6 }, 65),
        q('meat', 'Meat for the Winter Cellars', 'collect', { item: 'meat', count: 8 }, 85),
      ];
    case 'forester':
      return [
        q('hides', 'Leatherworking Order', 'collect', { item: 'hide', count: 5 }, 90),
        q('boars', 'Boars at the Sawmill', 'kill', { role: 'boar', count: 3 }, 100),
      ];
    case 'herbalist':
      return [
        q('herbs', 'Medicine for the Watch', 'collect', { item: 'herb', count: 7 }, 95),
        q('spring', 'Explore the Shrine', 'visit', { place: 'shrine' }, 125),
      ];
    case 'quartermaster':
      return [q('bridge', 'Patrol the River Crossing', 'visit', { place: 'cross' }, 80)];
    case 'merchant':
      return [
        q(
          'escort-' + e.id,
          'To the Next Gate',
          'escort',
          { caravan: e.id, destination: e.destination },
          120,
        ),
      ];
    default:
      return [];
  }
}

Object.assign(
  ITEMS,
  LORE_ITEMS,
  Object.fromEntries(
    RELICS.map((r) => [
      r.item,
      { name: r.name, icon: r.icon, price: 0, description: r.description, artifact: true },
    ]),
  ),
);
Object.assign(ROLES, LORE_ROLES);
RANGED.push('nomadArcher');

Object.assign(FACTIONS, {
  emralaan: 'Emralaand Nomad Camps',
  fairies: 'The Winged',
  arktaria: 'New Arctaria',
  chapel: 'Voiceless Chapel',
});

Object.assign(ROLES, { groom: 'Groom', horse: 'Horse' });
