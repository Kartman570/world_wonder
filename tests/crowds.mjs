import assert from 'node:assert/strict';
import {World,TILE,W} from '../simulation.js';
import {bodyRadius} from '../actor-collision.js';
import {recordCrime,lawActorAI} from '../law.js';
function fixture(){const w=new World('crowd-fixture');w.entities=[];w.cities=[];w.prisons=[];w.prisonGateGrid.clear();w.player.x=100;w.player.y=100;w.respawn={x:0,y:0};for(let y=180;y<225;y++)for(let x=180;x<225;x++){const i=y*W+x;w.tiles[i]=3;w.solids[i]=0;w.walls[i]=0;w.roomGrid[i]=0;}w.rebuildSpatial();return w;}
function run(w,actors,seconds,dt=.15){for(let t=0;t<seconds;t+=dt){w.elapsed+=dt;w.rebuildSpatial();for(const e of actors)if(Math.hypot(e.x-e.goal.x,e.y-e.goal.y)>16)w.move(e,e.goal.x,e.goal.y,90,dt);for(let i=0;i<actors.length;i++)for(let j=0;j<i;j++)assert.ok(Math.hypot(actors[i].x-actors[j].x,actors[i].y-actors[j].y)>=bodyRadius(actors[i])+bodyRadius(actors[j])-.3,'Solid bodies do not pass through each other');}}
{
 const w=fixture(),actors=[];for(const side of [-1,1])for(let i=0;i<12;i++){const e=w.add('citizen','oak',200+side*(4+Math.floor(i/4)*.7),200+(i%4-1.5)*.7);e.goal={x:(200-side*(6+Math.floor(i/4)*.7))*TILE,y:e.y};actors.push(e);}run(w,actors,40);const arrived=actors.filter(e=>Math.hypot(e.x-e.goal.x,e.y-e.goal.y)<25).length;assert.ok(arrived===24,`Opposing crowds pass: ${arrived}/24 arrived`);console.log('✓ Встречные толпы: '+arrived+'/24 дошли без прохождения друг сквозь друга');
}
{
 const w=fixture();for(let y=180;y<225;y++)if(y!==200){w.solids[y*W+200]=1;w.walls[y*W+200]=1;}const actors=[];for(const side of [-1,1])for(let i=0;i<3;i++){const e=w.add('citizen','oak',200+side*(2+i*.8)+.5,200.5);e.goal={x:(200-side*(4+i*.8))*TILE+24,y:e.y};actors.push(e);}run(w,actors,35);const arrived=actors.filter(e=>Math.hypot(e.x-e.goal.x,e.y-e.goal.y)<25).length;assert.equal(arrived,6,`Single door traffic: ${arrived}/6 arrived`);console.log('✓ Встречные NPC уступают дорогу в проёме шириной в одну клетку');
}
{
 const w=fixture(),p=w.player;Object.assign(p,{x:200.5*TILE,y:200.5*TILE,weaponDrawn:false});w.cities=[{id:'oak',x:200,y:200,rx:25,ry:25}];const blocked=w.add('guard','oak',202.5,200.5),reachable=w.add('guard','oak',200.5,202.55);w.solids[200*W+201]=1;w.walls[200*W+201]=1;recordCrime(w,'oak','weapon');w.rebuildSpatial();let dialogs=0;w.onDetention=()=>dialogs++;lawActorAI(w,blocked,.15);assert.equal(w.detention,null);lawActorAI(w,reachable,.15);assert.equal(w.detention.guard,reachable.id,'First reachable guard handles arrest, not nearest through wall');lawActorAI(w,blocked,.15);lawActorAI(w,reachable,.15);assert.equal(dialogs,1,'One conversation is claimed atomically');
 const v=fixture();Object.assign(v.player,{x:200*TILE,y:200*TILE,weaponDrawn:false});v.cities=[{id:'oak',x:200,y:200,rx:25,ry:25}];const guards=[v.add('guard','oak',204,200),v.add('guard','oak',200,204),v.add('guard','oak',196,200)];recordCrime(v,'oak','weapon');v.rebuildSpatial();for(const g of guards){const before={x:g.x,y:g.y};lawActorAI(v,g,.15);assert.ok(Math.hypot(g.x-before.x,g.y-before.y)>0,'Every guard approaches a surrendered suspect');}console.log('✓ Все стражники подходят; первый доступный начинает единственный диалог');
}
