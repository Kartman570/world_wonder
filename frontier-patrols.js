import {TILE} from './content.js';
import {dominance,fairyDefense} from './wild-hazards.js';
export function initializePatrols(w){if(w.dungeonSpec||w.generatorVersion<9||w.frontierRevision)return;const d=w.loreGeography.desert;
 for(let squad=0;squad<18;squad++){
  const route=[];for(let j=0;j<5;j++){const angle=(squad+j*.9)*2.39996,rad=.22+((squad+j)%6)*.115;let x=d.x+Math.cos(angle)*d.rx*rad,y=d.y+Math.sin(angle)*d.ry*rad;if(w.blocked(x*TILE,y*TILE)||w.tile(x,y)!==15){x=d.x+Math.cos(angle)*d.rx*.35;y=d.y+Math.sin(angle)*d.ry*.35;}if(w.generatorVersion>=10&&(w.blocked(x*TILE,y*TILE)||w.tile(x,y)!==15)){let found=false;for(let radius=2;radius<100&&!found;radius+=3)for(let k=0;k<24;k++){const xx=x+Math.cos(k*Math.PI/12)*radius,yy=y+Math.sin(k*Math.PI/12)*radius;if(((xx-d.x)/d.rx)**2+((yy-d.y)/d.ry)**2<1&&w.tile(xx,yy)===15&&!w.blocked(xx*TILE,yy*TILE)){x=xx;y=yy;found=true;break;}}}route.push({x:x*TILE,y:y*TILE});}
  let leader;for(let i=0;i<6;i++){const p=route[0],e=w.safeSpawn(i%3===0?'nomadArcher':'nomad',(w.generatorVersion>=11?w.places.filter(z=>z.nomadClan)[squad%6].faction:'emralaan'),p.x/TILE+(i%3-1)*1.4,p.y/TILE+Math.floor(i/3)*1.6,'Дозор '+(squad+1)+' · '+(i%3===0?'стрелок':'всадник'));e.loreActor=true;e.race='emralaan';e.mounted=true;e.inventory={sword:1,gold:5,...(i%3===0?{bow:1,arrow:40}:{})};e.hp=e.maxHp=100;e.patrolSquad=squad;e.patrolTerritory={...d};if(!leader){leader=e;e.frontierRoute=route;e.frontierLeg=0;}else{e.frontierLeader=leader.id;e.formation={x:(i%3-1)*70,y:Math.floor(i/3)*75};}}
 }
 w.frontierRevision=1;
}
export function frontierAI(w,e,dt){
 if(e.role==='fairy'&&fairyDefense(w,e,dt))return true;
 if(!['nomad','nomadArcher'].includes(e.role))return false;
 dominance(w,e);
 if(e.stolenHorseId){const camp=w.places.find(z=>z.nomadClan&&z.faction===e.faction)||w.places.find(z=>z.id==='emralaan');e.state='leadingStolenHorse';w.navigate(e,{x:camp.x*TILE,y:camp.y*TILE},dt,125);return true;}
 if(e.frontierLeader){const leader=w.entityById.get(e.frontierLeader);if(leader?.hp>0){const p={x:leader.x+e.formation.x,y:leader.y+e.formation.y};e.state='frontierPatrol';if(Math.hypot(e.x-p.x,e.y-p.y)>45)w.navigate(e,p,dt,145);return true;}e.frontierLeader=null;e.frontierRoute=[e.home,{x:e.home.x+100,y:e.home.y+100}];e.frontierLeg=0;}
 if(e.frontierRoute){const p=e.frontierRoute[e.frontierLeg||0];e.state='frontierPatrol';if(w.navigate(e,p,dt,125))e.frontierLeg=((e.frontierLeg||0)+1)%e.frontierRoute.length;return true;}
 return false;
}
