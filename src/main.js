import { TerrainTextures } from './render/terrain-textures.js';
import { CanopyWindow } from './render/canopy-window.js';
import { grantDebugGold } from './gameplay/debug-tools.js';
import { setAlienPropSprites } from './render/alien-render.js';
import { EnvironmentSprites, mountedPose } from './render/environment-sprites.js';
import { setFurnitureSprites } from './render/interiors.js';
import { BuildingSprites } from './render/building-sprites.js';
import { faceConversation } from './core/idle-activity.js';
import { renderLocationCatalog, renderJournal } from './ui/exploration-ui.js';
import { SpriteSheets } from './render/sprite-sheets.js';
import { cityMapPoints, drawCityMap } from './render/city-map.js';
import { drawArchitecture, drawAlienPlant } from './render/architectural-details.js';
import { biomeColor } from './world/regional-terrain.js';
import { drawAlienProp, drawRipple } from './render/alien-render.js';
import { stealAlienTool, giveAlienTool } from './gameplay/alien-ecology.js';
import {
  buyHorse,
  stealHorse,
  mountHorse,
  dismountHorse,
  playerHorse,
  horseOwned,
  reclaimHorse,
  drawHorse,
  HORSE_PRICE,
  HORSE_SPEED,
} from './gameplay/horses.js';
import { takeTrainingKit } from './gameplay/sanctuary-stock.js';
import { drawWebs } from './gameplay/wild-hazards.js';
import { RELICS, RELIC_KEYS, OBSERVATIONS } from './gameplay/lore-content.js';
import { beginRelicHunt, relicCatalog, renderHunt } from './gameplay/relic-hunt.js';
import { acceptBreathSuit, toggleBreathSuit, observeSite } from './world/lore-world.js';
import {
  drawLoreActor,
  drawLoreTent,
  drawLoreSite,
  drawRift,
  drawPurpleAir,
} from './render/lore-render.js';
import {
  renderConversation,
  conversationPlan,
  renderQuestChoices,
  detailHelp,
} from './ui/conversation-ui.js';
import { renderDeath } from './gameplay/mortality.js';
import { renderCityGuide } from './gameplay/city-guide.js';
import {
  CHAPTERS,
  startCampaign,
  campaignEvent,
  campaignWizard,
  campaignLesson,
  campaignTarget,
  campaignSupplyOffer,
  campaignTrainingSupplies,
} from './gameplay/campaign.js';
import { renderCampaign } from './ui/campaign-ui.js';
import { renderProjects } from './ui/projects-ui.js';
import {
  standing,
  tradePrice,
  servicePrice,
  beginInnRest,
  clinicHeal,
} from './gameplay/settlement-services.js';
import { hireCompanion, hirePrice } from './gameplay/companions.js';
import { renderPartyPanel } from './ui/party-ui.js';
import { weatherAt, drawWeather } from './gameplay/ecology.js';
import { renderLivingPanel } from './ui/living-ui.js';
import { renderCraftPanel, renderContracts, renderCampPanel } from './ui/adventure-ui.js';
import { drawCrop, drawCamp } from './render/adventure-render.js';
import { USE_EFFECTS } from './gameplay/adventure-content.js';
import { useSupply, equipGear, cancelCraft } from './gameplay/crafts.js';
import { beginRescue } from './gameplay/contracts.js';
import {
  CRIMES,
  cityMemory,
  warrant,
  sentence,
  settleArrest,
  openCell,
  provokeJailer,
  stealPrisonKey,
  recoverPrisonInventory,
  drawPrison,
} from './gameplay/law.js';
import { drawCombatAim } from './render/combat-render.js';
import { lockedTarget } from './gameplay/combat.js';
import { renderLootPanel } from './ui/loot-panel.js';
import { movePlayer, MAX_STAMINA, WALK_SPEED } from './gameplay/player-movement.js';
import { drawCharacter } from './render/character-sprites.js';
import {
  forestShade as deepForestShade,
  drawEdgePressure,
  breathingDanger,
  AIR_GRACE,
} from './render/atmosphere.js';
import { drawAnimal } from './render/animal-sprites.js';
import { Expedition } from './core/expedition.js';
import {
  World,
  TILE,
  W,
  H,
  ITEMS,
  ANIMALS,
  ROLES,
  TRADE,
  FACTIONS,
  questOffers,
  dist,
  rng,
} from './core/simulation.js';
import { resolveInteraction, beginGather, hoveredNpc } from './gameplay/interactions.js';
import { PathService } from './core/path-service.js';
import { roomName, drawInterior, drawDoor, drawFurnishing } from './render/interiors.js';
import { RenderAssets } from './render/render-assets.js';

const terrainTextures = new TerrainTextures();
const rasterSprites = new SpriteSheets({ maxBytes: 256 * 1024 * 1024 });
const environmentSprites = new EnvironmentSprites(rasterSprites);
setFurnitureSprites((c, f) => environmentSprites.prop(c, f, world.elapsed));
setAlienPropSprites((c, f, time) => environmentSprites.prop(c, f, time));
const buildingSprites = new BuildingSprites(rasterSprites);
let canopyWindow = null;
let lastCampaignStage = null;
let canopyShade = 0;
const params = new URLSearchParams(location.search),
  slot = params.get('slot');
const SAVE_KEY =
  (params.has('start') ? 'ashen-road-preview-save' : 'ashen-road-save') +
  (slot ? ':' + slot.slice(0, 48) : '');
let journalCollapsed = false;
try {
  journalCollapsed = localStorage.getItem('ashen-road-journal-collapsed') === 'true';
} catch {}
const $ = (s) => document.querySelector(s),
  canvas = $('#world'),
  ctx = canvas.getContext('2d'),
  mini = $('#minimap'),
  mc = mini.getContext('2d');
let expedition = null,
  world = null,
  camera = { x: 0, y: 0 },
  keys = {},
  started = false,
  paused = false,
  modal = false,
  modalKind = null,
  modalOpener = null,
  openingKey = null,
  last = 0,
  nearest = null,
  hovered = null,
  mouse = { x: 0, y: 0 },
  zoom = 1,
  mapOpen = false,
  frame = 0,
  autosave = 0,
  mapTarget = null,
  mapCache = null;
const color = {
  player: '#c0b68a',
  sanctuary: '#b5a77a',
  oak: '#7a9e8b',
  salt: '#7a9da8',
  north: '#a29cbb',
  red: '#aa6050',
  ash: '#b08d55',
  wild: '#8e9075',
  thorn: '#a48d9f',
};
let assets = null,
  pathService = null,
  debugPerf = false;
const perfSamples = [];
let perfFrame = 0,
  perfSim = 0,
  perfRender = 0,
  groundRenderMs = 0,
  buildingRenderMs = 0,
  actorRenderMs = 0;
document.body.classList.add('main-menu');
let sw = innerWidth,
  sh = innerHeight,
  dpr = Math.min(devicePixelRatio || 1, 2);
function resize() {
  sw = innerWidth;
  sh = innerHeight;
  canvas.width = sw * dpr;
  canvas.height = sh * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  zoom = sw < 700 ? 0.8 : 1;
}
addEventListener('resize', resize);
resize();
function connect() {
  world.onSophos = (message) => {
    close();
    wizard(message);
    save();
  };
  world.onDetention = () => arrestDialog();
  world.onEvent = (text, event) => {
    if (!world.eventObservable(event)) return;
    const div = document.createElement('div');
    div.textContent = text;
    $('#feed').prepend(div);
    while ($('#feed').children.length > 4) $('#feed').lastChild.remove();
    setTimeout(() => div.remove(), 18000);
  };
  world.onAction = (action, target) => {
    if (action?.corpse && target) {
      loot(target);
      save();
    } else toast('Action complete');
  };
  world.onDeath = () => {
    if (world.dungeonSpec) expedition.pendingDeath = true;
    else {
      deathScreen();
      save();
    }
  };
}
function toast(t) {
  $('#toast').textContent = t;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => ($('#toast').textContent = ''), 4000);
}
function save() {
  try {
    const old = localStorage.getItem(SAVE_KEY);
    let oldVersion = 0;
    try {
      oldVersion = JSON.parse(old)?.version || 0;
    } catch {}
    if (old && oldVersion !== 3 && !localStorage.getItem(SAVE_KEY + '-before-lore'))
      localStorage.setItem(SAVE_KEY + '-before-lore', old);
    if (
      old &&
      oldVersion === 2 &&
      !JSON.parse(old).interiorRevision &&
      !localStorage.getItem(SAVE_KEY + '-before-interiors')
    )
      localStorage.setItem(SAVE_KEY + '-before-interiors', old);
    localStorage.setItem(SAVE_KEY, expedition.save());
  } catch {
    toast('Could not save: browser storage is unavailable.');
  }
}
let pendingSave = null;
function scheduleSave() {
  if (pendingSave !== null) return;
  const callback = () => {
    pendingSave = null;
    if (started) save();
  };
  pendingSave =
    typeof requestIdleCallback === 'function'
      ? requestIdleCallback(callback, { timeout: 2000 })
      : setTimeout(callback, 0);
}
let starting = false;
async function start(
  load = false,
  { seed = null, forceCathedral = false, campaign = false, migrate = false } = {},
) {
  if (load && !migrate) {
    try {
      const old = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (old?.version === 2) {
        migrationMenu();
        return;
      }
    } catch {}
  }
  if (starting) return;
  starting = true;
  started = false;
  document.body.classList.add('game-loading');
  const status = document.createElement('div');
  status.id = 'world-loading';
  status.style.cssText =
    'position:fixed;inset:0;background:#14251f;z-index:9999;display:grid;place-items:center;color:#ded0a6;font:22px Georgia';
  status.textContent = load ? 'Loading save…' : 'Creating world…';
  document.body.append(status);
  try {
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
    if (pendingSave !== null) {
      if (typeof cancelIdleCallback === 'function') cancelIdleCallback(pendingSave);
      clearTimeout(pendingSave);
      pendingSave = null;
    }
    pathService?.dispose();
    assets?.dispose();
    keys = {};
    nearest = null;
    mapTarget = null;
    autosave = 0;
    paused = false;
    modal = false;
    mapOpen = false;
    $('#modal').classList.add('hidden');
    $('#feed').replaceChildren();
    $('#pause').textContent = 'Ⅱ';
    if (load) {
      try {
        expedition = Expedition.restore(localStorage.getItem(SAVE_KEY));
        world = expedition.current;
      } catch {
        toast('The save is corrupted. Starting a new world.');
        expedition = new Expedition(new World($('#seed').value));
        world = expedition.current;
      }
    } else {
      expedition = new Expedition(new World(seed || $('#seed').value || '734291'));
      world = expedition.current;
    }
    if (!load && campaign) startCampaign(world);
    lastCampaignStage = null;
    connect();
    assets = new RenderAssets(world, { terrain: terrainTextures });
    pathService = new PathService(world);
    const preview = new URLSearchParams(location.search).get('start');
    const z = world.places.find((z) => z.id === preview && ['oak', 'salt', 'north'].includes(z.id));
    if (z && !load && !forceCathedral && !campaign) {
      world.player.x = z.x * TILE;
      world.player.y = (z.y + 2) * TILE;
    }
    mapCache = null;
    camera = { x: world.player.x, y: world.player.y };
    started = false;
    const loading = status;
    loading.textContent = 'Preparing graphics…';
    try {
      await Promise.all([
        environmentSprites.warm(
          [world.player, ...world.nearby(world.player, 2200)],
          (done, total) => {
            loading.textContent = 'Preparing graphics… ' + done + ' / ' + total;
          },
        ),
        terrainTextures.warm(),
      ]);
      loading.textContent = 'Preparing terrain…';
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
      await assets.prepareGround(
        {
          left: camera.x - sw / zoom / 2 - 500,
          right: camera.x + sw / zoom / 2 + 500,
          top: camera.y - sh / zoom / 2 - 500,
          bottom: camera.y + sh / zoom / 2 + 500,
        },
        zoom,
      );
    } finally {
      loading.remove();
    }
    started = true;
    document.body.classList.remove('main-menu');
    $('#welcome').classList.add('hidden');
    world.log(
      load
        ? 'Journey resumed: ' +
            (world.dungeonSpec?.name || world.placeAt(world.player)?.name || 'wildlands') +
            '.'
        : z && !forceCathedral
          ? 'You arrive in ' +
            z.name +
            '. ' +
            (z.kind === 'village'
              ? 'The elder and local trader will help you settle in.'
              : z.kind === 'town'
                ? 'The mayor receives visitors at the town hall.'
                : 'The king holds court in the castle; shops surround the central square.')
          : 'You arrive in the cathedral courtyard. The library is to the left, training hall to the right, and Sophos in the north hall.',
    );
    save();
    if (!load && campaign) {
      setJournalCollapsed(false);
      campaignPanel();
    }
    if (expedition?.surface?.deathReport && !expedition?.surface?.deathReport.acknowledged)
      deathScreen();
  } catch (error) {
    started = false;
    document.body.classList.add('main-menu');
    $('#welcome').classList.remove('hidden');
    console.error(error);
    toast('Could not open the world: ' + error.message);
  } finally {
    status.remove();
    starting = false;
    document.body.classList.remove('game-loading');
  }
}
$('#begin').onclick = () => start();
$('#continue').onclick = () => start(true);
try {
  if (localStorage.getItem(SAVE_KEY)) $('#continue').classList.remove('hidden');
} catch {}
let conversationPartner = null;
function faceTalker(e, w = world) {
  if (!e) return;
  conversationPartner = { entity: e, world: w };
  faceConversation(w, e);
}
function open(content, kind = 'interaction') {
  if (
    expedition?.surface?.deathReport &&
    !expedition?.surface?.deathReport.acknowledged &&
    kind !== 'death'
  )
    return;
  modalOpener = openingKey || (modal ? modalOpener : kind);
  modalKind = kind;
  modal = true;
  mapOpen = kind === 'map';
  keys = {};
  $('#modal-content').innerHTML = content;
  $('.modal-card').scrollTop = 0;
  $('#modal').classList.remove('hidden');
}
function openWindow(kind, content) {
  if (expedition) campaignEvent(expedition.surface, 'window', { kind });
  open(content, kind);
}
function close() {
  if (expedition?.surface?.deathReport && !expedition?.surface?.deathReport.acknowledged) return;
  if (conversationPartner) {
    faceConversation(conversationPartner.world, conversationPartner.entity);
    conversationPartner = null;
  }
  modal = false;
  modalKind = null;
  modalOpener = null;
  keys = {};
  $('#modal').classList.add('hidden');
  mapOpen = false;
  if (started) save();
}
function toggleWindow(kind, render) {
  if (!started) return;
  if (modal && (modalKind === kind || modalOpener === kind)) {
    close();
    return;
  }
  openingKey = kind;
  try {
    render();
  } finally {
    openingKey = null;
  }
}
$('#close').onclick = close;
// Consume outside clicks before they can activate combat or unrelated HUD actions.
document.addEventListener(
  'click',
  (e) => {
    if (!modal || e.target.closest('.modal-card')) return;
    if (e.target.closest('#inventory,#help,#journal,#menu,#minimap,#interact,#crafting')) return;
    close();
    e.preventDefault();
    e.stopImmediatePropagation();
  },
  true,
);

function button(text, action) {
  const b = document.createElement('button');
  b.textContent = text;
  b.onclick = action;
  return b;
}
const lore = [
  [
    'I am ready to search for an artifact.',
    'The Dawn Shard lies in old ruins to the southwest. Bring it here, to my chambers. The Red Foxes watch the forest. Be careful.',
  ],
  [
    'What is this cathedral?',
    'Seven bells once rang here. Now only one remains. While it rings, neither beast nor bandit crosses this threshold with a weapon.',
  ],
  [
    'Why are you the only one who can cast magic?',
    'I am the last to remember the language of stone. My gift cannot be passed to weapons or people. You must rely on steel and your own legs.',
  ],
  [
    'Tell me about the towns.',
    'Oakmarch in the west, Salt Quay in the east, and Northwatch live by their own labor. Their guards protect the residents.',
  ],
  [
    'Who rules the forests?',
    'The Red Foxes and Ash Hounds. They hate one another almost as much as they hate strangers’ caravans.',
  ],
  [
    'What happens at night?',
    'People go home. Guards remain in the streets, and beasts venture closer to roads. Time passes for everyone here.',
  ],
  [
    'Where do fishers get fish?',
    'From the water. Until a fisher reaches the lake and finishes fishing, there is no fish in their bag. See for yourself.',
  ],
  [
    'What if I die?',
    'After death, another wanderer arrives with a clean reputation. The predecessor’s body remains in the forest until looters find it; belongings held by guards will not be given to a new person.',
  ],
  [
    'Where can I train?',
    'The east wing holds a training hall with stationary and moving dummies. Striking them is safe. Watch your stamina.',
  ],
  [
    'How can I restore health?',
    'Eat rations, meat, or fish from your inventory. Market traders sell provisions.',
  ],
  [
    'What is in the library?',
    'The rules of this world, records of your encounters, and a catalog of discoveries. The shelf by the west wall is always open.',
  ],
  [
    'Do you ever feel lonely?',
    'Sometimes. But silence is rarely empty. You can hear the rain learning to speak to the roof.',
  ],
  ['What do you think of roads?', 'Every road promises a meeting. Not every promise is kind.'],
  [
    'Can merchants be trusted?',
    'Inspect their stock and decide for yourself. They travel between markets, and their bags may interest bandits.',
  ],
  [
    'How do I find the ruins?',
    'Leave through the south gate, then go west and south. Ruins are marked with a diamond on the map. Press M to open the map.',
  ],
  ['I brought the Dawn Shard.', 'Show it to me.'],
];
function deathScreen() {
  open('<div id="death-report"></div>', 'death');
  $('#modal').classList.add('death-screen');
  renderDeath($('#death-report'), expedition.surface, {
    continueLife: () => {
      expedition.surface.deathReport.acknowledged = true;
      $('#modal').classList.remove('death-screen');
      close();
      hud();
      save();
    },
  });
}
function campaignPanel() {
  openWindow('campaign', '<div id="campaign-panel"></div>');
  renderCampaign($('#campaign-panel'), expedition.surface, {
    select: (t) => (mapTarget = t),
    close,
  });
}
function wizard(message = null) {
  faceTalker(
    expedition.surface.entities.find((e) => e.role === 'wizard'),
    expedition.surface,
  );
  const surface = expedition.surface,
    lesson = campaignLesson(surface),
    primary = [],
    topics = [],
    hasRelic = RELIC_KEYS.some(
      (k) => world.player.inventory[k] > 0 && !surface.returnedRelics.includes(k),
    );
  const add = (label, run) => primary.push({ label, run });
  let view;
  if (world.player.inventory.arkCutter > 0)
    add('Hand over the ribbed handle', () => {
      const r = giveAlienTool(surface);
      save();
      wizard(r.message);
    });
  if (hasRelic) add('Hand over discovered relics', () => wizard(returnRelics()));
  if (lesson && ['welcome', 'departure'].includes(lesson.id))
    add('Continue the Story', () => {
      campaignWizard(surface);
      save();
      hud();
      wizard();
    });
  if (!surface.quest && !lesson)
    add('Begin the Relic Search', () => {
      const message = beginRelicHunt(surface);
      save();
      wizard(message);
    });
  topics.push({
    id: 'hunt',
    label: 'Sophos’s Tasks',
    greeting:
      'These things are dangerous, whatever their current owners believe. Do not test their powers.',
    render: (body) => renderHunt(body, surface, { select: (t) => (mapTarget = t), close }),
  });
  const remaining = surface.landmarks.find(
    (l) => l.id !== 'supply' && !surface.returnedRelics.includes(l.item),
  );
  if (remaining && (surface.quest || ['artifact', 'return'].includes(lesson?.id)))
    add('Where should I seek the next relic?', (say) => {
      mapTarget = { ...remaining, name: remaining.name };
      say('Objective marked: ' + remaining.name + '. Open the Map M, to choose your road.');
    });
  if (surface.campaign) add('My Journey · T', campaignPanel);
  topics.push({
    id: 'world',
    label: 'About the World',
    greeting: 'What interests you?',
    render: (body) => {
      for (const [title, indices] of [
        ['The Cathedral and Sophos', [1, 2, 10, 11]],
        ['Towns and People', [3, 4, 6, 13]],
        ['The Road and Survival', [5, 7, 8, 9, 12, 14]],
      ]) {
        const group = document.createElement('details');
        group.className = 'compact-choice';
        const summary = document.createElement('summary');
        summary.textContent = title;
        group.append(summary);
        group.addEventListener('toggle', () => {
          if (group.open)
            for (const other of body.querySelectorAll(':scope > details'))
              if (other !== group) other.open = false;
        });
        const list = document.createElement('div');
        list.className = 'conversation-actions';
        for (const i of indices)
          list.append(
            button(lore[i][0], () => {
              let text = lore[i][1];
              if (i === 3)
                text =
                  surface.cities
                    .map((z) => z.name + ' — ' + (z.layoutName || 'settlement'))
                    .join('; ') + '.';
              if (i === 14)
                text =
                  'Seek ' +
                  surface.places.find((z) => z.id === 'ruins').name +
                  ' on the map (M). Roads depend on the world’s seed.';
              view.say(text);
            }),
          );
        group.append(list);
        body.append(group);
      }
    },
  });
  if (
    lesson &&
    ['welcome', 'orientation', 'library', 'sword', 'moving', 'bow', 'craft', 'departure'].includes(
      lesson.id,
    ) &&
    (lesson.id === 'craft'
      ? !(world.player.inventory.cloth > 0)
      : lesson.id === 'bow'
        ? !(world.player.inventory.bow > 0) || world.player.inventory.arrow < 8
        : !(world.player.inventory.sword > 0))
  )
    topics.push({
      id: 'training',
      label: 'Training Supplies',
      render: (body) => {
        const p = document.createElement('p');
        p.textContent =
          'If you lack materials or equipment for the current lesson, Sophos will share his training supplies.';
        body.append(
          p,
          button('Ask for Missing Supplies', () => {
            view.say(campaignTrainingSupplies(surface).message);
            save();
          }),
        );
      },
    });
  if (!primary.length) add('Talk About the World', () => view.show('world'));
  open('<div id="conversation"></div>');
  view = renderConversation($('#conversation'), {
    eyebrow: 'SOPHOS’S HALL',
    title: 'Wizard Sophos',
    greeting:
      message ||
      (surface.returnedRelics.length >= relicCatalog(surface).length
        ? 'Everything is in place. I shall close the inner door. Return if the people need help.'
        : lesson
          ? lesson.text
          : surface.campaign?.status === 'completed'
            ? 'You brought back the light. Choose your own road now.'
            : 'Things remain in distant places that must not be treated as ordinary loot. Bring them to me intact. I promise none of their power, only payment for the journey.'),
    primary,
    topics,
  });
}

