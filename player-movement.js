import {moveMounted} from './horses.js';
import {campaignEvent} from './campaign.js';
export const WALK_SPEED=126.5,SPRINT_SPEED=214.5,MAX_STAMINA=300;
export function normalizeStamina(player){
 const oldMax=player.maxStamina||100;
 if(oldMax!==MAX_STAMINA){player.stamina=Math.max(0,Math.min(MAX_STAMINA,(player.stamina??oldMax)/oldMax*MAX_STAMINA));player.maxStamina=MAX_STAMINA;}
 return player;
}
export function movePlayer(world,dx,dy,sprinting,dt){
 const p=normalizeStamina(world.player);p.sprinting=false;if((p.stunUntil||0)>world.elapsed||(!dx&&!dy))return;
 if(p.riding&&moveMounted(world,dx,dy,dt))return;
 const old={x:p.x,y:p.y},run=sprinting&&p.stamina>2;world.move(p,p.x+dx*100,p.y+dy*100,run&&!p.swimming?SPRINT_SPEED:WALK_SPEED,dt);
 p.sprinting=run&&!p.swimming&&Math.hypot(p.x-old.x,p.y-old.y)>.01;
 campaignEvent(world,'walk',{distance:Math.hypot(p.x-old.x,p.y-old.y),run});
 if(run)p.stamina=Math.max(0,p.stamina-dt*23);
}
