import {RELICS} from './lore-content.js';
import {TILE,point} from './content.js';
export function buildSanctuary(w,clear){
 const z=w.places.find(z=>z.id==='cathedral'),{x,y}=z;z.r=34;
 clear(x-26,y-24,53,49,8);clear(x-2,y-23,5,47,3);clear(x-21,y+5,43,6,3);clear(x-9,y-9,19,4,3);w.spawn=point(x+.5,y+10.5);w.respawn={...w.spawn};
 for(const side of [-1,1])w.buildings.push({x:x+side*25,y:y-23,w:1,h:46,type:'wall',sanctuary:true});
 w.buildings.push({x:x-25,y:y-23,w:51,h:1,type:'wall',sanctuary:true},{x:x-25,y:y+22,w:21,h:1,type:'wall',sanctuary:true},{x:x+5,y:y+22,w:21,h:1,type:'wall',sanctuary:true});
 for(const b of [{x:x-16,y:y-6,w:13,h:12,type:'library',name:'БИБЛИОТЕКА'},{x:x+3,y:y-6,w:13,h:12,type:'training',name:'ТРЕНИРОВОЧНЫЙ ЗАЛ'},{x:x-7,y:y-20,w:15,h:12,type:'wizardHall',name:'ЗАЛ МАГИСТРА СОФОСА'}])w.buildings.push({...b,sanctuary:true});
 w.courtyard={...point(x+.5,y+3.5)};for(const dx of [-21,20])w.buildings.push({x:x+dx,y:y+12,w:2,h:1,type:'bench',sanctuary:true});
 w.districts.push({name:'ДВОР СОБОРА',...point(x,y+13),sanctuary:true});
}
export function furnishSanctuary(w){
 const z=w.places.find(z=>z.id==='cathedral');if(!z)return;
 w.libraryShelves=[];w.pedestals=[];
 const add=(b,kind,x,y,width=1,height=1,extra={})=>b.furniture.push({kind,x:b.x+x,y:b.y+y,w:width,h:height,solid:true,...extra});
 const library=w.buildings.find(b=>b.type==='library');
 if(library){
  for(const [tab,name,x,y]of [['guide','Полка наставлений',1,1],['bestiary','Полка бестиария',8,1],['finds','Каталог находок',1,5],['world','Хроники мира',8,5]]){add(library,'shelf',x,y,3,1,{tab});w.libraryShelves.push({id:tab,tab,name,...point(library.x+x+1.5,library.y+y+1.6)});}
  add(library,'table',5,4,2,2);library.workSpot=point(library.x+6.5,library.y+8.5);w.library={...w.libraryShelves[0]};
 }
 const hall=w.buildings.find(b=>b.type==='wizardHall');
 if(hall){for(const [i,[item,name]]of (w.generatorVersion>=9?RELICS.map(r=>[r.item,r.name]):RELICS.slice(0,3).map(r=>[r.item,r.name])).entries()){const x=3+(i%3)*4,y=[2,4,8][Math.floor(i/3)];add(hall,'pedestal',x,y,1,1,{item});w.pedestals.push({item,name,...point(hall.x+x+.5,hall.y+y+1.6),display:point(hall.x+x+.5,hall.y+y+.5)});}hall.workSpot=point(hall.x+7.5,hall.y+6.5);w.wizardSpot={...hall.workSpot};add(hall,'shelf',1,5,1,3);add(hall,'shelf',13,5,1,3);}
 const gym=w.buildings.find(b=>b.type==='training');if(gym){gym.workSpot=point(gym.x+6.5,gym.y+9.5);w.trainingRoom=gym;add(gym,'rack',1,1,2,1);add(gym,'rack',10,1,2,1);}
}
export function populateSanctuary(w){
 w.add('wizard','sanctuary',w.wizardSpot.x/TILE,w.wizardSpot.y/TILE);
 const b=w.trainingRoom;
 for(const [i,[x,y,moving]]of [[3.5,4.5,false],[9.5,4.5,false],[3.5,8.5,true],[9.5,8.5,true]].entries()){
  const e=w.add('dummy','sanctuary',b.x+x,b.y+y,moving?'Подвижный манекен':'Стоячий манекен');e.moving=moving;
  if(moving){e.trainingRoute=[point(b.x+x-1.5,b.y+y),point(b.x+x+1.5,b.y+y),point(b.x+x+1.5,b.y+y-2),point(b.x+x-1.5,b.y+y-2)];e.trainingLeg=i%4;}
 }
}