function returnRelics() {
  const active = world.campaign?.status === 'active',
    result = world.depositRelics();
  save();
  hud();
  if (active && world.campaign?.status === 'completed')
    return (
      'You have returned the light, wanderer. The Bell and Dawn campaign is complete. The relic rests on its pedestal; accept ' +
      result.reward +
      ' gold. Choose your own path now: the whole world is open, and everything you earned stays with you.'
    );
  return result.count
    ? result.receipts.join(' ') +
        ' Relics returned: ' +
        result.total +
        '/' +
        relicCatalog(expedition.surface).length +
        '. Accept ' +
        result.reward +
        ' gold.'
    : 'You have no new relics for my chambers yet.';
}

function crafting() {
  openWindow('craft', '<div id="craft-panel"></div>');
  renderCraftPanel($('#craft-panel'), world, {
    changed: () => {
      hud();
      save();
    },
    close,
    notify: toast,
  });
}
function contracts(city = world.inCity(world.player)?.id) {
  openWindow('contracts', '<div id="contract-panel"></div>');
  renderContracts($('#contract-panel'), world, city, {
    changed: () => {
      hud();
      save();
    },
    notify: toast,
    projects: () => projectsPanel(city),
    select: (target) => {
      mapTarget = target;
      toast('Destination set: ' + target.name);
    },
  });
}
function campWindow(camp) {
  open('<div id="camp-panel"></div>');
  renderCampPanel($('#camp-panel'), world, camp, {
    changed: () => {
      hud();
      save();
    },
    close,
    notify: toast,
  });
}
function captiveTalk(e) {
  faceTalker(e);
  open(
    '<div class="eyebrow">CAPTIVE APPRENTICE</div><h1>' +
      e.name +
      '</h1><p>' +
      (e.captive
        ? '“Untie my hands. If I can get out, I will follow you to my town’s warehouse.”'
        : e.rescued
          ? '“Thank you for bringing me home. Ask the quartermaster for your reward.”'
          : '“I will follow you. Stay nearby and lead me to my home warehouse.”') +
      '</p><div id="rescue-actions" class="actions"></div>',
  );
  if (e.captive)
    $('#rescue-actions').append(
      button('Untie the Ropes · 4 seconds', () => {
        const result = beginRescue(world, e);
        toast(result.message);
        if (result.ok) close();
      }),
    );
  else
    $('#rescue-actions').append(
      button('Mark the Home Warehouse', () => {
        mapTarget = { name: 'Home Warehouse · ' + world.factionName(e.rescueCity), ...e.home };
        close();
      }),
    );
}
function inventory() {
  world.normalizeEquipment();
  const p = world.player;
  openWindow(
    'inventory',
    '<div class="eyebrow">WANDERER’S EQUIPMENT</div><h1>Traveling Bag</h1><div class="stats"><span>Health: ' +
      Math.ceil(p.hp) +
      '/100</span><span>Stamina: ' +
      Math.ceil(p.stamina) +
      '/' +
      (p.maxStamina || MAX_STAMINA) +
      '</span><span>Gold: ' +
      (p.inventory.gold || 0) +
      '</span><span>Holding: ' +
      (ITEMS[p.weapon]?.name || 'Unarmed') +
      '</span></div><div class="weapon-slots" id="weapons"></div><div id="items"></div><details class="compact-help"><summary>Configure weapons and equipment</summary><p>Q or the button ↔ on the action bar to switch to the other weapon slot. Ranged combat requires a bow and arrows. The melee slot accepts a sword, axe, or hammer. Unusual ranged devices also use the ranged slot. R — draws / sheathes. Guards warn twice about drawn weapons, then attack if you refuse to sheathe them.</p></details>',
  );
  for (const [mode, label, choices] of [
    ['melee', 'Melee Slot', ['sword', 'axe', 'hammer']],
    ['ranged', 'Ranged Slot', ['bow', 'arkCutter']],
  ]) {
    const box = document.createElement('label');
    box.className = 'weapon-slot' + (p.weaponMode === mode ? ' active' : '');
    const title = document.createElement('span');
    title.textContent = label;
    const select = document.createElement('select');
    select.id = 'slot-' + mode;
    select.setAttribute('aria-label', label);
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = 'Empty Slot';
    select.append(empty);
    for (const key of choices) {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = ITEMS[key].name + (!(p.inventory[key] > 0) ? ' · not in your bag' : '');
      option.disabled = !(p.inventory[key] > 0);
      select.append(option);
    }
    select.value = p.equipment[mode] || '';
    select.onchange = () => {
      const result = world.equip(mode, select.value || null);
      if (!result.ok) toast(result.message);
      inventory();
    };
    box.append(title, select);
    const take = button(p.weaponMode === mode ? 'Holding' : 'Hold', () => {
      if (!p.equipment[mode] || !(p.inventory[p.equipment[mode]] > 0)) {
        toast('The slot is empty or the weapon is not in your bag');
        return;
      }
      p.weaponMode = mode;
      world.normalizeEquipment();
      inventory();
    });
    take.disabled = p.weaponMode === mode;
    box.append(take);
    $('#weapons').append(box);
  }
  itemRows(
    p.inventory,
    $('#items'),
    (k) => {
      if (USE_EFFECTS[k]) {
        const result = useSupply(world, k);
        toast(result.message);
        inventory();
        return;
      }
      if (k === 'breathSuit') {
        const result = toggleBreathSuit(world);
        toast(result.message);
        inventory();
        return;
      }
      if (k === 'torch') {
        world.player.inventory.torch--;
        world.player.torchUntil = world.time + 90;
        toast('Torch lit for 90 game minutes.');
        inventory();
        return;
      }
      if (['ration', 'fish', 'meat', 'herb'].includes(k)) {
        if (p.hp >= 100) {
          toast('Health is already restored.');
          return;
        }
        p.inventory[k]--;
        if (!p.inventory[k]) delete p.inventory[k];
        p.hp = Math.min(100, p.hp + { ration: 35, fish: 20, meat: 25, herb: 40 }[k]);
        inventory();
      }
    },
    (k) =>
      USE_EFFECTS[k] || ['ration', 'fish', 'meat', 'herb', 'torch', 'breathSuit'].includes(k)
        ? k === 'breathSuit'
          ? p.breathSuitWorn
            ? 'Unequip'
            : 'Equip'
          : 'Use'
        : '',
  );
  $('#items').after(button('Open Crafting · C', crafting));
  for (const [slot, label, choices] of [
    ['body', 'Clothing and Armor', ['coat', 'travelCoat', 'armor']],
    ['offhand', 'Shield', ['shield']],
  ]) {
    if (!choices.some((k) => p.inventory[k] > 0)) continue;
    const box = document.createElement('div');
    box.className = 'weapon-slot';
    box.append(document.createTextNode(label));
    for (const key of choices)
      if (p.inventory[key] > 0)
        box.append(
          button((p.gear?.[slot] === key ? '✓ ' : '') + ITEMS[key].name, () => {
            equipGear(world, slot, p.gear?.[slot] === key ? null : key);
            inventory();
          }),
        );
    $('#weapons').append(box);
  }
}
function switchWeapon() {
  if (!started || modal) return;
  const result = world.switchWeapon();
  toast(result.message);
  hud();
}

function itemRows(inv, el, action, label) {
  const entries = Object.entries(inv).filter(([, v]) => v > 0);
  if (!entries.length) el.innerHTML = '<div class="empty">Nothing here.</div>';
  for (const [k, v] of entries) {
    const row = document.createElement('div');
    row.className = 'item-row';
    const span = document.createElement('span');
    span.textContent = (ITEMS[k]?.icon || '◇') + '  ' + (ITEMS[k]?.name || k) + ' × ' + v;
    if (ITEMS[k]?.description) {
      const desc = document.createElement('small');
      desc.className = 'item-description';
      desc.textContent = ITEMS[k].description;
      span.append(desc);
    }
    row.append(span);
    const text = label?.(k);
    if (text) row.append(button(text, () => action(k)));
    el.append(row);
  }
}
function arrestDialog() {
  const d = world.detention;
  if (!d) return;
  faceTalker(world.entityById.get(d.guard));
  const verdict = sentence(world, d.city);
  if (!verdict) return;
  const penniless = (world.player.inventory.gold || 0) < verdict.amount;
  open(
    '<div class="eyebrow">GUARD · ' +
      world.factionName(d.city) +
      '</div><h1>You Are Detained</h1><p>Crime: ' +
      verdict.crime +
      '.</p><p>' +
      (verdict.kind === 'fine'
        ? penniless
          ? '“No money? Get lost. Next time, you go to prison.”'
          : '“A 35-gold fine for disturbing the peace. Pay, and sheathe your weapon.”'
        : '“No fine will settle this. Hand over your weapons and belongings: you are going to prison.”') +
      '</p><div id="arrest-actions" class="actions"></div>',
  );
  $('#arrest-actions').append(
    button(
      verdict.kind === 'fine'
        ? penniless
          ? 'Hear the warning and leave'
          : 'Pay 35 Gold'
        : 'Surrender · go to prison',
      () => {
        const result = settleArrest(world, 'accept');
        close();
        if (!result.ok) toast(result.message);
        camera = { x: world.player.x, y: world.player.y };
        hud();
      },
    ),
    button('I refuse. I will fight to the death', () => {
      settleArrest(world, 'fight');
      close();
    }),
  );
}
function cellDialog(cell) {
  open(
    '<div class="eyebrow">' +
      world.factionName(cell.city) +
      ' · DETENTION SITE</div><h1>Prison Bars</h1><p>Open a cell with the jailer’s key. Lockpicking is not available yet.</p><p>' +
      (world.player.imprisoned
        ? 'Your equipment has been confiscated. A key hidden beforehand stays with you. Without one, provoke the jailer: he will open the door and block the passage. LMB / Space punches; an armed, armored opponent is much stronger.'
        : 'Prisoners remember their aims: murderers riot, thieves flee to bandits, and drunkards wait out the guards.') +
      '</p><div id="cell-actions" class="actions"></div>',
  );
  $('#cell-actions').append(
    button('Unlock with Key', () => {
      const result = openCell(world, cell.id);
      if (result.ok) close();
      else toast(result.message);
    }),
  );
  if (world.player.imprisoned?.cellId === cell.id)
    $('#cell-actions').append(
      button('Provoke the jailer into a fight', () => {
        const result = provokeJailer(world);
        if (result.ok) close();
        else toast(result.message);
      }),
    );
}
function loot(c) {
  open('<div id="loot-panel"></div>');
  renderLootPanel($('#loot-panel'), world, c, {
    onChange: () => {
      hud();
      save();
    },
    onTakeAll: close,
    onButcher: (source) => {
      close();
      world.startAction({ corpse: source.obj.id, remaining: 3 });
    },
  });
}
function trade(e, tab = 'buy', message = '', query = '', scroll = 0) {
  faceTalker(e);
  campaignEvent(world, 'talk', { city: e.faction });
  const rule = TRADE[e.role];
  if (!rule) return townTalk(e);
  open(
    '<div class="commerce"><div class="eyebrow">' +
      ROLES[e.role] +
      ' · ' +
      world.factionName(e.faction) +
      '</div><h1>' +
      e.name +
      '</h1><div class="trade-header"><span>You have ' +
      (world.player.inventory.gold || 0) +
      ' gold</span><span>At the Artisan’s ' +
      (e.inventory.gold || 0) +
      ' gold</span><button id="town-task" class="text-button">Conversation →</button></div><div class="tabs" id="trade-tabs"></div><input id="trade-search" class="panel-search" aria-label="Find Goods" placeholder="Find Goods"><p class="panel-feedback" id="trade-feedback" role="status"></p><div id="trade-items" class="panel-list"></div></div>',
  );
  const feedback = $('#trade-feedback'),
    search = $('#trade-search'),
    list = $('#trade-items');
  feedback.textContent = message;
  search.value = query;
  const paint = () => {
    list.replaceChildren();
    const buy = tab === 'buy',
      inventory = buy ? e.inventory : world.player.inventory,
      keys = buy ? rule.sells : rule.buys;
    const stock = Object.fromEntries(
      Object.entries(inventory).filter(
        ([k, n]) =>
          n > 0 &&
          keys.includes(k) &&
          (ITEMS[k]?.name || k).toLowerCase().includes(search.value.toLowerCase()),
      ),
    );
    if (!Object.keys(stock).length) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = search.value
        ? 'No goods match that name.'
        : buy
          ? 'The trader has nothing to sell yet.'
          : 'Nothing in your bag interests this trader.';
      list.append(empty);
      return;
    }
    itemRows(
      stock,
      list,
      (k) => {
        const result = world.trade(e, k, buy);
        if (!result.ok) feedback.textContent = result.message;
        else {
          hud();
          save();
          trade(
            e,
            tab,
            (buy ? 'Bought: ' : 'Sold: ') + ITEMS[k].name,
            search.value,
            list.scrollTop,
          );
        }
      },
      (k) => (buy ? 'Buy · ' : 'Sell · ') + tradePrice(world, e, k, buy) + ' gold',
    );
  };
  for (const [id, label] of [
    ['buy', 'Buy'],
    ['sell', 'Sell'],
  ]) {
    const b = button(label, () => trade(e, id));
    b.classList.toggle('selected', tab === id);
    b.setAttribute('aria-pressed', String(tab === id));
    $('#trade-tabs').append(b);
  }
  search.oninput = paint;
  $('#town-task').onclick = () => townTalk(e);
  paint();
  list.scrollTop = scroll;
}

