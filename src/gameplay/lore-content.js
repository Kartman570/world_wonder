// These are the names and observations available to people of this age.
// The historical explanation belongs in the author's notes, never in the codex.
export const RELICS = [
  {
    item: 'relic',
    name: 'Dawn Shard',
    icon: '✧',
    act: 0,
    reward: 120,
    title: 'Light Beneath the Ash',
    clue: 'A flat shard remains in a casket among the old ruins. Do not hold it to your eyes.',
    description:
      'A dark plate with no hammer marks. A thin rainbow rests on its chipped edge; in sunlight it seems deeper than the stone itself.',
    receipt: 'Do not look at the light through it. It will be quieter here.',
  },
  {
    item: 'moonRelic',
    name: 'Moon Seal',
    icon: '☾',
    act: 0,
    reward: 180,
    title: 'A Seal Without a Letter',
    clue: 'Seek a circle with three open grooves beneath the stones of the nameless barrow.',
    description:
      'A round object marked by three grooves. A warm palm leaves a pale imprint that takes time to fade.',
    receipt: 'This seal promises its owner nothing. Good that you did not search for its lock.',
  },
  {
    item: 'tideRelic',
    name: 'Heart of the Tide',
    icon: '❖',
    act: 0,
    reward: 180,
    title: 'The Weight of Still Water',
    clue: 'A heavy object is hidden in the flooded shrine; nearby water lies unnaturally still.',
    description:
      'A small, heavy block. Place it on a table, and water droplets slowly gather along one edge.',
    receipt: 'Leave the wet cloth outside. I can manage from here.',
  },
  {
    item: 'hushLens',
    name: 'Blind Eye',
    icon: '◉',
    act: 1,
    reward: 260,
    title: 'An Alien Wonder',
    clue: 'The keeper of the Voiceless Chapel holds the Blind Eye and calls it sacred. He will not give it willingly. If he drops it, let him go. Leave his attendants alone: they do not know what they guard.',
    description:
      'A dark slit turns inside cloudy glass, though nothing outside moves. A small bell sounds duller when held near it.',
    receipt: 'He believed he was protecting people. I hope he can still find another calling.',
  },
  {
    item: 'threadSpool',
    name: 'Endless Thread',
    icon: '≋',
    act: 1,
    reward: 240,
    title: 'The Price of a Bandit’s Trophy',
    clue: 'A forest gang’s chief carries a spool untouched by rust. It is in his bag, not the camp chest.',
    description:
      'A spool of almost invisible thread. No end can be found; your fingers feel its pull long after touching it.',
    receipt: 'Do not try to cut the thread. Set down the whole spool.',
  },
  {
    item: 'mirrorSeed',
    name: 'Mirror Garden Seed',
    icon: '◈',
    act: 1,
    reward: 280,
    title: 'A Garden Without a Gardener',
    clue: 'Overgrown stone honeycombs stand by the Silk Road. One still holds a smooth seed. Do not taste their fruit or the water in their bowls.',
    description:
      'A smooth seed beneath a transparent crust. Thin branches reflect across its surface, even in an empty room.',
    receipt: 'The garden must grow no further. Leave the seed with me.',
  },
  {
    item: 'windKnot',
    name: 'Wind Knot',
    icon: '⌘',
    act: 2,
    reward: 350,
    title: 'Wind Tamer’s Saddle',
    clue: 'The Wasteland’s nomad chief tied the Wind Knot to his unicorn’s saddle. His band tolerates no strangers. The winged camp attendants are not your enemies.',
    description: 'Several nested rings that never touch. Nearby sand forms ridges across the wind.',
    receipt: 'I hope the winged attendants got clear. This knot will stay here.',
  },
  {
    item: 'breathVessel',
    name: 'Vessel of Alien Breath',
    icon: '♧',
    act: 2,
    reward: 320,
    title: 'Below the Purple Boundary',
    clue: 'An abandoned workshop lies in New Arctaria’s crater. Its owners are friendly but do not understand our words. Before descending, accept their help on the upper ledge.',
    description:
      'A sealed vessel with a violet rim. Its empty interior sometimes arranges itself into regular layers.',
    receipt:
      'They let you descend? Then you found a way to hear them. Take care of what they gave you.',
  },
  {
    item: 'brokenCrown',
    name: 'Crown of the Empty Door',
    icon: '⌁',
    act: 2,
    reward: 400,
    title: 'The Door That Is Not There',
    clue: 'An open frame stands in the Field of Shards. The Crown lies at its base. Do not step into drifting gaps merely to shorten your road.',
    description:
      'A broken arc with smooth teeth along its inner edge. Looking down its length, distant objects briefly slip out of alignment with their outlines.',
    receipt: 'Leave me for a while now. No, we will not open the door. Not today.',
  },
];
export const RELIC_KEYS = RELICS.map((r) => r.item);
export const LORE_ITEMS = {
  spore: {
    name: 'Pale Nodule',
    icon: '◌',
    price: 0,
    description: 'A springy, warm fold. Sometimes it contracts on its own.',
  },
  spiderChitin: {
    name: 'Chitin Shell',
    icon: '⬡',
    price: 12,
    description: 'Dry plates of spider chitin.',
  },
  venomGland: {
    name: 'Spider Venom Gland',
    icon: '◍',
    price: 18,
    description: 'A dense sac of caustic, transparent liquid.',
  },
  arkCutter: {
    name: 'Ribbed Handle',
    icon: '≋',
    price: 0,
    description:
      'A heavy handle with an empty ring instead of a blade. Squeezing it makes distant edges lose alignment. Cold lingers on the palm.',
  },
  breathSuit: {
    name: 'Sealed-Breath Garment',
    icon: '♙',
    price: 0,
    description:
      'A tight shell with a transparent face. Its seams press themselves together. Wearing it lets you descend into the purple air.',
  },
};
export const LORE_ROLES = {
  nomad: 'Emralaand Rider',
  nomadArcher: 'Emralaand Archer',
  fairy: 'Winged Attendant',
  arctMiner: 'Arctarian Miner',
  arctarian: 'Arctarian Artisan',
  arctRescuer: 'Arctarian Greeter',
  relicKeeper: 'Chapel Keeper',
};
export const OBSERVATIONS = {
  'evening-hare': {
    title: 'Evening Sunbeam',
    text: 'Rows of black rectangles rise from the water. Each reflects sunlight at the same angle. Fishers steer their nets around them.',
  },
  'cold-roots': {
    title: 'Cold Roots',
    text: 'Regular ribs stretch beneath the water by the cathedral shore. Warm silt never settles on the nearby stones.',
  },
  'old-pine': {
    title: 'Uarelon Tree',
    text: 'A crooked pine clings to bare stone. The fence reads: “Be like the Uarelon Tree.” Nobody remembers who brought its seed.',
  },
  'cut-stone': {
    title: 'Edge of the Old Road',
    text: 'A smooth black strip ends inside the cliff. Identical white dashes disappear beneath roots; the masons know no such stonework.',
  },
  'silk-road': {
    title: 'Silk Road',
    text: 'A dense pale canopy hangs between the rocks. Its threads reach trees far beyond the gorge. Something deep inside shifts its supports.',
  },
  garden: {
    title: 'Garden of Stone Honeycombs',
    text: 'Empty cradles are coated with the same film. Toothed leaves sprout from some; others hold bones with remarkably similar curves.',
  },
  eye: {
    title: 'Mark of the Closed Eye',
    text: 'On a chipped slab, five rays cross out an eye. The mark is older than the wooden chapel above it. People bring flowers, but nobody reads its letters.',
  },
  'ark-gate': {
    title: 'Upper Ledge',
    text: 'Purple air pools below the stone boundary like water. Huge eyeless hosts point to your chest, then to a sealed shell. Their gestures hold no threat.',
  },
  'ark-work': {
    title: 'Circles Beneath the Mist',
    text: 'The artisan’s broad arms end in different tools. They remove one and fit another in the same motion. Waste from one workbench is collected for the next.',
  },
  'ark-hull': {
    title: 'Half the Sky',
    text: 'A semicircular hull hangs above the basin. Dust trembles underneath, but there are no chains or flames. Half of a similar shell serves as a roof.',
  },
  'blue-fire': {
    title: 'Blue Rest',
    text: 'Tall riders wear face wraps, even beside the fire. Small winged attendants mend their straps, while only the wingless carry weapons.',
  },
  barrier: {
    title: 'Teraquar Barrier',
    text: 'The old barrier has handrails at two heights: very low and above a human head. Narrow walkways suit those who do not travel on the ground.',
  },
  frame: {
    title: 'Empty Frame',
    text: 'Two broad arches stand without gates or hinges. The stone on one side is cut so smoothly that the skyline appears in its reflection. Sometimes the air between the arches differs from the air beyond them.',
  },
  'vampire-water': {
    title: 'Pale Shore',
    text: 'Abandoned bowls line the stream. A house wall bears marks of children’s heights, all low. The doors show no claw marks, only bolts on the inside.',
  },
};
