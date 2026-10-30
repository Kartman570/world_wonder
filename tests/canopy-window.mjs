import assert from 'node:assert/strict';
import { CanopyWindow, canopyIntersects, CANOPY_OPACITY } from '../src/render/canopy-window.js';
const p = { x: 100, y: 200 },
  near = { left: 50, right: 150, top: 50, bottom: 250 },
  far = { left: 600, right: 800, top: 0, bottom: 300 };
assert.equal(canopyIntersects(near, p), true);
assert.equal(canopyIntersects(far, p), false);
assert.equal(
  canopyIntersects({ left: 90, right: 110, top: -200, bottom: 180 }, p),
  true,
  'crown over the player counts even when the trunk is distant',
);
let allocations = 0,
  draws = 0;
const operations = [],
  stops = [];
const layer = {
  setTransform() {},
  clearRect() {},
  save() {},
  restore() {},
  translate() {},
  createRadialGradient(...args) {
    operations.push(args);
    return {
      addColorStop(...s) {
        stops.push(s);
      },
    };
  },
  fillRect() {
    operations.push(this.globalCompositeOperation);
  },
};
const image = { width: 0, height: 0, getContext: () => layer };
const window = new CanopyWindow(() => {
  allocations++;
  return image;
});
const target = {
  save() {},
  restore() {},
  drawImage() {
    draws++;
  },
};
window.draw(
  target,
  (c) => {
    assert.equal(c, target);
  },
  far,
  p,
);
assert.equal(allocations, 0, 'distant vegetation draws directly');
window.draw(
  target,
  (c) => {
    assert.equal(c, layer);
  },
  near,
  p,
);
assert.equal(allocations, 1);
assert.equal(draws, 1);
assert.equal(operations.at(-1), 'destination-out');
assert.equal(stops[0][1], 'rgba(0,0,0,' + (1 - CANOPY_OPACITY) + ')');
assert.equal(stops[1][1], 'rgba(0,0,0,0)');
window.draw(target, () => {}, near, { x: 120, y: 200 });
assert.equal(allocations, 1, 'scratch canvas reused');
assert.equal(draws, 2);
console.log(
  '✓ Crown intersection, soft circular vegetation-only alpha mask, distant fast path and reused scratch canvas',
);
