# Single graphics manifest

`manifest.json` is the only manifest. Each character or object appears exactly once in
`catalog`, combining the art brief, readiness, PNG paths and technical parameters.

## Readiness and paths

- `spriteReady:false`: PNG is not ready; the engine does not request it.
- `spriteReady:true`: PNG is loadable; this does not mean every planned animation is complete.
- `animations.<clip>.ready`: individual clip readiness. Unfinished clips remain artist tasks.

Cell dimensions, anchor, fps, hashes and row ranges belong directly in the catalog entry.
There is no separate list of completed models or local manifests. Read current readiness
from the manifest rather than keeping a second list in documentation.

- Characters: `characters/<id>/<id>_atlas.png`, eight columns E, SE, S, SW, W, NW, N, NE;
  all clips share one sheet.
- Static objects: `static/<id>/<id>_static.png`, one fixed view, no animation,
  `type:static`, `directions:1`.
- Dynamic objects: `dynamic/<id>/<id>_loop.png`, one column, frames top to bottom,
  no directional set, `type:dynamic`, `directions:0`. One-shot effects use `loop:false`.

IDs are stable ASCII snake_case names. `file` is relative to the sprites root.
Example: `characters/city_guard/city_guard_atlas.png`.

Git does not store empty directories. Exporters create directories when writing PNGs;
placeholder files are unnecessary. Root `.gitignore` rules retain PNGs, this README and
the root manifest. Keep intermediate frames and Blender sources elsewhere.

## Art briefs and export

Each animation has a `description`. `suggestedFrames` and fps are recommendations;
frame counts and dimensions are model-specific. `gameRoles` connects models to roles;
`notes`, `variants` and `group` describe variations. `optional:true` marks future reserves.

Animate in place without root displacement. Death does not loop: its final frame remains
a lootable body. Tools must match separate workstations: a smith strikes an anvil, a fisher
uses a rod and bucket. See `catalog` for the full task list.

Buildings use separate roof, entrance, walls and facade modules. Generation varies sizes
and outlines. Interiors are hidden from outside; UI draws building labels. Do not bake
fire, waving flags or effects into static bases. Town and clan palettes reuse models.
Lore objects must not explicitly reveal the world's technological past.

`frameWidth` and `frameHeight` describe the cropped cell; `frames` counts all atlas rows.
Character PNG width is `frameWidth * 8`, height is `frameHeight * frames`. A ready clip
contains `start` (zero-based first row), `frames`, `fps`, `loop` and `ready:true`, beside
its description. Looping playback uses:

```js
column = ((direction % 8) + 8) % 8;
row = clip.start + (Math.floor(seconds * (clip.fps ?? asset.fps)) % clip.frames);
```

Clamp nonlooping clips to their final frame. Idle uses its own clip, never walking rows.
Do not apply a second direction permutation. Shared cropping covers every pose and view;
anchor is recalculated automatically. Use straight alpha and nearest-neighbor rendering.

Model priority: `character.sprite → roles[role] → races[race]`; values are catalog IDs.
The [Blender exporter](../3d/README.md) creates PNGs and updates the existing catalog entry
with dimensions, hash and clip readiness. `publish:true` also connects game roles.
Missing clips retain `ready:false`. Do not create sidecar JSON files.

## Automatic discovery and loading

Ready models are discovered by role: `player` matches `player`, `banditArcher` matches
`bandit_archer`. Other names use `gameRoles`; races use `gameRaces` or a matching ID.
Explicit `character.sprite` takes priority. A dedicated ready role model replaces the
shared fallback; `roles`/`races` tables remain fallback bindings.

After export, reload the page. The manifest uses `cache:no-store`, PNG validation uses
`cache:no-cache`, and hashes version URLs. Neither a new world nor an engine edit is needed
for each model. Ready `run`, `swim`, `ride`, `stunned`, `draw_weapon`/`sheath` and
`attack_<weapon>` clips are selected automatically.

`water_surface` is `tileable:true`: frames fill a square without transparent margins and
repeat on both axes. Other objects retain transparent borders. Nonlooping effects may
start and end with fully transparent frames.

Repeatable `wood_floor`, `stone_floor`, `cave_floor`, `catacomb_floor`, `lake_bed`,
`sand_tile`, `forest_ground`, `road_tile` and `trail_tile` also use `tileable:true`:
one 64×64 square, no transparent border, 2.1×2.1 m source period, top-down camera.
Neighboring copies of materials, leaves and stones must close both pattern and shadows.

## Modular buildings: contract v1

The same manifest is the sole source of `catalog[].components` and `assembly`.
The 30 `building_*` entries plus `door`, `roof` and `interior_wall` have no fictitious
single `file`. They are static objects; every part is a separate single-view PNG.
`building_smith#roof` references `components.roof` in `building_smith`.
Shared fallbacks `roof#default` and `interior_wall#default` require explicit `asset` references.

The exact example is `building_smith`:

