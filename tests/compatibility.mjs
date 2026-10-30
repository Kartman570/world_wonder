import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { World } from '../src/core/simulation.js';
for (const tag of ['alpha-1', 'alpha-2']) {
  const dir = await mkdtemp(join(tmpdir(), 'ashen-compat-'));
  try {
    const archive = execFileSync('git', ['archive', tag], { maxBuffer: 50 * 1024 * 1024 });
    execFileSync('tar', ['-x', '-C', dir], { input: archive });
    const { World: OldWorld } = await import(pathToFileURL(join(dir, 'simulation.js')));
    const old = new OldWorld('compat-' + tag);
    old.player.inventory = { gold: 123, sword: 1, ore: 7 };
    old.player.skills = { smith: 9 };
    old.player.name = '\u0421\u043e\u0444\u043e\u0441';
    old.player.hp = 83;
    old.time = 4900;
    const w = World.restore(old.save());
    // Pre-lore save versions intentionally start in the expanded region. The established
    // migration carries possessions and skills, rather than the obsolete map, clock or HP.
    assert.equal(w.seed, old.seed);
    assert.equal(w.player.inventory.gold, 123);
    assert.equal(w.player.inventory.sword, 1);
    assert.equal(w.player.inventory.ore, 7);
    assert.deepEqual(w.player.skills, old.player.skills);
    assert.equal(w.player.name, 'Sophos');
    assert.equal(w.player.hp, 100);
    assert.equal(w.generatorVersion, 10);
    assert.ok(w.events.some((entry) => entry.text.includes('region has expanded')));
    assert.ok(w.cities.every((city) => !/[\u0400-\u04ff]/u.test(city.name)));
    const again = World.restore(w.save());
    assert.equal(again.entities.length, w.entities.length);
    assert.deepEqual(Buffer.from(again.tiles), Buffer.from(w.tiles));
    assert.deepEqual(again.player.inventory, w.player.inventory);
    assert.deepEqual(again.projects, w.projects);
    assert.equal(again.time, w.time);
    console.log(
      `✓ ${tag}: expanded-world migration preserves items/skills, translates names and reloads without duplicates`,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
