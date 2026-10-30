import { RELIC_KEYS } from './lore-content.js';
import { point } from '../core/content.js';
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const CHAPTERS = [
  [
    'welcome',
    'A Bell for the Wanderer',
    'Find Sophos in the cathedral’s north hall. Approach and press E.',
    'I have been waiting, wanderer. Beyond these walls, the world lives without orders: people work, caravans trade, and bandits go hungry. You are no wizard. Let us begin with what will keep you alive. Your main task is on the first conversation tab; questions about the world are separate. You can ask them at any time.',
  ],
  [
    'orientation',
    'First Steps',
    'Walk 150 pixels, then run using Shift, open the map M, bag I and journal J.',
    'WASD or arrow keys to walk, Shift — to run. Stamina recovers while you rest. The map M shows the roads; choosing a destination gives a bearing, not automatic movement. Close a window by pressing its key again, Esc or by clicking outside.',
  ],
  [
    'library',
    'Four Shelves',
    'Visit the west wing and read the instruction shelf: approach it and press E.',
    'Instructions, creatures, discoveries, and chronicles each have a library shelf. You can also open help with H, but find a real shelf for this lesson: doors lead into rooms without leaving the world.',
  ],
  [
    'sword',
    'Steel Follows the Hand',
    'Draw your sword in the east training hall with R and hit a stationary dummy. Aim your strike with the mouse.',
    'Swords hit one enemy, axes strike everyone in an arc, and hammers stun for one second. Large beasts can knock you senseless too. R draws and sheathes your weapon. Entering town with a sword ready attracts the guards’ suspicion.',
  ],
  [
    'moving',
    'Keep Moving in Combat',
    'Hit the moving dummy with a melee weapon. You can strike while moving.',
    'Keep moving and choose your moment. Enemies flank, retreat, and assess their strength. Bodies occupy space: a crowd can block your path. Training dummies let you practice safely.',
  ],
  [
    'bow',
    'Thread of Aim',
    'Q switches slots. Equip the bow, click a dummy to lock on, and hit it with an arrow.',
    'Aim a bow with the mouse. The first click locks a target; Space then shoots at it. RMB clears the lock. Arrows are real and consumed; training arrows return after hitting a dummy. Configure weapon slots in I.',
  ],
  [
    'craft',
    'Hands Remember',
    'Sheathe your weapon for R. Open C and craft bandages from cloth. Wait for the work to finish.',
    'I offer cloth and dressings for the road. Crafting takes time and materials; complex work needs a workshop and experience. X cancels work and returns materials. Bandages help after combat: in I use it if you are wounded.',
  ],
  [
    'departure',
    'The Last Wizard’s Task',
    'Return to Sophos for your task on the road.',
    'The Dawn Shard lies in the ruins. It will grant you no spells: only I can speak to ancient stone. Return any relic you find to my pedestal, and our lesson ends. First, find allies in a settlement along the road.',
  ],
  [
    'city',
    'Foreign Gates',
    'Reach the marked settlement with your weapon sheathed.',
    'Follow the road: deep forest slows and darkens your journey. You can swim rivers, but currents carry you; lakes have no current. At night, townsfolk go home and guards stay outside. Animals and gangs do not wait for your arrival.',
  ],
  [
    'people',
    'A Town Is Its People',
    'Speak to a quartermaster, ruler, or peaceful resident in the chosen settlement.',
    'An ordinary resident is no trader. Find weapons at a smithy, food at a farm shop, and medicine at a herbalist’s. Enter through the door. Quartermasters handle contracts; only a large city has a king.',
  ],
  [
    'trade',
    'The Price of Trust',
    'Buy or sell at least one item with a local trader.',
    'A purchase moves the item and money between real inventories. Blacksmiths do not buy fish. Complete tasks to earn discounts through reputation; good standing lets you hire a hunter. V — gives companion orders. Buy lodging and treatment by speaking to the relevant worker.',
  ],
  [
    'service',
    'One Who Helps',
    'Complete any side quest and report to its giver. The quartermaster offers a training delivery of two herbs.',
    'Gather herbs with E and bring them to the warehouse. B — notice board, J — opens the journal. Some orders have deadlines; rewards come from the treasury. Towns depend on local supplies: hunger brings sickness. N shows news, O — opens the carpenter’s projects. You can change settlement life.',
  ],
  [
    'artifact',
    'Beyond the Last Light',
    'Find the marked casket in the ruins. E opens loot; Take moves the artifact to your bag.',
    'Caravans carry real goods; gangs rob them and fight each other. People can die, and their bodies contain what they actually made. Cave, catacomb, and ruin entrances lead underground, where the map is revealed gradually. Companions wait on the surface.',
  ],
  [
    'return',
    'Home by Dawn',
    'Return the relic you found to Sophos in the cathedral’s north hall.',
    'In the wild, pitch a camp through C: rest requires food and fire. The chest can be looted. After death, a new person arrives at the cathedral with a clean reputation. The previous wanderer’s body remains in the world; guards will not release their belongings to a successor. Do not draw weapons before guards: two warnings, then a warrant. Surrender may mean a fine or prison. Towns remember crimes.',
  ],
].map(([id, title, task, text]) => ({ id, title, task, text }));
export function startCampaign(w) {
  if (w.dungeonSpec || w.campaign) return false;
  const wizard = w.entities.find((e) => e.role === 'wizard');
  if (wizard)
    for (const [k, n] of Object.entries({ sword: 1, bow: 1, arrow: 40, cloth: 6 }))
      wizard.inventory[k] = (wizard.inventory[k] || 0) + n;
  const relic = w.landmarks.find((l) => l.item === 'relic'),
    origin = w.spawn || w.respawn,
    city = [...w.cities].sort(
      (a, b) =>
        distance(point(a.x, a.y), origin) +
        distance(point(a.x, a.y), relic) -
        distance(point(b.x, b.y), origin) -
        distance(point(b.x, b.y), relic),
    )[0];
  w.campaign = {
    version: 1,
    status: 'active',
    stage: 0,
    city: city.id,
    relic: 'relic',
    facts: {},
    history: [],
    started: w.time,
    origin: { x: w.player.x, y: w.player.y },
    walk: 0,
    run: 0,
    baselineCraft: w.player.crafted?.bandage || 0,
  };
  w.player.inventory.cloth = Math.max(2, w.player.inventory.cloth || 0);
  w.log('The Bell and Dawn campaign: find Sophos in the cathedral’s north hall.');
  return true;
}
export function campaignEvent(w, event, data = {}) {
  const c = w.campaign;
  if (c?.status !== 'active') return;
  const f = c.facts;
  switch (event) {
    case 'window':
      f[data.kind] = true;
      break;
    case 'walk':
      c.walk += data.distance || 0;
      if (data.run) c.run += data.distance || 0;
      break;
    case 'shelf':
      f.shelf = true;
      break;
    case 'dummy':
      if (data.ranged) f.bow = true;
      else if (data.moving) f.moving = true;
      else f.sword = true;
      break;
    case 'trade':
      if (data.city === c.city) f.trade = true;
      break;
    case 'talk':
      if (data.city === c.city) f.talk = true;
      break;
  }
  updateCampaign(w);
}
function advance(w) {
  const c = w.campaign,
    chapter = CHAPTERS[c.stage];
  c.history.push({ id: chapter.id, title: chapter.title, at: w.time });
  c.stage++;
  w.log('Campaign: ' + CHAPTERS[c.stage].title + '. ' + CHAPTERS[c.stage].task);
}
export function updateCampaign(w) {
  const c = w.campaign;
  if (!c || c.status !== 'active') return;
  if (w.returnedRelics.length) {
    if (CHAPTERS[c.stage]?.id === 'return')
      c.history.push({ id: 'return', title: CHAPTERS[c.stage].title, at: w.time });
    c.status = 'completed';
    c.completed = w.time;
    w.log(
      'The Bell and Dawn campaign is complete. The artifact has returned to its pedestal. The world is open: continue your journey.',
    );
    return;
  }
  const f = c.facts,
    chapter = CHAPTERS[c.stage];
  if (!chapter) return;
  let done = false;
  switch (chapter.id) {
    case 'orientation':
      done = c.walk >= 150 && c.run >= 60 && f.map && f.inventory && f.journal;
      break;
    case 'library':
      done = f.shelf;
      break;
    case 'sword':
      done = f.sword;
      break;
    case 'moving':
      done = f.moving;
      break;
    case 'bow':
      done = f.bow;
      break;
    case 'craft':
      done = (w.player.crafted?.bandage || 0) > c.baselineCraft;
      break;
    case 'city':
      done = !w.dungeonSpec && w.inCity(w.player)?.id === c.city && !w.player.weaponDrawn;
      break;
    case 'people':
      done = f.talk;
      break;
    case 'trade':
      done = f.trade;
      break;
    case 'service':
      done = w.quests.some((q) => q.status === 'completed');
      break;
    case 'artifact':
      done = RELIC_KEYS.some((k) => w.player.inventory[k] > 0);
      break;
  }
  if (done) advance(w);
}
export function campaignLesson(w) {
  const c = w.campaign;
  return c?.status === 'active' ? CHAPTERS[c.stage] : null;
}
export function campaignWizard(w) {
  const c = w.campaign,
    lesson = campaignLesson(w);
  if (!lesson)
    return {
      ok: false,
      message:
        c?.status === 'completed'
          ? 'You have brought back the light. Choose your own road now: other discoveries, towns, and distant lands still await you.'
          : 'Campaign not started.',
    };
  if (!['welcome', 'departure'].includes(lesson.id))
    return { ok: true, message: lesson.text + ' ' + lesson.task };
  if (lesson.id === 'departure') w.quest = true;
  const message = lesson.text;
  advance(w);
  return { ok: true, message: message + ' ' + CHAPTERS[c.stage].task };
}
export function campaignTarget(w) {
  const c = w.campaign,
    lesson = campaignLesson(w);
  if (!lesson) return null;
  const wizard = w.entities.find((e) => e.role === 'wizard'),
    city = w.cities.find((z) => z.id === c.city);
  switch (lesson.id) {
    case 'welcome':
    case 'departure':
    case 'return':
      return wizard ? { name: 'Sophos · ' + lesson.title, x: wizard.x, y: wizard.y } : null;
    case 'library':
      return { name: 'Instruction Shelf', ...w.libraryShelves?.find((s) => s.tab === 'guide') };
    case 'sword':
    case 'moving':
    case 'bow': {
      const e = w.entities.find((e) => e.role === 'dummy' && e.moving === (lesson.id === 'moving'));
      return e ? { name: e.name, x: e.x, y: e.y } : null;
    }
    case 'city':
      return { name: city.name, ...point(city.x, city.y) };
    case 'people':
    case 'service': {
      const e = w.entities.find(
        (e) => e.hp > 0 && e.faction === city.id && e.role === 'quartermaster',
      );
      return e ? { name: e.name, x: e.x, y: e.y } : { name: city.name, ...point(city.x, city.y) };
    }
    case 'trade': {
      const e = w.entities.find((e) => e.hp > 0 && e.shopkeeper && e.faction === city.id);
      return e ? { name: e.name, x: e.x, y: e.y } : { name: city.name, ...point(city.x, city.y) };
    }
    case 'artifact':
      return { ...w.landmarks.find((l) => l.item === c.relic), name: 'Dawn Casket' };
    default:
      return null;
  }
}
export function campaignSupplyOffer(w, city) {
  if (w.campaign?.status !== 'active' || city !== w.campaign.city) return null;
  return {
    id: 'campaign-herbs',
    city,
    giver: 'quartermaster',
    type: 'commission',
    item: 'herb',
    count: 2,
    reward: 30,
    deadline: null,
    title: 'A Small Favor: Herbs for the Road Healer',
  };
}
export function campaignTrainingSupplies(w) {
  const c = w.campaign,
    lesson = campaignLesson(w),
    wizard = w.entities.find((e) => e.role === 'wizard');
  if (
    !lesson ||
    !wizard ||
    !w.canInteract(w.player, wizard, 130) ||
    !['welcome', 'orientation', 'library', 'sword', 'moving', 'bow', 'craft', 'departure'].includes(
      lesson.id,
    )
  )
    return { ok: false, message: 'Training supplies are available from Sophos before you leave.' };
  let count = 0;
  const wants =
    lesson.id === 'craft'
      ? { cloth: 1 }
      : lesson.id === 'bow'
        ? { bow: 1, arrow: 8 }
        : { sword: 1 };
  for (const [k, n] of Object.entries(wants)) {
    const take = Math.min(Math.max(0, n - (w.player.inventory[k] || 0)), wizard.inventory[k] || 0);
    if (take) {
      wizard.inventory[k] -= take;
      w.player.inventory[k] = (w.player.inventory[k] || 0) + take;
      count += take;
    }
  }
  return {
    ok: count > 0,
    message: count
      ? 'Take any training supplies you lack from my stock. Check your weapon slots in I.'
      : 'You already have what the lesson needs, or my training stock is exhausted.',
  };
}
