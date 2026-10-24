import assert from 'node:assert/strict';
import {World,TILE,W} from '../simulation.js';
import {beginStrike,tickCombat,aimPlayer,guardWarnings,combatAI,assessForces} from '../combat.js';
import {movePlayer} from '../player-movement.js';
import {bodyRadius} from '../actor-collision.js';
function arena(){const w=new World('combat-fixture');w.entities=[];w.corpses=[];w.effects=[];w.cities=[];w.respawn={x:0,y:0};Object.assign(w.player,{x:200*TILE+24,y:200*TILE+24,inventory:{sword:1,axe:1,hammer:1,bow:1,arrow:40},weaponDrawn:true,drawUntil:0,aimAngle:0,stamina:300});for(let y=190;y<220;y++)for(let x=190;x<230;x++){const i=y*W+x;w.tiles[i]=1;w.solids[i]=0;w.walls[i]=0;w.roomGrid[i]=0;}w.rebuildSpatial();return w;}
function target(w,dx,dy,role='citizen',faction='red'){const p=w.player,e=w.add(role,faction,(p.x+dx)/TILE,(p.y+dy)/TILE);e.hp=e.maxHp=100;e.inventory={sword:1};w.rebuildSpatial();return e;}
function release(w,t=.35){w.elapsed+=t;tickCombat(w,w.player,t);}
{
 const w=arena(),a=target(w,53,-15),b=target(w,58,18),behind=target(w,-40,0);w.player.weaponDrawn=false;assert.equal(w.attackPlayer().ok,false);w.toggleWeapon();assert.equal(w.attackPlayer().ok,false);w.elapsed+=.3;const x=w.player.x;assert.equal(w.attackPlayer().ok,true);assert.equal(a.hp,100);movePlayer(w,1,0,false,.03);assert.ok(w.player.x>x);release(w,.13);assert.equal([a,b].filter(e=>e.hp<100).length,1);assert.equal(behind.hp,100);
}
{
 const w=arena(),a=target(w,52,-22),b=target(w,55,23),behind=target(w,-45,0);w.equip('melee','axe');assert.ok(w.attackPlayer().ok);release(w);assert.ok(a.hp<100&&b.hp<100);assert.equal(behind.hp,100);
}
{
 const w=arena(),e=target(w,55,0);w.equip('melee','hammer');w.attackPlayer();release(w);assert.equal(e.stunUntil,w.elapsed+1);const x=e.x;w.move(e,e.x+100,e.y,120,.5);assert.equal(e.x,x);w.elapsed+=1.01;w.move(e,e.x+100,e.y,120,.1);assert.ok(e.x>x);
 for(const role of ['deer','elk','goat']){const v=arena(),animal=target(v,52,0,role,'wild');animal.aggressor='player';animal.inventory={};assert.ok(beginStrike(v,animal,v.player));v.elapsed+=.3;tickCombat(v,animal,.3);assert.ok(v.player.stunUntil>v.elapsed);}
}
{
 const w=arena(),left=target(w,120,-70),right=target(w,210,40);w.player.weaponMode='ranged';w.normalizeEquipment();aimPlayer(w,{x:right.x,y:right.y-38},{lock:true});assert.equal(w.player.lockedTargetId,right.id);assert.ok(w.attackPlayer().ok);release(w,.13);for(let i=0;i<40;i++)w.updateProjectiles(.02);assert.ok(right.hp<100);assert.equal(left.hp,100);w.player.cooldown=0;aimPlayer(w,{x:left.x,y:left.y-38});assert.ok(w.attackPlayer().ok);release(w,.13);assert.equal(w.projectiles[0].target,right.id);w.player.lockedTargetId=null;
}
{
 const w=arena(),p=w.player;target(w,30,-24,'bandit');target(w,30,0,'bandit');target(w,30,24,'bandit');const x=p.x;for(let i=0;i<60;i++)w.move(p,x+150,p.y,130,.015);assert.ok(p.x<x+18,'A wall of enemies blocks the player');for(const e of w.entities)assert.ok(Math.hypot(p.x-e.x,p.y-e.y)>=bodyRadius(p)+bodyRadius(e)-.2);w.entities[1].hp=0;w.rebuildSpatial();for(let i=0;i<60;i++)w.move(p,x+150,p.y,130,.015);assert.ok(p.x>x+60,'A dead enemy opens a gap');
}
{
 const w=arena(),p=w.player,z={id:'oak',x:p.x/TILE,y:p.y/TILE,rx:30,ry:30};w.cities=[z];target(w,80,0,'guard','oak');guardWarnings(w);w.elapsed+=.6;guardWarnings(w);assert.equal(p.weaponWarnings.count,1);assert.ok(!p.wanted);w.elapsed+=4.1;guardWarnings(w);assert.equal(p.weaponWarnings.count,2);assert.ok(!p.wanted);w.elapsed+=4.1;guardWarnings(w);assert.equal(p.wanted,'oak');const v=arena();v.cities=[{...z,x:v.player.x/TILE,y:v.player.y/TILE}];target(v,80,0,'guard','oak');guardWarnings(v);v.elapsed+=.6;guardWarnings(v);v.toggleWeapon();guardWarnings(v);assert.equal(v.player.weaponWarnings,null);assert.ok(!v.player.wanted);
}
{
 const w=arena(),bandit=target(w,180,0,'bandit');for(let j=0;j<7;j++)target(w,220,j*28-84,'guard','oak');const enemy=w.entities[1];const odds=assessForces(w,bandit,enemy);assert.ok(odds.opponents>odds.allies*1.5);combatAI(w,bandit,enemy,.15);assert.equal(bandit.state,'retreating');const v=arena(),e=target(v,50,0,'bandit');e.hp=15;combatAI(v,e,v.player,.15);assert.equal(e.state,'retreating');const u=arena(),fighter=target(u,55,0,'guard','oak');fighter.cooldown=.7;fighter.moraleAt=99;const old={x:fighter.x,y:fighter.y};combatAI(u,fighter,u.player,.15);assert.ok(Math.hypot(fighter.x-old.x,fighter.y-old.y)>1,'Fighters maneuver during cooldown');
}
{
 const w=arena(),e=target(w,56,0,'bandit');e.moraleAt=999;const before={x:e.x,y:e.y};combatAI(w,e,w.player,.05);assert.ok(e.pendingStrike);assert.ok(Math.hypot(e.x-before.x,e.y-before.y)>0);w.elapsed+=.15;tickCombat(w,e,.15);assert.ok(w.player.hp<100,'NPC can land an attack while maneuvering');
 const v=arena(),cx=v.player.x,cy=v.player.y;v.player.x-=600;const bandit=v.add('bandit','red',cx/TILE,cy/TILE);bandit.hp=15;const guards=[];for(let j=0;j<8;j++)guards.push(v.add('guard','oak',(cx+Math.cos(j*Math.PI/4)*35)/TILE,(cy+Math.sin(j*Math.PI/4)*35)/TILE));v.rebuildSpatial();for(let j=0;j<20;j++){combatAI(v,bandit,guards[0],.15);v.elapsed+=.15;}assert.ok(Math.hypot(bandit.x-cx,bandit.y-cy)<12,'Encircling guards block a fleeing bandit');
}
console.log('✓ Направленные удары на ходу, меч/топор/молот, оглушение животных, мышиный захват лука, столкновения толпы, два предупреждения, оценка сил, манёвры и отступление');
