import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {SpriteSheets} from '../sprite-sheets.js';
import {EnvironmentSprites,mountedPose,environmentId} from '../environment-sprites.js';
const manifest=JSON.parse(await fs.readFile(new URL('../graphics/sprites/manifest.json',import.meta.url)));
const images=new Map(manifest.catalog.filter(e=>e.file).map(e=>[e.file,{width:e.frameWidth*(e.type==='character'?8:1),height:e.frameHeight*e.frames}]));
for(const e of manifest.catalog)for(const p of Object.values(e.components||{}))images.set(p.file,{width:p.frameWidth,height:p.frameHeight});
const sheets=new SpriteSheets({maxBytes:256*1024*1024,fetcher:async()=>({ok:true,json:async()=>manifest}),imageLoader:async url=>{const key=decodeURIComponent(new URL(url).pathname.split('/sprites/')[1]);assert.ok(images.has(key),key);return images.get(key);}});await sheets.ready;
const env=new EnvironmentSprites(sheets),player={role:'player',riding:1,hp:100},horse={role:'horse',hp:100};await env.warm([player,horse]);
const calls=[],c={save(){},restore(){},drawImage(...args){calls.push(args)}};
for(const id of ['fountain','statue','alien_tree_0','alien_tree_1','alien_tree_2','oak','birch','pine','flagpole','flag','bed','loom','anvil','fountain_water']){assert.equal(env.draw(c,id,100,100,{time:1}),true,id);assert.ok(sheets.assets.get(id).image,id+' decoded');}
assert.equal(calls.length,14);assert.equal(env.draw(c,'not_exported',0,0),false);assert.equal(environmentId('sewingTable'),'sewing_table');
const pose={x:100,y:100,dir:0,walk:0},mounted=mountedPose(sheets,player,horse,pose);assert.equal(mounted.animation,'ride');assert.ok(mounted.y<pose.y&&mounted.y>pose.y-40,'pelvis meets saddle instead of floating 47 px above ground origin');
assert.ok(sheets.bytes<256*1024*1024,'startup scene fits cache budget');
console.log('✓ Environment PNG/dynamic rows, all requested object categories, preload budget and rider attachment alignment');
// A trunk may be outside the viewport while the crown still intersects it.
const oak=env.bounds('oak',400,500,{scale:1.8});
assert.equal(env.visible('oak',400,500,{left:oak.left,top:oak.top,right:399,bottom:499},{scale:1.8}),true);
assert.equal(env.visible('oak',400,500,{left:oak.right+1,top:0,right:oak.right+50,bottom:900},{scale:1.8}),false);
const before=calls.length;assert.equal(env.draw(c,'dummy_static',200,200),true);assert.equal(env.camp(c,{x:400,y:400,fireUntil:200},100),true);
for(const kind of ['arkRock','arkGarden','arkFilter','arkResonator','arkNest','arkVessel'])assert.equal(env.prop(c,{kind,x:3,y:3,w:2,h:2},1),true,kind);
const wallCalls=[];const wc={...c,drawImage(...args){wallCalls.push(args)}};
const world={dungeonSpec:{},tile(x,y){return y===1&&x>=0&&x<5?3:x===3?11:7;}};
env.dungeonWalls(wc,world,{left:0,right:200,top:0,bottom:200},1);
assert.ok(wallCalls.some(args=>args[0]===sheets.assets.get('cave_wall').image));
assert.ok(wallCalls.some(args=>args[0]===sheets.assets.get('catacomb_wall').image));
// Idle buildings must stay decoded after the ordinary character cache is trimmed.
sheets.maxBytes=1;for(const r of sheets.resources.values())r.used=-100000;sheets.trim();
assert.ok(sheets.assets.get('building_smith#roof')?.image,'building components are pinned');
assert.ok(sheets.assets.get('oak')?.image,'trees are pinned');
assert.ok(calls.length>before);
console.log('✓ Off-screen crowns remain visible, dummy/camp/alien props and both dungeon wall sets draw; environment survives LRU pressure');