- `static/building_smith/building_smith_floor.png`
- `static/building_smith/building_smith_walls.png`
- `static/building_smith/building_smith_facade.png`
- `static/building_smith/building_smith_roof.png`
- Doors: `static/door/door_closed.png`, `door_open.png`, `door_locked.png`, `door_broken.png`.

The four smithy layers share an uncropped **480×480** transparent canvas. The local ground
rectangle is **[48,160,384,320]** pixels (x,y,w,h). Walls extend upward from this footprint;
the roof occupies the upper canvas margin. PNG anchor is `[0,0]`.
`rect:[-0.125,-0.5,1.25,1.5]` positions the canvas relative to the building's actual ground
rectangle: origin `(b.x*TILE,b.y*TILE)`, size `(b.w*TILE,b.h*TILE)`.
All layers scale together on both axes. Textures must tolerate changing proportions;
sections do not tile automatically.

Different outlines need `assembly.variants`: `rect` for ordinary buildings, `ellipse` for
`arkVault`. Do not stretch a rectangular house into a round hut. Missing variants retain
procedural rendering; collisions and interiors keep the generator's actual outline.

`walls` holds rear/side walls; `facade` holds the front wall, without floor or roof.
`doorCutout:true` cuts an opening in walls/facade at the actual `b.door` tile, so artists
need not predict door placement at different widths. `floor` is visible only inside.
Facade and roof use `visibility:outside` and disappear upon entry; rear walls remain.
Furniture uses the existing interior layer.

`ground` renders before characters. `depth` sorts with characters at the building's south
edge: a character in front covers the facade; one behind is obscured. Transparency is required.

Doors use uncropped **384×384** canvases and anchor `[0,0]`. `origin:door` starts at the
door tile's top-left corner; `rect:[0,-0.5,1,1.5]` uses **tiles**, not building fractions.
The threshold is in the lower third. `states` maps closed/open/locked/broken to separate
PNGs; an open door leaves a transparent passage. Explicit `b.doorState` wins, otherwise
inside selects open and outside selects closed. This rendering contract adds no lock mechanics.

For each completed component, set `spriteReady:true` and actual `frameWidth`, `frameHeight`,
`frames:1`, `directions:1`, anchor and content hash. Never crop or resize one layer alone.
The sizes above are the exact starting template; changing all canvases and `sourceCanvas`
together is allowed. Top-level readiness means all required components of all variants
are exported; the engine checks individual parts, including the chosen door state.
Partial exports are allowed. Until required visible layers decode, the whole building
uses procedural rendering. `required:false` allows optional decoration to be omitted.

Door styles `canvas_*`, `iron_*` and `alloy_*` also provide all four state suffixes. Tents
use fabric, cages and cave entrances use bars, Arctarian dwellings use pressure doors.
References are explicit in `assembly.variants.*.parts[].states`; the engine does not infer
styles from building names. Each door PNG remains 384×384.

## Environment, riding and visibility

`src/render/environment-sprites.js` shares the PNG cache and three-request queue for trees,
alien vegetation, statues, fountains, flags and furniture. Static assets have one column;
dynamic assets have one column with a `loop` clip. Ready environment assets and nearby
characters are prepared before the loading screen closes; new characters are requested
outside the visible area. A ready character PNG still loading does not flash the old
vector sprite; actual load failures retain fallback graphics.

`horse.attachments.saddle` and `player.attachments.seat` hold normalized saddle and pelvis
coordinates. The engine aligns them using anchor and scale rather than a fixed 47-pixel
rider lift. Artists may adjust attachment points after model changes. Riders use `ride`;
horses have their own PNG. Review all eight directions in
`/tools/previews/environment-preview.html`.

Environment culling uses full PNG bounds, including anchor, scale and dimensions. Buildings
use the union of module bounds, including projecting roofs. Crowns and roofs can therefore
appear before their trunk/building center enters the screen. Trees are queried with a
1200-world-pixel margin; nearby building modules prepare in an 1800-pixel margin.
Environment and building textures remain pinned after startup (currently about 121 MiB
decoded) to prevent reloads while walking around town. Character textures use LRU eviction.

Standing dummies use `dummy_static`; camps combine `camp_tent`, `camp_chest`, `firepit`
and `campfire`. Arctarian objects render indoors and outdoors; `ark_filter` and
`ark_resonator` overlay their `_base` objects. Dungeon edges choose `cave_wall` or
`catacomb_wall` from actual tile types, including mixed ruins. Exploration fog renders above.

`src/render/canopy-window.js` reveals the area around the player through vegetation:
130-world-pixel radius, 85-pixel core, 8% center opacity. Only tree/alien-plant pixels are
masked, not ground, characters or the screen. Crown bounds determine overlap, not trunks.
One temporary Canvas is reused for intersecting sprites; other vegetation draws directly.
No artist PNG changes are required.

```sh
node tests/sprite-sheets.mjs
node tests/art-catalog.mjs
node tests/building-sprites.mjs
```