const townGreetings = {
  carpenter:
    'I build town improvements with supplies delivered to the quartermaster. I work on site by day and rest at night. Without materials, there will be no new arsenal or infirmary.',
  grainFarmer:
    'I harvest grain and hops from the fields. I carry them to the warehouse for the miller and brewer.',
  miller:
    'First I collect grain from the warehouse, then grind flour and return the sacks. Flour does not appear from thin air.',
  baker:
    'I need flour and honey. I bake bread in the oven, then carry it to the warehouse. Buy it from the innkeeper.',
  brewer:
    'I take grain and hops from the warehouse and brew ale. Each finished jug comes from a real batch.',
  beekeeper:
    'I tend the forest apiary. I collect honey and wax, then carry them to town. The hives need time to fill again.',
  tanner: 'I tan real hides. The leather becomes cloaks and shields.',
  healer:
    'I make salve from herbs and honey. If a wounded guard is nearby, I bring medicine and dress the wound.',
  king: 'My tasks concern the safety of the roads and distant ruins. The crown rewards faithful service generously.',
  herald: 'Hear the latest news! Caravans travel the roads, and there is no plague in town.',
  tailor: 'Real flax becomes cloth on the loom; from cloth and leather I sew traveling cloaks.',
  farmer: 'I gather flax and carry its fiber to the warehouse for the weavers.',
  citizen:
    'I live here and do not trade. Ask the elder or mayor about work; local artisans work in their shops.',
  guard: 'The gates and streets are guarded. Beyond the walls, bandits hunt caravans.',
  archer: 'My arrow reaches an enemy before they reach the gates.',
  fisher:
    'I deliver my catch to the town warehouse. There is no fish in my bag until I finish fishing.',
  forester:
    'First I fell a tree and stack its logs on the ground; in the evening I carry them to the warehouse. Carcasses are the same: they must be butchered.',
  hunter: 'I track game beyond the walls. Foresters help butcher the carcasses.',
  miner:
    'I extract ore at the quarry and carry it to the warehouse. The blacksmith makes weapons from it.',
  mayor: 'The town has work in the forests and on distant roads. Choose a task you can handle.',
  quartermaster:
    'I accept deliveries and store belongings recovered by guards from bodies. Caravan escorts report here too.',
  merchant:
    'A buyer awaits beyond the next gate. Help the guards, but stay nearby until we arrive.',
};
function loreTalk(e, message = null) {
  faceTalker(e);
  let view;
  const primary = [];
  let greeting = '';
  if (e.race === 'arctarian') {
    if (e.inventory.arkCutter > 0)
      primary.push({
        label: 'Snatch the ribbed handle',
        run: () => {
          const r = stealAlienTool(world, e);
          save();
          hud();
          loreTalk(e, r.message);
        },
      });
    greeting =
      e.role === 'arctRescuer'
        ? 'The huge eyeless host kneels to meet your gaze. They point to their chest, then to a sealed shell. You do not recognize the words.'
        : 'The artisan answers with a low, wavering sound. They clear a space and open their palms. You share no words.';
    if (e.role === 'arctRescuer' && !(world.player.inventory.breathSuit > 0))
      primary.push({
        label: 'Accept the offered shell',
        run: () => {
          const gift = acceptBreathSuit(world, e);
          save();
          hud();
          loreTalk(e, gift.message);
        },
      });
    if (world.player.inventory.breathSuit > 0)
      primary.push({
        label: world.player.breathSuitWorn ? 'Open the face shell' : 'Seal the Garment’s Seams',
        run: () => {
          const r = toggleBreathSuit(world);
          save();
          loreTalk(e, r.message);
        },
      });
    primary.push({
      label: 'Point to the thick purple air',
      run: (say) =>
        say(
          'They carefully press the edges of your shell together and point to the stone boundary, then trace the hollow with a finger. You understand the gesture, not the words.',
        ),
    });
  } else if (e.role === 'fairy') {
    greeting =
      'The winged attendant hovers motionless. Her voice rustles like thin fabric; she looks at the riders before looking at you.';
    primary.push(
      {
        label: 'Show Empty Hands',
        run: (say) =>
          say(
            'She lowers her shoulders and returns to the torn strap. She carries neither spear nor sword.',
          ),
      },
      {
        label: 'Point to the Blue Fire',
        run: (say) =>
          say(
            'The winged attendant shakes her head and points away from camp. One rider is already watching.',
          ),
      },
    );
  } else {
    greeting =
      '“The Eye protects us. I will not give it to the man in the tower.” The keeper shields the dark glass. Their fingers whiten around the hammer’s handle.';
    primary.push({
      label: 'Sophos orders you to retrieve a dangerous object',
      run: (say) =>
        say(
          '“Let him come himself. This is all we have left.” He retreats to the wall without lowering his weapon.',
        ),
    });
  }
  open('<div id="conversation"></div>');
  view = renderConversation($('#conversation'), {
    eyebrow: world.factionName(e.faction),
    title: e.name,
    greeting: message || greeting,
    primary,
  });
}
function observation(site) {
  const r = observeSite(world, site);
  if (!r.ok) return toast(r.message);
  open('<div id="observation"></div>');
  const root = $('#observation');
  for (const [tag, text] of [
    ['div', 'WANDERER’S SKETCH'],
    ['h1', site.title],
    ['p', r.message],
  ]) {
    const n = document.createElement(tag);
    n.textContent = text;
    root.append(n);
  }
  save();
}
function observationNotes() {
  const w = expedition.surface;
  open('<div id="observation-notes"></div>');
  const root = $('#observation-notes'),
    h = document.createElement('h1');
  h.textContent = 'Sketches and Traces';
  root.append(h);
  const notes = w.loreState?.notes || [];
  if (!notes.length) {
    const p = document.createElement('p');
    p.textContent = 'No entries yet. Examine unusual places with E.';
    root.append(p);
  }
  for (const id of notes) {
    const site = w.loreSites?.find((s) => s.id === id);
    if (!site) continue;
    const d = document.createElement('details');
    d.className = 'compact-choice';
    const t = document.createElement('summary'),
      p = document.createElement('p');
    t.textContent = site.title;
    p.textContent = site.text;
    d.append(t, p);
    root.append(d);
  }
}
function relicJournal() {
  open(
    '<div class="eyebrow">SOPHOS’S TASKS</div><h1>Things That Need Rest</h1><div id="hunt-panel"></div>',
  );
  renderHunt($('#hunt-panel'), expedition.surface, { select: (t) => (mapTarget = t), close });
}
function trainingStockWindow(message = '') {
  const stock = world.trainingStock,
    generation = world.life?.generation || 1;
  open('<div id="conversation"></div>');
  renderConversation($('#conversation'), {
    eyebrow: 'TRAINING HALL',
    title: 'Training Weapons',
    greeting:
      message ||
      'Each new wanderer may claim a sword, bow, and 32 arrows. Only missing items are supplied, once per lifetime. Stock: ' +
        stock.inventory.sword +
        ' swords, ' +
        stock.inventory.bow +
        ' bows, ' +
        stock.inventory.arrow +
        ' arrows.',
    primary: stock.issued.includes(generation)
      ? []
      : [
          {
            label: 'Receive missing equipment',
            run: () => {
              const result = takeTrainingKit(world);
              save();
              hud();
              trainingStockWindow(result.message);
            },
          },
        ],
  });
}
function stableWindow(groom, message = '') {
  faceTalker(groom);
  open('<div id="conversation"></div>');
  const own = world.entities.filter((e) => e.hp > 0 && horseOwned(world, e));
  const primary = world.entities
    .filter((e) => e.hp > 0 && e.horse?.owner === 'stable' && e.horse.city === groom.faction)
    .map((e) => ({
      label: e.name + ' · ' + HORSE_PRICE + ' gold',
      run: () => {
        const result = buyHorse(world, groom, e.id);
        save();
        hud();
        stableWindow(groom, result.message);
      },
    }));
  const topics = own.length
    ? [
        {
          id: 'horses',
          label: 'My Horses · ' + own.length,
          render: (body) => {
            for (const h of own)
              body.append(
                button('Show Direction · ' + h.name, () => {
                  mapTarget = { name: h.name, x: h.x, y: h.y };
                  close();
                }),
              );
          },
        },
      ]
    : [];
  renderConversation($('#conversation'), {
    eyebrow: 'STABLE · ' + world.factionName(groom.faction),
    title: groom.name,
    greeting:
      message ||
      'A horse costs ' +
        HORSE_PRICE +
        ' gold. It waits outside: E near it, or F — to mount. It moves four times faster than a running person and uses no stamina. You dismount before a fight; the horse waits behind.',
    primary,
    topics,
  });
}
function horseWindow(horse, message = '') {
  faceTalker(horse);
  const primary = [];
  if (horseOwned(world, horse))
    primary.push({
      label: world.player.riding ? 'Dismount · F' : 'Mount · F',
      run: () => {
        const r = world.player.riding ? dismountHorse(world) : mountHorse(world, horse);
        toast(r.message);
        close();
        hud();
      },
    });
  else if (horse.horse.owner === 'stable')
    primary.push({
      label: 'Steal the Horse and Mount',
      run: () => {
        const r = stealHorse(world, horse);
        toast(r.message);
        if (r.ok) {
          close();
          save();
          hud();
        } else horseWindow(horse, r.message);
      },
    });
  else if (['emralaan', 'stray'].includes(horse.horse.owner))
    primary.push({
      label: 'Take the Reins',
      run: () => {
        const r = reclaimHorse(world, horse);
        save();
        horseWindow(horse, r.message);
      },
    });
  open('<div id="conversation"></div>');
  renderConversation($('#conversation'), {
    eyebrow: 'REINS AND SADDLE',
    title: horse.name,
    greeting:
      message ||
      (horse.horse.owner === 'stable'
        ? 'Buy a horse from the groom, or steal it. If local residents witness the theft, the town issues a warrant.'
        : horse.horse.owner === 'emralaan'
          ? 'A nomad is leading the horse. Drive off or defeat the thief to take the reins.'
          : 'Health: ' +
            Math.ceil(horse.hp) +
            '/' +
            horse.maxHp +
            '. It waits here. It does not fight; if attacked, it flees and stays where it calms down.'),
    primary,
  });
}
function rideAction() {
  const mount = playerHorse(world);
  if (mount) {
    toast(dismountHorse(world).message);
    hud();
    save();
    return;
  }
  const horse = world
    .nearby(world.player, 145)
    .filter((e) => e.horse && horseOwned(world, e))
    .sort((a, b) => dist(a, world.player) - dist(b, world.player))[0];
  toast(
    horse ? mountHorse(world, horse).message : 'Approach your horse. Buy one from a town groom.',
  );
  hud();
  save();
}
function townTalk(e, message = null) {
  faceTalker(e);
  if (e.role === 'groom') return stableWindow(e, message);
  if (e.role === 'horse') return horseWindow(e, message);
  if (e.loreActor) return loreTalk(e, message);
  campaignEvent(world, 'talk', { city: e.faction });
  if (e.role === 'captive') return captiveTalk(e);
  if (world.detention?.guard === e.id) return arrestDialog();
  const offers = e.role === 'king' ? world.royalOffers(e) : questOffers(e),
    lesson = campaignSupplyOffer(world, e.faction);
  if (e.role === 'quartermaster' && lesson) offers.unshift(lesson);
  const plan = conversationPlan(world, e, offers),
    full = townGreetings[e.role] || TRADE[e.role]?.text || 'Everyone here has their own work.',
    primary = [],
    topics = [],
    add = (label, run) => primary.push({ label, run });
  let view;
  const rerender = (text) => {
    save();
    hud();
    townTalk(e, text);
  };
  if (plan.ready.length)
    add('Turn In Quests · ' + plan.ready.length, () => rerender(world.completeQuests(e)));
  if (TRADE[e.role] && !e.noTrade) add('Browse Goods', () => trade(e));
  if (e.role === 'quartermaster') {
    add('Orders and Expeditions', () => contracts(e.faction));
    add('Town Projects', () => projectsPanel(e.faction));
  }
  if (e.role === 'cook')
    add('Lodging and Food · ' + servicePrice(world, e, 'rest') + ' gold', (say) => {
      const r = beginInnRest(world, e);
      if (r.ok) {
        close();
        save();
      } else say(r.message);
    });
  if (['healer', 'herbalist'].includes(e.role) && world.player.hp < world.player.maxHp)
    add('Treatment · ' + servicePrice(world, e, 'heal') + ' gold', (say) => {
      const r = clinicHeal(world, e);
      if (r.ok) rerender(r.message);
      else say(r.message);
    });
  if (e.role === 'hunter')
    add(
      (e.companion?.active ? 'Renew Contract' : 'Hire a Companion') +
        ' · ' +
        hirePrice(world, e) +
        ' gold / day',
      (say) => {
        const r = hireCompanion(world, e);
        if (r.ok) rerender(r.message);
        else say(r.message);
      },
    );
  if (e.role === 'herald') add('Latest News', (say) => say(world.heraldNews(e.faction).join(' ')));
  add('Where can I find a person or place?', () => cityGuideDialog(e));
  if (plan.hasQuests && e.role !== 'quartermaster')
    add(e.role === 'king' ? 'Royal Quests' : 'Is there work?', () => view.show('quests'));
  if (plan.hasQuests && e.role !== 'quartermaster')
    topics.push({
      id: 'quests',
      label: 'Quests' + (plan.available.length ? ' · ' + plan.available.length : ''),
      render: (body) =>
        renderQuestChoices(body, world, plan, {
          accept: (q) => {
            const text = world.acceptQuest(q),
              target = world.places.find((z) => z.id === (q.place || q.destination));
            if (target) mapTarget = { name: target.name, x: target.x * TILE, y: target.y * TILE };
            townTalk(e, text);
            save();
          },
          select: () => journal(),
        }),
    });
  topics.push({
    id: 'local',
    label: 'About the Town',
    greeting: 'What would you like to know about town?',
    render: (body, say) => {
      detailHelp(body, 'About Your Work', full);
      const m = cityMemory(world, e.faction),
        r = warrant(world, e.faction);
      detailHelp(
        body,
        'My Reputation',
        standing(world, e.faction).title +
          ' · ' +
          m.reputation +
          '. ' +
          (r ? 'Wanted: ' + r.name + '.' : 'No warrant.'),
      );
      detailHelp(
        body,
        'How Settlements Work',
        'Only a large city has a king and castle. An ordinary town has a town hall; a village has one trader. Locals can tell you how to find someone.',
      );
      if ((e.jailer || e.keyHolder) && e.inventory['jailKey_' + e.faction] > 0) {
        const d = detailHelp(
          body,
          'Risky Actions',
          'The key theft will be noticed if you approach openly.',
        );
        d.append(
          button('Try to steal the key', () => {
            say(stealPrisonKey(world, e).message || 'The key is hidden in your bag.');
            save();
          }),
        );
      }
      const stock = world.storages[e.faction];
      if (
        ['quartermaster', 'guard', 'archer'].includes(e.role) &&
        stock &&
        Object.values(stock).some((n) => n > 0)
      )
        body.append(
          button('Recover items from storage', () => {
            world.loot(world.player, { inventory: stock });
            world.storages[e.faction] = {};
            rerender('Items handed over.');
          }),
        );
    },
  });
  open('<div id="conversation"></div>');
  view = renderConversation($('#conversation'), {
    eyebrow: (ROLES[e.role] || 'RESIDENT') + ' · ' + world.factionName(e.faction),
    title: e.name,
    greeting: message || full.match(/^[^.!?]+[.!?]?/)[0],
    primary,
    topics,
  });
}
function cityGuideDialog(e) {
  open(
    '<div class="eyebrow">' +
      world.factionName(e.faction) +
      '</div><h1>How Do I Get There?</h1><button class="text-button" id="guide-back">← Back to Conversation</button><div id="city-guide"></div>',
  );
  $('#guide-back').onclick = () => townTalk(e);
  renderCityGuide($('#city-guide'), world, e);
}

function library(tab = 'guide') {
  openWindow(
    'library',
    '<div class="eyebrow">CATHEDRAL LIBRARY · CHRONICLES 0.32 · ALPHA 14</div><h1>Wanderer’s Book</h1><div class="tabs" id="lib-tabs"></div><div class="codex" id="codex"></div>',
  );
  [
    ['guide', 'How to Play'],
    ['bestiary', 'Bestiary'],
    ['finds', 'Discoveries'],
    ['world', 'Living World'],
  ].forEach(([id, t]) => $('#lib-tabs').append(button(t, () => library(id))));
  const data = {
    guide:
      '<h3>Crafting, Camps, and Orders</h3><p>C opens crafting and skills. Basic recipes can be made by hand; others need a hearth, forge, warehouse, loom, or herbal workshop. Crafting takes real time; X cancels work and returns materials. Finished items grant experience and unlock advanced recipes. Equip clothing and shields in your inventory (I).</p><p>Pitch a camp from a camp bundle outside settlements: use the button in the crafting panel (C). Press E at a camp to open its chest, rest, add fuel or pack up; press C beside a lit campfire to cook. Bandits can loot the chest. Press B or E at a town board to find orders based on warehouse supplies, crafting commissions, camp inspections, and prisoner rescues. Turn contracts in to the quartermaster; rewards come from the treasury. Free the apprentice and physically escort them home; a dead captive does not respawn.</p><h3>Town Memory and Prisons</h3><p>Two warnings for a drawn weapon lead to a warrant lasting one game hour. Sheathe it: a guard will approach and offer a fine or prison. The first offense costs 35 gold; if penniless, you are released. Repeat offenses and murder lead to a cell. Find crime history and reputation in the journal (J). Town guards stay within the boundary; road patrols can intervene along the road.</p><p>Steal a key beforehand from a calm jailer: approach from behind with your weapon sheathed and press E to speak. Inside a cell, press E at the bars to use a key or provoke the guard. When provoked, the door opens only after the guard approaches; he blocks the doorway. Without equipment, LMB / Space punches. Losing returns you to a locked cell. Recover your belongings from the chest after escaping; the town hunts fugitives for a week.</p><h3>Doors and the Living World</h3><p>Enter smithies, inns, shops, warehouses, castles, and homes directly from the street through the south door. The roof disappears only once you enter; neighbors behind walls stay hidden. Merchants work indoors. Residents and workers truly return home at night.</p><h3>The Cathedral and Returning Relics</h3><p>You begin in the courtyard. The west wing is the library, with shelves of instructions, creatures, discoveries, and chronicles. The east wing holds stationary and moving training dummies. Sophos’s hall is to the north. Return his relics: they will fill the empty pedestals.</p><h3>Dungeons</h3><p>The ▾ symbol on the map (M) marks a dungeon entrance: by the road, deep in the woods, or underwater. Approach and press E. Branching tunnels, caches, and enemies lie below; exploration reveals the map. Return to the stairs and press E. Your belongings stay in the same dungeon after death; enemies do not respawn. Life continues on the surface.</p><h3>A Real Journey</h3><p>The region spans 1280 × 960 tiles. Towns are far apart; stock up on food and arrows. Open the map (M) to choose a destination. The guide shows direction, distance, and walking time in a straight line.</p><p>R — draw / sheathe; LMB aims a strike or selects a bow target; Space attacks (a bow fires at the locked target); RMB clears the lock; WASD / arrow keys move; Shift — runs; LMB / Space attacks; Q — switches weapon slots; E — interacts; I — opens the bag; J — opens the journal; M — opens the map; H — opens the library; P — pauses; press a window’s key again or click outside to close it; Esc — closes any window. Take All Nearby collects loot and closes the window. Use the mouse wheel over the world to zoom. F3 — shows frame rate and processing time. Esc or ☰ opens the menu for saving, world regeneration and debug mode. Debug mode enables fast travel on the map. The − button collapses the quest panel; Q and ↔ switch weapons between the two inventory slots.</p><p>Swimming is slower than walking. Rivers carry you downstream; lakes have no current. Forest grows denser and movement slower farther from roads. Bridges cross rivers without swimming.</p><p>With an axe equipped, press E beside a tree to chop it for 6 seconds. Press E beside herbs or ore to gather. Butcher an animal carcass before taking its loot. Moving too far from the target interrupts work. Death opens a lifetime summary. A new person then arrives at the cathedral without belongings or the former reputation. The predecessor’s body can be found in the world, but guards will not release its property.</p>',
    bestiary:
      '<h3>Animals and Enemies</h3><p>' +
      Object.entries(ANIMALS)
        .map(
          ([key, a]) =>
            a.name +
            ' · ' +
            a.hp +
            ' health · ' +
            (a.aggressive ? 'dangerous' : 'avoids people') +
            (world.discovery.includes(key) ? ' · studied' : ''),
        )
        .join('<br>') +
      '</p><p>Bandits, raiders, brutes, and archers attack caravans. Archers have limited arrows; walls block shots. Town and caravan guards also use bows.</p>',
    finds:
      '<h3>In the Traveling Bag</h3><p>' +
      Object.keys(world.player.inventory)
        .filter((k) => world.player.inventory[k] > 0)
        .map((k) => (ITEMS[k]?.icon || '◇') + ' ' + (ITEMS[k]?.name || k))
        .join('<br>') +
      '</p><p>Three relics lie in the ruins, barrow, and shrine. Sophos accepts each separately.</p>',
    world:
      '<h3>Professions and Roads</h3><p>Fishers catch fish and carry it to the warehouse. Foresters fell real trees, leaving stumps and stacking logs on site. From 18:00 they load the logs and carry them to town; hunters kill animals, butcher carcasses, and deliver meat and hides. Miners extract ore. Blacksmiths consume ore and wood; innkeepers cook meat and fish.</p><p>Ordinary residents do not trade. Blacksmiths do not buy fish; fishers do not buy swords. Caravans carry goods, exchange them with town warehouses, and travel on with guards. Either side may perish in a raid. The dead do not respawn.</p><p>Night lasts from 20:00 to 06:00. Townsfolk return home; guards remain. One hour lasts roughly 92 seconds. All windows pause the simulation. A new world replaces the current autosave; old saves carry belongings into a new region.</p>',
  };
  $('#codex').innerHTML = data[tab];
}
function projectsPanel(city = world.inCity(world.player)?.id) {
  openWindow('projects', '<div id="projects-panel"></div>');
  renderProjects($('#projects-panel'), world, city, {
    notify: toast,
    changed: () => {
      hud();
      save();
    },
    refresh: () => projectsPanel(city),
  });
}
function partyPanel() {
  openWindow('party', '<div id="party-panel"></div>');
  renderPartyPanel($('#party-panel'), expedition.surface, {
    notify: toast,
    changed: () => {
      hud();
      save();
    },
    refresh: partyPanel,
    surfacePresent: !world.dungeonSpec,
  });
}
function livingPanel() {
  openWindow('living', '<div id="living-panel"></div>');
  renderLivingPanel($('#living-panel'), expedition.surface);
}
function journal() {
  openWindow('journal', '<div id="journal-content"></div>');
  renderJournal($('#journal-content'), world, {
    relics: relicCatalog(expedition.surface).length,
    returned: world.returnedRelics.length,
    openRelics: relicJournal,
    openNotes: observationNotes,
    openCampaign: expedition.surface.campaign ? campaignPanel : null,
    cityMemory,
    warrant,
    roleName: (role) => ROLES[role],
    formatTime,
  });
}

