import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
let source = await fs.readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const elements = new Map(),
  events = new Map(),
  frames = [];
let constructors = 0;
let allowCreation = false,
  restores = 0;
const context = { setTransform() {} };
const element = () => ({
  classList: { add() {}, remove() {}, toggle() {} },
  style: {},
  append() {},
  replaceChildren() {},
  remove() {},
  getContext: () => context,
  addEventListener() {},
  setAttribute() {},
  textContent: '',
  value: '734291',
});
const document = {
  createElement: element,
  body: element(),
  querySelector(s) {
    if (!elements.has(s)) elements.set(s, element());
    return elements.get(s);
  },
  addEventListener(name, callback) {
    events.set(name, callback);
  },
};
const makeWorld = () => ({
  player: { x: 0, y: 0 },
  places: [],
  nearby: () => [],
  log() {},
  placeAt: () => null,
});
class ForbiddenWorld {
  constructor() {
    constructors++;
    assert.ok(allowCreation, 'World must not be created in menu');
    return makeWorld();
  }
  static restore() {
    restores++;
    return makeWorld();
  }
}
class FakeExpedition {
  constructor(surface) {
    assert.ok(allowCreation);
    this.current = this.surface = surface;
  }
  save() {
    return '{}';
  }
  static restore() {
    return new FakeExpedition(ForbiddenWorld.restore());
  }
}
class LazyService {
  prepareGround() {
    return Promise.resolve();
  }
  chunk() {}
  constructor() {
    assert.ok(allowCreation, 'Services must not start in menu');
  }
  dispose() {}
}
class Sheets {
  constructor() {
    this.manifest = {};
  }
}
class Environment {
  constructor() {}
  warm() {
    return Promise.resolve();
  }
}
class Buildings {
  constructor() {}
}
const imports = new Proxy(
  {},
  {
    get: (_, path) =>
      new Proxy(
        {
          World: ForbiddenWorld,
          Expedition: FakeExpedition,
          RenderAssets: LazyService,
          PathService: LazyService,
          SpriteSheets: Sheets,
          EnvironmentSprites: Environment,
          TerrainTextures: Environment,
          BuildingSprites: Buildings,
          TILE: 48,
          W: 1280,
          H: 960,
        },
        { get: (o, key) => o[key] || (() => {}) },
      ),
  },
);
source = source.replace(
  /import\s*\{([^}]+)\}\s*from\s*(['"])(.*?)\2\s*;/g,
  (_, names, q, path) =>
    `const {${names.replace(/\s+as\s+/g, ':')}}=__imports[${JSON.stringify(path)}];`,
);
const c = vm.createContext({
  window: {},
  __imports: imports,
  document,
  location: { search: '' },
  URLSearchParams,
  innerWidth: 1280,
  innerHeight: 720,
  devicePixelRatio: 1,
  localStorage: { getItem: () => null, setItem() {} },
  addEventListener: (name, fn) => events.set(name, fn),
  requestAnimationFrame: (fn) => frames.push(fn),
  setTimeout,
  clearTimeout,
  console,
  performance,
});
vm.runInContext(source, c);
assert.equal(constructors, 0);
assert.equal(frames.length, 1);
frames.shift()(16);
frames.shift()(32);
assert.equal(constructors, 0, 'menu frames do not construct worlds, render assets or workers');
const key = {
  key: 'e',
  code: 'KeyE',
  target: { closest: () => null, matches: () => false },
  preventDefault() {},
};
assert.doesNotThrow(() => events.get('keydown')(key), 'keyboard works before a world exists');
assert.doesNotThrow(() => elements.get('#close').onclick());
assert.equal(typeof elements.get('#begin').onclick, 'function');
assert.equal(typeof elements.get('#continue').onclick, 'function');
console.log(
  '✓ Menu initializes and idles without World/Expedition/RenderAssets/PathService; pre-game input safely handles absent world',
);

allowCreation = true;
async function finishLaunch(p) {
  let done = false;
  p.finally(() => (done = true));
  for (let i = 0; i < 30 && !done; i++) {
    for (const f of frames.splice(0)) if (f.name !== 'loop') f(i * 16);
    await new Promise((r) => setTimeout(r, 1));
  }
  assert.ok(done, 'startup completes');
  await p;
}
const launch = elements.get('#begin').onclick();
await finishLaunch(launch);
assert.equal(constructors, 1, 'new game generates exactly once after clicking');
const resume = elements.get('#continue').onclick();
await finishLaunch(resume);
assert.equal(restores, 1, 'continue restores only after clicking');
assert.equal(constructors, 1, 'continue does not create a throwaway world');
console.log('✓ New game creates one world; Continue restores once without an extra generation');
