import assert from 'node:assert/strict';
import {faceConversation,holdConversation,updateIdleFacing,paceInCell} from '../idle-activity.js';
import {TILE} from '../content.js';
const e={id:12,role:'citizen',hp:100,x:100,y:100,dir:0,state:'idle'};
const w={elapsed:0,entities:[e],player:{x:100,y:200,hp:100}};
let turns=0,last=e.dir;
for(let i=0;i<1200;i++){w.elapsed+=.15;updateIdleFacing(w,.15);if(last!==e.dir){assert.ok([1,7].includes((e.dir-last+8)%8));turns++;last=e.dir;}}
assert.ok(turns>=7&&turns<=20,'idle actors turn occasionally, not every tick');
const facing=e.dir;e.state='sleep';for(let i=0;i<300;i++){w.elapsed+=.15;updateIdleFacing(w,.15);}assert.equal(e.dir,facing,'sleeping actors stay asleep');
e.state='idle';assert.equal(faceConversation(w,e),true);assert.equal(e.dir,2);assert.equal(holdConversation(w,e),true);w.player.x=200;w.player.y=100;assert.equal(faceConversation(w,e),true);assert.equal(e.dir,0);e.enemyId='player';assert.equal(holdConversation(w,e),false,'attention never blocks combat');e.enemyId=null;
faceConversation(w,e);w.player.weaponDrawn=true;assert.equal(holdConversation(w,e),false);w.player.weaponDrawn=false;
const cell={x:10,y:10,w:3,h:4,open:false},prisoner={id:37,role:'prisoner',hp:60,x:11.5*TILE,y:11.6*TILE,state:'imprisoned',dir:0};
const jail={elapsed:0,entities:[prisoner],player:{hp:100,x:0,y:0},nearby:()=>[],blocked:()=>false,visibleFrom:()=>true,move(e,x,y,speed,dt){const d=Math.hypot(x-e.x,y-e.y),f=Math.min(1,speed*dt/d);if(d){e.x+=(x-e.x)*f;e.y+=(y-e.y)*f;e.dir=(Math.round(Math.atan2(y-e.y,x-e.x)/(Math.PI/4))+8)%8;}},dungeonSpec:null};
let moving=0,trips=0,wasMoving=false;
for(let i=0;i<2400;i++){jail.elapsed+=.15;const old={x:prisoner.x,y:prisoner.y};paceInCell(jail,prisoner,cell,.15);const moved=Math.hypot(old.x-prisoner.x,old.y-prisoner.y)>.001;if(moved)moving++;if(moved&&!wasMoving)trips++;wasMoving=moved;
 assert.ok(prisoner.x>(cell.x+1)*TILE&&prisoner.x<(cell.x+cell.w-1)*TILE);assert.ok(prisoner.y>(cell.y+1)*TILE&&prisoner.y<(cell.y+cell.h-1)*TILE);
}
assert.ok(trips>=3&&trips<=12,'short trips separated by long waits');assert.ok(moving/2400<.12,'prisoners mostly rest rather than endlessly pace');
cell.open=true;const old={x:prisoner.x,y:prisoner.y};jail.elapsed+=100;paceInCell(jail,prisoner,cell,.15);assert.equal(prisoner.x,old.x);assert.equal(prisoner.y,old.y);
console.log('✓ Sparse idle turns, sleeping/combat exclusions, conversation facing/attention and rare cell-contained strolls');

const {World}=await import('../simulation.js');
const real=new World('734291');
const inmate=real.entities.find(e=>e.cellId&&e.prisonCrime==='theft');assert.ok(inmate);
const realCell=real.prisons.flatMap(p=>p.cells).find(c=>c.id===inmate.cellId);
const {lawActorAI}=await import('../law.js');let travelled=0;
for(let i=0;i<1200;i++){real.elapsed+=.15;const x=inmate.x,y=inmate.y;assert.equal(lawActorAI(real,inmate,.15),true);travelled+=Math.hypot(inmate.x-x,inmate.y-y);
 assert.ok(inmate.x>(realCell.x+1)*TILE&&inmate.x<(realCell.x+realCell.w-1)*TILE,'real collision keeps body within cell width');
 assert.ok(inmate.y>(realCell.y+1)*TILE&&inmate.y<(realCell.y+realCell.h-1)*TILE,'closed door is never used as a stroll destination');
 assert.equal(real.blocked(inmate.x,inmate.y),false);
}
assert.ok(travelled>30,'real prisoner actually takes occasional steps');
real.player.x=inmate.x+50;real.player.y=inmate.y;faceConversation(real,inmate);realCell.open=true;assert.equal(holdConversation(real,inmate),false,'release interrupts attention immediately');lawActorAI(real,inmate,.15);assert.equal(inmate.cellId,null,'opening a cell immediately returns control to escape/riot AI');
console.log('✓ Real prison geometry, solid-body movement and release AI remain valid during occasional strolls');
