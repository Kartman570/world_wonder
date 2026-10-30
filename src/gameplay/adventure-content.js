import { ITEMS, ROLES, TRADE } from '../core/content.js';
const item = (name, icon, price) => ({ name, icon, price });
Object.assign(ITEMS, {
  grain: item('Seed', '♧', 3),
  hops: item('Hops', '❧', 4),
  flour: item('Flour', '▱', 6),
  bread: item('Village Bread', '▰', 10),
  honey: item('Forest Honey', '⬢', 12),
  wax: item('Beeswax', '⬡', 7),
  leather: item('Tanned Leather', '◈', 18),
  ingot: item('Iron Ingot', '▰', 18),
  nails: item('Nails', '†', 5),
  planks: item('Planks', '▥', 10),
  rope: item('Flax Rope', '∞', 9),
  bandage: item('Clean Bandages', '✚', 14),
  medicine: item('Herbal Salve', '✥', 28),
  torch: item('Traveling Torch', '♨', 16),
  campKit: item('Packed Camp', '⌂', 65),
  jerky: item('Dried Meat', '◆', 14),
  stew: item('Hot Stew', '♜', 20),
  tools: item('Tool Kit', '⚒', 55),
  travelCoat: item('Reinforced Cloak', '♧', 75),
  shield: item('Wooden Shield', '◐', 65),
  salve: item('Honey Dressing', '✚', 22),
});
Object.assign(ROLES, {
  grainFarmer: 'Grain Farmer',
  miller: 'Miller',
  baker: 'Baker',
  brewer: 'Brewer',
  beekeeper: 'Beekeeper',
  tanner: 'Tanner',
  healer: 'Healer',
  captive: 'Captive Apprentice',
});
const extend = (role, buy, sell) => {
  TRADE[role].buys = [...new Set([...TRADE[role].buys, ...buy])];
  TRADE[role].sells = [...new Set([...TRADE[role].sells, ...sell])];
};
extend(
  'cook',
  ['grain', 'flour', 'honey', 'hops', 'bread', 'jerky', 'stew'],
  ['bread', 'ale', 'jerky', 'stew'],
);
extend('farmerTrader', ['grain', 'hops', 'honey', 'wax'], ['grain', 'hops', 'honey', 'wax']);
extend('herbalist', ['honey', 'wax', 'cloth'], ['bandage', 'medicine', 'salve']);
extend('smith', ['ingot', 'nails', 'tools', 'planks'], ['ingot', 'nails', 'tools']);
extend('tailor', ['rope', 'leather'], ['rope', 'bandage', 'travelCoat']);
extend('leatherworker', ['leather', 'wax'], ['leather', 'travelCoat']);
extend('armorer', ['ingot', 'leather', 'planks'], ['shield', 'armor', 'travelCoat']);
extend(
  'provisioner',
  ['bread', 'jerky', 'torch', 'rope'],
  ['bread', 'jerky', 'torch', 'campKit', 'rope'],
);
extend(
  'merchant',
  ['bread', 'flour', 'grain', 'hops', 'honey', 'wax', 'leather'],
  ['bread', 'flour', 'grain', 'hops', 'honey', 'wax', 'leather'],
);
export const SKILLS = {
  craft: 'Crafting',
  cooking: 'Cooking',
  medicine: 'Herbalism',
  survival: 'Survival',
  smithing: 'Smithing',
};
export const STATIONS = {
  field: 'By Hand',
  fire: 'Hearth or Camp',
  forge: 'Smithy',
  loom: 'Weaving Workshop',
  bench: 'Workshop / Warehouse',
  mortar: 'Herbalist’s Shop',
  tannery: 'Leatherworking Workshop',
};
const recipe = (id, name, input, output, skill, station, seconds, level = 1) => ({
  id,
  name,
  input,
  output,
  skill,
  station,
  seconds,
  level,
});
export const RECIPES = [
  recipe('rope', 'Weave Rope', { fiber: 3 }, { rope: 1 }, 'craft', 'field', 4),
  recipe('bandage', 'Cut Clean Bandages', { cloth: 1 }, { bandage: 2 }, 'medicine', 'field', 4),
  recipe(
    'salve',
    'Honey Dressing',
    { herb: 1, honey: 1, cloth: 1 },
    { salve: 2 },
    'medicine',
    'field',
    6,
  ),
  recipe(
    'torch',
    'Make a Torch',
    { log: 1, cloth: 1, wax: 1 },
    { torch: 2 },
    'survival',
    'field',
    5,
  ),
  recipe('planks', 'Split Planks', { log: 2 }, { planks: 3 }, 'craft', 'field', 7),
  recipe(
    'camp',
    'Craft a Packed Camp',
    { log: 3, cloth: 2, rope: 2 },
    { campKit: 1 },
    'survival',
    'field',
    10,
  ),
  recipe('jerky', 'Dry Meat', { meat: 2 }, { jerky: 3 }, 'cooking', 'fire', 9),
  recipe('fish', 'Bake Fish', { fish: 2, herb: 1 }, { ration: 3 }, 'cooking', 'fire', 7),
  recipe('stew', 'Cook Stew', { meat: 1, herb: 1, grain: 1 }, { stew: 2 }, 'cooking', 'fire', 8),
  recipe('bread', 'Bake Bread', { flour: 2, honey: 1 }, { bread: 4 }, 'cooking', 'fire', 10),
  recipe('flour', 'Grind Flour', { grain: 3 }, { flour: 2 }, 'craft', 'bench', 7),
  recipe('cloth', 'Weave Cloth', { fiber: 3 }, { cloth: 1 }, 'craft', 'loom', 8),
  recipe('leather', 'Tan Hides', { hide: 2 }, { leather: 2 }, 'craft', 'tannery', 12),
  recipe('ingot', 'Smelt an Ingot', { ore: 2, log: 1 }, { ingot: 1 }, 'smithing', 'forge', 10),
  recipe('nails', 'Forge Nails', { ingot: 1 }, { nails: 8 }, 'smithing', 'forge', 8),
  recipe('arrows', 'Make Arrows', { planks: 1, nails: 2 }, { arrow: 16 }, 'craft', 'bench', 8),
  recipe(
    'medicine',
    'Prepare Salve',
    { herb: 3, honey: 1 },
    { medicine: 2 },
    'medicine',
    'mortar',
    10,
  ),
  recipe(
    'tools',
    'Assemble Tools',
    { ingot: 2, planks: 1, rope: 1 },
    { tools: 1 },
    'smithing',
    'forge',
    12,
    2,
  ),
  recipe(
    'shield',
    'Reinforce a Shield',
    { planks: 3, leather: 1, nails: 4 },
    { shield: 1 },
    'craft',
    'bench',
    12,
    2,
  ),
  recipe(
    'coat',
    'Reinforce a Traveling Cloak',
    { cloth: 3, leather: 2, wax: 1 },
    { travelCoat: 1 },
    'craft',
    'loom',
    14,
    2,
  ),
  recipe('axe', 'Forge an Axe', { ingot: 2, planks: 1 }, { axe: 1 }, 'smithing', 'forge', 12, 2),
  recipe(
    'hammer',
    'Forge a Hammer',
    { ingot: 3, planks: 1 },
    { hammer: 1 },
    'smithing',
    'forge',
    14,
    2,
  ),
];
export const INDUSTRIES = {
  miller: {
    name: 'Millers’ Cooperative',
    room: 'warehouse',
    prop: 'millstone',
    recipe: 'flour',
    inputs: ['grain'],
    outputs: ['flour'],
    time: 12,
  },
  baker: {
    name: 'Bakery',
    room: 'inn',
    prop: 'breadOven',
    recipe: 'bread',
    inputs: ['flour', 'honey'],
    outputs: ['bread'],
    time: 18,
  },
  brewer: {
    name: 'Brewery',
    room: 'inn',
    prop: 'brewVat',
    input: { grain: 2, hops: 1 },
    output: { ale: 4 },
    inputs: ['grain', 'hops'],
    outputs: ['ale'],
    time: 24,
  },
  tanner: {
    name: 'Tannery',
    room: 'leatherworks',
    prop: 'tanningFrame',
    recipe: 'leather',
    inputs: ['hide'],
    outputs: ['leather'],
    time: 20,
  },
  healer: {
    name: 'Infirmary',
    room: 'apothecary',
    prop: 'herbDryer',
    recipe: 'medicine',
    inputs: ['herb', 'honey'],
    outputs: ['medicine'],
    time: 22,
  },
};
export const USE_EFFECTS = {
  bread: { hp: 20, stamina: 55 },
  jerky: { hp: 25, stamina: 75 },
  stew: { hp: 40, stamina: 100 },
  bandage: { hp: 22 },
  salve: { hp: 35 },
  medicine: { hp: 60 },
};
