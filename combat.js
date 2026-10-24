import {alertAttack} from './combat-alerts.js';
import {cutWeb} from './wild-hazards.js';
import {dismountHorse} from './horses.js';
import {campaignEvent} from './campaign.js';
import {recordCrime,warrant} from './law.js';
import {ANIMALS,BANDITS,GUARDS,RANGED,TILE} from './content.js';
const D=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),delta=a=>Math.atan2(Math.sin(a),Math.cos(a));
export const WEAPONS={sword:{damage:20,range:77,arc:.72,windup:.12,cooldown:.5,cost:7},axe:{damage:18,range:83,arc:1.05,windup:.2,cooldown:.75,cost:11,cleave:true},hammer:{damage:24,range:74,arc:.7,windup:.27,cooldown:.95,cost:12,stun:1},bow:{damage:23,range:620,windup:.12,cooldown:.7,cost:6,ranged:true},natural:{damage:10,range:61,arc:.9,windup:.18,cooldown:.8,cost:0}};
export function normalizeCombat(w){const p=w.player;p.weaponDrawn=!!p.weaponDrawn;p.aimAngle??=p.dir*Math.PI/4;p.lockedTargetId??=null;for(const e of w.entities){if(e.role==='raider'&&!e.inventory.axe&&e.inventory.sword){delete e.inventory.sword;e.inventory.axe=1;}if(e.role==='brute'&&!e.inventory.hammer){if(e.inventory.sword){delete e.inventory.sword;e.inventory.hammer=1;}}}}
export function toggleWeapon(w){const p=w.player;w.normalizeEquipment();if(!p.weapon)p.unarmedCombat=true;p.weaponDrawn=!p.weaponDrawn;p.drawUntil=w.elapsed+.25;p.pendingStrike=null;p.lockedTargetId=null;if(!p.weaponDrawn){p.weaponWarnings=null;for(const m of Object.values(w.cityMemory||{}))if(m.active)m.active.refused=false;}return {ok:true,message:!p.weapon?(p.weaponDrawn?'Кулаки подняты. ЛКМ / пробел — удар.':'Кулаки опущены.'):p.weaponDrawn?'Оружие обнажено. R — убрать.':'Оружие убрано.'};}
export function aimPlayer(w,point,{lock=false}={}){const p=w.player;p.aimPoint={...point};let best=null,score=Infinity;
 for(const e of w.nearby(p,680)){if(e.role==='wizard'||!w.visibleFrom(p,e))continue;const dx=Math.abs(point.x-e.x),dy=Math.abs(point.y-(e.y-(ANIMALS[e.role]?24:38)));if(dx>Math.max(24,ANIMALS[e.role]?.size||0)||dy>45)continue;const n=dx*dx+dy*dy;if(n<score){score=n;best=e;}}
 p.aimAngle=Math.atan2((best&&p.weapon!=='bow'?best.y:point.y)-p.y,(best&&p.weapon!=='bow'?best.x:point.x)-p.x);if(p.weaponDrawn)p.dir=(Math.round(p.aimAngle/(Math.PI/4))+8)%8;
 if(lock&&p.weapon==='bow'&&p.weaponDrawn)p.lockedTargetId=best?.id??null;
}

