# Graphics sources

Each object has its own `<id>/<id>.blend` and `build.py` (or earlier object-specific scripts).
Shared geometry and animation logic live in `_shared/`; `_template/` provides an empty studio.
`_shared/render_8_directions.py` locates the 3d root and exports into the adjacent sprites directory.
The only production queue and readiness source is `../sprites/manifest.json`, under `catalog`.
Complete an object and update its entry before moving on. Do not make Git commits.

All models use **128 / 4.2 = 30.476190476 pixels per Blender unit**. More clips are not a
reason to lower density: increase explicit memory/atlas budgets instead. Check alien models
against their catalog art briefs and notes; terrestrial professions and animals follow real anatomy.

## Artist: start here

Your task is modeling, materials and quality animation. The exporter handles sheet assembly,
direction ordering, anchor calculation, PNG optimization and game metadata.

1. Copy `_template/sprite_template.blend` to `<id>/<id>.blend`. The city guard source is a
   finished character/walking example with meshes and keys preserved.
2. Work in scene `SPRITE_TEMPLATE`, collection `ASSET • replace with your character`.
   Preserve the camera and lights in `RENDER_RIG`. Characters face **−Y**, ground is **Z=0**,
   and feet anchor at **(0,0,0)**. All clips stay in place; the engine moves the character.
3. Animate on a shared timeline using armatures, object keys or NLA. Export captures the
   evaluated scene. Action names alone do not choose animations: place actions in timeline
   ranges. `CLIP_*` markers are guides, not automatic clip boundaries.
4. Edit scene custom property **`sprite_export_json`**. See
   `_template/character.export.example.json`. Enter actual frame ranges; omit unfinished
   clips rather than presenting a still pose as a completed attack or work animation.
5. Run `render_8_directions.py` in the Text Editor with Alt+P, or use the command below.
   Export creates the PNG, validates texture budgets and updates the single catalog entry.
6. In `/tools/previews/sprite-preview.html`, inspect **every clip**, all eight directions,
   feet, weapon tips and final death pose. Increase camera coverage and re-export if anything
   clips; never hide a bounds error by cutting off a weapon.

Runtime delivery is **one PNG per model plus its catalog entry**. Keep the `.blend` for later
editing. Do not place intermediate frames or heavy sources in `graphics/sprites`.
Professions can have different clip names, counts and durations.

## Configuration and execution

From the repository root, with `blender` on PATH:

```sh
blender --background graphics/3d/my_character/my_character.blend --python graphics/3d/_shared/render_8_directions.py
```

To override the saved scene configuration:

```sh
blender --background graphics/3d/my_character/my_character.blend --python graphics/3d/_shared/render_8_directions.py -- graphics/3d/my_character/export.json
```

On macOS, the executable is usually `/Applications/Blender.app/Contents/MacOS/Blender`.
Players do not need Blender. Export uses Blender's bundled Python and numpy; Pillow,
ImageMagick and separate packages are unnecessary.

Main JSON fields:

- `asset`: catalog ID, for example `city_guard`; also the folder/PNG identity. No second
  completed-asset ID is needed.
- `outputSize`: square frame size **before** common cropping, usually 128. Keep rendering
  at 256×256 for alpha-aware downsampling. Large/tall creatures may need a larger size and
  camera coverage. Render resolution must divide evenly by outputSize. This is not world size.
- `scale`: game pixels per final texture pixel; current style uses
  `4.2 / 3.25 = 1.2923076923`. Preserve the common source density above regardless of clip count.
- `crop:true`: one shared rectangle across all views and poses, with automatic anchor
  recalculation. Cells may become rectangular, e.g. 80×112. Never crop frames independently.
- `clips`: arbitrary names with `start` (Blender frame), `frames` (sample count), `step`
  (Blender-frame step, default 1), `fps` (game playback speed), and `loop`. Alternatively use
  `samples:[1,3,5.5,...]`. `enabled:false` excludes an unfinished clip.
- Export writes PNG metadata and readiness directly into the root catalog. `publish:true`
  also connects game roles while preserving other entries. Optional `roles:["guard"]` /
  `races:[...]` add bindings; **do not take over another model's roles without agreement**.
- `output`: optional output directory, defaulting to adjacent `graphics/sprites`.
- `maxDecodedBytes`: per-model budget, default 16 MiB. Export stops on overflow: remove
  redundant frames or explicitly raise the budget while preserving density. Defaults are
  8192 px per atlas side and 64 MiB for the uncropped working buffer. Increase `maxAtlasSide`
  and `maxWorkingBytes` explicitly for longer sheets.

Read current clip ranges/FPS from the scene's `sprite_export_json` and the root manifest.
Closing loop keys are not exported twice. The base template contains an empty model scene,
a camera and lights; model dimensions are not fixed for future characters.

## Engine semantics

Standard clips are `idle`, `walk`, `attack`, `death` and `work`. Attack/death default to
nonlooping and stop on the final frame; others loop. Suggested frame counts are idle 2–4,
walk 8–12, attack 4–8, death 6–10 and work 6–10. These are recommendations, not format limits.