function map() {
  if (world.dungeonSpec) return dungeonMap();
  mapOpen = true;
  openWindow(
    'map',
    '<div class="eyebrow">CARTOGRAPHY · SEED ' +
      String(world.seed).replace(/[<>&"']/g, '') +
      (world.debugMode ? ' · DEBUG' : '') +
      '</div><h1>' +
      (world.regionName || 'The Greater Southern Lands') +
      '</h1><div class="atlas-workspace"><canvas id="bigmap" width="800" height="600" style="width:100%;border:1px solid #c5ae7830"></canvas><div id="destinations"></div></div><div id="debug-travel"></div><p id="map-info">Select a place or map point for your bearings.' +
      (world.debugMode
        ? ' In debug-mode, the button below teleports you instantly.'
        : ' Fast travel is disabled.') +
      '</p>',
  );
  const currentCity = world.inCity(world.player);
  if (currentCity) {
    const tabs = document.createElement('div');
    tabs.className = 'tabs';
    const region = button('World Map', () => map());
    region.classList.add('selected');
    region.setAttribute('aria-pressed', 'true');
    const town = button('Town Map · ' + currentCity.name, () => cityPlan(currentCity));
    tabs.append(region, town);
    $('.atlas-workspace').before(tabs);
  }
  const canvas = $('#bigmap');
  const refresh = () => {
    renderMap(canvas.getContext('2d'), 800, 600, true);
    $('#debug-travel').replaceChildren();
    if (world.debugMode) {
      const b = button('DEBUG · Travel' + (mapTarget ? ' → ' + mapTarget.name : ''), () => {
        const result = world.debugTravel(mapTarget);
        if (!result.ok) {
          toast(result.message);
          return;
        }
        camera.x = world.player.x;
        camera.y = world.player.y;
        nearest = null;
        close();
        findNearest();
        hud();
        toast('Fast travel complete');
      });
      b.className = 'debug-travel';
      b.disabled = !mapTarget;
      $('#debug-travel').append(b);
    }
  };
  const select = (target) => {
    mapTarget = target;
    $('#map-info').textContent = 'Target: ' + target.name + ' · ' + travelText(target) + '.';
    refresh();
  };
  renderLocationCatalog($('#destinations'), world, {
    travel: travelText,
    plan: (city) => (city === 'sanctuary' ? sanctuaryPlan() : cityPlan(city)),
    select: (item) => {
      if (item.resource) {
        const r = world.resources
          .filter((r) => r.kind === item.resource && r.amount > 0 && !world.blocked(r.x, r.y, true))
          .sort((a, b) => dist(a, world.player) - dist(b, world.player))[0];
        if (r) select({ name: ITEMS[item.resource].name, x: r.x, y: r.y });
        else toast('No accessible resources remain');
      } else select(item.target);
    },
  });
  canvas.onclick = (e) => {
    const r = canvas.getBoundingClientRect(),
      scale = Math.min(r.width / canvas.width, r.height / canvas.height),
      ox = (r.width - canvas.width * scale) / 2,
      oy = (r.height - canvas.height * scale) / 2,
      x = (e.clientX - r.left - ox) / scale,
      y = (e.clientY - r.top - oy) / scale;
    if (x < 0 || y < 0 || x > canvas.width || y > canvas.height) return;
    const tx = Math.min(W - 2, Math.max(1, Math.floor((x / canvas.width) * W))),
      ty = Math.min(H - 2, Math.max(1, Math.floor((y / canvas.height) * H)));
    select({ name: 'Point ' + tx + ', ' + ty, x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE });
  };
  if (mapTarget) select(mapTarget);
  else refresh();
}

function travelText(p) {
  const d = dist(world.player, p);
  const seconds = Math.ceil(d / (world.player.riding ? HORSE_SPEED : WALK_SPEED));
  return (
    Math.round(d / TILE) +
    ' tiles · at least ' +
    Math.floor(seconds / 60) +
    ':' +
    String(seconds % 60).padStart(2, '0') +
    (world.player.riding ? ' mounted' : ' on foot')
  );
}
function activateLayer() {
  pathService?.dispose();
  assets?.dispose();
  world = expedition.current;
  connect();
  assets = new RenderAssets(world, { terrain: terrainTextures });
  pathService = new PathService(world);
  camera = { x: world.player.x, y: world.player.y };
  keys = {};
  nearest = null;
  mapTarget = null;
  mapCache = null;
  world.rebuildSpatial();
  world.update(0);
  hud();
  save();
}
function enterDungeon(id, debug = false) {
  const result = expedition.enter(id, { debug });
  if (!result.ok) {
    toast(result.message);
    return;
  }
  close();
  activateLayer();
  toast('Dungeon: ' + world.dungeonSpec.name);
}
function interact() {
  if (!started || modal) return;
  if ((world.player.stunUntil || 0) > world.elapsed) {
    toast('You are stunned.');
    return;
  }
  findNearest();
  if (!nearest) return;
  const n = nearest;
  if (n.kind === 'trainingStock') {
    trainingStockWindow();
    return;
  }
  if (n.kind === 'horse') {
    horseWindow(n.obj);
    return;
  }
  if (n.kind === 'alienSite') {
    open('<h1>' + n.obj.name + '</h1><p>' + n.obj.text + '</p>');
    return;
  }
  if (n.kind === 'loreSite') {
    observation(n.obj);
    return;
  }
  if (n.kind === 'camp') {
    campWindow(n.obj);
    return;
  }
  if (n.kind === 'contractBoard') {
    contracts(n.obj.city);
    return;
  }
  if (n.kind === 'arrest') {
    arrestDialog();
    return;
  }
  if (n.kind === 'cell') {
    cellDialog(n.obj);
    return;
  }
  if (n.kind === 'prisonChest') {
    toast(recoverPrisonInventory(world, n.obj.city).message);
    hud();
    save();
    return;
  }
  if (n.kind === 'dungeonEntrance') {
    enterDungeon(n.obj.id);
    return;
  } else if (n.kind === 'dungeonExit') {
    expedition.leave();
    activateLayer();
    return;
  } else if (n.kind === 'libraryShelf') {
    campaignEvent(world, 'shelf');
    library(n.obj.tab);
  } else if (n.kind === 'pedestal')
    open(
      '<div class="eyebrow">WIZARD’S HALL</div><h1>' +
        n.obj.name +
        '</h1><p>' +
        (world.relicVault[n.obj.item]
          ? 'The relic has been returned to Sophos and rests on this pedestal.'
          : 'The pedestal is empty. Find the relic and bring it to Sophos.') +
        '</p>',
    );
  else if (n.kind === 'library') library();
  else if (n.kind === 'landmark') loot(n.obj);
  else if (n.kind === 'tree') {
    if (!world.player.inventory.axe) {
      toast('You need an axe to chop trees');
      return;
    }
    world.startAction({
      type: 'tree',
      id: n.obj.id,
      remaining: world.player.inventory.tools > 0 ? 4.8 : 6,
    });
    toast('Chopping a Tree · 6 seconds');
  } else if (n.kind === 'resource') {
    if (beginGather(world, n)) toast('Gathering: ' + ITEMS[n.obj.kind].name);
  } else if (n.kind === 'corpse' || n.kind === 'woodPile') loot(n.obj);
  else {
    const e = n.obj;
    if (e.role === 'wizard') wizard();
    else if (e.role === 'dummy') toast('LMB / Space strikes; Q — switch weapons');
    else if (['red', 'ash', 'thorn'].includes(e.faction))
      toast('The bandit draws a weapon. There will be no conversation.');
    else if (TRADE[e.role] && !e.noTrade) trade(e);
    else townTalk(e);
  }
}

$('#begin-campaign').onclick = () => {
  try {
    const old = localStorage.getItem(SAVE_KEY);
    if (old) localStorage.setItem(SAVE_KEY + '-before-regeneration', old);
  } catch {
    toast('Could not save a backup. Launch canceled.');
    return;
  }
  start(false, { campaign: true, forceCathedral: true });
};
$('#crafting').onclick = () => toggleWindow('craft', crafting);
mini.onclick = () => toggleWindow('map', map);
$('#attack').onclick = () => {
  if (started && !paused && !modal) playerAttack();
};
$('#draw-weapon').onclick = () => {
  if (started && !paused && !modal) {
    const result = world.toggleWeapon();
    toast(result.message);
    hud();
  }
};
$('#interact').onclick = () => toggleWindow('interaction', interact);
$('#weapon-switch').onclick = switchWeapon;
$('#menu').onclick = () => toggleWindow('menu', gameMenu);
$('#quest-toggle').onclick = () => setJournalCollapsed(!journalCollapsed);
$('#inventory').onclick = () => toggleWindow('inventory', inventory);
$('#help').onclick = () => toggleWindow('library', () => library());
$('#journal').onclick = () => toggleWindow('journal', journal);
$('#pause').onclick = () => {
  paused = !paused;
  $('#pause').textContent = paused ? '▶' : 'Ⅱ';
};
function setJournalCollapsed(value) {
  journalCollapsed = !!value;
  $('.quest-panel').classList.toggle('collapsed', journalCollapsed);
  $('#quest-toggle').textContent = journalCollapsed ? '+' : '−';
  $('#quest-toggle').setAttribute('aria-expanded', String(!journalCollapsed));
  $('#quest-toggle').setAttribute('aria-label', journalCollapsed ? 'Show Quests' : 'Hide quests');
  try {
    localStorage.setItem('ashen-road-journal-collapsed', String(journalCollapsed));
  } catch {}
}
function gameMenu() {
  if (!started) return;
  openWindow('menu', '<div id="conversation"></div>');
  const primary = [
    {
      label: 'Resume Journey',
      run: () => {
        paused = false;
        $('#pause').textContent = 'Ⅱ';
        close();
      },
    },
    {
      label: 'Save',
      run: (say) => {
        save();
        say('Journey saved.');
      },
    },
  ];
  if (expedition.surface.campaign?.status === 'active')
    primary.push({ label: 'Current Chapter · T', run: campaignPanel });
  renderConversation($('#conversation'), {
    eyebrow: 'ASHEN ROAD · 0.32',
    title: 'Journey Menu',
    greeting: 'The world is paused.',
    primary,
    topics: [
      {
        id: 'panels',
        label: 'Sections',
        render: (body) => {
          const list = document.createElement('div');
          list.className = 'conversation-actions';
          for (const [label, fn] of [
            ['Map · M', map],
            ['Journal · J', journal],
            ['Crafting · C', crafting],
            ['Notice Board · B', () => contracts()],
            ['Region Pulse · N', livingPanel],
            ['Companions · V', partyPanel],
            ['Town Projects · O', () => projectsPanel()],
            ['Campaign Story · T', campaignPanel],
          ])
            list.append(button(label, fn));
          body.append(list);
        },
      },
      {
        id: 'new',
        label: 'New Game',
        render: (body) => {
          const p = document.createElement('p');
          p.textContent =
            'The new world replaces your current journey. A backup will be made before starting.';
          body.append(
            p,
            button('World with Tutorial Campaign', () => regenerationMenu(true)),
            button('Free World Without Tutorial', () => regenerationMenu(false)),
          );
        },
      },
      {
        id: 'settings',
        label: 'Settings',
        render: (body) => {
          body.innerHTML =
            '<div class="menu-settings"><label><input id="journal-setting" type="checkbox" ' +
            (journalCollapsed ? 'checked' : '') +
            '> Collapse the on-screen quests</label><label><input id="debug-setting" type="checkbox" ' +
            (world.debugMode ? 'checked' : '') +
            '> Debug-mode <small>Fast travel on the map and instant timed actions.</small></label></div>';
          const gold = button('Add 1,000,000 Gold', () => {
            const r = grantDebugGold(world);
            toast(r.message);
            if (r.ok) {
              save();
              hud();
            }
          });
          gold.disabled = !world.debugMode;
          $('#debug-setting').closest('.menu-settings').append(gold);
          $('#debug-setting').onchange = (e) => {
            world.debugMode = e.target.checked;
            gold.disabled = !world.debugMode;
            save();
            hud();
          };
          $('#journal-setting').onchange = (e) => setJournalCollapsed(e.target.checked);
        },
      },
    ],
  });
}

function migrationMenu() {
  open(
    '<div class="eyebrow">NEW REGION</div><h1>Journey from an Earlier Version</h1><p>The geography has changed: the map is four times larger. You can carry your wanderer’s belongings, name, and crafting skills into the new region. Quests, towns, and the old world’s state will start afresh. A full snapshot of the previous world will remain in a separate browser backup.</p><div id="migration-actions" class="actions"></div>',
  );
  $('#migration-actions').append(
    button('Back Up and Transfer Wanderer', () => {
      try {
        localStorage.setItem(SAVE_KEY + '-before-lore', localStorage.getItem(SAVE_KEY));
      } catch {
        toast('Could not make a backup. Transfer canceled.');
        return;
      }
      start(true, { migrate: true });
    }),
    button('Cancel · keep the save', close),
  );
}
function newSeed() {
  return String(crypto.getRandomValues(new Uint32Array(1))[0]);
}
function regenerationMenu(campaign = false) {
  openWindow(
    'menu',
    '<div class="eyebrow">NEW JOURNEY</div><h1>' +
      (campaign ? 'Start Tutorial Campaign' : 'Regenerate World Without Tutorial') +
      '</h1><p>' +
      (campaign
        ? 'A fresh world with the Bell and Dawn story: from cathedral lessons to the return of an artifact. '
        : 'Free play without tutorial quests. ') +
      'Regenerating resets inventory, quests, time, gathered resources, NPC and caravan state. You begin in the cathedral courtyard. The latest state is kept in a separate backup.</p><label class="seed-control">New World Seed<input id="regenerate-seed" maxlength="32"></label><div class="actions"><button class="action" id="random-seed">Another Seed</button><button class="action danger" id="regenerate-confirm">' +
      (campaign ? 'Start Campaign in a Fresh World' : 'Regenerate and Start Over') +
      '</button><button class="action" id="regenerate-cancel">Cancel</button></div>',
  );
  $('#regenerate-seed').value = newSeed();
  $('#random-seed').onclick = () => ($('#regenerate-seed').value = newSeed());
  $('#regenerate-cancel').onclick = gameMenu;
  $('#regenerate-confirm').onclick = () => {
    const seed = $('#regenerate-seed').value.trim() || newSeed();
    try {
      localStorage.setItem(SAVE_KEY + '-before-regeneration', expedition.save());
    } catch {
      toast('Could not save a backup. Reset canceled.');
      return;
    }
    $('#regenerate-confirm').disabled = true;
    $('#regenerate-confirm').textContent = 'Creating world…';
    requestAnimationFrame(() =>
      setTimeout(() => {
        start(false, { seed, forceCathedral: true, campaign });
        toast((campaign ? 'Tutorial campaign started' : 'Free world created') + ' · seed ' + seed);
      }, 0),
    );
  };
}
setJournalCollapsed(journalCollapsed);
function inputKey(e) {
  return (
    {
      KeyF: 'f',
      KeyT: 't',
      KeyO: 'o',
      KeyN: 'n',
      KeyV: 'v',
      KeyR: 'r',
      KeyC: 'c',
      KeyB: 'b',
      KeyX: 'x',
      KeyW: 'w',
      KeyA: 'a',
      KeyS: 's',
      KeyD: 'd',
      KeyE: 'e',
      KeyI: 'i',
      KeyH: 'h',
      KeyJ: 'j',
      KeyM: 'm',
      KeyP: 'p',
      KeyQ: 'q',
    }[e.code] || e.key.toLowerCase()
  );
}
addEventListener('keydown', (e) => {
  const k = inputKey(e);
  if (expedition?.surface?.deathReport && !expedition?.surface?.deathReport.acknowledged) {
    if (!e.target.closest('#death-report')) e.preventDefault();
    return;
  }
  if (k === 'escape') {
    e.preventDefault();
    if (!started || e.repeat) return;
    if (modal) close();
    else gameMenu();
    return;
  }
  if (
    e.target.matches(
      'input:not([type=checkbox]):not([type=button]),textarea,[contenteditable=true]',
    )
  )
    return;
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
  if (!started || e.repeat) return;
  const windows = {
    t: ['campaign', campaignPanel],
    o: ['projects', () => projectsPanel()],
    v: ['party', partyPanel],
    n: ['living', livingPanel],
    c: ['craft', crafting],
    b: ['contracts', () => contracts()],
    i: ['inventory', inventory],
    h: ['library', () => library()],
    j: ['journal', journal],
    m: ['map', map],
    e: ['interaction', interact],
  };
  if (windows[k]) {
    e.preventDefault();
    toggleWindow(...windows[k]);
    return;
  }
  if (modal) return;
  keys[k] = true;
  if (k === '-' || k === '=') zoom = Math.max(0.25, Math.min(1.5, zoom * (k === '-' ? 0.8 : 1.25)));
  if (k === 'f3') {
    e.preventDefault();
    debugPerf = !debugPerf;
    $('#performance').classList.toggle('hidden', !debugPerf);
  }
  if (k === 'f') rideAction();
  if (k === 'r') {
    $('#draw-weapon').click();
  }
  if (k === 'q') switchWeapon();
  if (k === 'x' && cancelCraft(world)) toast('Work canceled. Materials returned.');
  if (k === 'p') $('#pause').click();
  if (k === ' ' && !paused) playerAttack();
});
addEventListener('keyup', (e) => (keys[inputKey(e)] = false));
addEventListener('blur', () => {
  keys = {};
  if (started) save();
});
canvas.addEventListener('pointermove', (e) => {
  mouse = { x: e.clientX, y: e.clientY, active: true };
});
canvas.addEventListener('pointerdown', (e) => {
  if (!started || paused || modal) return;
  mouse = { x: e.clientX, y: e.clientY, active: true };
  if (e.button === 2) {
    world.player.lockedTargetId = null;
    return;
  }
  if (e.button !== 0) return;
  if (!world.player.weaponDrawn) return;
  world.aimPlayer(mouseWorld(), { lock: true });
  keys.mouseAttack = true;
  playerAttack();
});
canvas.addEventListener('click', (e) => {
  if (!started || paused || modal || world.player.weaponDrawn || e.button !== 0) return;
  mouse = { x: e.clientX, y: e.clientY, active: true };
  const target = hoveredNpc(world, mouseWorld(), zoom);
  if (
    target &&
    !ANIMALS[target.role] &&
    !['dummy', 'bandit', 'banditArcher', 'brute', 'raider', 'nomad', 'nomadArcher'].includes(
      target.role,
    ) &&
    world.canInteract(world.player, target, 155)
  ) {
    if (target.role === 'wizard') wizard();
    else if (TRADE[target.role] && !target.noTrade) trade(target);
    else townTalk(target);
  } else if (target) toast('Move closer to speak.');
});
addEventListener('pointerup', () => (keys.mouseAttack = false));
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
addEventListener('beforeunload', () => {
  if (started) save();
});
function mouseWorld() {
  return { x: (mouse.x - sw / 2) / zoom + camera.x, y: (mouse.y - sh / 2) / zoom + camera.y };
}
function playerAttack(notify = true) {
  const result = world.attackPlayer();
  if (notify && result?.message) toast(result.message);
  return result;
}
function formatTime(t) {
  const m = Math.floor(t % 1440);
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}
function stateName(s) {
  return (
    {
      helpingAlly: 'Running to Help an Ally',
      guardingRelic: 'Guarding the Camp',
      frontierPatrol: 'Patrolling the Territory',
      fairyFlight: 'Flying from Danger',
      horseWaiting: 'Waiting',
      horseFleeing: 'Fleeing Danger',
      stolenHorse: 'Led Away by a Nomad',
      stealingHorse: 'Taking the Reins',
      leadingStolenHorse: 'Leading the Horse Away',
      ridden: 'Mounted',
      riding: 'Mounted Patrol',
      offeringShell: 'Helping Travelers',
      quietWork: 'Doing Delicate Work',
      tendingRider: 'Tending the Rider',
      byBlueFire: 'By the Blue Fire',
      watchingRelic: 'Guarding the Shrine',
      fetchingSupplies: 'Fetching Warehouse Materials',
      waitingForHarvest: 'Waiting for the Harvest',
      craftingGoods: 'Working in the Workshop',
      waitingForSupplies: 'Waiting for Materials',
      tendingBees: 'Tending the Bees',
      harvestingGrain: 'Harvesting Crops',
      treating: 'Treating the Wounded',
      captive: 'Captive',
      following: 'Following the Rescuer',
      waitingForRescuer: 'Waiting for Rescue',
      rescued: 'Returned Home',
      apprentice: 'Helping in Town',
      approachingCell: 'Approaching the Cell Door',
      imprisoned: 'Imprisoned',
      arresting: 'Arresting a Criminal',
      coveringArrest: 'Covering an Arrest',
      pursuing: 'Pursuing a Criminal',
      prisonGuard: 'Guarding the Prison',
      blockingCell: 'Blocking the Cell Door',
      waitingForRiot: 'Waiting Out the Riot',
      escapingToBandits: 'Fleeing to Bandits',
      drinking: 'Drinking in the Tavern',
      drunkWandering: 'Drunken Stroll',
      arrestingDrunk: 'Detaining a Drunkard',
      avoidingDrunk: 'Avoiding a Drunkard',
      announcing: 'Announcing News',
      hauling: 'Hauling Logs',
      collectingLogs: 'Collecting Logs',
      loadingLogs: 'Loading Logs',
      defending: 'Waiting for Guards · combat',
      logging: 'Chopping a Tree',
      butchering: 'Butchering a Carcass',
      toWork: 'Going to Work',
      toCarcass: 'Approaching Prey',
      delivering: 'Delivering to Warehouse',
      delivered: 'Unloading',
      mining: 'Mining Ore',
      gathering: 'Gathering Herbs',
      working: 'Working',
      errands: 'Running Errands',
      escorting: 'Guarding the Caravan',
      returning: 'Returning',
      ambush: 'Ambushing',
      loading: 'Loading the Wagon',
      idle: 'Resting',
      stunned: 'Stunned',
      retreating: 'Retreating',
      windingUp: 'Winding Up',
      combat: 'Fighting',
      sleep: 'At Home',
      fishing: 'Fishing',
      toFish: 'Going Fishing',
      hunting: 'Hunting',
      trading: 'Hauling Goods',
      patrol: 'Patrolling',
      loot: 'Taking Loot',
      roam: 'Roaming',
      flee: 'Fleeing',
    }[s] || s
  );
}
function findHovered() {
  const tip = $('#npc-tooltip');
  hovered =
    mouse.active && !modal
      ? hoveredNpc(
          world,
          { x: (mouse.x - sw / 2) / zoom + camera.x, y: (mouse.y - sh / 2) / zoom + camera.y },
          zoom,
        )
      : null;
  tip.classList.toggle('hidden', !hovered);
  if (!hovered) return;
  tip.querySelector('strong').textContent = hovered.name;
  tip.querySelector('span').textContent =
    (ROLES[hovered.role] || ANIMALS[hovered.role]?.name || hovered.role) +
    ' · ' +
    world.factionName(hovered.faction) +
    ' · ' +
    stateName(hovered.state);
  tip.style.left = Math.min(sw - 280, Math.max(10, mouse.x + 17)) + 'px';
  tip.style.top = Math.max(75, Math.min(sh - 150, mouse.y - 70)) + 'px';
}
canvas.addEventListener('pointerleave', () => {
  mouse.active = false;
  $('#npc-tooltip').classList.add('hidden');
});
function findNearest() {
  nearest = resolveInteraction(world);
  $('#prompt').style.display = nearest && !modal ? 'block' : 'none';
  if (nearest) {
    $('#prompt').replaceChildren();
    const key = document.createElement('b');
    key.textContent = 'E';
    $('#prompt').append(key, document.createTextNode(' ' + nearest.label));
  }
}

function hud() {
  if (!started || !world) return;
  world.normalizeEquipment();
  const p = world.player,
    t = world.terrain(p);
  const ownsHorse = world.entities.some((e) => e.hp > 0 && horseOwned(world, e));
  $('#horse-control').classList.toggle('hidden', !ownsHorse && !p.riding);
  $('#horse-control span').textContent = p.riding ? 'Dismount' : 'Mount';
  $('.portrait span').textContent = String(expedition.surface.life?.generation || 1).padStart(
    2,
    '0',
  );
  $('.player-name').firstChild.textContent = p.name.toUpperCase() + ' ';
  $('#attack').querySelector('span').textContent = ['bow', 'arkCutter'].includes(p.weapon)
    ? 'Shot'
    : 'Attack';
  $('#attack').title = 'LMB / Space · attack';
  $('#draw-weapon').querySelector('span').textContent = p.weapon
    ? p.weaponDrawn
      ? 'Sheathe Weapon'
      : 'Draw weapon'
    : p.weaponDrawn
      ? 'Lower Fists'
      : 'Raise Fists';
  $('#draw-weapon').setAttribute('aria-pressed', String(!!p.weaponDrawn));
  $('#hp').textContent = Math.ceil(p.hp) + ' / 100';
  $('#hpbar').style.transform = 'scaleX(' + p.hp / 100 + ')';
  $('#stbar').parentElement.title =
    'Stamina: ' + Math.ceil(p.stamina) + ' / ' + (p.maxStamina || MAX_STAMINA);
  $('#stbar').style.transform = 'scaleX(' + p.stamina / (p.maxStamina || MAX_STAMINA) + ')';
  $('#coins').textContent = (p.inventory.gold || 0) + ' gold';
  const swap = $('#weapon-switch');
  swap.querySelector('b').textContent = p.weaponMode === 'ranged' ? '➶' : '⚔';
  swap.querySelector('span').textContent = p.weaponMode === 'ranged' ? 'Ranged' : 'Melee';
  swap.title = 'Q · ' + (ITEMS[p.weapon]?.name || 'Empty Slot') + ' · switch weapons';
  swap.setAttribute(
    'aria-label',
    'Switch Weapon: ' + (p.weaponMode === 'ranged' ? 'ranged' : 'melee') + ' combat',
  );
  $('#debug-badge').classList.toggle('hidden', !world.debugMode);
  $('#time').textContent = (world.night ? '☾ ' : '☀ ') + formatTime(world.time);
  $('#day').textContent =
    'DAY ' + (1 + Math.floor(world.time / 1440)) + ' · ' + weatherAt(expedition.surface).name;
  const zone = world.placeAt(p);
  const interior = world.interiorAt(p);
  $('#zone').textContent = interior
    ? roomName(interior)
    : world.dungeonSpec?.name || zone?.name || 'Wildlands';
  $('#zone-sub').textContent = world.dungeonSpec
    ? (world.templateName || 'Dungeon').toUpperCase() +
      ' · ' +
      world.rooms.length +
      ' CELLS · M MAP'
    : interior
      ? 'INSIDE · ' +
        (interior.type === 'dungeonGate'
          ? 'ANCIENT STRUCTURE'
          : (interior.type === 'arkVault' ? 'NEW ARCTARIA' : world.factionName(interior.city)) ||
            'CATHEDRAL')
      : zone?.id === 'cathedral'
        ? 'SANCTUARY · SOUTHERN LANDS'
        : zone?.faction
          ? ['emralaan', 'arktaria', 'fairies', 'chapel'].includes(zone.faction)
            ? {
                emralaan: 'NOMAD CAMP',
                arktaria: 'LANDS OF THE QUIET BASIN',
                fairies: 'LANDS OF THE WINGED',
                chapel: 'OLD ABBEY',
              }[zone.faction] +
              ' · ' +
              t.name.toUpperCase()
            : ['red', 'ash', 'thorn'].includes(zone.faction)
              ? 'HOSTILE TERRITORY'
              : 'TOWN · ' + t.name.toUpperCase()
          : t.name.toUpperCase() + ' · SPEED ' + Math.round(t.speed * 100) + '%';
  $('#status').textContent = p.imprisoned
    ? 'Imprisoned · E by the bars'
    : world.detention
      ? 'The Guards Are Detaining You · E'
      : p.wanted
        ? 'WANTED · ' + warrant(world, p.wanted)?.name
        : (p.stunUntil || 0) > world.elapsed
          ? 'STUNNED'
          : p.weaponWarnings
            ? 'Guards: Sheathe Your Weapon · ' + p.weaponWarnings.count + '/2'
            : paused
              ? 'Game paused'
              : p.action
                ? 'Work: ' + Math.ceil(p.action.remaining) + ' sec. · X cancel'
                : (p.weaponDrawn
                    ? p.weapon === 'arkCutter'
                      ? 'Ribbed Handle · '
                      : p.weapon === 'bow'
                        ? 'Bow · ' + (p.inventory.arrow || 0) + ' arrows · '
                        : (ITEMS[p.weapon]?.name || 'Fists') + ' · '
                    : 'Weapon Sheathed · ') +
                  t.name +
                  ' · ' +
                  (world.night ? 'night' : 'day');
  if (p.riding) $('#status').textContent = 'Mounted · F dismount · ' + t.name;
  if (breathingDanger(world))
    $('#status').textContent =
      'NO AIR TO BREATHE · ' +
      Math.max(0, Math.ceil(AIR_GRACE - (world.loreState?.exposure || 0))) +
      ' sec. until suffocation';
  const poison = (p.poison || []).filter((s) => s.until > world.elapsed);
  if (poison.length)
    $('#status').textContent +=
      ' · POISON ' + Math.ceil(Math.max(...poison.map((s) => s.until)) - world.elapsed) + ' sec.';
  const q = world.quests.find((q) => q.status === 'active');
  $('#quest-title').textContent = q
    ? q.title
    : world.quest
      ? 'Sophos’s Tasks'
      : 'Where the Journey Begins';
  $('#quest-desc').textContent = q
    ? world.questText(q)
    : world.quest
      ? 'Find dangerous objects and return them to the cathedral. Details are in the journal J.'
      : 'Speak to Sophos, or travel to town to find work.';
  $('#quest-step').textContent = q
    ? 'Journal J · ' + world.factionName(q.city)
    : 'Relics: ' + world.returnedRelics.length + '/' + relicCatalog(expedition.surface).length;
  const c = expedition.surface.campaign,
    lesson = campaignLesson(expedition.surface);
  if (lesson) {
    $('#quest-title').textContent = 'Campaign · ' + lesson.title;
    $('#quest-desc').textContent = lesson.task;
    $('#quest-step').textContent =
      'Chapter ' + (c.stage + 1) + '/' + CHAPTERS.length + ' · T — story and hints';
  }
  const campaignKey = c ? c.status + ':' + c.stage : null;
  if (campaignKey !== lastCampaignStage) {
    lastCampaignStage = campaignKey;
    if (lesson) {
      const target = campaignTarget(expedition.surface);
      if (target) mapTarget = target;
    } else if (c?.status === 'completed') {
      mapTarget = null;
      toast('Campaign complete. Free play continues.');
    }
  }
  const journey = $('#journey');
  journey.style.display = mapTarget ? 'block' : 'none';
  if (mapTarget) {
    const a = Math.atan2(mapTarget.y - p.y, mapTarget.x - p.x),
      arrow = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'][(Math.round(a / (Math.PI / 4)) + 8) % 8];
    journey.innerHTML =
      '<b>' +
      arrow +
      '</b><span>' +
      mapTarget.name +
      '<small>' +
      travelText(mapTarget) +
      '</small></span>';
  }
}

// Renderer: layered ground, projected scenery, eight directional procedural sprite poses.
function ellipse(x, y, rx, ry, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}
function poly(points, fill, stroke) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}
function building(b) {
  const cutaway = world.interiorAt(world.player)?.id === b.id;
  if (buildingSprites.draw(ctx, b, cutaway, 'ground')) {
    if (cutaway) {
      for (const f of b.furniture || []) drawFurnishing(ctx, f);
      if (b.prison) drawPrison(ctx, world, b);
      if (b.type === 'wizardHall') drawRelicPedestals();
      if (b.type === 'dungeonGate') {
        const d = world.dungeonEntrances.find((d) => d.buildingId === b.id);
        if (d) drawPortal(d, false);
      }
    }
    return;
  }
  if (drawLoreTent(ctx, b, world)) return;
  if (b.type === 'cage') {
    drawPrison(ctx, world, b);
    return;
  }
  const inside = world.interiorAt(world.player);
  if (b.enterable && inside?.id === b.id && b.type !== 'cathedral') {
    drawInterior(ctx, b, world.night);
    if (b.prison) drawPrison(ctx, world, b);
    if (b.type === 'dungeonGate') {
      const d = world.dungeonEntrances.find((d) => d.buildingId === b.id);
      if (d) drawPortal(d, false);
    }
    if (b.type === 'wizardHall') drawRelicPedestals();
    if (b.type === 'library')
      for (const shelf of world.libraryShelves)
        label(shelf.name, shelf.x, shelf.y - 52, '#d8c497', 9);
    return;
  }
  if (b.type === 'cathedral' && inside?.id !== b.id) {
    closedCathedral(b);
  } else buildingExterior(b);
  if (b.enterable && inside?.id !== b.id) {
    drawDoor(ctx, b);
    if (dist(world.player, b.entrance) < 210)
      label(
        roomName(b) + ' · entrance',
        (b.x + b.w / 2) * TILE,
        (b.y + b.h - 1.8) * TILE,
        '#d7c699',
        10,
      );
  }
}
function closedCathedral(b) {
  const x = b.x * TILE,
    y = b.y * TILE,
    w = b.w * TILE,
    h = b.h * TILE;
  ctx.fillStyle = '#64756a';
  ctx.fillRect(x, y, w, h);
  poly(
    [
      [x - 12, y + 20],
      [x + w / 2, y - 110],
      [x + w + 12, y + 20],
      [x + w / 2, y + 115],
    ],
    '#5b7569',
  );
  poly(
    [
      [x + w / 2, y - 110],
      [x + w + 12, y + 20],
      [x + w / 2, y + 115],
    ],
    '#405c52',
  );
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = '#344e43';
    ctx.fillRect(x + 55 + i * 110, y + h - 120, 30, 65);
  }
  for (const side of [0, 1]) {
    const xx = x + side * (w - 75);
    ctx.fillStyle = '#8d9681';
    ctx.fillRect(xx, y + h - 150, 75, 150);
    poly(
      [
        [xx - 8, y + h - 150],
        [xx + 37, y + h - 245],
        [xx + 83, y + h - 150],
      ],
      '#5f7766',
    );
  }
  label('CATHEDRAL OF THE LAST LIGHT', x + w / 2, y + h / 2, '#dbcca8', 12);
}
function buildingExterior(b) {
  if (
    b.type === 'statue' &&
    environmentSprites.draw(ctx, 'statue', (b.x + b.w / 2) * TILE, (b.y + b.h) * TILE, {
      width: Math.max(75, b.w * TILE),
    })
  )
    return;
  if (b.type === 'cityFlag') {
    const fx = b.x * TILE + 12,
      fy = b.y * TILE + 20;
    if (environmentSprites.draw(ctx, 'flagpole', fx, fy, { scale: 1.5 })) {
      environmentSprites.draw(ctx, 'flag', fx, fy - 100, { scale: 1.5, time: world.elapsed });
      return;
    }
  }
  const x = b.x * TILE,
    y = b.y * TILE,
    w = b.w * TILE,
    h = b.h * TILE;
  if (b.type === 'cityFlag') {
    ctx.strokeStyle = '#b8a37d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 20);
    ctx.lineTo(x + 12, y - 76);
    ctx.stroke();
    poly(
      [
        [x + 14, y - 73],
        [x + 65, y - 67],
        [x + 60, y - 30],
        [x + 14, y - 37],
      ],
      b.style?.flag || '#a89860',
    );
    ctx.strokeStyle = '#eadbb6';
    ctx.lineWidth = 2;
    if (b.style?.mark === 'tower') {
      ctx.strokeRect(x + 30, y - 59, 12, 14);
      for (let j = 0; j < 3; j++) ctx.fillRect(x + 28 + j * 6, y - 64, 4, 7);
    } else if (b.style?.mark === 'moon') {
      ellipse(x + 36, y - 53, 9, 10, '#eadbb6');
      ellipse(x + 41, y - 57, 8, 9, b.style.flag);
    } else if (b.style?.mark === 'leaf') {
      poly(
        [
          [x + 36, y - 66],
          [x + 45, y - 53],
          [x + 36, y - 40],
          [x + 28, y - 52],
        ],
        '#eadbb6',
      );
      ctx.beginPath();
      ctx.moveTo(x + 36, y - 63);
      ctx.lineTo(x + 36, y - 39);
      ctx.stroke();
    } else if (b.style?.mark === 'stag') {
      ctx.beginPath();
      ctx.moveTo(x + 36, y - 40);
      ctx.lineTo(x + 36, y - 55);
      for (const side of [-1, 1]) {
        ctx.moveTo(x + 36, y - 53);
        ctx.lineTo(x + 36 + side * 10, y - 59);
        ctx.lineTo(x + 36 + side * 12, y - 67);
        ctx.moveTo(x + 36 + side * 7, y - 57);
        ctx.lineTo(x + 36 + side * 5, y - 65);
      }
      ctx.stroke();
    } else if (b.style?.mark === 'sun') ellipse(x + 36, y - 52, 6, 6, '#eadbb6');
    else if (b.style?.mark === 'star')
      poly(
        [
          [x + 36, y - 63],
          [x + 40, y - 54],
          [x + 49, y - 53],
          [x + 41, y - 47],
          [x + 43, y - 38],
          [x + 35, y - 43],
          [x + 28, y - 38],
          [x + 29, y - 47],
          [x + 22, y - 53],
          [x + 31, y - 54],
        ],
        '#eadbb6',
      );
    return;
  }
  if (b.type === 'statue') {
    ellipse(x + 26, y + 28, 38, 18, '#12261b66');
    ctx.fillStyle = b.style?.wall || '#b5b29c';
    ctx.fillRect(x - 5, y - 14, 62, 40);
    ctx.fillStyle = '#d1c9ac';
    ctx.fillRect(x - 10, y - 20, 72, 10);
    ctx.fillRect(x - 8, y + 22, 68, 10);
    ctx.strokeStyle = '#a3aa99';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(x + 14, y - 20);
    ctx.lineTo(x + 17, y - 62);
    ctx.lineTo(x + 37, y - 71);
    ctx.moveTo(x + 37, y - 71);
    ctx.lineTo(x + 41, y - 20);
    ctx.stroke();
    poly(
      [
        [x + 12, y - 67],
        [x + 42, y - 67],
        [x + 45, y - 35],
        [x + 9, y - 35],
      ],
      '#b9bdab',
    );
    ellipse(x + 27, y - 81, 12, 14, '#c7c9b4');
    ctx.strokeStyle = '#c2c9b8';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x + 43, y - 61);
    ctx.lineTo(x + 65, y - 98);
    ctx.lineTo(x + 65, y - 139);
    ctx.stroke();
    return;
  }
  if (b.type === 'dungeonGate') {
    ctx.fillStyle = b.ruined ? '#666c5e' : '#93917c';
    ctx.fillRect(x, y, w, h);
    for (const side of [0, 1]) {
      const xx = x + side * (w - 32);
      ctx.fillStyle = '#b0ad91';
      ctx.fillRect(xx, y - 25, 32, h + 25);
      for (let yy = y; yy < y + h; yy += 36) {
        ctx.strokeStyle = '#515e50';
        ctx.strokeRect(xx, yy, 32, 36);
      }
    }
    poly(
      [
        [x - 15, y + 25],
        [x + w / 2, y - 100],
        [x + w + 15, y + 25],
      ],
      '#7c8270',
    );
    if (b.ruined) {
      poly(
        [
          [x + w * 0.45, y - 65],
          [x + w * 0.72, y - 24],
          [x + w * 0.67, y + h * 0.6],
          [x + w * 0.4, y + h * 0.4],
        ],
        '#354d3e',
      );
      ctx.fillStyle = '#a39a7d';
      ctx.fillRect(x + w * 0.65, y + h - 36, 45, 20);
    }
    label(b.ruined ? 'TEMPLE RUINS' : 'STONE CRYPT', x + w / 2, y + h * 0.48, '#e6d6b0', 13);
    return;
  }
  if (b.type === 'bench') {
    ctx.fillStyle = '#364239';
    ctx.fillRect(x + 5, y + 19, w - 10, 18);
    ctx.fillStyle = '#a08b64';
    ctx.fillRect(x, y + 4, w, 15);
    ctx.fillStyle = '#c1ab7c';
    ctx.fillRect(x, y - 9, w, 10);
    return;
  }
  if (b.type === 'cathedral') {
    ctx.fillStyle = '#68716a';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#72796b';
    ctx.fillRect(x + 12, y + 12, w - 24, h - 24);
    for (let i = 0; i < 12; i++)
      for (let j = 0; j < 10; j++) {
        ctx.strokeStyle = '#35463c35';
        ctx.strokeRect(x + i * 48, y + j * 48, 48, 48);
      }
    ctx.fillStyle = '#9a9370';
    ctx.fillRect(x + w / 2 - 32, y + 22, 64, h - 20);
    ctx.strokeStyle = '#c1ac7050';
    ctx.strokeRect(x + w / 2 - 25, y + 25, 50, h - 25);
    ctx.fillStyle = '#38443d';
    ctx.fillRect(x + 12, y + 12, w - 24, 10);
    ctx.fillRect(x + 8, y, 16, h);
    ctx.fillRect(x + w - 24, y, 16, h);
    ctx.fillStyle = '#a1a18a';
    ctx.fillRect(x, y - 32, w, 32);
    ctx.fillStyle = '#626f64';
    ctx.fillRect(x, y - 5, w, 10);
    for (let i = 0; i < 5; i++) {
      const xx = x + 18 + (i * (w - 36)) / 4;
      poly(
        [
          [xx, y - 32],
          [xx + 17, y - 54],
          [xx + 34, y - 32],
        ],
        '#878d7b',
      );
    }
    for (let i = 0; i < 4; i++) {
      for (const side of [0, 1]) {
        const xx = x + 24 + side * (w - 48),
          yy = y + 80 + i * 95;
        ellipse(xx, yy + 4, 17, 9, '#20372d55');
        ctx.fillStyle = '#4c5c50';
        ctx.fillRect(xx - 10, yy - 46, 20, 46);
        ellipse(xx, yy - 46, 12, 7, '#a7a68c');
        ctx.fillStyle = '#657464';
        ctx.fillRect(xx - 13, yy - 8, 26, 8);
      }
    }
    ctx.fillStyle = '#465a49';
    ctx.fillRect(x, y + h - 10, w / 2 - 62, 25);
    ctx.fillRect(x + w / 2 + 62, y + h - 10, w / 2 - 62, 25);
    for (const side of [-1, 1]) {
      const xx = x + w / 2 + side * 65;
      ctx.fillStyle = '#687767';
      ctx.fillRect(xx - 10, y + h - 70, 20, 85);
      poly(
        [
          [xx - 18, y + h - 70],
          [xx, y + h - 97],
          [xx + 18, y + h - 70],
        ],
        '#a2a28a',
      );
    }
    ctx.fillStyle = '#433f2e';
    ctx.fillRect(world.library.x - 28, world.library.y - 25, 55, 18);
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = ['#9c7958', '#7d8560', '#a4a082'][i % 3];
      ctx.fillRect(world.library.x - 25 + i * 4, world.library.y - 23, 3, 15);
    }
    label('LIBRARY', world.library.x, world.library.y - 42, '#e3d6a6', 9);
    label('TRAINING YARD', x + w - 95, y + h - 140, '#e3d6a6', 8);
    return;
  }
  if (b.type === 'stall') {
    ctx.fillStyle = '#75603f';
    ctx.fillRect(x, y, w, h);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? '#a99a6a' : '#dbcca0';
      ctx.fillRect(x - 6 + (i * (w + 12)) / 6, y - 25, (w + 12) / 6, 30);
    }
    ctx.fillStyle = '#b19a6a';
    ctx.fillRect(x + 4, y + 10, w - 8, 9);
    for (let i = 0; i < 4; i++)
      ellipse(x + 12 + i * 18, y + 12, 6, 4, ['#b3995b', '#87925a', '#bb8054', '#bdaf73'][i]);
    return;
  }
  if (b.type === 'wall' || b.type === 'tower' || b.type === 'castle') {
    const tall = b.type === 'castle' ? 65 : b.type === 'tower' ? 48 : 24;
    ctx.fillStyle = '#34443b';
    ctx.fillRect(x + 8, y + 8, w, h);
    ctx.fillStyle = b.style?.wall || '#737f71';
    ctx.fillRect(x, y - tall, w, h + tall);
    ctx.fillStyle = '#959e89';
    ctx.fillRect(x, y - tall, w, 10);
    ctx.fillStyle = '#4c5d50';
    ctx.fillRect(x + w - 12, y - tall, 12, h + tall);
    for (let xx = x; xx < x + w; xx += 30) {
      ctx.fillStyle = '#a1a38b';
      ctx.fillRect(xx, y - tall - 10, 15, 16);
    }
    if (b.type === 'castle') {
      ctx.fillStyle = '#3a4438';
      ctx.fillRect((b.door.x + 0.5) * TILE - 23, y + h - 53, 46, 53);
      for (const off of [26, w - 42]) {
        ctx.fillStyle = '#38483c';
        ctx.fillRect(x + off, y + 28, 17, 30);
        ctx.fillStyle = b.style?.flag || color[b.city];
        ctx.fillRect(x + off - 5, y + 75, 27, 52);
        poly(
          [
            [x + off - 5, y + 127],
            [x + off + 8, y + 117],
            [x + off + 22, y + 127],
          ],
          '#e1cca6',
        );
      }
      for (const side of [0, 1]) {
        const xx = x + side * (w - 60);
        ctx.fillStyle = '#88917e';
        ctx.fillRect(xx, y - 90, 60, 130);
        poly(
          [
            [xx - 8, y - 90],
            [xx + 30, y - 140],
            [xx + 68, y - 90],
          ],
          '#4e655a',
        );
      }
      label('CASTLE', x + w / 2, y + h * 0.48, '#e3d6ad', 13);
    }
    return;
  }
  ellipse(x + w / 2 + 12, y + h + 9, w * 0.6, 20, '#07140d55');
  if (b.type === 'tent') {
    poly(
      [
        [x, y + h],
        [x + w / 2, y - 20],
        [x + w, y + h],
      ],
      ['#915c4a', '#5f6654', '#716b7e'][b.campStyle ?? 0],
    );
    poly(
      [
        [x + w / 2, y - 20],
        [x + w, y + h],
        [x + w - 12, y + h - 12],
      ],
      '#544c39',
    );
    poly(
      [
        [x + w * 0.3, y + h],
        [x + w * 0.5, y + h * 0.4],
        [x + w * 0.65, y + h],
      ],
      '#252c20',
    );
    return;
  }
  ctx.fillStyle = b.style?.house || ['#a19373', '#a2a6a0', '#ae9074'][b.palette ?? 0];
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#5f6755';
  ctx.fillRect(x + w - 15, y, 15, h);
  poly(
    [
      [x - 14, y + 15],
      [x + w / 2, y - 56],
      [x + w + 14, y + 15],
      [x + w / 2, y + 40],
    ],
    b.style?.roof ||
      (b.type === 'tailor'
        ? '#576f7d'
        : b.type === 'smith'
          ? '#676466'
          : b.type === 'inn'
            ? '#84624b'
            : ['#6a6550', '#4d6972', '#786950'][b.palette ?? 0]),
  );
  poly(
    [
      [x + w / 2, y - 56],
      [x + w + 14, y + 15],
      [x + w / 2, y + 40],
    ],
    '#444f42',
  );
  ctx.fillStyle = '#343d30';
  ctx.fillRect(x + w / 2 - 11, y + h - 37, 22, 37);
  ctx.fillStyle = world.night ? '#edbc62' : '#69705a';
  ctx.fillRect(x + 18, y + h - 50, 16, 20);
  ctx.fillRect(x + w - 35, y + h - 50, 16, 20);
  ctx.fillStyle = '#777865';
  ctx.fillRect(x + 20, y - 35, 15, 25);
  drawArchitecture(ctx, b, TILE, world.elapsed);
  if (b.name) label(b.name, x + w / 2, y + h * 0.48, '#dbca9c', 11);
  if (b.type === 'smith') {
    ellipse(x + 35, y + h + 12, 17, 8, '#3c3c32');
    ellipse(x + 35, y + h + 10, 9, 5, '#df9c54');
  }
  if (b.type === 'warehouse') {
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = '#a48a57';
      ctx.fillRect(x + 20 + i * 26, y + h + 5, 22, 20);
      ctx.strokeStyle = '#5e5138';
      ctx.strokeRect(x + 20 + i * 26, y + h + 5, 22, 20);
    }
  }
}
function label(t, x, y, c = '#c5c3a0', size = 11) {
  ctx.font = `${size}px Manrope,system-ui`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#09150ecc';
  ctx.fillRect(
    x - ctx.measureText(t).width / 2 - 6,
    y - size - 3,
    ctx.measureText(t).width + 12,
    size + 10,
  );
  ctx.fillStyle = c;
  ctx.fillText(t, x, y);
}
function treeSpriteId(t) {
  return t.type === 0 ? 'pine' : Number(t.id) % 3 === 0 ? 'birch' : 'oak';
}
function tree(t, c = ctx) {
  if (
    t.wood &&
    !t.hidden &&
    environmentSprites.draw(c, treeSpriteId(t), t.x, t.y, { scale: t.s || 1 })
  )
    return;
  assets.tree(c, t);
}
function seeThroughCanopy(id, t, draw) {
  const bounds = environmentSprites.bounds(id, t.x, t.y, { scale: t.s || 1 });
  (canopyWindow ??= new CanopyWindow()).draw(ctx, draw, bounds, world.player);
}

