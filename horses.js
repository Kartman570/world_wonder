import {mapCanOccupy} from './actor-collision.js';
import {TILE,W,H,ANIMALS,point} from './content.js';
import {prepareRooms,drawInterior,drawDoor} from './interiors.js';
const D=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const HORSE_SPEED=860,HORSE_PRICE=220;
export function buildStables(w){
 if(w.dungeonSpec||w.generatorVersion<8||w.stables)return;w.stables=[];
 for(const z of w.cities){let lot;
  // Use an existing dry street frontage; no road, waterway, house or entrance is overwritten.
  for(let radius=14;radius<z.r+30&&!lot;radius+=3)for(let j=0;j<32&&!lot;j++){
   const a=j*Math.PI/16,x=Math.round(z.x+Math.cos(a)*radius),y=Math.round(z.y+Math.sin(a)*radius);if(x<5||y<5||x+10>=W-5||y+9>=H-5)continue;
   let valid=true;for(let yy=y-1;yy<=y+9&&valid;yy++)for(let xx=x-1;xx<=x+10;xx++)if(w.roadMask[yy*W+xx]||[2,4,16,17].includes(w.tile(xx,yy))||w.buildings.some(b=>xx>=b.x-2&&xx<b.x+b.w+2&&yy>=b.y-2&&yy<b.y+b.h+3)){valid=false;break;}
   if(!valid)continue;const front=point(x+4.5,y+8.5);if(!w.path(point(z.x,z.y),front).length)continue;lot={x,y};
  }
  if(!lot)throw new Error('No reachable stable site: '+w.seed+' '+z.id);
  const b={...lot,w:9,h:7,type:'stable',city:z.id,style:z.style,name:'КОНЮШНЯ · '+z.name,fullRoom:true};prepareRooms([b]);b.id=w.buildings.length+1;w.buildings.push(b);w.stables.push({city:z.id,buildingId:b.id,x:b.x,y:b.y,stock:[]});
  for(let yy=b.y-1;yy<b.y+b.h+3;yy++)for(let xx=b.x-1;xx<b.x+b.w+1;xx++)w.tiles[yy*W+xx]=3;
  for(const t of w.treesNear(point(b.x+4,b.y+4),12*TILE))if(t.x/TILE>=b.x-1&&t.x/TILE<=b.x+10&&t.y/TILE>=b.y-1&&t.y/TILE<=b.y+10){t.hidden=true;t.wood=0;}
  w.districts.push({name:'КОНЮШНЯ',city:z.id,...point(b.x+4.5,b.y+8)});
 }
 w.rasterizeBuildings();
}
export function initializeHorses(w){
 if(w.dungeonSpec||w.generatorVersion<8)return;buildStables(w);if(w.horseRevision)return;
 for(const stable of w.stables){const b=w.buildings[stable.buildingId-1];if(!w.entities.some(e=>e.role==='groom'&&e.faction===stable.city)){const e=w.add('groom',stable.city,b.workSpot.x/TILE,b.workSpot.y/TILE,'Конюх '+w.factionName(stable.city));e.homeBuildingId=b.id;e.workBuildingId=b.id;e.home={...b.workSpot};e.work={...b.workSpot};e.inventory={gold:160};}
  for(let i=0;i<3;i++){const e=w.safeSpawn('horse',stable.city,b.x+1.5+i*3,b.y+8.5+(i===1?2:0),'Конь '+['Гнедой','Сивый','Вороной'][i]);e.hp=e.maxHp=150;e.horse={owner:'stable',city:stable.city,coat:i};e.inventory={};}
 }
 w.horseRevision=1;
}
export function playerHorse(w){const e=w.entityById.get(w.player.riding);return e?.hp>0&&e.horse?.rider==='player'?e:null;}
export function horseOwned(w,e){return e?.horse?.owner==='player'&&e.horse.generation===(w.life?.generation||1);}
export function buyHorse(w,groom,horseId){const p=w.player,e=w.entityById.get(horseId);if(w.dungeonSpec||groom?.role!=='groom'||groom.hp<=0||!w.canInteract(p,groom,150))return {ok:false,message:'Подойдите к конюху.'};if(!e?.horse||e.hp<=0||e.horse.owner!=='stable'||e.horse.city!==groom.faction)return {ok:false,message:'Этот конь уже не продаётся.'};if(p.weaponDrawn||p.imprisoned||p.wanted)return {ok:false,message:'Уберите оружие и уладьте дела со стражей.'};if(w.entities.some(o=>o.hp>0&&horseOwned(w,o)))return {ok:false,message:'У этого странника уже есть конь.'};if(!(p.inventory.gold>=HORSE_PRICE))return {ok:false,message:'Конь стоит '+HORSE_PRICE+' золотых.'};p.inventory.gold-=HORSE_PRICE;groom.inventory.gold=(groom.inventory.gold||0)+HORSE_PRICE;e.horse.owner='player';e.horse.generation=w.life?.generation||1;e.state='horseWaiting';w.log('Вы купили '+e.name+'. Он ждёт у конюшни. E рядом с конём или F — сесть в седло.');return {ok:true,message:'Конь ваш. Он не будет вступать в бой.'};}
export function mountHorse(w,e){const p=w.player;if(!horseOwned(w,e)||e.hp<=0||!w.canInteract(p,e,145))return {ok:false,message:'Подойдите к своему коню.'};if(p.riding)return {ok:false,message:'Вы уже в седле.'};if(w.dungeonSpec||w.interiorAt(p)||p.imprisoned||p.swimming||(p.stunUntil||0)>w.elapsed)return {ok:false,message:'Здесь нельзя сесть в седло.'};if((e.horse.fleeUntil||0)>w.elapsed)return {ok:false,message:'Конь ещё отступает от опасности. Подождите, пока успокоится.'};p.riding=e.id;p.weaponDrawn=false;p.pendingStrike=null;p.lockedTargetId=null;e.horse.rider='player';e.enemyId=null;e.battleAlert=null;e.state='ridden';e.x=p.x;e.y=p.y;w.rebuildSpatial();return {ok:true,message:'Вы в седле. F — спешиться. Конь не расходует выносливость.'};}
export function dismountHorse(w,{combat=false}={}){const p=w.player,e=playerHorse(w);if(!e){p.riding=null;return {ok:false,message:'Вы пешком.'};}e.horse.rider=null;p.riding=null;e.x=p.x;e.y=p.y;e.state='horseWaiting';
 // Put the rider beside the horse, never through a wall or another solid body.
 let found=false;for(let r=1;r<=5&&!found;r++)for(let n=0;n<16;n++){const a=n*Math.PI/8,q={x:e.x+Math.cos(a)*(40+r*12),y:e.y+Math.sin(a)*(40+r*12)};if(w.blocked(q.x,q.y)||w.interiorAt(q)||w.nearby(e,100).some(o=>o!==p&&D(o,q)<35))continue;p.x=q.x;p.y=q.y;found=true;break;}
 w.rebuildSpatial();if(combat)w.log('Вы спешились для боя. Конь остался ждать.');return {ok:true,message:'Конь ждёт здесь и сам не пойдёт следом.'};}
