import assert from 'node:assert/strict';
import { World } from '../src/core/simulation.js';
import { englishLegacyText, migrateSaveText } from '../src/core/legacy-text.js';

assert.equal(englishLegacyText('Iron Sword'), 'Iron Sword');
assert.equal(englishLegacyText('\u0421\u043e\u0444\u043e\u0441'), 'Sophos');
assert.equal(
  englishLegacyText(
    '\u0414\u0443\u0431\u043e\u0432\u044b\u0439 \u043f\u0440\u0435\u0434\u0435\u043b',
  ),
  'Oakmarch',
);
const legacyName = '\u0421\u043e\u0444\u043e\u0441';
const save = {
  seed: legacyName,
  player: { name: legacyName, inventory: { gold: 17, sword: 1 } },
  entities: [{ name: legacyName, role: 'wizard', faction: 'cathedral', x: 123, y: 456 }],
  notes: ['NPC: ' + legacyName + ' (3)'],
  completedQuests: ['delivery-oak'],
};
const migrated = migrateSaveText(structuredClone(save));
assert.equal(migrated.seed, save.seed, 'Opaque seeds must remain unchanged');
assert.equal(migrated.player.name, 'Sophos');
assert.equal(migrated.notes[0], 'NPC: Sophos (3)');
assert.deepEqual(migrated.player.inventory, save.player.inventory);
assert.deepEqual(migrated.completedQuests, save.completedQuests);
assert.deepEqual(migrated.entities[0], { ...save.entities[0], name: 'Sophos' });
assert.deepEqual(migrateSaveText(structuredClone(migrated)), migrated, 'Migration is idempotent');
assert.doesNotMatch(
  englishLegacyText('\u0416\u0443\u0440\u0430\u0432\u043b\u0451\u0432'),
  /[\u0400-\u04ff]/,
);
console.log('✓ English legacy display text; seeds, identifiers, progress and inventory preserved');

// Current-version saves must keep their geography and progress while their display text changes.
const world = new World('english-save-roundtrip');
const state = JSON.parse(world.save());
state.entities[0].name = legacyName;
state.player.inventory.gold = 4321;
state.player.hp = 61;
const restored = World.restore(JSON.stringify(state));
assert.equal(restored.entities.find((entity) => entity.id === state.entities[0].id).name, 'Sophos');
assert.ok(restored.cities.every((city) => !/[\u0400-\u04ff]/u.test(city.name)));
assert.equal(restored.player.inventory.gold, 4321);
assert.equal(restored.player.hp, 61);
assert.equal(restored.time, state.time);
assert.equal(restored.seed, state.seed);
assert.deepEqual(Buffer.from(restored.tiles), Buffer.from(world.tiles));
assert.deepEqual(restored.quests, world.quests);
console.log('✓ Current saves keep their map, health, time and quests when display text migrates');