function drawActorSprite(c, e, pose, time) {
  const drawn = rasterSprites.draw(c, e, pose, time);
  const id = rasterSprites.assetFor(e);
  return (
    drawn || Boolean(id && rasterSprites.configFor(id) && !rasterSprites.assets.get(id)?.error)
  );
}
function actor(e, pose = world.renderPose(e, paused || modal ? 1 : undefined)) {
  if (e.horse?.rider) return;
  if (e.hp <= 0 || !world.visibleFrom(world.player, pose)) return;
  if (world.night && e.state === 'sleep' && dist(e, e.home) < 45 && !world.interiorAt(e)) return;
  const x = pose.x,
    y = pose.y,
    active = e === world.player;
  const attack = pose.attack;
  const walk = Math.sin(pose.walk * 2.5) * 3;
  ellipse(x + 2, y + 3, active ? 15 : 13, 6, '#09180b70');
  if (world.player.lockedTargetId === e.id) {
    ctx.strokeStyle = '#f0d27a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y + 3, 26, 13, 0, 0, Math.PI * 2);
    ctx.stroke();
    label('TARGET · ' + e.name, x, y - 100, '#f1d88c', 10);
  }
  if (e.sickness) label('FEVER', x, y - 108, '#cba875', 9);
  if (e.companion?.active) label('COMPANION', x, y - 108, '#b5cda1', 9);
  if ((e.stunUntil || 0) > world.elapsed) {
    label('✦ STUNNED', x, y - 90, '#e6d7a5', 10);
  }
  if (ANIMALS[e.role]) {
    ctx.save();
    if (world.player.lockedTargetId === e.id) {
      ctx.shadowColor = '#f0d27a';
      ctx.shadowBlur = 10;
    }
    if (e.juvenileUntil) {
      ctx.translate(x, y);
      ctx.scale(0.68, 0.68);
      if (!drawActorSprite(ctx, e, { ...pose, x: 0, y: 0 }, world.elapsed))
        drawAnimal(ctx, { ...e, x: 0, y: 0 }, { ...pose, x: 0, y: 0 });
    } else if (!drawActorSprite(ctx, e, pose, world.elapsed)) drawAnimal(ctx, e, pose);
    ctx.restore();
    if (e.hp < e.maxHp) {
      ctx.fillStyle = '#17221a';
      ctx.fillRect(x - 17, y - 72, 34, 3);
      ctx.fillStyle = '#bb775a';
      ctx.fillRect(x - 17, y - 72, 34 * Math.max(0, e.hp / e.maxHp), 3);
    }
    return;
  }
  if (e.role === 'horse') {
    if (!drawActorSprite(ctx, e, pose, world.elapsed)) drawHorse(ctx, e, pose);
    if (nearest?.obj === e) label(e.name + ' · ' + stateName(e.state), x, y - 105, '#ded0a1', 10);
    if (e.hp < e.maxHp) {
      ctx.fillStyle = '#bd8769';
      ctx.fillRect(x - 25, y - 92, (50 * e.hp) / e.maxHp, 3);
    }
    return;
  }
  if (e.role === 'dummy') {
    if (environmentSprites.draw(ctx, 'dummy_static', x, y)) return;
    ctx.fillStyle = '#645436';
    ctx.fillRect(x - 3, y - 40, 6, 40);
    ctx.fillRect(x - 21, y - 31, 42, 5);
    ellipse(x, y - 45, 8, 8, '#c0aa78');
    ctx.fillStyle = '#a6986b';
    ctx.fillRect(x - 10, y - 35, 20, 22);
    ctx.strokeStyle = '#695f42';
    ctx.strokeRect(x - 9, y - 34, 18, 20);
    return;
  }
  ctx.save();
  if (world.player.lockedTargetId === e.id) {
    ctx.shadowColor = '#f0d27a';
    ctx.shadowBlur = 10;
  }
  if (active && playerHorse(world)) {
    const mount = playerHorse(world);
    if (!drawActorSprite(ctx, mount, { ...pose, dir: e.dir }, world.elapsed))
      drawHorse(ctx, mount, { ...pose, dir: e.dir }, { saddled: true });
    pose = mountedPose(rasterSprites, e, mount, pose);
  }
  if (!drawActorSprite(ctx, e, pose, world.elapsed) && !drawLoreActor(ctx, e, pose))
    drawCharacter(ctx, e, pose, { player: active, torch: world.player.torchUntil > world.time });
  ctx.restore();
  if (e.role === 'merchant') wagon({ ...e, x, y });
  if (e.swimming) {
    ellipse(x, y - 2, 22, 8, '#93c3ba55');
  }
  if (active) {
    ctx.strokeStyle = '#d9c68b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, y + 3, 18, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (e.hp < e.maxHp && !active) {
    ctx.fillStyle = '#17221a';
    ctx.fillRect(x - 15, y - 51, 30, 3);
    ctx.fillStyle = '#bb775a';
    ctx.fillRect(x - 15, y - 51, 30 * Math.max(0, e.hp / e.maxHp), 3);
  }
  if (nearest?.obj === e || e.role === 'wizard') {
    label(
      e.name,
      x,
      y - (e.role === 'wizard' ? 105 : 88),
      e.role === 'bandit' ? '#d5917b' : '#e2d7ac',
      10,
    );
    if (nearest?.obj === e && e.role !== 'wizard')
      label((ROLES[e.role] || '') + ' · ' + stateName(e.state), x, y - 104, '#a9b69b', 8);
  }
}
function baseMap() {
  if (mapCache) return mapCache;
  mapCache = document.createElement('canvas');
  mapCache.width = W;
  mapCache.height = H;
  const c = mapCache.getContext('2d'),
    im = c.createImageData(W, H),
    palette = [
      [43, 66, 44],
      [134, 126, 84],
      [43, 78, 82],
      [134, 140, 116],
      [48, 93, 106],
      [168, 147, 104],
      [101, 111, 62],
      [29, 28, 34],
      [103, 121, 66],
      [51, 79, 65],
      [115, 111, 91],
      [82, 96, 97],
      [172, 166, 143],
      [111, 97, 75],
      [139, 130, 108],
      [193, 166, 113],
      [108, 85, 127],
      [82, 89, 101],
      [143, 151, 142],
      [124, 108, 76],
    ];
  for (let i = 0; i < W * H; i++) {
    const climate = biomeColor(world, i),
      rgb = climate
        ? [
            parseInt(climate.slice(1, 3), 16),
            parseInt(climate.slice(3, 5), 16),
            parseInt(climate.slice(5, 7), 16),
          ]
        : palette[world.tiles[i]] || palette[0],
      shade = world.tiles[i] === 0 ? Math.min(world.depth[i], 18) * 0.8 : 0;
    im.data[i * 4] = rgb[0] - shade;
    im.data[i * 4 + 1] = rgb[1] - shade;
    im.data[i * 4 + 2] = rgb[2] - shade;
    im.data[i * 4 + 3] = 255;
  }
  c.putImageData(im, 0, 0);
  c.fillStyle = '#a5a28b';
  for (const b of world.buildings) {
    c.fillStyle =
      b.type === 'cityFlag'
        ? b.style?.flag || '#d5b668'
        : b.style?.[b.type === 'wall' || b.type === 'tower' ? 'wall' : 'house'] || '#a5a28b';
    c.fillRect(b.x, b.y, b.w, b.h);
  }
  return mapCache;
}
function renderMap(c, w, h, big = false) {
  if (world.dungeonSpec) {
    renderCaveMap(c, w, h);
    return;
  }
  c.clearRect(0, 0, w, h);
  c.imageSmoothingEnabled = false;
  c.drawImage(baseMap(), 0, 0, w, h);
  const sx = w / W,
    sy = h / H;
  if (big) {
    c.strokeStyle = '#e5d5a11c';
    c.lineWidth = 1;
    for (let x = 0; x < W; x += 80) {
      c.beginPath();
      c.moveTo(x * sx, 0);
      c.lineTo(x * sx, h);
      c.stroke();
    }
    for (let y = 0; y < H; y += 80) {
      c.beginPath();
      c.moveTo(0, y * sy);
      c.lineTo(w, y * sy);
      c.stroke();
    }
  }
  for (const z of world.places) {
    c.fillStyle = color[z.faction] || '#d0c192';
    c.beginPath();
    c.arc(z.x * sx, z.y * sy, big ? 4 : 2, 0, Math.PI * 2);
    c.fill();
    if (big) {
      c.font =
        (z.faction && ['oak', 'salt', 'north'].includes(z.id) ? 'bold 11px' : '9px') +
        ' Manrope,system-ui';
      c.textAlign = 'center';
      c.fillStyle = '#081712';
      const wid = c.measureText(z.name).width;
      c.fillRect(z.x * sx - wid / 2 - 3, z.y * sy - 20, wid + 6, 13);
      c.fillStyle = '#e5dfc5';
      c.fillText(z.name, z.x * sx, z.y * sy - 10);
    }
  }
  for (const d of world.dungeonEntrances || []) {
    c.fillStyle = d.kind === 'underwater' ? '#9fcddd' : '#d3a56c';
    c.beginPath();
    c.moveTo((d.x / TILE) * sx - 4, (d.y / TILE) * sy - 3);
    c.lineTo((d.x / TILE) * sx + 4, (d.y / TILE) * sy - 3);
    c.lineTo((d.x / TILE) * sx, (d.y / TILE) * sy + 4);
    c.fill();
    if (big) {
      c.font = '9px system-ui';
      c.textAlign = 'center';
      c.fillText(d.name, (d.x / TILE) * sx, (d.y / TILE) * sy + 15);
    }
  }
  for (const camp of world.camps || []) {
    c.fillStyle = '#e7c078';
    c.font = (big ? '16' : '10') + 'px system-ui';
    c.textAlign = 'center';
    c.fillText('⌂', (camp.x / TILE) * sx, (camp.y / TILE) * sy);
    if (big) {
      c.font = '9px system-ui';
      c.fillText(camp.name, (camp.x / TILE) * sx, (camp.y / TILE) * sy + 12);
    }
  }
  for (const z of world.territories) {
    c.strokeStyle = color[z.owner];
    c.lineWidth = 1;
    c.strokeRect((z.x / TILE) * sx - 3, (z.y / TILE) * sy - 3, 6, 6);
  }
  for (const e of world.entities)
    if (e.caravan && e.hp > 0) {
      c.fillStyle = '#d5af72';
      c.fillRect((e.x / TILE) * sx - 2, (e.y / TILE) * sy - 2, 4, 4);
    }
  for (const h of world.entities.filter(
    (e) => e.hp > 0 && horseOwned(world, e) && !e.horse.rider,
  )) {
    c.fillStyle = '#d9c998';
    c.font = (big ? '15' : '9') + 'px system-ui';
    c.textAlign = 'center';
    c.fillText('♞', (h.x / TILE) * sx, (h.y / TILE) * sy);
  }
  const x = (world.player.x / TILE) * sx,
    y = (world.player.y / TILE) * sy;
  if (mapTarget) {
    c.strokeStyle = '#ead78e';
    c.setLineDash([3, 4]);
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo((mapTarget.x / TILE) * sx, (mapTarget.y / TILE) * sy);
    c.stroke();
    c.setLineDash([]);
    c.strokeRect((mapTarget.x / TILE) * sx - 5, (mapTarget.y / TILE) * sy - 5, 10, 10);
  }
  c.fillStyle = '#fff0b7';
  c.beginPath();
  c.moveTo(x, y - 5);
  c.lineTo(x + 4, y);
  c.lineTo(x, y + 5);
  c.lineTo(x - 4, y);
  c.fill();
  if (!big) {
    c.strokeStyle = '#e5deaa99';
    c.strokeRect(
      ((camera.x - sw / zoom / 2) / TILE) * sx,
      ((camera.y - sh / zoom / 2) / TILE) * sy,
      (sw / zoom / TILE) * sx,
      (sh / zoom / TILE) * sy,
    );
  }
}
function wagon(e) {
  const x = e.x,
    y = e.y + 37;
  ellipse(x, y + 7, 48, 17, '#09140f70');
  ctx.fillStyle = '#5b472e';
  ctx.fillRect(x - 24, y - 21, 48, 33);
  ctx.strokeStyle = '#b29662';
  ctx.lineWidth = 3;
  ctx.strokeRect(x - 24, y - 21, 48, 33);
  for (const side of [-1, 1])
    for (const off of [-14, 10]) {
      ellipse(x + side * 27, y + off, 6, 10, '#322d23');
      ellipse(x + side * 27, y + off, 2, 4, '#918365');
    }
  poly(
    [
      [x - 24, y - 21],
      [x - 16, y - 42],
      [x + 16, y - 42],
      [x + 24, y - 21],
    ],
    '#b7ab81',
  );
  ctx.fillStyle = '#d0c29a';
  ctx.fillRect(x - 16, y - 40, 32, 15);
  ctx.strokeStyle = '#716047';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 24, y - 21);
  ctx.lineTo(x + 24, y - 21);
  ctx.moveTo(x - 10, y - 40);
  ctx.lineTo(x - 10, y + 12);
  ctx.moveTo(x + 10, y - 40);
  ctx.lineTo(x + 10, y + 12);
  ctx.stroke();
  if (dist(e, world.player) < 300)
    label(e.name + ' · ' + stateName(e.state), x, y + 39, '#d9c592', 9);
}
function cityPlan(z) {
  openWindow(
    'map',
    '<div class="eyebrow">CARTOGRAPHY · TOWN PLAN</div><h1 id="city-map-title"></h1><div class="tabs" id="city-map-tabs"></div><canvas id="city-plan" width="720" height="280" style="width:100%;border:1px solid #c5ae7830" aria-label="Town map with points of interest"></canvas><p id="city-map-info" role="status">The white arrow is you. Select a number or a place from the list.</p><div class="city-map-legend" id="city-map-legend"></div>',
  );
  $('#city-map-title').textContent = z.name;
  const worldTab = button('World Map', map),
    cityTab = button('Town Map', () => cityPlan(z));
  cityTab.classList.add('selected');
  cityTab.setAttribute('aria-pressed', 'true');
  $('#city-map-tabs').append(worldTab, cityTab);
  const canvas = $('#city-plan'),
    points = cityMapPoints(world, z);
  let selected = null,
    markers = [];
  const refresh = () =>
    (markers = drawCityMap(canvas.getContext('2d'), world, z, baseMap(), points, selected));
  const select = (p) => {
    selected = p.index;
    mapTarget = { name: p.name, x: p.x, y: p.y };
    $('#city-map-info').textContent = p.name + ' · ' + travelText(p) + '. Direction selected.';
    for (const b of $('#city-map-legend').children)
      b.classList.toggle('selected', Number(b.dataset.index) === selected);
    refresh();
  };
  for (const p of points) {
    const b = button(p.index + '. ' + p.name, () => select(p));
    b.dataset.index = p.index;
    $('#city-map-legend').append(b);
  }
  canvas.onclick = (e) => {
    const r = canvas.getBoundingClientRect(),
      x = ((e.clientX - r.left) / r.width) * canvas.width,
      y = ((e.clientY - r.top) / r.height) * canvas.height,
      p = markers.find((p) => Math.hypot(p.x - x, p.y - y) < 14);
    if (p) select(points.find((q) => q.index === p.index));
  };
  refresh();
}

