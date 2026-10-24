import assert from 'node:assert/strict';
import {World,W,TILE} from '../simulation.js';
import {arkRadius,desertAt,purpleAt} from '../lore-world.js';
import {createHash} from 'node:crypto';
const hash=x=>createHash('sha256').update(x).digest('hex'),angles=new Set();
for(let n=0;n<20;n++){
 const w=new World(n?'alien-region-'+n:'oak',{generatorVersion:11}),a=w.loreGeography.ark;
 assert.equal(w.generatorVersion,11);assert.ok(Math.max(...Array.from({length:64},(_,i)=>arkRadius(a,i*Math.PI/32)))-Math.min(...Array.from({length:64},(_,i)=>arkRadius(a,i*Math.PI/32)))>.25);
 const gate=a.gate;assert.ok(!w.blocked(gate.x,gate.y),'dry pass');assert.ok(!purpleAt(w,gate),'suit giver outside atmosphere');
 const resident=w.entities.find(e=>e.role==='arctMiner');assert.ok(w.path(gate,resident).length,'pass reaches basin');
 angles.add(Math.round(Math.atan2(gate.y/TILE-a.y,gate.x/TILE-a.x)*4/Math.PI));
 for(let i=0;i<w.roadMask.length;i++)if(w.roadMask[i])assert.equal(desertAt(w,i%W,Math.floor(i/W)),false,'no desert highways');
 for(let y=a.y-50;y<a.y+50;y++)for(let x=a.x-50;x<a.x+50;x++)if(w.arkAtmosphere[y*W+x])assert.ok(purpleAt(w,{x:(x+.5)*TILE,y:(y+.5)*TILE}));
 assert.equal(w.places.filter(z=>z.nomadClan).length,6);const clans=[...new Set(w.entities.filter(e=>e.race==='emralaan').map(e=>e.faction))];assert.equal(clans.length,6);
 const riders=clans.map(f=>w.entities.find(e=>e.faction===f));assert.ok(w.hostile(riders[0],riders[1]));assert.equal(w.hostile(riders[0],w.entities.find(e=>e!==riders[0]&&e.faction===clans[0])),false);
 assert.ok(w.alienFlora.length>100);const homes=w.buildings.filter(b=>b.type==='house'&&b.w>=8);assert.ok(homes.length>30);assert.ok(homes.every(b=>b.furniture.filter(f=>f.kind==='bed').length>=4));for(const b of w.buildings.filter(b=>b.type==='house'||b.type==='arkVault'))assert.ok(w.path(b.entrance,b.workSpot).length,'shared bedroom has a working doorway');
 if(n===0){const i=w.arkAtmosphere.findIndex(Boolean),old=w.tiles[i],p={x:(i%W+.5)*TILE,y:(Math.floor(i/W)+.5)*TILE};for(const tile of [1,4,5]){w.tiles[i]=tile;assert.ok(purpleAt(w,p),'roads and water do not erase atmosphere');}w.tiles[i]=old;const restored=World.restore(w.save());assert.equal(hash(w.tiles),hash(restored.tiles));assert.deepEqual(w.alienFlora,restored.alienFlora);assert.deepEqual(w.arkAtmosphere,restored.arkAtmosphere);}
 console.log('✓',w.seed,'gate',gate,'flora',w.alienFlora.length);
}
assert.ok(angles.size>=2,'entrance follows neighboring road rather than fixed southern point');
console.log('✓ Irregular atmosphere, variable dry entrance, six hostile clans, no desert roads, shared homes, alien flora and save roundtrip');

// Faction hostility must reach the real combat loop, not merely a map label.
{const w=new World('clan-skirmish');w.entities=[];w.corpses=[];w.player.x=100*TILE;w.player.y=100*TILE;for(let y=190;y<220;y++)for(let x=990;x<1030;x++){const i=y*W+x;w.tiles[i]=15;w.solids[i]=0;w.walls[i]=0;w.roomGrid[i]=0;}const a=w.add('nomad','emralaan-0',1000,200,'Синий'),b=w.add('nomad','emralaan-1',1002,200,'Красный');for(const e of [a,b]){e.loreActor=true;e.race='emralaan';e.inventory={sword:1};e.hp=e.maxHp=150;}w.rebuildSpatial();for(let i=0;i<70;i++)w.update(.15);assert.ok(a.hp<150&&b.hp<150,'Both clans actually attack each other');console.log('✓ Rival clans fight through the real AI and combat loop');}
