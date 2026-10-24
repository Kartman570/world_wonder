import {ANIMALS,BANDITS,GUARDS,TILE} from './content.js';
// One tile is one metre for perception. Assistance is a bounded wave, not a global aggro flag.
export const HEARING_RANGE=5*TILE,SIGHT_RANGE=20*TILE;
const D=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const passive=e=>e.role==='wizard'||e.role==='dummy'||e.role==='horse'||e.race==='arctarian'||e.role==='fairy'||e.captive||e.cellId;
export const combatant=e=>!passive(e)&&(BANDITS.includes(e.role)||GUARDS.includes(e.role)||['hunter','nomad','nomadArcher','relicKeeper'].includes(e.role)||!!ANIMALS[e.role]?.aggressive);
const actor=(w,id)=>id==='player'?w.player:w.entityById.get(id);
export function alertAttack(w,attacker,victim){
 if(!attacker||!victim||victim.role==='dummy'||attacker===victim||victim.hp<=0)return;
 const now=w.elapsed||0;victim.lastAttackerId=attacker.id;victim.lastAttackAt=now;
 if(combatant(victim)){victim.battleAlert={target:attacker.id,x:attacker.x,y:attacker.y,until:now+35,hops:0,source:victim.id};victim.enemyId=attacker.id;victim.perceptionAt=now+1;}
 // An attack on a civilian still calls the armed members of their own faction.
 if(['wild','silk','underground'].includes(victim.faction)&&!ANIMALS[victim.role])return;
 for(const ally of w.nearby(victim,SIGHT_RANGE)){
  if((ally.faction!==victim.faction&&!(victim===w.player&&ally.companion?.active))||ANIMALS[victim.role]&&ally.role!==victim.role||!combatant(ally))continue;
  const d=D(ally,victim);if(d>HEARING_RANGE&&(!w.visibleFrom(ally,victim)||!w.lineClear(ally,victim)))continue;
  enlist(w,ally,attacker.id,attacker,0,victim.id);
 }
}
function enlist(w,e,target,where,hops,source){
 if(e.hp<=0||target===e.id||target===e.leader)return;
 const current=e.battleAlert;if(current&&current.until>w.elapsed&&current.target===target)return;
 e.battleAlert={target,x:where.x,y:where.y,until:w.elapsed+35,hops,source};e.state='helpingAlly';e.enemyId=null;e.perceptionAt=w.elapsed+.3;e.nextRelay=w.elapsed+.3+(Number(e.id)%3)*.08;
 e.nav=null;e.route=[];e.routeDest=null;e.pathPending=false;
}
export function battleTarget(w,e){const a=e.battleAlert;if(!a||a.until<w.elapsed){e.battleAlert=null;return null;}const t=actor(w,a.target);if(!t||t.hp<=0||t.id==='absent'){e.battleAlert=null;return null;}return t;}
export function helpAlly(w,e,dt){
 const target=battleTarget(w,e);if(!target||!combatant(e))return false;
 const a=e.battleAlert;
 if(w.visibleFrom(e,target)&&w.lineClear(e,target)){a.x=target.x;a.y=target.y;}
 if(w.elapsed>=(e.nextRelay||0)&&a.hops<8){e.nextRelay=w.elapsed+1;for(const ally of w.nearby(e,HEARING_RANGE))if(ally.faction===e.faction&&(!ANIMALS[e.role]||ally.role===e.role)&&combatant(ally))enlist(w,ally,a.target,a,a.hops+1,a.source);}
 // Stay within a city post or a guardian's camp; movement enforces the same restriction.
 if(e.relicGuardian&&D(target,e.relicGuardian.anchor)>e.relicGuardian.radius+SIGHT_RANGE){e.battleAlert=null;return false;}
 if(D(e,target)> (e.inventory.bow&&e.inventory.arrow>0?520:95)||!w.visibleFrom(e,target)||!w.lineClear(e,target)){
  e.state='helpingAlly';const last={x:a.x,y:a.y};w.navigate(e,last,dt,e.mounted?165:130);return true;
 }
 e.enemyId=target.id;return false;
}
export function clearBattleMemory(w){for(const e of w.entities){e.battleAlert=null;e.lastAttackerId=null;if(e.state==='helpingAlly')e.state='idle';}}
