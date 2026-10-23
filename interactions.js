import {canUseCell} from './law.js';
import {ITEMS,ANIMALS,TRADE,TILE} from './content.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
// The action discriminant belongs to the descriptor; resource.kind remains on obj.
export function resolveInteraction(world,p=world.player){
 const candidates=[];const add=(kind,obj,label,priority=1)=>candidates.push({kind,obj,x:obj.x,y:obj.y,label,priority});
 for(const z of world.cities||[]){const board={city:z.id,x:(z.x+4.5)*TILE,y:(z.y+4.5)*TILE};if(world.canInteract(p,board,90))add('contractBoard',board,'Доска поручений · прочитать',-1);}
 for(const camp of world.camps||[])if(world.canInteract(p,camp,100))add('camp',camp,'Походный лагерь · отдых и сундук',1);
 if(world.detention){const guard=world.entityById.get(world.detention.guard);if(guard&&world.canInteract(p,guard,110))add('arrest',guard,'Стража · обсудить задержание',-4);}
 for(const prison of world.prisons||[]){for(const c of prison.cells){const gate={...c,x:(c.door.x+.5)*TILE,y:(c.door.y+.5)*TILE};if(p.imprisoned?.cellId===c.id||canUseCell(world,c,p))add('cell',gate,c.open?'Открытая камера · осмотреть':'Камера · замок',-2);}const b=world.buildings[prison.buildingId-1],chest={city:prison.city,x:(b.door.x+1.85)*TILE,y:(b.door.y-1.25)*TILE};if(world.canInteract(p,chest,80))add('prisonChest',chest,'Тюремный сундук · снаряжение',-1);}
 if(world.dungeonExit&&world.canInteract(p,world.dungeonExit,90))add('dungeonExit',world.dungeonExit,'Лестница · вернуться на поверхность',-1);
 for(const d of world.dungeonEntrances||[])if(world.canInteract(p,d,95))add('dungeonEntrance',d,d.name+' · спуститься'+(d.kind==='underwater'?' через подводный вход':''),-1);
 for(const shelf of world.libraryShelves||[])if(world.canInteract(p,shelf,90))add('libraryShelf',shelf,shelf.name+' · читать',-1);
 for(const pedestal of world.pedestals||[])if(world.canInteract(p,pedestal,85))add('pedestal',pedestal,'Пьедестал: '+pedestal.name+' · осмотреть',-1);
 if(!world.libraryShelves?.length&&world.canInteract(p,world.library,95))add('library',world.library,'Библиотека · читать');
 for(const l of world.landmarks)if(Object.values(l.inventory).some(n=>n>0)&&world.canInteract(p,l,90))add('landmark',l,l.name+' · открыть',0);
 for(const r of world.resources)if(r.amount>0&&world.canInteract(p,r,60))add('resource',r,ITEMS[r.kind].name+' · собрать',0);
 for(const pile of world.woodPiles||[])if((pile.inventory.log||0)>0&&world.canInteract(p,pile,80))add('woodPile',pile,'Брёвна × '+pile.inventory.log+' · забрать',0);
 for(const c of world.corpses)if((Object.values(c.inventory||{}).some(n=>n>0)||c.animal&&!c.butchered)&&world.canInteract(p,c,75))add('corpse',c,c.name+' · '+(c.animal&&!c.butchered?'разделать':'обыскать'),0);
 for(const e of world.entities)if(e.hp>0&&!ANIMALS[e.role]&&!['bandit','banditArcher','brute','raider'].includes(e.role)&&world.canInteract(p,e))add('npc',e,e.name+' · '+(TRADE[e.role]&&!e.noTrade?'торговать':e.role==='dummy'?'тренировка':'говорить'));
 if(!candidates.length){const t=world.treesNear(p,60).filter(t=>world.canInteract(p,t,60)).sort((a,b)=>distance(a,p)-distance(b,p))[0];if(t)add('tree',t,'Дерево · срубить');}
 return candidates.sort((a,b)=>a.priority-b.priority||distance(a,p)-distance(b,p))[0]||null;
}
export function beginGather(world,target){
 if(target?.kind!=='resource'||!target.obj||!(target.obj.amount>0)||!world.canInteract(world.player,target.obj,60))return false;
 world.player.action={type:'resource',id:target.obj.id,remaining:target.obj.kind==='ore'?4:2};return true;
}
export function hoveredNpc(world,point,zoom=1){let selected=null,best=Infinity;for(const e of world.entities){if(e.hp<=0)continue;const pose=world.renderPose(e);if(!world.visibleFrom(world.player,pose))continue;const animal=ANIMALS[e.role],height=e.role==='wizard'?100:animal?['deer','elk'].includes(e.role)?90:55:80;const dx=Math.abs(point.x-pose.x),dy=Math.abs(point.y-(pose.y-height/2));if(dx>(animal?Math.max(22,animal.size*1.5):22)/zoom||dy>(height/2+4)/zoom)continue;const score=dx*dx+dy*dy;if(score<best){best=score;selected=e;}}return selected;}