export function lockedTarget(w){const p=w.player,e=w.entityById.get(p.lockedTargetId);if(!e||e.hp<=0||D(p,e)>680||!w.visibleFrom(p,e)){p.lockedTargetId=null;return null;}return e;}
export function weaponFor(e){if(e.role==='player')return e.weapon||'natural';if(ANIMALS[e.role])return 'natural';if(RANGED.includes(e.role)&&(e.inventory.arrow||0)>0)return 'bow';return e.inventory.hammer?'hammer':e.inventory.axe?'axe':e.inventory.sword?'sword':'natural';}
export function beginStrike(w,a,target=null,{angle=null,weapon=null}={}){
 if(a.hp<=0||(a.stunUntil||0)>w.elapsed||a.cooldown>0||a.pendingStrike)return false;
 const player=a===w.player;if(player&&a.riding)dismountHorse(w,{combat:true});if(player&&(!a.weaponDrawn||w.elapsed<(a.drawUntil||0)))return false;
 const kind=weapon||weaponFor(a),base=WEAPONS[kind]||WEAPONS.natural,config={...base};if(kind==='natural'){config.damage=player?6:ANIMALS[a.role]?.damage||10;if(['deer','elk','goat','bear','boar'].includes(a.role))config.stun=1;}
 if(player&&a.stamina<config.cost)return false;if(base.ranged&&!(a.inventory.arrow>0))return false;
 const facing=angle??(target?Math.atan2(target.y-a.y,target.x-a.x):a.aimAngle??a.dir*Math.PI/4);
 if(target&&(D(a,target)>config.range+10||!w.visibleFrom(a,target)||!w.lineClear(a,target)))return false;
 a.aimAngle=facing;a.dir=(Math.round(facing/(Math.PI/4))+8)%8;a.cooldown=config.cooldown;a.attack=config.windup+.2;a.weaponDrawn=true;a.pendingStrike={remaining:config.windup,kind,angle:facing,targetId:target?.id??null,config};if(player)a.stamina-=config.cost;return true;
}
export function attackPlayer(w){const p=w.player;w.normalizeEquipment();if(!p.weaponDrawn)return {ok:false,message:'R — достать оружие.'};if((p.stunUntil||0)>w.elapsed)return {ok:false,message:'Вы оглушены.'};const target=p.weapon==='bow'?lockedTarget(w):null;return {ok:beginStrike(w,p,target,{angle:target?null:p.aimAngle,weapon:p.weapon})};}
function release(w,a,s){cutWeb(w,a,s);if(s.config.ranged){if(!(a.inventory.arrow>0))return;const target=s.targetId==='player'?w.player:w.entityById.get(s.targetId);let angle=s.angle;if(target&&w.hostile(target,a))alertAttack(w,a,target);if(target&&target.hp>0&&w.visibleFrom(a,target)){const distance=D(a,target),time=distance/620,previous=w.motion.get(target.id),vx=previous?Math.max(-180,Math.min(180,(target.x-previous.x)/.15)):0,vy=previous?Math.max(-180,Math.min(180,(target.y-previous.y)/.15)):0;angle=Math.atan2(target.y+vy*time-a.y,target.x+vx*time-a.x);}
 a.inventory.arrow--;w.projectiles.push({x:a.x+Math.cos(angle)*18,y:a.y+Math.sin(angle)*18,vx:Math.cos(angle)*620,vy:Math.sin(angle)*620,owner:a.id,faction:a.faction,target:s.targetId,damage:s.config.damage,life:1.15});return;}
 const candidates=w.nearby(a,s.config.range+25).filter(e=>e.role!=='wizard'&&w.visibleFrom(a,e)&&D(a,e)<=s.config.range&&Math.abs(delta(Math.atan2(e.y-a.y,e.x-a.x)-s.angle))<=s.config.arc&&w.lineClear(a,e)&&(a===w.player||e===w.player&&w.hostile(a,e)||w.hostile(a,e)||e.id===s.targetId)).sort((b,c)=>D(a,b)-D(a,c));
 for(const e of s.config.cleave?candidates:candidates.slice(0,1)){
  if(e.role==='dummy'){if(a===w.player)campaignEvent(w,'dummy',{moving:!!e.moving,ranged:false});w.effects.push({x:e.x,y:e.y-40,text:'Попадание · тренировка',life:.8,color:'#e2c78e'});continue;}
  w.damage(a,e,s.config.damage);if(s.config.stun&&e.hp>0&&w.elapsed>=(e.stunResistUntil||0)){e.stunUntil=w.elapsed+s.config.stun;e.stunResistUntil=e.stunUntil+.55;e.pendingStrike=null;e.attack=0;e.state='stunned';w.effects.push({x:e.x,y:e.y-55,text:'ОГЛУШЕНИЕ · 1 с',life:1,color:'#e3d9a0'});}
 }
 w.effects.push({x:a.x,y:a.y,arc:s.angle,spread:s.config.arc,range:s.config.range,life:.16,color:s.kind==='hammer'?'#edbe8299':'#e0d6a677'});
}
export function tickCombat(w,e,dt){if((e.stunUntil||0)>w.elapsed){e.state='stunned';e.pendingStrike=null;return true;}if(e.pendingStrike){e.pendingStrike.remaining-=dt;if(e.pendingStrike.remaining<=0){const s=e.pendingStrike;e.pendingStrike=null;release(w,e,s);}}return false;}
export function guardWarnings(w){const p=w.player;if(!p.weaponDrawn||!p.weapon){p.weaponWarnings=null;return;}const city=w.inCity(p);if(!city)return;
 const guard=w.nearby(p,310).find(e=>GUARDS.includes(e.role)&&e.faction===city.id&&w.visibleFrom(e,p)&&w.lineClear(e,p));if(!guard)return;
 if(warrant(w,city.id))return;let warning=p.weaponWarnings;if(!warning||warning.city!==city.id)warning=p.weaponWarnings={city:city.id,count:0,next:w.elapsed+.5};if(w.elapsed<warning.next)return;
 if(warning.count<2){warning.count++;warning.next=w.elapsed+4;guard.announcement='Уберите оружие! Предупреждение '+warning.count+' из 2.';guard.speechUntil=w.elapsed+4;w.log('Стража: '+guard.announcement,{at:guard,personal:true});}
 else{recordCrime(w,city.id,'weapon');p.weaponWarnings=null;w.log('Вы проигнорировали два предупреждения. Стража атакует.',{personal:true});}
}
function strength(e){return (e.hp/e.maxHp)*(ANIMALS[e.role]?.damage||(e.role==='brute'?20:GUARDS.includes(e.role)?17:13))+(RANGED.includes(e.role)?5:0);}
export function assessForces(w,e,enemy){let allies=strength(e),opponents=0;for(const o of w.nearby(e,420)){if(!w.visibleFrom(e,o))continue;if(o.faction===e.faction||o.leader&&o.leader===e.leader)allies+=strength(o);else if(w.hostile(e,o)||o===enemy)opponents+=strength(o);}return {allies,opponents};}
export function combatAI(w,e,enemy,dt){
 if((e.retreatUntil||0)>w.elapsed){retreat(w,e,enemy,dt);return;}
 if(w.elapsed>=(e.moraleAt||0)){e.moraleAt=w.elapsed+.8;const forces=assessForces(w,e,enemy),losing=e.hp/e.maxHp<(.22+(e.id%3)*.04),outnumbered=(BANDITS.includes(e.role)||e.mounted)&&forces.opponents>forces.allies*(1.35+(e.id%3)*.15);if((losing&&!['bear','caveSpider'].includes(e.role))||outnumbered){e.retreatUntil=w.elapsed+5+(e.id%4);e.enemyId=null;e.retreatFrom=enemy.id;retreat(w,e,enemy,dt);return;}}
 const d=D(e,enemy),kind=weaponFor(e),ranged=kind==='bow',angle=Math.atan2(enemy.y-e.y,enemy.x-e.x),side=e.id%2?1:-1,range=ranged?480:(WEAPONS[kind]?.range||61)-6;e.weaponDrawn=true;e.state=e.pendingStrike?'windingUp':'combat';
 if(d<=range&&w.lineClear(e,enemy)&&e.cooldown<=0)beginStrike(w,e,enemy);
 let tx,ty,speed=e.mounted?155:(ANIMALS[e.role]?.speed||105);
 if(ranged){const radial=d<160?-1:d>360?1:0;tx=e.x+Math.cos(angle)*radial*150+Math.cos(angle+side*Math.PI/2)*70;ty=e.y+Math.sin(angle)*radial*150+Math.sin(angle+side*Math.PI/2)*70;}
 else if(d>range){const flank=(e.id%5-2)*.23,slotAngle=Math.atan2(e.y-enemy.y,e.x-enemy.x)+flank;const target={x:enemy.x+Math.cos(slotAngle)*42,y:enemy.y+Math.sin(slotAngle)*42};if(!w.lineClear(e,target)){w.navigate(e,target,dt,speed);e.dir=(Math.round(angle/(Math.PI/4))+8)%8;return;}tx=target.x;ty=target.y;}
 else{const radial=e.cooldown>.35?-25:10;tx=e.x+Math.cos(angle)*radial+Math.cos(angle+side*Math.PI/2)*65;ty=e.y+Math.sin(angle)*radial+Math.sin(angle+side*Math.PI/2)*65;speed=70;}
 w.move(e,tx,ty,speed*(e.pendingStrike?.8:1),dt);e.aimAngle=angle;e.dir=(Math.round(angle/(Math.PI/4))+8)%8;
}
export function retreat(w,e,enemy,dt){e.state='retreating';const a=Math.atan2(e.y-enemy.y,e.x-enemy.x),side=e.id%2?1:-1;e.enemyId=null;w.move(e,e.x+Math.cos(a)*200+Math.cos(a+side*Math.PI/2)*60,e.y+Math.sin(a)*200+Math.sin(a+side*Math.PI/2)*60,(ANIMALS[e.role]?.speed||125),dt);}
