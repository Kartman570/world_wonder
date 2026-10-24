import {guardianClue} from './quest-guardians.js';
import {RELICS,RELIC_KEYS} from './lore-content.js';
import {TILE} from './content.js';
export function relicCatalog(w){return w.generatorVersion>=9?RELICS:RELICS.slice(0,3);}
export function beginRelicHunt(w){w.quest=true;if(w.loreState)w.loreState.commissioned=true;return 'Ищи вещи, которые не похожи на работу живых мастеров. Не проверяй их силу на себе или других. Принеси их целиком. Первые следы я оставил в поручениях.';}
export function relicAct(w){return w.returnedRelics.length>=3?2:w.returnedRelics.length>=1?1:0;}
export function relicAssignments(w){return relicCatalog(w).filter(r=>r.act<=relicAct(w)&&!w.returnedRelics.includes(r.item));}
export function relicWhere(w,item){
 const holder=w.entities.find(e=>e.hp>0&&e.inventory[item]>0);if(holder){const place=w.placeAt(holder),camp=w.places.find(z=>z.id===holder.faction);return {kind:'holder',name:holder.name,area:place?.name||camp?.name||'Дикие земли'};}
 const chest=w.landmarks.find(l=>l.inventory[item]>0);if(chest)return {kind:'chest',name:chest.name};
 const body=w.corpses.find(c=>c.inventory[item]>0);if(body)return {kind:'body',name:body.name};
 return {kind:w.player.inventory[item]>0?'carried':'missing'};
}
export function depositHuntRelics(w){let count=0,reward=0;const receipts=[];for(const r of relicCatalog(w))if(w.player.inventory[r.item]>0&&!w.returnedRelics.includes(r.item)){
 w.player.inventory[r.item]--;w.returnedRelics.push(r.item);w.relicVault[r.item]=(w.relicVault[r.item]||0)+1;count++;reward+=r.reward;receipts.push(r.receipt);if(w.loreState)w.loreState.receipts.push({item:r.item,at:w.time});
 }if(count){w.player.inventory.gold=(w.player.inventory.gold||0)+reward;w.relicReturned=w.returnedRelics.includes('relic');w.log('Софосу возвращено реликвий: '+w.returnedRelics.length+'/'+relicCatalog(w).length+'. +'+reward+' золота.');}
 return {count,reward,total:w.returnedRelics.length,receipts};}
export function renderHunt(root,w,{select=()=>{},close=()=>{}}={}){
 const el=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};root.replaceChildren();root.append(el('p','Софос просит приносить находки целиком. Их назначение неизвестно; воспользоваться ими нельзя. Возвращено: '+w.returnedRelics.length+'/'+relicCatalog(w).length+'.'));
 if(!w.quest){root.append(el('p','Поговорите с Софосом о поисках.'));return;}
 const list=document.createElement('div');list.className='quest-list';
 for(const r of relicAssignments(w)){
 const d=document.createElement('details');d.className='compact-choice';d.append(el('summary',r.title+(w.player.inventory[r.item]>0?' · В СУМКЕ':'')+' · '+r.reward+' зол.'));
 const originId={hushLens:'silent-chapel',threadSpool:'red',windKnot:'emralaan'}[r.item],origin=w.places.find(z=>z.id===originId);d.append(el('p',r.clue));if(origin)d.append(el('p','Последняя весть: '+origin.name+'.'));const trace=guardianClue(w,r.item);if(trace)d.append(el('p',trace));const clue=el('p','Искомая вещь: '+r.name+'. '+r.description);d.append(clue);
 // No live GPS for a stolen artifact. Its present holder must be found in the world.
 const source=w.landmarks.find(l=>l.item===r.item)||(origin?{name:origin.name,x:origin.x*TILE,y:origin.y*TILE}:null);if(source){const b=el('button',origin?'Запомнить место последней вести':'Запомнить место поиска');b.onclick=()=>{select({name:source.name,x:source.x,y:source.y});close();};d.append(b);}
 list.append(d);
 }root.append(list);
 if(w.returnedRelics.length){const d=document.createElement('details');d.className='compact-help';d.append(el('summary','Возвращённые находки'));for(const r of relicCatalog(w).filter(r=>w.returnedRelics.includes(r.item)))d.append(el('p',r.name+' · на пьедестале'));root.append(d);}
 if(w.returnedRelics.length===relicCatalog(w).length)root.append(el('p','Все поручения исполнены. Софос закрыл внутреннюю дверь. Во дворе снова слышны обычные шаги. Дороги остаются открыты.'));
}

export function releaseRelicUnderPressure(w,e){
 if(w.generatorVersion<9||e===w.player||e.hp<=0||e.hp/e.maxHp>.24||e.relicDropped)return false;
 const item=RELIC_KEYS.find(k=>e.inventory[k]>0);if(!item)return false;
 const count=e.inventory[item];delete e.inventory[item];e.relicDropped=true;
 w.landmarks.push({id:'dropped-relic-'+e.id,item,name:'Обронённая вещь · '+relicCatalog(w).find(r=>r.item===item).name,x:e.x,y:e.y,inventory:{[item]:count}});
 e.retreatUntil=w.elapsed+10;e.retreatFrom='player';e.enemyId=null;
 w.log(e.name+' выпускает свою ношу и пытается отступить.',{at:e});return true;
}

export function reconcileCarriedRelics(w){for(const item of RELIC_KEYS)if(w.player.inventory[item]>0){w.player.inventory[item]=1;for(const source of [...w.landmarks,...w.entities])delete source.inventory[item];}}