function choppedVisible() {
  const out = [];
  const cx = Math.floor(camera.x / (TILE * 16)),
    cy = Math.floor(camera.y / (TILE * 16)),
    r = Math.ceil(Math.max(sw, sh) / zoom / (TILE * 32)) + 1;
  for (let y = cy - r; y <= cy + r; y++)
    for (let x = cx - r; x <= cx + r; x++)
      for (const t of world.treeChunks.get(x + ',' + y) || []) if (!t.wood) out.push(t.id);
  return out;
}
function render() {
  const renderMark = performance.now();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#243c2e';
  ctx.fillRect(0, 0, sw, sh);
  ctx.save();
  ctx.translate(sw / 2, sh / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-camera.x, -camera.y);
  const left = camera.x - sw / zoom / 2 - 120,
    right = camera.x + sw / zoom / 2 + 120,
    top = camera.y - sh / zoom / 2 - 120,
    bottom = camera.y + sh / zoom / 2 + 180;
  rasterSprites.prepare(() => [
    world.player,
    ...world.nearby(camera, Math.hypot(sw / zoom / 2, sh / zoom / 2) + 2000),
  ]);
  if (frame % 15 === 0) {
    buildingSprites.prepare(world.buildings, {
      left: left - 1800,
      right: right + 1800,
      top: top - 1800,
      bottom: bottom + 1800,
    });
    void assets.prepareGround(
      { left: left - 1200, right: right + 1200, top: top - 1200, bottom: bottom + 1200 },
      zoom,
      { left, right, top, bottom },
    );
  }
  assets.drawGround(ctx, { left, right, top, bottom }, zoom, world.elapsed);
  groundRenderMs = performance.now() - renderMark;
  environmentSprites.dungeonWalls(ctx, world, { left, right, top, bottom }, world.elapsed);
  drawWebs(ctx, world, { left, right, top, bottom });
  for (const site of world.loreSites || []) {
    const id =
      'landmark_' + (site.id.startsWith('clan-fire-') ? 'blue_fire' : site.id.replaceAll('-', '_'));
    if (environmentSprites.visible(id, site.x, site.y, { left, right, top, bottom })) {
      if (!environmentSprites.draw(ctx, id, site.x, site.y, { time: world.elapsed }))
        drawLoreSite(ctx, site, world.elapsed);
    }
  }
  for (const rift of world.rifts || [])
    if (rift.x > left && rift.x < right && rift.y > top && rift.y < bottom)
      drawRift(ctx, rift, world.elapsed);
  if (world.courtyard) {
    const p = world.courtyard;
    ellipse(p.x, p.y, 100, 69, '#a5a085');
    ellipse(p.x, p.y, 84, 56, '#686f60');
    ctx.strokeStyle = '#c1b68c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.x - 60, p.y);
    ctx.lineTo(p.x + 60, p.y);
    ctx.moveTo(p.x, p.y - 44);
    ctx.lineTo(p.x, p.y + 44);
    ctx.stroke();
  }
  for (const d of world.dungeonEntrances || []) {
    if (d.x < left || d.x > right || d.y < top || d.y > bottom) continue;
    drawPortal(d, false);
  }
  if (world.dungeonExit) drawPortal(world.dungeonExit, true);
  for (const b of world.buildings)
    if (buildingSprites.visible(b, { left, right, top, bottom })) building(b);
  buildingRenderMs = performance.now() - renderMark - groundRenderMs;
  for (const z of world.places.filter((z) => ['oak', 'salt', 'north'].includes(z.id))) {
    const x = z.x * TILE,
      y = z.y * TILE;
    if (x < left - 200 || x > right + 200 || y < top - 200 || y > bottom + 200) continue;
    if (environmentSprites.draw(ctx, 'fountain', x, y, { width: 120 })) {
      environmentSprites.draw(ctx, 'fountain_water', x, y, { scale: 2, time: world.elapsed });
      label(z.name.toUpperCase(), x, y - 95, '#d4c69a', 12);
      continue;
    }
    ellipse(x, y, 59, 30, '#a8a58b');
    ellipse(x, y - 3, 48, 23, '#495f5a');
    ellipse(x, y - 5, 40, 18, '#80a09a');
    ctx.fillStyle = '#8d9985';
    ctx.fillRect(x - 7, y - 55, 14, 45);
    ellipse(x, y - 55, 20, 10, '#b5b59c');
    ctx.strokeStyle = '#bdd2bb99';
    ctx.lineWidth = 2;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x, y - 51);
      ctx.quadraticCurveTo(x + side * 35, y - 40, x + side * 32, y - 8);
      ctx.stroke();
    }
    label(z.name.toUpperCase(), x, y - 95, '#d4c69a', 12);
  }

  for (const camp of world.camps || [])
    if (camp.x > left && camp.x < right && camp.y > top && camp.y < bottom) {
      if (!environmentSprites.camp(ctx, camp, world.time)) drawCamp(ctx, camp, world.time);
    }
  for (const f of world.workProps || []) {
    const p = { x: (f.x + 0.5) * TILE, y: (f.y + 0.5) * TILE };
    if (
      p.x > left &&
      p.x < right &&
      p.y > top &&
      p.y < bottom &&
      world.visibleFrom(world.player, p)
    )
      drawFurnishing(ctx, f);
  }
  for (const site of world.workSites || [])
    if (dist(site, world.player) < 260) label(site.name, site.x, site.y - 70, '#d9c697', 9);
  for (const site of world.campSites || [])
    if (dist(site, world.player) < 500) label(site.name, site.x, site.y - 350, '#d7b38a', 10);
  for (const pile of world.woodPiles || []) {
    if (
      !(pile.inventory.log > 0) ||
      pile.x < left ||
      pile.x > right ||
      pile.y < top ||
      pile.y > bottom
    )
      continue;
    drawLogPile(pile);
  }
  for (const f of world.dungeonDecor || [])
    if (
      f.x * TILE > left &&
      f.x * TILE < right &&
      f.y * TILE > top &&
      f.y * TILE < bottom &&
      world.visibleCells?.[f.y * W + f.x]
    )
      drawFurnishing(ctx, f);
  for (const l of world.landmarks) {
    if (l.x < left || l.x > right || l.y < top || l.y > bottom) continue;
    if (!String(l.id).startsWith('dropped-relic-') && !String(l.id).startsWith('lore-'))
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = '#6d7563';
        ctx.fillRect(l.x - 90 + i * 40, l.y - 95 + (i % 2) * 20, 17, 48);
      }
    ctx.fillStyle = '#595c44';
    ctx.fillRect(l.x - 18, l.y - 12, 36, 23);
    ctx.strokeStyle = '#bdab67';
    ctx.strokeRect(l.x - 18, l.y - 12, 36, 23);
    if (Object.values(l.inventory).some((n) => n > 0)) {
      ellipse(l.x, l.y - 16, 10, 5, '#cfcf8e');
      ctx.fillStyle = '#f3e6b6';
      ctx.fillRect(l.x - 2, l.y - 34, 4, 14);
    }
    label(l.name.toUpperCase(), l.x, l.y - 105, '#c4b17e', 11);
  }
  for (const r of world.resources) {
    if (r.amount <= 0 || r.x < left || r.x > right || r.y < top || r.y > bottom) continue;
    if (drawCrop(ctx, r)) continue;
    if (r.kind === 'ore') {
      poly(
        [
          [r.x - 13, r.y],
          [r.x - 9, r.y - 14],
          [r.x + 6, r.y - 20],
          [r.x + 15, r.y],
        ],
        '#7c8581',
      );
      poly(
        [
          [r.x - 9, r.y - 14],
          [r.x + 6, r.y - 20],
          [r.x + 2, r.y - 3],
        ],
        '#b1b1a0',
      );
    } else {
      ctx.strokeStyle = '#879b62';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x, r.y - 16);
      ctx.stroke();
      ellipse(r.x - 5, r.y - 9, 6, 3, '#a2ac6a');
      ellipse(r.x + 4, r.y - 13, 6, 3, '#7d995c');
      ellipse(r.x, r.y - 19, 3, 3, '#d7c697');
    }
  }
  if (!world.interiorAt(world.player))
    for (const d of world.districts)
      if (d.x > left && d.x < right && d.y > top && d.y < bottom)
        label(d.name, d.x, d.y, '#d1c49b', 11);

  for (const z of world.places.filter((z) => ['red', 'ash', 'thorn'].includes(z.id))) {
    const x = z.x * TILE,
      y = (z.y + 1) * TILE;
    ellipse(x, y, 15, 8, '#363e2d');
    poly(
      [
        [x - 8, y],
        [x - 2, y - 26 - Math.sin(frame * 0.12) * 4],
        [x + 3, y - 13],
        [x + 10, y],
      ],
      '#d3a156',
    );
    ellipse(x, y, 6, 4, '#efc880');
  }
  const objects = [
    ...(world.alienFlora || [])
      .filter((t) =>
        environmentSprites.visible(
          'alien_tree_' + (t.species ?? t.type ?? 0),
          t.x,
          t.y,
          { left, right, top, bottom },
          { scale: t.s || 1 },
        ),
      )
      .map((t) => ({
        y: t.y,
        draw: () =>
          seeThroughCanopy('alien_tree_' + (t.species ?? t.type ?? 0), t, (c) => {
            if (
              !environmentSprites.draw(c, 'alien_tree_' + (t.species ?? t.type ?? 0), t.x, t.y, {
                scale: t.s || 1,
              })
            )
              drawAlienPlant(c, t);
          }),
      })),
    ...world
      .treesNear(camera, Math.hypot(sw / zoom / 2, sh / zoom / 2) + 1200)
      .filter((t) =>
        environmentSprites.visible(
          treeSpriteId(t),
          t.x,
          t.y,
          { left, right, top, bottom },
          { scale: t.s || 1 },
        ),
      )
      .map((t) => ({
        y: t.y,
        draw: () => seeThroughCanopy(treeSpriteId(t), t, (c) => tree(t, c)),
      })),
    ...world.entities
      .filter((e) => e.hp > 0 && e.x > left && e.x < right && e.y > top && e.y < bottom)
      .map((e) => {
        const pose = world.renderPose(e, paused || modal ? 1 : undefined);
        return { y: pose.y, draw: () => actor(e, pose) };
      }),
    { y: world.player.y, draw: () => actor(world.player) },
  ];
  for (const c of world.corpses) {
    if (
      c.x < left ||
      c.x > right ||
      c.y < top ||
      c.y > bottom ||
      !world.visibleFrom(world.player, c)
    )
      continue;
    if (c.desertRemains) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate((Number(c.id) % 5) * 0.8);
      ctx.strokeStyle = '#c4b999';
      ctx.lineWidth = 3;
      for (let k = -2; k <= 2; k++) {
        ctx.beginPath();
        ctx.moveTo(k * 5, -7);
        ctx.lineTo(k * 5 + 2, 7);
        ctx.stroke();
      }
      ellipse(16, 0, 5, 5, '#d2c5a7');
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(-30, -9);
      ctx.moveTo(-12, 0);
      ctx.lineTo(-29, 9);
      ctx.stroke();
      ctx.restore();
      continue;
    }
    const corpseAsset = rasterSprites.configFor(rasterSprites.assetFor(c));
    if (
      !corpseAsset?.animations?.death ||
      !drawActorSprite(
        ctx,
        c,
        {
          x: c.x,
          y: c.y,
          dir: c.dir,
          animation: 'death',
          animationSeconds: Math.max(0, world.elapsed - (c.deathAt ?? world.elapsed)),
        },
        world.elapsed,
      )
    ) {
      ellipse(c.x, c.y, 17, 7, '#3b2923');
      ctx.fillStyle = '#807760';
      ctx.fillRect(c.x - 12, c.y - 6, 21, 8);
    }
    if (Object.keys(c.inventory).length) {
      ctx.strokeStyle = c.player ? '#e0ca84' : '#b2aa78';
      ctx.strokeRect(c.x + 6, c.y - 10, 8, 9);
      if (c.player) label('YOUR BELONGINGS', c.x, c.y - 24, '#dfc17f', 9);
    }
  }
  for (const id of choppedVisible()) {
    const t = world.trees[id];
    tree(t);
  }
  for (const site of world.alienEcology?.sites || [])
    if (
      environmentSprites.visible(
        site.kind,
        site.x,
        site.y + TILE * 0.5,
        { left, right, top, bottom },
        { scale: 2 },
      ) &&
      world.visibleFrom(world.player, site)
    )
      drawAlienProp(ctx, { ...site, x: site.x / TILE - 1, y: site.y / TILE - 1 }, world.elapsed);
  drawPurpleAir(ctx, world, { left, right, top, bottom }, world.elapsed);
  drawCombatAim(ctx, world);
  for (const a of world.projectiles) {
    if (!world.visibleFrom(world.player, a)) continue;
    ctx.strokeStyle = '#e7d6a5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y - 30);
    ctx.lineTo(a.x - a.vx * 0.03, a.y - a.vy * 0.03 - 30);
    ctx.stroke();
  }
  for (const b of world.buildings) {
    if (!buildingSprites.visible(b, { left, right, top, bottom })) continue;
    objects.push({
      y: (b.y + b.h) * TILE,
      draw: () =>
        buildingSprites.draw(ctx, b, world.interiorAt(world.player)?.id === b.id, 'depth'),
    });
  }
  const actorMark = performance.now();
  objects.sort((a, b) => a.y - b.y).forEach((o) => o.draw());
  actorRenderMs = performance.now() - actorMark;
  for (const e of world.entities)
    if (
      e.hp > 0 &&
      e.speechUntil > world.elapsed &&
      e.x > left &&
      e.x < right &&
      e.y > top &&
      e.y < bottom &&
      world.visibleFrom(world.player, e)
    )
      speechBubble(e);
  for (const fx of world.effects) {
    if (!world.visibleFrom(world.player, fx)) continue;
    if (drawRipple(ctx, fx, world.elapsed)) continue;
    if (fx.field) {
      ctx.strokeStyle = fx.color;
      ctx.globalAlpha = Math.max(0, fx.life);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(fx.x, fx.y - 15, fx.field, fx.field * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      continue;
    }
    if (fx.arc !== undefined) {
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(fx.x, fx.y - 8, fx.range, fx.arc - fx.spread, fx.arc + fx.spread);
      ctx.stroke();
      continue;
    }
    ctx.globalAlpha = Math.max(0, fx.life);
    ctx.fillStyle = fx.color;
    ctx.font = 'bold 12px Manrope,system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(fx.text, fx.x, fx.y);
  }
  ctx.globalAlpha = 1;
  for (const b of world.buildings.filter((b) => b.prison))
    drawPrison(ctx, world, b, { barsOnly: true });
  if (world.dungeonSpec) drawCaveFog(left, right, top, bottom);
  ctx.restore();
  drawWeather(ctx, world, sw, sh);
  const hour = (world.time % 1440) / 60,
    night = world.night;
  canopyShade += (deepForestShade(world) - canopyShade) * 0.07;
  const darkness = Math.min(
    0.62,
    world.dungeonSpec
      ? 0.12
      : night
        ? 0.46
        : hour > 18
          ? (hour - 18) * 0.12
          : hour < 8
            ? (8 - hour) * 0.1
            : 0,
  );
  if (darkness > 0) {
    ctx.fillStyle = `rgba(8,18,36,${darkness})`;
    ctx.fillRect(0, 0, sw, sh);
    const p = world.player,
      px = (p.x - camera.x) * zoom + sw / 2,
      py = (p.y - camera.y) * zoom + sh / 2;
    const g = ctx.createRadialGradient(px, py, 5, px, py, 180);
    g.addColorStop(0, world.player.torchUntil > world.time ? '#f2c57866' : '#dfc58a22');
    g.addColorStop(1, '#dfc58a00');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, sw, sh);
  }
  drawEdgePressure(ctx, world, sw, sh, canopyShade);
  if (paused && !modal) {
    ctx.fillStyle = '#0a171480';
    ctx.fillRect(0, 0, sw, sh);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e2d5af';
    ctx.font = '36px Georgia';
    ctx.fillText('Pause', sw / 2, sh / 2);
    ctx.font = '12px system-ui';
    ctx.fillText('P — resume', sw / 2, sh / 2 + 30);
  }
  renderMap(mc, 180, 145);
}
function loop(t) {
  if (!started) {
    last = t;
    requestAnimationFrame(loop);
    return;
  }
  const frameStart = performance.now();
  perfSim = 0;
  const interval = last ? t - last : 16.7;
  const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
  last = t;
  frame++;
  if (started && !paused && !modal) {
    const p = world.player;
    let dx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0),
      dy = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
    if (['bow', 'arkCutter'].includes(p.weapon)) lockedTarget(world);
    if (mouse.active && p.weaponDrawn) world.aimPlayer(mouseWorld());
    movePlayer(world, dx, dy, keys.shift, dt);
    if ((keys[' '] || keys.mouseAttack) && p.weaponDrawn && p.cooldown <= 0) playerAttack(false);
    const simStart = performance.now();
    if (expedition.update(dt)) {
      activateLayer();
      deathScreen();
      save();
    }
    perfSim = performance.now() - simStart;
    autosave += dt;
    if (autosave > 20) {
      scheduleSave();
      autosave = 0;
    }
  }
  camera.x += (world.player.x - camera.x) * Math.min(1, dt * 9);
  camera.y += (world.player.y - camera.y - cameraOffset()) * Math.min(1, dt * 9);
  if (frame % 3 === 0) {
    findNearest();
    findHovered();
  }
  if (frame % 6 === 0) hud();
  const renderStart = performance.now();
  render();
  perfRender = performance.now() - renderStart;
  perfFrame = performance.now() - frameStart;
  perfSamples.push({ interval, cpu: perfFrame, sim: perfSim, render: perfRender });
  if (perfSamples.length > 240) perfSamples.shift();
  if (debugPerf && frame % 30 === 0) {
    const avg = (k) => perfSamples.reduce((n, s) => n + s[k], 0) / perfSamples.length;
    $('#performance').textContent =
      Math.round(1000 / avg('interval')) +
      ' FPS · frame CPU ' +
      avg('cpu').toFixed(1) +
      ' ms · simulation ' +
      avg('sim').toFixed(1) +
      ' ms · render ' +
      avg('render').toFixed(1) +
      ' ms\nNPC ' +
      world.entities.filter((e) => e.hp > 0).length +
      ' · paths: ' +
      (world.pathService ? 'background worker' : 'incremental processing') +
      ' · queue ' +
      world.pathQueue.length +
      '\nGround ' +
      groundRenderMs.toFixed(1) +
      ' ms · buildings ' +
      buildingRenderMs.toFixed(1) +
      ' ms · objects ' +
      actorRenderMs.toFixed(1) +
      ' ms · cache ' +
      assets.ground.size +
      ' · loading ' +
      assets.pendingChunks.size;
  }
  requestAnimationFrame(loop);
}
function cameraOffset() {
  return 20;
}
requestAnimationFrame(loop);
// Read-only debug handle for inspecting the running simulation in browser developer tools.
window.ashenRoad = {
  get world() {
    return world;
  },
  get metrics() {
    return {
      frameMs: perfFrame,
      simMs: perfSim,
      renderMs: perfRender,
      samples: perfSamples.slice(),
      paths: pathService?.metrics,
    };
  },
  save,
};

canvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    zoom = Math.max(0.25, Math.min(1.5, zoom * (e.deltaY > 0 ? 0.9 : 1.1)));
  },
  { passive: false },
);

function dungeonMap() {
  mapOpen = true;
  openWindow(
    'map',
    '<div class="eyebrow">' +
      (world.templateName || 'UNDERGROUND PASSAGES') +
      ' · EXPLORED AREA</div><h1>' +
      world.dungeonSpec.name +
      '</h1><canvas id="cave-map" width="800" height="600" style="width:100%;background:#101313"></canvas><p>Bright areas are currently visible; dark ones have been explored. Unknown passages remain hidden. ▴ — marks the way back to the surface. Bodies and loot remain here after you leave.</p><div id="cave-actions" class="actions"></div>',
  );
  const mapCanvas = $('#cave-map'),
    refresh = () => renderCaveMap(mapCanvas.getContext('2d'), 800, 600);
  refresh();
  $('#cave-actions').append(
    button('Show the way to the exit', () => {
      mapTarget = { ...world.dungeonExit };
      close();
    }),
  );
  if (world.debugMode) {
    $('#cave-actions').append(
      button('DEBUG · Reveal the Entire Layout', () => {
        world.debugMapReveal = !world.debugMapReveal;
        refresh();
      }),
    );
    const jump = button('DEBUG · Select a Map Point', () => {
      const result = world.debugTravel(mapTarget);
      if (result.ok) {
        camera = { x: world.player.x, y: world.player.y };
        world.revealCell = null;
        world.update(0);
        close();
      } else toast(result.message);
    });
    jump.disabled = true;
    $('#cave-actions').append(jump);
    mapCanvas.onclick = (event) => {
      const rect = mapCanvas.getBoundingClientRect(),
        fit = Math.min(rect.width / 800, rect.height / 600),
        px = (event.clientX - rect.left - (rect.width - 800 * fit) / 2) / fit,
        py = (event.clientY - rect.top - (rect.height - 600 * fit) / 2) / fit,
        b = world.dungeonBounds,
        scale = Math.min(800 / b.w, 600 / b.h),
        x = b.x + (px - (800 - b.w * scale) / 2) / scale,
        y = b.y + (py - (600 - b.h * scale) / 2) / scale;
      if (x < b.x || y < b.y || x > b.x + b.w || y > b.y + b.h) return;
      mapTarget = {
        name: 'Dungeon Point',
        x: (Math.floor(x) + 0.5) * TILE,
        y: (Math.floor(y) + 0.5) * TILE,
      };
      jump.disabled = false;
      jump.textContent = 'DEBUG · Travel to the selected point';
    };
    $('#cave-actions').append(
      button('DEBUG · Return to the Surface', () => {
        expedition.leave();
        close();
        activateLayer();
      }),
    );
  }
}
function renderCaveMap(c, width, height) {
  const b = world.dungeonBounds,
    scale = Math.min(width / b.w, height / b.h),
    ox = (width - b.w * scale) / 2,
    oy = (height - b.h * scale) / 2;
  c.fillStyle = '#101315';
  c.fillRect(0, 0, width, height);
  for (let y = b.y; y < b.y + b.h; y++)
    for (let x = b.x; x < b.x + b.w; x++) {
      const i = y * W + x;
      if (!world.explored[i] && !(world.debugMode && world.debugMapReveal)) continue;
      c.fillStyle = world.solids[i]
        ? world.tiles[i] === 11
          ? '#535f60'
          : '#343438'
        : world.tiles[i] === 2
          ? '#416e82'
          : world.tiles[i] === 12
            ? '#b5b2a1'
            : world.tiles[i] === 14
              ? '#8a8170'
              : world.visibleCells[i]
                ? '#b29d78'
                : '#666454';
      c.fillRect(ox + (x - b.x) * scale, oy + (y - b.y) * scale, scale + 0.3, scale + 0.3);
    }
  const marker = (p, color, size) => {
    c.fillStyle = color;
    c.beginPath();
    c.arc(ox + (p.x / TILE - b.x) * scale, oy + (p.y / TILE - b.y) * scale, size, 0, Math.PI * 2);
    c.fill();
  };
  marker(world.dungeonExit, '#a8d0bc', width > 200 ? 5 : 2);
  for (const corpse of world.corpses)
    if (corpse.player) marker(corpse, '#d6a35e', width > 200 ? 4 : 2);
  marker(world.player, '#fff3c5', width > 200 ? 5 : 2);
}
function drawPortal(d, exit) {
  const x = d.x,
    y = d.y;
  if (d.buildingId) {
    if (world.interiorAt(world.player)?.id !== d.buildingId) return;
    ctx.fillStyle = '#17221e';
    ctx.fillRect(x - 26, y - 30, 52, 55);
    for (let j = 0; j < 6; j++) {
      ctx.fillStyle = j % 2 ? '#8b8873' : '#6e7364';
      ctx.fillRect(x - 24 + j * 2, y - 24 + j * 9, 48 - j * 4, 6);
    }
    label('STAIRS DOWN · E', x, y - 44, '#dfcda4', 10);
    return;
  }
  if (!exit && d.template && d.template !== 'caves') {
    ctx.fillStyle = d.template === 'ruins' ? '#6b7167' : '#8b8878';
    ctx.fillRect(x - 63, y - 68, 126, 83);
    ctx.fillStyle = '#17201c';
    ctx.fillRect(x - 27, y - 46, 54, 61);
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#aaa58b';
      ctx.fillRect(x + side * 45 - 8, y - 72, 16, 88);
      ctx.fillRect(x + side * 45 - 13, y - 77, 26, 9);
    }
    poly(
      [
        [x - 70, y - 78],
        [x, y - 111],
        [x + 70, y - 78],
      ],
      '#858a79',
    );
    if (d.template === 'ruins') {
      poly(
        [
          [x + 10, y - 90],
          [x + 50, y - 71],
          [x + 25, y - 30],
        ],
        '#304538',
      );
    }
    label(d.template === 'ruins' ? 'FLOODED RUINS' : 'CATACOMBS', x, y - 126, '#d8c6a0', 10);
    return;
  }
  ellipse(x + 4, y + 10, 64, 25, '#09130e88');
  if (exit) {
    ctx.fillStyle = '#a3997c';
    for (let i = 0; i < 6; i++) ctx.fillRect(x - 24 + i * 2, y + 18 - i * 10, 48 - i * 4, 8);
    poly(
      [
        [x - 40, y - 37],
        [x + 40, y - 37],
        [x + 29, y - 78],
        [x - 28, y - 78],
      ],
      '#8e9078',
    );
    label('TO THE SURFACE · E', x, y - 94, '#d9d2a9', 11);
  } else {
    const wet = d.kind === 'underwater';
    poly(
      [
        [x - 66, y + 9],
        [x - 53, y - 35],
        [x - 24, y - 65],
        [x + 22, y - 60],
        [x + 56, y - 26],
        [x + 68, y + 12],
      ],
      wet ? '#536d72' : '#737365',
    );
    ellipse(x, y - 9, 35, 33, '#101a1b');
    ctx.strokeStyle = wet ? '#86b7bd' : '#aa9c7e';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(x, y - 7, 37, Math.PI, Math.PI * 2);
    ctx.stroke();
    if (wet) {
      ellipse(x, y + 7, 54, 12, '#83b2b94d');
      for (let i = 0; i < 3; i++) ellipse(x + 18 + i * 8, y - 50 - i * 17, 3, 3, '#b2d6d5');
    } else {
      ctx.fillStyle = '#ab8758';
      ctx.fillRect(x - 52, y - 13, 6, 29);
      ellipse(x - 49, y - 23, 7, 13, '#d8aa59');
    }
    if (dist(d, world.player) < 440)
      label(d.name + (wet ? ' · underwater' : ''), x, y - 87, '#dbcb9e', 11);
  }
}
function drawCaveFog(left, right, top, bottom) {
  for (
    let y = Math.max(0, Math.floor(top / TILE));
    y <= Math.min(H - 1, Math.ceil(bottom / TILE));
    y++
  )
    for (
      let x = Math.max(0, Math.floor(left / TILE));
      x <= Math.min(W - 1, Math.ceil(right / TILE));
      x++
    ) {
      const i = y * W + x;
      if (world.visibleCells[i]) continue;
      ctx.fillStyle = world.explored[i] ? '#060c10e6' : '#080c0f';
      ctx.fillRect(x * TILE, y * TILE, TILE + 1, TILE + 1);
    }
}
function drawRelicPedestals() {
  for (const p of world.pedestals || []) {
    const x = p.display.x,
      y = p.display.y;
    if (world.relicVault[p.item] > 0) {
      ellipse(x, y - 25, 15, 7, '#c9b37144');
      ctx.fillStyle = '#e0d09b';
      ctx.font = '27px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText(ITEMS[p.item].icon, x, y - 22);
    } else label('EMPTY', x, y - 20, '#b0aa8e', 8);
  }
}
function sanctuaryPlan() {
  const z = world.places.find((z) => z.id === 'cathedral');
  openWindow(
    'map',
    '<div class="eyebrow">CATHEDRAL OF THE LAST LIGHT</div><h1>Courtyard and Three Wings</h1><canvas id="city-plan" width="720" height="620" style="width:100%"></canvas><p>Four library shelves are to the left; stationary and moving dummies to the right. The north wing holds Sophos and nine pedestals. The south gate leads to the approach road.</p><div id="sanctuary-destinations" class="actions"></div>',
  );
  const c = $('#city-plan').getContext('2d'),
    scale = 10,
    ox = z.x - 36,
    oy = z.y - 31;
  c.imageSmoothingEnabled = false;
  c.drawImage(baseMap(), ox, oy, 72, 62, 0, 0, 720, 620);
  for (const b of world.buildings.filter((b) => b.sanctuary && b.enterable)) {
    c.fillStyle = '#20352c';
    c.font = 'bold 11px system-ui';
    c.textAlign = 'center';
    c.fillText(b.name, (b.x + b.w / 2 - ox) * scale, (b.y + b.h / 2 - oy) * scale);
  }
  c.fillStyle = '#fff0b7';
  c.beginPath();
  c.arc(
    (world.player.x / TILE - ox) * scale,
    (world.player.y / TILE - oy) * scale,
    5,
    0,
    Math.PI * 2,
  );
  c.fill();
  const targets = [
    { name: 'Courtyard', ...world.spawn },
    ...world.buildings
      .filter((b) => b.sanctuary && b.enterable)
      .map((b) => ({ name: b.name, ...(world.debugMode ? b.workSpot : b.entrance) })),
  ];
  if (world.trainingRack) targets.push({ name: 'Training Weapons', ...world.trainingRack });
  for (const target of targets)
    $('#sanctuary-destinations').append(
      button((world.debugMode ? 'DEBUG · ' : '') + target.name, () => {
        if (world.debugMode) {
          const result = world.debugTravel(target);
          if (!result.ok) return toast(result.message);
          camera = { x: world.player.x, y: world.player.y };
        } else mapTarget = target;
        close();
      }),
    );
}
function drawLogPile(p) {
  const n = Math.min(12, p.inventory.log);
  for (let i = 0; i < n; i++) {
    const x = p.x + (i % 4) * 10 - 15,
      y = p.y - Math.floor(i / 4) * 8;
    ctx.fillStyle = '#88704b';
    ctx.fillRect(x - 18, y - 6, 36, 9);
    ellipse(x + 18, y - 2, 5, 5, '#c2a575');
    ellipse(x + 18, y - 2, 2, 2, '#86673f');
  }
  if (dist(p, world.player) < 160) label('Logs × ' + p.inventory.log, p.x, p.y - 36, '#d4bf8f', 9);
}
function speechBubble(e) {
  ctx.font = '10px Manrope,system-ui';
  const words = (e.announcement || '').split(' '),
    lines = [];
  let line = '';
  for (const word of words) {
    if (ctx.measureText(line + ' ' + word).width > 235 && line) {
      lines.push(line);
      line = word;
    } else line += (line ? ' ' : '') + word;
  }
  if (line) lines.push(line);
  const x = e.x,
    y = e.y - 80 - lines.length * 15;
  ctx.fillStyle = '#14231de8';
  ctx.strokeStyle = '#b8a47077';
  ctx.fillRect(x - 130, y, 260, lines.length * 15 + 18);
  ctx.strokeRect(x - 130, y, 260, lines.length * 15 + 18);
  ctx.fillStyle = '#ded4b2';
  ctx.textAlign = 'center';
  lines.forEach((t, i) => ctx.fillText(t, x, y + 17 + i * 15));
}

$('#horse-control').onclick = () => {
  if (started && !modal && !paused) rideAction();
};