export function moveMounted(w,dx,dy,dt){const p=w.player,e=playerHorse(w);if(!e){p.riding=null;return false;}w.move(p,p.x+dx*100,p.y+dy*100,HORSE_SPEED,dt);e.x=p.x;e.y=p.y;e.dir=p.dir;e.walk=p.walk;e.state='ridden';return true;}
export function horseAttacked(w,e,attacker){if(!e.horse)return;if(e.horse.rider==='player')dismountHorse(w,{combat:true});e.horse.fleeUntil=w.elapsed+5;e.horse.danger={x:attacker.x,y:attacker.y};e.horse.dangerId=attacker.id;e.horse.rider=null;e.enemyId=null;}
export function horseDamageAllowed(attacker){return !!ANIMALS[attacker.role]||attacker.drunkard&&attacker.drink>=3;}
export function horseAI(w,e,dt){if(!e.horse)return false;
 if(e.horse.rider==='player'){if(w.player.riding===e.id){e.x=w.player.x;e.y=w.player.y;e.dir=w.player.dir;e.walk=w.player.walk;e.state='ridden';return true;}e.horse.rider=null;}
 const predator=w.nearby(e,230).find(o=>ANIMALS[o.role]?.aggressive&&w.visibleFrom(e,o)&&w.lineClear(e,o));if(predator){e.horse.fleeUntil=w.elapsed+3;e.horse.danger={x:predator.x,y:predator.y};}
 if((e.horse.fleeUntil||0)>w.elapsed&&e.horse.danger){e.state='horseFleeing';const a=Math.atan2(e.y-e.horse.danger.y,e.x-e.horse.danger.x);w.move(e,e.x+Math.cos(a)*300,e.y+Math.sin(a)*300,430,dt);return true;}
 const thief=w.entityById.get(e.horse.thief);if(e.horse.owner==='emralaan'&&thief?.hp>0){e.state='stolenHorse';if(D(e,thief)>100)w.navigate(e,thief,dt,180);return true;}
 if(e.horse.owner==='emralaan'&&(!thief||thief.hp<=0)){e.horse.thief=null;e.state='horseWaiting';return true;}
 e.state='horseWaiting';return true;
}
export function stealNearbyHorse(w,e,dt){if(!['nomad','nomadArcher'].includes(e.role)||e.relicGuardian||e.enemyId||e.stolenHorseId)return false;const horse=w.nearby(e,240).find(o=>o.role==='horse'&&o.hp>0&&!o.horse.rider&&o.horse.owner!=='emralaan');if(!horse)return false;if(D(e,horse)>65){e.state='stealingHorse';w.navigate(e,horse,dt,155);return true;}horse.horse.previousOwner=horse.horse.owner;horse.horse.owner='emralaan';horse.horse.thief=e.id;horse.horse.generation=w.life?.generation||1;e.stolenHorseId=horse.id;w.log(e.name+' увёл '+horse.name+'.',{at:horse});return true;}
export function reclaimHorse(w,e){const thief=w.entityById.get(e?.horse?.thief);if(!e?.horse||!w.canInteract(w.player,e,145)||!['emralaan','stray'].includes(e.horse.owner)||thief?.hp>0&&D(thief,e)<320)return {ok:false,message:'Сначала оттесните похитителя от коня.'};if(w.entities.some(o=>o!==e&&o.hp>0&&horseOwned(w,o)))return {ok:false,message:'У вас уже есть конь.'};e.horse.owner='player';e.horse.generation=w.life?.generation||1;e.horse.thief=null;return {ok:true,message:'Вы взяли поводья. Конь позволяет подойти и ждёт команды.'};}
export function updateHorses(w){for(const e of w.entities){if(!e.horse||e.hp<=0)continue;const drunk=w.nearby(e,85).find(o=>o.drunkard&&o.drink>=3&&o.hp>0&&w.canInteract(o,e,85));if(drunk&&w.elapsed>=(drunk.nextHorsePunch||0)){drunk.nextHorsePunch=w.elapsed+4;w.damage(drunk,e,3);w.log(drunk.name+' ударил коня. Конь отступает.',{at:e});}}}
export function abandonHorse(w){const e=playerHorse(w);if(e){e.horse.rider=null;e.state='horseWaiting';}for(const o of w.entities)if(horseOwned(w,o)){o.horse.owner='stray';o.horse.rider=null;}w.player.riding=null;}
export function teleportParty(w){const p=w.player,mount=playerHorse(w);if(mount){mount.x=p.x;mount.y=p.y;mount.nav=null;mount.route=[];mount.pathPending=false;}w.rebuildSpatial();for(const e of w.entities.filter(e=>e.hp>0&&e.companion?.active)){
 let dest=null;for(let r=2;r<=20&&!dest;r++)for(let n=0;n<16;n++){const a=n*Math.PI/8,q={x:p.x+Math.cos(a)*r*30,y:p.y+Math.sin(a)*r*30};if(!mapCanOccupy(w,e,q.x,q.y)||(r<=8&&w.interiorAt(q)?.id!==w.interiorAt(p)?.id)||w.nearby(p,r*30+60).some(o=>o!==e&&D(o,q)<34))continue;dest=q;break;}
 if(dest){Object.assign(e,dest);e.companion.anchor={...dest};e.enemyId=null;e.battleAlert=null;e.pendingStrike=null;e.nav=null;e.route=[];e.routeDest=null;e.pathPending=false;w.rebuildSpatial();}
 }w.resetMotion();}
