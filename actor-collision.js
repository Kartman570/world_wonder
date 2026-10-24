import {purpleAt} from './lore-world.js';
import {ANIMALS,TILE,W,H} from './content.js';
export function bodyRadius(e){return e.role==='absent'||e.hp<=0||e.horse?.rider?0:e.role==='caveBat'?8:ANIMALS[e.role]?Math.max(8,Math.min(22,ANIMALS[e.role].size*.75)):e.mounted||e.riding||e.role==='horse'?24:e.race==='arctarian'?22:e.race==='fairy'?8:e.role==='merchant'?17:e.role==='brute'?16:12;}
export function mapCanOccupy(w,e,x,y){
 if(e.relicGuardian&&Math.hypot(x-e.relicGuardian.anchor.x,y-e.relicGuardian.anchor.y)>e.relicGuardian.radius)return false;
 if(e.patrolTerritory){const z=e.patrolTerritory;if(((x/TILE-z.x)/z.rx)**2+((y/TILE-z.y)/z.ry)**2>1)return false;}
 if(e.riding&&(w.interiorAt({x,y})||[2,4].includes(w.tile(x/TILE,y/TILE))))return false;
 if(e.race!=='arctarian'&&purpleAt(w,{x,y})&&!(e===w.player&&e.inventory.breathSuit>0&&e.breathSuitWorn)){if(e===w.player&&(!w.loreState.airBlockedAt||w.elapsed>w.loreState.airBlockedAt+5)){w.log('Дыхание перехватывает. Без закрытого одеяния под фиолетовую черту не пройти.');w.loreState.airBlockedAt=w.elapsed||.001;}return false;}
 const radius=bodyRadius(e),swimmer=e===w.player;if(e!==w.player&&['guard','archer'].includes(e.role)&&!e.leader&&!e.roadPatrol&&w.inCity(e.home)?.id===e.faction&&w.inCity({x,y})?.id!==e.faction)return false;
 for(const [dx,dy]of [[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius],[radius*.7,radius*.7],[-radius*.7,radius*.7],[radius*.7,-radius*.7],[-radius*.7,-radius*.7]])if(w.blocked(x+dx,y+dy,swimmer))return false;
 return true;
}
export function canOccupy(w,e,x,y){
 const radius=bodyRadius(e);if(!mapCanOccupy(w,e,x,y))return false;
 for(const o of w.nearby(e,90)){if(!bodyRadius(o)||o.id===e.riding||!w.visibleFrom(e,o)||!w.visibleFrom(o,e))continue;const gap=radius+bodyRadius(o),before=Math.hypot(e.x-o.x,e.y-o.y),after=Math.hypot(x-o.x,y-o.y);if(after<gap-.1&&after<before-.01)return false;}
 return true;
}
// Keep solid bodies, but plan passing maneuvers before two streams touch.
function trafficHeading(w,e,angle,dt){
 if(e===w.player||e.enemyId||e.pendingStrike||e.state==='blockingCell')return angle;
 const now=w.elapsed||0,ux=Math.cos(angle),uy=Math.sin(angle),radius=bodyRadius(e);
 const obstacles=w.nearby(e,105).filter(o=>w.visibleFrom(e,o)&&w.visibleFrom(o,e));
 let blocked=false,opponent=null;
 for(const o of obstacles){const dx=o.x-e.x,dy=o.y-e.y,ahead=dx*ux+dy*uy,side=dx*-uy+dy*ux,gap=radius+bodyRadius(o)+8;if(ahead<=0||ahead>90||Math.abs(side)>gap)continue;
  blocked=true;const moving=now-(o.trafficAt??-10)<.5,opposes=moving&&Math.cos((o.trafficHeading??angle)-angle)<-.45;
  if(opposes&&(!opponent||ahead<opponent.ahead))opponent={actor:o,ahead};
 }
 const probe=Math.max(2,Math.min(7,105*dt));if(!blocked&&canOccupy(w,e,e.x+ux*probe,e.y+uy*probe)&&(e.trafficPassUntil||0)<=now&&(e.trafficYieldUntil||0)<=now){e.trafficStuck=0;return angle;}if(blocked)e.trafficPassUntil=now+.55;
 // A consistent right-hand rule separates opposing streams instead of oscillating.
 let desired=angle+1.05;
 if((e.trafficYieldUntil||0)>now)desired=angle+2.15;
 else if((opponent&&opponent.ahead<48&&(e.trafficStuck||0)>.35&&(opponent.actor===w.player||e.id>opponent.actor.id))||(!opponent&&(e.trafficStuck||0)>.6)){e.trafficYieldUntil=now+1.2;e.trafficStuck=0;desired=angle+2.15;}
 if(canOccupy(w,e,e.x+Math.cos(desired)*probe,e.y+Math.sin(desired)*probe))return desired;
 // In a tight doorway the yielding actor backs out to the nearest passing space.
 if((e.trafficYieldUntil||0)>now){for(const turn of [Math.PI,2.65,-2.65]){const a=angle+turn;if(canOccupy(w,e,e.x+Math.cos(a)*probe,e.y+Math.sin(a)*probe))return a;}}
 return angle;
}
export function moveActor(w,e,tx,ty,speed,dt){
 if((e.stunUntil||0)>w.elapsed)return false;
 const startX=e.x,startY=e.y,dx=tx-e.x,dy=ty-e.y,d=Math.hypot(dx,dy);if(d<3)return true;
 const angle=Math.atan2(dy,dx),heading=trafficHeading(w,e,angle,dt);e.trafficHeading=angle;e.trafficAt=w.elapsed||0;const step=Math.min(d,speed*w.terrain(e).speed*dt),count=Math.max(1,Math.ceil(step/7));let moved=0;
 for(let j=0;j<count;j++){
  const length=step/count,beforeX=e.x,beforeY=e.y;let found=false;
  for(const offset of (e===w.player?[0,.55,-.55,1.05,-1.05]:[0,.45,-.45,.9,-.9,1.35,-1.35,1.65,-1.65])){const a=heading+offset,x=e.x+Math.cos(a)*length,y=e.y+Math.sin(a)*length;if(canOccupy(w,e,x,y)){e.x=x;e.y=y;found=true;break;}}
  if(!found)break;moved+=Math.hypot(e.x-beforeX,e.y-beforeY);
 }
 if(e!==w.player)e.trafficStuck=d-Math.hypot(e.x-tx,e.y-ty)<step*.08?(e.trafficStuck||0)+dt:Math.max(0,(e.trafficStuck||0)-dt);
 e.moveDir=(Math.round((moved>0?Math.atan2(e.y-startY,e.x-startX):angle)/(Math.PI/4))+8)%8;if(!(e===w.player&&e.weaponDrawn)&&!e.enemyId)e.dir=e.moveDir;e.walk=(e.walk||0)+moved/20;
 return Math.hypot(e.x-tx,e.y-ty)<15;
}

export function settleBodies(w){
 for(const e of [w.player,...w.entities]){if(e.hp<=0||mapCanOccupy(w,e,e.x,e.y))continue;let best=null,distance=Infinity;const tx=Math.floor(e.x/TILE),ty=Math.floor(e.y/TILE);for(let r=0;r<=4&&!best;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const x=(tx+dx+.5)*TILE,y=(ty+dy+.5)*TILE,d=Math.hypot(x-e.x,y-e.y);if(d<distance&&mapCanOccupy(w,e,x,y)){best={x,y};distance=d;}}if(best)Object.assign(e,best);}
}
