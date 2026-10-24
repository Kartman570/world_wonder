import {eventNews} from './world-events.js';
import {TILE,point,ITEMS,BANDITS,questOffers} from './content.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function createWorkSites(w){
 w.workSites=[];w.workProps=[];
 const prop=(site,kind,dx,dy,width=1,height=1,solid=true)=>w.workProps.push({site:site.id,kind,x:Math.floor(site.x/TILE)+dx,y:Math.floor(site.y/TILE)+dy,w:width,h:height,solid});
 for(const z of w.cities){
  if(z.port){const horizontal=w.generatorVersion>=10?z.portSite.side==='N'||z.portSite.side==='S':w.river.axis==='horizontal',site={id:z.id+'-port',kind:'port',name:'Речной порт · '+z.name,city:z.id,...point(z.portSite?.x??(horizontal?z.x:z.channelCoordinate+4),z.portSite?.y??(horizontal?z.channelCoordinate+4:z.y))};w.workSites.push(site);prop(site,'smugglerCart',2,2,3,2);prop(site,'crates',1,0,2,1);prop(site,'barrels',-2,1,2,1);for(let j=-2;j<=2;j++)prop(site,'dock',horizontal?j:0,horizontal?0:j,1,1,false);}
  const logging={id:z.id+'-logging',kind:'logging',name:'Лесозаготовка · '+z.name,city:z.id,...z.lumber};w.workSites.push(logging);prop(logging,'sawhorse',2,0,2,1);prop(logging,'axeBlock',-2,1);prop(logging,'toolRack',2,2,2,1);
  const fishing={id:z.id+'-fishing',kind:'fishing',name:'Рыбацкая стоянка · '+z.name,city:z.id,...z.fishing};w.workSites.push(fishing);prop(fishing,'fishingRod',0,0,1,1,false);prop(fishing,'bucket',-1,1);prop(fishing,'fishingRod',1,1,1,1,false);prop(fishing,'bucket',-2,1);
  const field={id:z.id+'-field',kind:'field',name:'Льняное поле · '+z.name,city:z.id,...point(z.x-z.rx+8,z.y+z.ry+7)};w.workSites.push(field);prop(field,'fiberBundle',-3,-1,1,1,false);
 }
}
export function ensureRoyalCourts(w){
 if(w.dungeonSpec||w.generatorVersion<4)return;
 for(const [i,z]of w.cities.entries()){
  const castle=w.buildings.find(b=>b.city===z.id&&b.type==='castle');if(!castle)continue;
  let king=w.entities.find(e=>e.role==='king'&&e.faction===z.id);if(!king){king=w.add('king',z.id,castle.x+6.5,castle.y+2.5,'Король '+['Радомир','Эдрик','Велимир'][i]);king.inventory={gold:350};}
  king.workBuildingId=castle.id;king.homeBuildingId=castle.id;king.work=point(castle.x+6.5,castle.y+2.5);king.home={...king.work};king.livery=z.style?.cloth;king.flagColor=z.style?.flag;
  const posts=[[4.5,2.5],[9.5,2.5],[4.5,6.5],[9.5,6.5],[3.5,11],[7.5,11],[11.5,11],[1.5,8]],guards=w.entities.filter(e=>e.royalPost&&e.faction===z.id);
  for(let j=guards.length;j<posts.length;j++){const [dx,dy]=posts[j],g=w.add(dy>9?'archer':'guard',z.id,castle.x+dx,castle.y+dy,'Королевская стража');g.royalPost=true;g.livery=z.style?.cloth;g.flagColor=z.style?.flag;}
 }
}
export function populateSociety(w){
 ensureRoyalCourts(w);
 for(const [i,z]of w.cities.entries()){

  w.add('tailor',z.id,z.x,z.y,'Швея '+['Лиора','Марта','Эльза'][i]).inventory={gold:150,fiber:9,cloth:3,coat:1,hide:3};
  const herald=w.add('herald',z.id,z.x+2.5,z.y+1.5,'Глашатай '+['Савва','Мирен','Яром'][i]);herald.work=point(z.x+2.5,z.y+1.5);herald.nextAnnouncement=w.elapsed+5+i*3;herald.newsIndex=0;
  const farmer=w.add('farmer',z.id,z.x-2,z.y+2);farmer.work={...w.workSites.find(s=>s.id===z.id+'-field')};
 }
}
export function foresterAI(w,e,dt){
 const hour=w.time%1440/60,evening=hour>=18,night=hour>=20||hour<6;
 const carrying=(e.inventory.log||0)>0;
 if(carrying){e.state='hauling';w.deliverWorker(e,dt,['log','meat','hide']);return;}
 if(night){e.state='sleep';w.navigate(e,e.home,dt,88);return;}
 if(evening){const pile=w.woodPiles.filter(p=>p.city===e.faction&&(p.inventory.log||0)>0).sort((a,b)=>distance(a,e)-distance(b,e))[0];if(!pile){e.state='returning';w.navigate(e,e.home,dt,85);return;}if(distance(e,pile)>35){e.state='collectingLogs';w.navigate(e,pile,dt,88);}else {const n=Math.min(12,pile.inventory.log);pile.inventory.log-=n;e.inventory.log=(e.inventory.log||0)+n;e.state='loadingLogs';w.log(e.name+' погрузил '+n+' брёвен для вечернего вывоза.',{at:e});}return;}
 if((e.inventory.meat||0)>=6){w.deliverWorker(e,dt,['meat','hide']);return;}
 if(w.carcassAI(e,dt))return;
 let tree=w.trees[e.treeId];if(!tree||tree.wood<=0||distance(tree,e.work)>800){if(distance(e,e.work)>180){e.state='toWork';w.navigate(e,e.work,dt,86);return;}tree=w.treesNear(e.work,650).sort((a,b)=>distance(a,e)-distance(b,e))[0];if(tree?.id!==e.treeId)e.workProgress=0;e.treeId=tree?.id;}
 if(tree){if(distance(tree,e)>30){e.state='toWork';w.navigate(e,tree,dt,80);}else w.harvest(e,tree,dt);}else e.state='idle';
}
export function heraldNews(w,cityId){
 const inbound=w.entities.filter(e=>e.caravan&&e.hp>0&&e.destination===cityId).sort((a,b)=>distance(a,{x:w.cities.find(z=>z.id===cityId).x*TILE,y:w.cities.find(z=>z.id===cityId).y*TILE})-distance(b,{x:w.cities.find(z=>z.id===cityId).x*TILE,y:w.cities.find(z=>z.id===cityId).y*TILE}));
 const outbound=w.entities.find(e=>e.caravan&&e.hp>0&&e.faction===cityId),lines=[];
 if(inbound[0]){const e=inbound[0],z=w.cities.find(z=>z.id===cityId);lines.push('В '+z.name+' идёт '+e.name+' из '+w.factionName(e.faction)+'. До города '+Math.round(distance(e,point(z.x,z.y))/TILE)+' клеток.');}else lines.push('На подходе к городу обозов пока нет.');
 if(outbound)lines.push(outbound.name+' '+(outbound.rest>0?'готовится отправиться':'следует')+' в '+w.factionName(outbound.destination)+'.');
 lines.push(...eventNews(w,cityId));return lines;
}
export function royalOffers(w,e){
 const base={city:e.faction,giver:'king'},offers=[{...base,id:e.faction+'-royal-hunt',title:'Королевский указ: сломить шайки',type:'kill',role:'bandits',count:12,reward:480},{...base,id:e.faction+'-royal-arsenal',title:'Запасы королевского арсенала',type:'collect',item:'ore',count:20,reward:350}];
 const dungeon=w.dungeonEntrances?.find(d=>d.template==='ruins');if(dungeon)offers.push({...base,id:e.faction+'-royal-depths',title:'Королевская экспедиция: '+dungeon.name,type:'clearDungeon',dungeon:dungeon.id,count:1,reward:650});
 const caravan=w.entities.find(n=>n.caravan&&n.hp>0&&n.faction===e.faction);if(caravan)offers.push({...base,id:e.faction+'-royal-escort-'+caravan.id,title:'Охрана коронного обоза',type:'escort',caravan:caravan.id,destination:caravan.destination,count:1,reward:320});return offers;
}
export function makeCampDetails(w){
 w.campSites=[];
 for(const [i,id]of ['red','ash','thorn'].entries()){
  const z=w.places.find(z=>z.id===id),site={id:'camp-'+id,kind:'camp',city:id,...point(z.x,z.y),name:['Охотничий стан Красных лис','Стоянка Пепельных псов','Укрепление Тернового союза'][i],style:i};w.campSites.push(site);
  for(const b of w.buildings.filter(b=>b.type==='tent'&&Math.abs(b.x-z.x)<15&&Math.abs(b.y-z.y)<15)){b.campStyle=i;b.camp=id;}
  const prop=(kind,x,y,width=1,height=1,solid=true)=>w.workProps.push({site:site.id,kind,x:z.x+x,y:z.y+y,w:width,h:height,solid});
  prop('campBanner',-1,-6,1,1,false);w.workProps.at(-1).style=i;prop('brazier',0,2);
  if(i===0){prop('hideRack',-5,1,2,1);prop('sawhorse',4,2,2,1);prop('bucket',-3,4);}
  if(i===1){prop('smugglerCart',-5,1,3,2);prop('crates',4,1,2,1);prop('barrels',3,4,2,1);}
  if(i===2){prop('palisade',-7,0,1,4);prop('palisade',7,0,1,4);prop('weaponRack',-4,1,2,1);prop('fallenColumn',3,1,2,1);}
 }
}