export function drawHorse(c,e,pose=e,{saddled=false}={}){const a=(pose.dir??e.dir??0)*Math.PI/4,co=Math.cos(a),si=Math.sin(a),phase=(pose.walk||0)*2.5,P=(u,v,z)=>[pose.x+u*co-v*si,pose.y+(u*si+v*co)*.5-z];const L=(pts,color,width)=>{c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.beginPath();pts.map(p=>P(...p)).forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();},O=(u,v,z,rx,ry,color)=>{const [x,y]=P(u,v,z);c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};const coat=['#997252','#b7b5a5','#5a5655'][e.horse?.coat||0];
 O(0,0,0,36,10,'#17292066');for(const side of [-1,1])for(const front of [-1,1]){const step=Math.sin(phase+side+front)*7;L([[front*24,side*9,35],[front*24+step,side*9,17],[front*24-step,side*9,3]],coat,6);O(front*24-step,side*9,2,5,3,'#3e423d');}O(0,0,39,35,18,coat);L([[23,0,37],[34,0,67]],coat,18);O(42,0,69,15,9,coat);L([[29,-7,65],[28,-8,84]],'#49483f',4);L([[30,7,65],[29,9,84]],'#49483f',4);L([[-29,0,43],[-46,0,25],[-48,0,13]],'#4c4437',6);L([[35,-10,65],[35,10,65]],'#c1a878',2);O(46,-3,72,1.7,2,'#18272a');if(saddled||e.horse?.owner!=='stray'){O(-1,0,52,18,6,'#6b5743');L([[0,-13,50],[0,-16,24]],'#a79467',3);L([[0,13,50],[0,16,24]],'#a79467',3);}}