Movement, attacks, death and known work states are selected automatically, with procedural
fallbacks if a model is missing. Export configuration can map extra profession states with
`states:{"praying":"pray","craftingGoods":"work"}`. For new actions, game code may supply
`spriteAnimation` / `pose.animation`, a restart token in `spriteAnimationToken` /
`pose.animationToken`, and exact time in `pose.animationSeconds`. New clip names do not
create gameplay events automatically; until connected, they remain available in the viewer.

Corpses retain model and direction. Their death clip plays from death time and holds its
last pose. Legacy saves lacking these fields retain the old body image.
Model priority is `character.sprite → roles[role] → races[race]`.

## Compact export and loading

One atlas contains only selected frames, ordered E, SE, S, SW, W, NW, N, NE. Common transparent
margins are removed and anchors calculated automatically. PNG uses adaptive row filters and
lossless Deflate. Artistic `sprite_postprocess` settings for restrained palettes/edges remain
separately configurable.

The exporter writes dimensions, clips and a SHA-256 version into the manifest. Versioned URLs
prevent stale art after updates. Runtime loads nearby models, decodes up to three PNGs at once,
shares textures and evicts unused character textures under a memory budget. Decoded dimensions
determine working memory; removing empty margins matters more than extra file compression.

`render_8_directions.py` controls Blender; `sprite_pipeline.py` packs the atlas and metadata;
`configure_template.py` refreshes technical settings and embedded scripts while preserving
geometry and keys. After editing external export scripts, refresh embedded copies with
configure_template or Alt+P will still run the old copy. Template/guard generators call this
automatically, but rerunning those generators rebuilds geometry: use the saved `.blend` for art edits.

```sh
node tests/sprite-sheets.mjs
blender --background --python tests/blender-sprite-pipeline.py
```

## Production and validation

`_shared/catalog.py next` selects the first unfinished object. Do not substitute generic hand
motion for profession-specific work: tools and contact must match the clip description.
Consult catalog descriptions for alien anatomy.

New terrestrial characters use `_shared/humanoid.py` and one object-specific `build.py`.
Detailed geometry/materials remain in `.blend`; low resolution applies at export.
Check poses at quarter-frame intervals, and visually review intermediate phases, hand/tool
contact and falling. Geometric results are saved in `clip_pose_validation`.
For skirts/robes, `_shared/validate_cloth.py` checks legs against the evaluated garment surface
and stores `cloth_validation`; use `validate_apron()` for aprons and `validate()` for long garments.
`validate_grips.validate()` checks two-handed tools/marked handles and head clearance.

After review, `_shared/jobs.py:start_render()` renders poses sequentially, checks dimensions,
hashes and cell coverage, then saves the source. Progress and contact sheets from
`_shared/review.py` stay in system temp. Runtime sprites contain only the PNG and shared manifest.
Continue with the next catalog entry; do not commit.

Render settings: Cycles 48 samples, AgX, transparent background, 2× supersampling, restrained
6-bit RGB postprocessing and 8 alpha levels. Typical frame/camera: 128×128 / 4.2; player:
144×144 / 4.725, with identical density. Increase budgets rather than reducing frame size.
Read authoritative sizes and ranges from the manifest/scene, not duplicated readiness lists.

`catalog.py audit` checks PNGs, dimensions, hashes, contiguous clip rows, `.blend` presence and
one runtime file per ready sprite. This validates a file checkpoint, not artistic quality.
Shared-library fixes do not update already-baked `.blend` or PNG files.

## Species and object-specific sources

Mounted models use `_shared/equine.py`; rider and unicorn phases must agree. Build `unicorn`
before its dependent `nomad` / `nomad_archer` compositions. `validate_equine.validate()` checks
cycle seams, ground, leg/body connections and eight-view bounds. For riders,
`validate_mounted.validate()` checks pelvis/saddle, fingers/reins/string contact and weapon
clearance from the mount. Also visually inspect seating and the combined death pose.

Winged servants have shortened leg anatomy and flight-specific poses. `validate_flight.validate()`
checks ground, stable ground anchoring, wing movement in exported frames and support after falling.
Arctarian anatomy, sensory plates and implants live in `_shared/arctarian.py`.
`validate_arctarian.validate()` checks the absence of human eyes, required implants, device grips
and device/body clearance. Object-only logic remains alongside its model, e.g.
`arctarian/arct_workshop.py`, `arct_rescuer/arct_rescue.py` and their validators.

Arctarian palettes reflect location: `arct_miner` and `arctarian` live inside the violet basin
with violet skin and no external respirators. `arct_rescuer` meets humans on the upper ledge:
green skin, transparent breathing mask and pale protective harness. Preserve these distinctions,
based on catalog notes and game `lore-render.js` / `lore-world.js`.

Cloth validation also covers falling. To repair a baked robe, use
`_shared/death_drape.py:repair_saved()`, then fully validate and re-export. It changes only death
cloth keys and root support height; other poses remain intact.

