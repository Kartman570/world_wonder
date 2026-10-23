import {ITEMS,TILE} from './content.js';
import {nearbyLootSources,takeLoot,takeAllNearbyLoot} from './loot.js';
export function renderLootPanel(root,world,anchor,{onChange=()=>{},onButcher=()=>{},onTakeAll=null}={}){
 root.replaceChildren();const sources=nearbyLootSources(world,anchor),element=(tag,text,cls)=>{const el=document.createElement(tag);if(text)el.textContent=text;if(cls)el.className=cls;return el;},button=(text,fn)=>{const b=element('button',text,'action');b.onclick=fn;return b;};
 root.append(element('div','ДОБЫЧА РЯДОМ','eyebrow'),element('h1',sources.length>1?'Источники добычи: '+sources.length:(sources[0]?.obj.name||'Добыча')),element('p','Предметы разделены по владельцам. Здесь показаны только доступные рядом источники.'));
 const changed=()=>{onChange();renderLootPanel(root,world,anchor,{onChange,onButcher,onTakeAll});};
 if(!sources.length)root.append(element('p','Рядом больше нет доступной добычи.','empty'));
 for(const [index,source]of sources.entries()){
  const {obj}=source,section=element('section',null,'loot-source'),heading=element('div',null,'loot-source-heading');heading.append(element('h3',obj.name||'Источник '+(index+1)),element('small',(obj.player?'Ваши вещи':source.kind==='woodPile'?'Лесозаготовка':source.kind==='landmark'?'Тайник':obj.animal?'Туша животного':'Тело')+' · '+(Math.round(source.distance/TILE*10)/10)+' кл.'));
  section.append(heading);const entries=Object.entries(obj.inventory||{}).filter(([,n])=>n>0);
  for(const [key,count]of entries){const row=element('div',null,'item-row');row.append(element('span',(ITEMS[key]?.icon||'◇')+' '+(ITEMS[key]?.name||key)+' × '+count),button('Забрать',()=>{takeLoot(world,source,key);changed();}));section.append(row);}
  if(!entries.length)section.append(element('p',source.needsButchering?'Сначала разделайте тушу, чтобы получить мясо и шкуры.':'Предметов не осталось.','empty'));
  const actions=element('div',null,'actions');if(source.needsButchering)actions.append(button('Разделать тушу · 3 сек.',()=>onButcher(source)));
  if(entries.length)actions.append(button('Забрать из источника',()=>{takeLoot(world,source);changed();}));section.append(actions);root.append(section);
 }
 if(sources.some(s=>Object.values(s.obj.inventory||{}).some(n=>n>0))){const actions=element('div',null,'actions loot-all');actions.append(button('Забрать всё рядом',()=>{takeAllNearbyLoot(world,anchor);if(onTakeAll){onChange();onTakeAll();}else changed();}));root.append(actions);}
}
