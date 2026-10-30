import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { SpriteSheets, resolveSprite, actorAnimation } from '../src/render/sprite-sheets.js';
const model = (id, extra = {}) => ({
  id,
  type: 'character',
  spriteReady: true,
  file: 'characters/' + id + '/' + id + '_atlas.png',
  frameWidth: 8,
  frameHeight: 8,
  frames: 1,
  animations: { idle: { start: 0, frames: 1, ready: true } },
  ...extra,
});
const m = {
  catalog: [
    model('player'),
    model('city_guard', { gameRoles: ['guard'] }),
    model('bandit_archer'),
    model('smith'),
    model('arctarian'),
    model('quarry_worker', { gameRoles: ['customMiner'] }),
    model('forest_people', { gameRaces: ['forestRace'] }),
    model('horse', { spriteReady: false }),
    model('statue', { type: 'static' }),
  ],
  roles: { escort: 'city_guard' },
  races: { oldRace: 'arctarian' },
};
assert.equal(resolveSprite(m, { role: 'player' }), 'player');
assert.equal(resolveSprite(m, { role: 'guard' }), 'city_guard');
assert.equal(resolveSprite(m, { role: 'banditArcher' }), 'bandit_archer');
assert.equal(resolveSprite(m, { role: 'smith' }), 'smith');
assert.equal(resolveSprite(m, { role: 'customMiner' }), 'quarry_worker');
assert.equal(resolveSprite(m, { role: 'escort' }), 'city_guard');
assert.equal(resolveSprite(m, { role: 'unknown', race: 'arctarian' }), 'arctarian');
assert.equal(resolveSprite(m, { race: 'forestRace' }), 'forest_people');
assert.equal(resolveSprite(m, { race: 'oldRace' }), 'arctarian');
assert.equal(resolveSprite(m, { role: 'horse' }), null);
assert.equal(resolveSprite(m, { role: 'statue' }), null);
assert.equal(resolveSprite(m, { role: 'player', sprite: 'custom' }), 'custom');
m.catalog.push(model('escort'));
assert.equal(
  resolveSprite(m, { role: 'escort' }),
  'escort',
  'dedicated ready art replaces a shared fallback automatically',
);
const requests = [],
  urls = [];
const loader = new SpriteSheets({
  fetcher: async (url, options) => {
    requests.push(options);
    return { ok: true, json: async () => m };
  },
  imageLoader: async (url) => {
    urls.push(url);
    return { width: 64, height: 8 };
  },
});
await loader.ready;
assert.equal(requests[0].cache, 'no-store');
const ctx = {
    drawImage() {
      this.drawn = true;
    },
  },
  player = { role: 'player', x: 0, y: 0, hp: 100 };
assert.equal(loader.draw(ctx, player, player, 0), false);
await loader.load('player');
assert.equal(loader.draw(ctx, player, player, 0), true);
assert.ok(ctx.drawn);
assert.equal(urls.length, 1);
const live = JSON.parse(
  await fs.readFile(new URL('../graphics/sprites/manifest.json', import.meta.url)),
);
if (live.catalog.some((e) => e.id === 'player' && e.spriteReady))
  assert.equal(
    resolveSprite(live, { role: 'player' }),
    'player',
    'artist player is discovered without a separate role registration',
  );
const clips = {
  animations: Object.fromEntries(
    [
      'idle',
      'walk',
      'run',
      'swim',
      'ride',
      'death',
      'stunned',
      'draw_weapon',
      'sheath',
      'work',
      'work_knife',
      'attack',
      'attack_axe',
      'attack_bow',
      'attack_hammer',
      'attack_cutter',
    ].map((id) => [id, {}]),
  ),
};
assert.equal(actorAnimation({ hp: 100, sprinting: true }, {}, true, clips), 'run');
assert.equal(actorAnimation({ swimming: true }, {}, true, clips), 'swim');
assert.equal(actorAnimation({ riding: 12 }, {}, true, clips), 'ride');
assert.equal(actorAnimation({ stunUntil: 3 }, {}, true, clips, 2), 'stunned');
assert.equal(
  actorAnimation({ drawUntil: 3, weaponDrawn: true }, {}, false, clips, 2),
  'draw_weapon',
);
assert.equal(actorAnimation({ drawUntil: 3, weaponDrawn: false }, {}, false, clips, 2), 'sheath');
assert.equal(
  actorAnimation({ weapon: 'axe', attack: 1 }, { attack: 1 }, true, clips),
  'attack_axe',
);
assert.equal(actorAnimation({ weapon: 'arkCutter' }, { attack: 1 }, false, clips), 'attack_cutter');
assert.equal(
  actorAnimation({ pendingStrike: { kind: 'bow' } }, { attack: 0.3 }, false, clips),
  'attack_bow',
);
assert.equal(actorAnimation({ action: { corpse: 12 } }, {}, false, clips), 'work_knife');
assert.equal(actorAnimation({ action: { type: 'tree' } }, {}, false, clips), 'work');
assert.equal(actorAnimation({ hp: 0, stunUntil: 5 }, {}, false, clips, 2), 'death');
assert.equal(
  actorAnimation({ sprinting: true }, {}, true, { animations: { idle: {}, walk: {} } }),
  'walk',
  'missing optional clips use core fallback',
);
console.log(
  '✓ Automatic catalog discovery for player, future roles, camelCase IDs, race and shared fallback; fresh manifests and available action clips',
);
const originalFetch = globalThis.fetch,
  originalBitmap = globalThis.createImageBitmap;
let validations = 0;
try {
  globalThis.fetch = async (url, options) => {
    assert.equal(options.cache, 'no-cache');
    validations++;
    return { ok: true, blob: async () => new Blob() };
  };
  globalThis.createImageBitmap = async () => ({ width: 64, height: 8 });
  for (let revision = 0; revision < 2; revision++) {
    const instance = new SpriteSheets({
      fetcher: async () => ({
        ok: true,
        json: async () => ({ catalog: [model('player', { hash: 'same-hash' })] }),
      }),
    });
    await instance.preload(['player']);
    assert.equal(instance.assetFor({ role: 'player' }), 'player');
  }
  assert.equal(
    validations,
    2,
    'each page load revalidates a manually replaced PNG even if its hash was not regenerated',
  );
} finally {
  globalThis.fetch = originalFetch;
  if (originalBitmap === undefined) delete globalThis.createImageBitmap;
  else globalThis.createImageBitmap = originalBitmap;
}
console.log('✓ PNGs are HTTP-revalidated across reloads, including unchanged manifest hashes');
