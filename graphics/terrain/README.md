# Terrain and landscape materials

`3d/` contains Blender sources and the reproducible `build_terrain.py` generator.
`sprites/` contains final PNGs and the single terrain-material manifest.

There are 14 materials, each with two 512×512 RGB variants: grass, dry_grass, forest,
soil, mud, sand, gravel, paving, cave, catacomb, alien, snow, water and boards.
Blender is unnecessary at runtime. No third-party textures or models are used.

## Generation

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
  --python graphics/terrain/3d/build_terrain.py
```

On another OS, substitute your `blender` executable. Append `-- paving catacomb` to generate
selected materials. Cycles is required; tested with Blender 5.2.3 LTS. The generator runs
in a separate background process and does not change the artist's working scene.
Each `.blend` stores variant 0; the same script reproduces variant 1.

Materials use periodic 4D noise on toroidal UV coordinates, small grass/leaf/stone geometry
and beveled paving slabs. The orthographic camera looks straight down over a 4×4 m area.
A 12×12 m plane and 3×3 geometry repetitions beyond the frame prevent lighting seams.
This margin is required: rendering at the plane boundary produces bright tiled stripes.
Lighting direction, gamma and restrained palettes match the character sprites.

## PNG contract

Each `sprites/manifest.json` entry contains two relative `files` and `worldPeriod`, the
repeat period in world pixels regardless of PNG resolution. Most materials use 384;
paving uses 192. Avoid checkerboard contrast between individual stones.

A terrain PNG has no direction, animation, anchor or transparent border: it fills its
entire square. New materials must match at their edges and share detail scale, exposure
and lighting. Review both a 3×3 repeat and the material beside a character.

## Runtime composition

`src/render/terrain-textures.js` chooses materials by logical tile, biome and forest depth,
adds broad coherent patches, and blends neighbors through a noise mask. Both variants
blend in world coordinates independently of chunk boundaries. Masks include a one-pixel
border so interpolation does not produce chunk seams.

`src/render/terrain-worker.js` and `src/render/terrain-chunks.js` prepare terrain in the
background with OffscreenCanvas. Only a local 20×20 material-name grid is sent to the
worker. Results return as ImageBitmap, are copied once into cached canvases, then closed.
A synchronous fallback supports browsers without Worker/OffscreenCanvas; procedural
terrain remains available if PNGs cannot load.

`src/render/render-assets.js` caches 16×16-tile chunks with a 64 MiB limit and three
resolution levels when zoomed out. Visible chunks take priority over offscreen margins.
The first chunk is prepared before the loading screen closes; subsequent chunks are
prepared ahead of the camera. Small static detail is baked into textures; only sparse,
faint water highlights animate each frame. World logic is unaffected.
Decoded textures occupy 28 MiB; the worker has its own references/copies.

Visual preview: `/tools/previews/terrain-preview.html`. In-game preview: `/index.html?start=oak`.
F3 shows terrain render time, cache size and preparation queue.

```sh
node tests/terrain-textures.mjs
node tests/terrain-chunks.mjs
node tests/menu-startup.mjs
```