Terrestrial animals share `_shared/animal_studio.py` for studio, materials and density.
Species geometry/movement live in their `build.py`. `_shared/validate_animal.py` checks evaluated
vertices at quarter frames, cycle closure, ground and eight views; species validators also
check paws/hooves, bones and the final pose. Visually inspect intermediate poses before rendering.

`horse/build.py` uses only geometry from `equine.make`, supplying its own three-segment legs,
gaits, reins and folding stirrups. Run `horse/validate_horse.py` instead of the older segment
validator. Reins preserve length/attachments; during death they rest on the ground without
setting carcass height.

`moving_dummy` is a nonliving canvas dummy on a four-wheeled wooden cart. Movement must not
look like human walking; damage lowers its upright, head and right crossbar.
Use `moving_dummy/validate_dummy.py`.

## Environment and buildings

Shared `environment_studio.py`, `render_single_view.py`, `environment_jobs.py` and
`validate_environment.py` support `kind:dynamic/static`. Dynamic assets use one column of clips;
static assets use one frame. Density/postprocessing match characters; export updates the root
catalog. Inspect frames before `environment_jobs.start_render()`.
`catalog.py next --kind dynamic` / `--kind static` selects work; `catalog.py audit` covers all kinds.
A flag's origin is its top attachment to the pole; the pole is a separate sprite.

Tileable `water_surface` is an exception to transparent borders: `tileable:true`, `crop:false`,
a continuous square with top-down camera and material period matching frame width. Directional
lighting preserves tiling. Soft effects use 32 alpha levels; other sources use 8. One-shot
`fairy_field` and `cutter_ripple` end with a transparent frame and `loop:false`.

Buildings follow [contract v1](../sprites/README.md) and `catalog[].assembly`: separate
floor/walls/facade/roof PNGs share a 480×480 canvas and [48,160,384,320] footprint. Individual
cropping is forbidden. Check transparency/openings in assembled outside/inside views.
`building_studio.py` saves sources and updates the existing entry after all parts export;
`building_architecture.py` contains profiles. Each object retains its source and `build.py`.

Single-view static objects use fixed daylight SUN: energy 2, angle 0.12, rotation
15°/−10°/−20°. Effects use studio Key/Fill/Rim; smoke uses daylight.
`environment_studio.begin()` removes previous helper lights/masks and sets the preset explicitly.
`stairs_down` uses invisible floor-level holdout planes in RENDER_RIG to clip outer stairwell
faces, not draw a background.

`door` has closed/open/locked/broken on 384×384 canvases. The stone frame reaches the engine's
cutout edges; the open central passage is transparent. Shared `roof#default` and
`interior_wall#default` are separate 384×384 components used only through explicit assembly
references. No sidecar manifests or previews belong in sprites.

Fortification grid: 0.525 m. `city_wall`: 4.2 m span, 1.05 m masonry thickness, wall walk
Z=3.15 m, crenellations to Z=3.675 m. `city_corner`: L-shaped 2.1×2.1 m, ports (2.1,0.525)
and (0.525,2.1) before root rotation. Gates: 2.1 m clear opening, arch to 2.625 m.
`dock`, `bridge`, `footbridge`: deck top Z=0, supports below, anchor on the walking plane.

Lore landmarks contain static surroundings/objects. Do not bake living NPCs, fire, dust,
fog, water or optical effects. `landmark_blue_fire` keeps a cold base and flame attachment;
the engine tints a separate `campfire` blue. Chapels and other architecture use contract v1 layers.

Effect attachments in source-local 3D coordinates:

| Base                          | Effect                      | X, Y, Z        |
| ----------------------------- | --------------------------- | -------------- |
| flagpole                      | flag, top fabric attachment | 0, 0, 2.40     |
| brazier                       | brazier_fire                | 0, 0, 0.69     |
| hearth                        | hearth_fire                 | 0, 0, 0.15     |
| torch_bracket                 | torch_flame                 | 0, −0.22, 0.30 |
| firepit                       | campfire                    | 0, 0, 0.08     |
| landmark_blue_fire            | campfire, blue tint         | 0, 0, 0.0944   |
| fountain                      | fountain_water              | 0, 0, 0        |
| ark_filter_base               | ark_filter                  | 0, 0, 0        |
| ark_resonator_base            | ark_resonator               | 0, 0, 0        |
| portal_frame / landmark_frame | portal_surface              | 0, 0, 0        |

`audit_environment_sources.py` opens every ready single-view source in background Blender,
checks export hashes, clips, density, camera, packed dependencies and PNG cells without editing
files. Progress goes to system temp. `catalog.py audit` is the quick check without Blender.

`validate_building_sources.py` checks module sources: stationary camera, shared footprint,
geometry in each layer, no top/side clipping, transparent open passage and source/PNG hash
agreement. Standalone cropped environment sources use the separate environment audit.

Module geometry is grouped under `COMPONENT • <part name>`. Doors show closed by default;
other state groups are available in the Outliner. Module validation also checks outward normals
of closed meshes and roof planes. Shared 384×384 roof/interior-wall components preserve the
480×480 template proportions at factor 0.8.
