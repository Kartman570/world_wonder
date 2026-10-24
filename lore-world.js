import {frontierContains} from './frontier-geography.js';
import {alienWorkerAI} from './alien-ecology.js';
import {AIR_GRACE,AIR_DAMAGE} from './atmosphere.js';
import {W,H,TILE,point} from './content.js';
import {OBSERVATIONS} from './lore-content.js';
const D=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const supported=w=>w.generatorVersion>=9&&!w.dungeonSpec;
export function buildLoreLands(w,r){
 if(!supported(w))return;
 const jitter=n=>Math.round((r()-.5)*n),ark={x:1010+jitter(65),y:737+jitter(55),rx:125,ry:115},desert={x:1000+jitter(50),y:210+jitter(45),rx:250,ry:205};
 if(w.generatorVersion>=11){ark.phase=r()*Math.PI*2;ark.rotation=r()*Math.PI*2;w.arkAtmosphere=new Uint8Array(W*H);}
 if(w.frontierRegions){Object.assign(ark,w.frontierRegions.ark);Object.assign(desert,w.frontierRegions.desert);}
 w.loreGeography={ark,desert};w.loreSites=[];w.rifts=[];
 const paint=(x,y,t)=>{if(w.generatorVersion>=10&&[2,4].includes(w.tile(x,y))&&!w.roadMask[y*W+x])return;if(x>1&&y>1&&x<W-2&&y<H-2)w.tiles[y*W+x]=w.roadMask[y*W+x]?(w.tiles[y*W+x]===5?5:1):t;};
 // Rivers and lakes remain natural: the new biomes change the banks, never erase water.
 for(let y=2;y<H-2;y++)for(let x=2;x<W-2;x++){
  const t=w.tile(x,y),basin=Math.abs(x-ark.x)<ark.rx*1.25&&Math.abs(y-ark.y)<ark.ry*1.25?arkBasin(ark,x,y):2;if(w.arkAtmosphere&&basin<.40)w.arkAtmosphere[y*W+x]=1;if([2,4,5,1,3,6].includes(t))continue;
  const sand=((x-desert.x)/desert.rx)**2+((y-desert.y)/desert.ry)**2;
  if(w.generatorVersion>=10){if(sand<(w.generatorVersion>=11?1+.07*Math.sin(y*.04):.14)&&![2,4,5,1,3,6].includes(t))paint(x,y,15);}else if(sand<1+.07*Math.sin(y*.04))paint(x,y,15);
  if(basin<1){if(basin>.66)paint(x,y,17);else if(basin<.40)paint(x,y,16);else paint(x,y,18);}
 }
 const flat=(x,y,radius,t=18)=>{for(let y1=-radius;y1<=radius;y1++)for(let x1=-radius;x1<=radius;x1++)paint(x+x1,y+y1,t);};
 const land=(id,name,x,y,rad=20,faction)=>{if(w.generatorVersion>=12&&!['new-arktaria','ark-ledge','emralaan','nomad-well'].includes(id)&&!id.startsWith('nomad-clan-')){for(let i=0;i<8000;i++){const xx=35+Math.floor(r()*(W-70)),yy=35+Math.floor(r()*(H-70));if(frontierContains(w,xx,yy,rad+30)||w.places.some(z=>Math.hypot(z.x-xx,z.y-yy)<(z.r||20)+rad+35)||w.buildings.some(b=>xx>b.x-20&&xx<b.x+b.w+20&&yy>b.y-20&&yy<b.y+b.h+20))continue;let dry=true;for(let dy=-17;dy<=17;dy+=2)for(let dx=-17;dx<=17;dx+=2)if([2,4,17].includes(w.tile(xx+dx,yy+dy)))dry=false;if(dry){x=xx;y=yy;break;}}}if(w.generatorVersion>=10&&(['emralaan','nomad-well','silent-chapel'].includes(id)||w.generatorVersion>=11&&id.startsWith('nomad-clan-'))){const dry=(xx,yy)=>{if(w.generatorVersion>=11&&(xx<20||yy<20||xx>W-21||yy>H-21))return false;for(let dy=-16;dy<=16;dy++)for(let dx=-16;dx<=16;dx++)if([2,4].includes(w.tile(xx+dx,yy+dy)))return false;return true;};if(!dry(x,y)){let found=false;for(let radius=8;radius<120&&!found;radius+=8)for(let k=0;k<24;k++){const xx=x+Math.round(Math.cos(k*Math.PI/12)*radius),yy=y+Math.round(Math.sin(k*Math.PI/12)*radius);if(dry(xx,yy)){x=xx;y=yy;found=true;break;}}}}const z={id,name,x,y,r:rad,faction};w.places.push(z);return z;};
 const camp=land('emralaan','Пустошь · Седло ветра',desert.x-20,desert.y,36,'emralaan');
 const other=land('nomad-well','Синие костры',desert.x+90,desert.y+65,24,'emralaan');
 land('new-arktaria','Новая Арктария',ark.x,ark.y,110,'arktaria');
 const ledge=land('ark-ledge','Верхний уступ Новой Арктарии',ark.x,ark.y+86,10,'arktaria');
 land('teraquaria','Теракварский барьер',790+jitter(20),350+jitter(25),24,'fairies');
 land('silk-road','Шёлковый путь',440+jitter(65),790+jitter(60),45);
 land('shard-reach','Поле осколков',1120+jitter(35),455+jitter(30),32);
 const chapel=land('silent-chapel','Безгласная часовня',590+jitter(40),665+jitter(25),18,'chapel');
 land('pale-shore','Бледный берег',680+jitter(35),805+jitter(35),20);
 if(w.generatorVersion>=11){
  const roadOutside=w.roads.flat().filter(p=>w.cities.every(c=>Math.hypot(p[0]-c.x,p[1]-c.y)>c.r+12));
  // Search the rim for a short, dry approach instead of building a causeway across a lake.
  let choice;
  for(let k=0;k<64;k++){const angle=k*Math.PI/32,edge=arkRadius(ark,angle),dx=Math.cos(angle)*ark.rx*edge,dy=Math.sin(angle)*ark.ry*edge,outer=[ark.x+dx*1.24,ark.y+dy*1.24];
   const near=roadOutside.reduce((a,b)=>Math.hypot(b[0]-outer[0],b[1]-outer[1])<Math.hypot(a[0]-outer[0],a[1]-outer[1])?b:a);let wet=0;
   for(let i=0;i<=50;i++){const t=.45+i/50*.8;if([2,4].includes(w.tile(Math.round(ark.x+dx*t),Math.round(ark.y+dy*t))))wet++;}
   const score=Math.hypot(near[0]-outer[0],near[1]-outer[1])+wet*35;if(!choice||score<choice.score)choice={near,dx,dy,score};
  }
  const {near,dx,dy}=choice;
  Object.assign(ledge,{x:Math.round(ark.x+dx*.76),y:Math.round(ark.y+dy*.76)});ark.gate=point(ledge.x,ledge.y);ark.approach=[Math.round(ark.x+dx*1.16),Math.round(ark.y+dy*1.16)];
  for(let i=0;i<=100;i++){const t=.57+i/100*.64;flat(Math.round(ark.x+dx*t),Math.round(ark.y+dy*t),6,18);}
  for(let i=0;i<=150;i++){const t=i/150*1.24;for(let yy=-4;yy<=4;yy++)for(let xx=-4;xx<=4;xx++){const x=Math.round(ark.x+dx*t)+xx,y=Math.round(ark.y+dy*t)+yy,j=y*W+x;w.tiles[j]=[2,4,5].includes(w.tiles[j])?5:18;w.roadMask[j]=1;}}
  w.allowArkRoad=true;try{w.paintRoad([near,ark.approach,[ledge.x,ledge.y]]);}finally{w.allowArkRoad=false;}
  const chapelNear=roadOutside.reduce((a,b)=>Math.hypot(b[0]-chapel.x,b[1]-chapel.y)<Math.hypot(a[0]-chapel.x,a[1]-chapel.y)?b:a);w.paintRoad([chapelNear,[chapel.x,chapel.y+13]]);
 }else{
  if(w.generatorVersion>=10)for(let y=ark.y+67;y<=ark.y+140;y++)for(let dx=-6;dx<=6;dx++)paint(ark.x+dx,y,18);
  const attach=[...w.roads.flat()].filter(p=>w.cities.every(c=>D({x:p[0],y:p[1]},c)>c.r+8)).sort((a,b)=>b[0]-a[0])[0]||[680,450];
  w.paintRoad([attach,[745,attach[1]+30],[780,480],[850,550],[ark.x,ark.y+145],[ark.x,ark.y+82]]);
  w.paintRoad([[780,480],[815,365],[850,290],[camp.x,camp.y+25]]);w.paintRoad([[745,attach[1]+30],[720,600],[chapel.x,chapel.y+13]]);
  ark.gate=point(ark.x,ark.y+83);for(let y=ark.y+67;y<=ark.y+140;y++)for(let dx=-6;dx<=6;dx++)paint(ark.x+dx,y,18);
 }
 const nomadCamps=[camp,other];
 if(w.generatorVersion>=11){for(let i=0;i<4;i++){const angle=i*Math.PI/2+.5;nomadCamps.push(land('nomad-clan-'+i,['Пепельные копыта','Белые ремни','Рваные знамёна','Горький колодец'][i],Math.round(desert.x+Math.cos(angle)*desert.rx*.65),Math.round(desert.y+Math.sin(angle)*desert.ry*.65),25,'emralaan'));}for(const [i,z]of nomadCamps.entries()){z.nomadClan=true;z.faction='emralaan-'+i;}}
 const addSite=(id,x,y,extra={})=>{const o=OBSERVATIONS[id];w.loreSites.push({id,...point(x,y),title:o.title,text:o.text,...extra});};
 const church=w.places.find(z=>z.id==='cathedral');
 addSite('cold-roots',church.x+19,church.y+17,{style:'ribs'});
 addSite('evening-hare',church.x+27,church.y+17,{style:'mirrors'});
 addSite('old-pine',church.x-18,church.y+16,{style:'pine'});
 addSite('cut-stone',740,560,{style:'road'});
 const silk=w.places.find(z=>z.id==='silk-road');flat(silk.x,silk.y,9,18);addSite('silk-road',silk.x,silk.y,{style:'web'});addSite('garden',silk.x+7,silk.y+6,{style:'pods'});
 const barrier=w.places.find(z=>z.id==='teraquaria');flat(barrier.x,barrier.y,4,18);addSite('barrier',barrier.x,barrier.y,{style:'barrier'});
 addSite('blue-fire',camp.x,camp.y,{style:'blueFire'});if(w.generatorVersion>=11)for(const z of nomadCamps.slice(1))w.loreSites.push({...w.loreSites.find(s=>s.id==='blue-fire'),id:'clan-fire-'+z.id,...point(z.x,z.y)});addSite('eye',chapel.x,chapel.y-3,{style:'eye'});
 addSite('ark-gate',ledge.x-3,ledge.y-2,{style:'shell'});addSite('ark-work',ark.x-3,ark.y+3,{style:'workbench'});addSite('ark-hull',ark.x+7,ark.y-4,{style:'hull'});
 const reach=w.places.find(z=>z.id==='shard-reach');flat(reach.x,reach.y,12,18);addSite('frame',reach.x,reach.y,{style:'frame'});
 const pale=w.places.find(z=>z.id==='pale-shore');flat(pale.x,pale.y,5,18);addSite('vampire-water',pale.x,pale.y,{style:'cups'});
 const b={x:chapel.x-5,y:chapel.y-8,w:11,h:11,type:'dungeonGate',fullRoom:true,name:'БЕЗГЛАСНАЯ ЧАСОВНЯ',loreChapel:true};flat(chapel.x,chapel.y,12,18);w.buildings.push(b);
 w.loreGeography.chapelBuilding=w.buildings.length;
 // Desert households differ from human streets; these are movable tents around blue fires.
 for(const z of nomadCamps){flat(z.x,z.y,15,15);for(let i=0;i<6;i++)w.buildings.push({x:z.x+Math.round(Math.cos(i*Math.PI/3)*12)-2,y:z.y+Math.round(Math.sin(i*Math.PI/3)*10)-2,w:4,h:4,type:'loreTent',loreStyle:i%2?'striped':'hide',clanColor:z.nomadClan?['#ad7757','#758baf','#ad9a55','#939dab','#8d685a','#848d60'][nomadCamps.indexOf(z)]:undefined});}
 for(let i=0;i<(w.generatorVersion>=11?8:14);i++){const angle=i*2.39996,rad=13+Math.floor(i/5)*12;let x=ark.x+Math.round(Math.cos(angle)*rad),y=ark.y+Math.round(Math.sin(angle)*rad*.78);if(Math.abs(x-ark.x)<5&&y>ark.y)continue;const half=w.generatorVersion>=11?7:5,clear=(xx,yy)=>{if(w.generatorVersion>=11&&Math.hypot(xx-ark.x,yy-ark.y)<14)return false;if(w.buildings.some(b=>xx+half+1>b.x&&xx-half-1<b.x+b.w&&yy+half+1>b.y&&yy-half-1<b.y+b.h))return false;for(let dy=-half-1;dy<=half+1;dy++)for(let dx=-half-1;dx<=half+1;dx++)if(w.roadMask[(yy+dy)*W+xx+dx]||[2,4,17].includes(w.tile(xx+dx,yy+dy)))return false;return true;};if(!clear(x,y)){let found=false;for(let r=7;r<70&&!found;r+=7)for(let a=0;a<12;a++){const xx=x+Math.round(Math.cos(a*Math.PI/6)*r),yy=y+Math.round(Math.sin(a*Math.PI/6)*r);if(clear(xx,yy)){x=xx;y=yy;found=true;break;}}}if(w.generatorVersion>=11&&!clear(x,y))continue;w.buildings.push({x:x-half,y:y-half,w:half*2+1,h:half*2+1,type:'arkVault',fullRoom:true,name:i%3?'ТИХОЕ УБЕЖИЩЕ':'КРУГЛАЯ МАСТЕРСКАЯ',lore:true});}

 // All unstable tears have their own bounded drift patch, independent of the camera.
 for(const [i,[x,y]]of [[reach.x+7,reach.y+5],[855,480],[350,715],[1190,845],[desert.x+40,desert.y-85]].entries()){
  flat(x,y,7,i===4?15:18);w.rifts.push({id:'rift-'+i,name:'Блуждающий разлом',anchor:point(x,y),...point(x,y),radius:24,phase:r()*Math.PI*2,drift:(3+r()*2)*TILE});
 }
 const chest=(item,name,x,y)=>{if(w.generatorVersion>=11){const valid=(xx,yy)=>!w.blocked((xx+.5)*TILE,(yy+.5)*TILE,true)&&!w.interiorAt(point(xx+.5,yy+.5));if(!valid(x,y)){let found=false;for(let radius=1;radius<80&&!found;radius++)for(let k=0;k<32;k++){const xx=Math.round(x+Math.cos(k*Math.PI/16)*radius),yy=Math.round(y+Math.sin(k*Math.PI/16)*radius);if(valid(xx,yy)){x=xx;y=yy;found=true;break;}}}}flat(x,y,2,w.tile(x,y)===16?16:18);w.landmarks.push({id:'lore-'+item,item,name,...point(x+.5,y+.5),inventory:{[item]:1}});};
 // Landmarks are installed after the ordinary surface chests (see populateLore).
 w.loreChestPlans=[['mirrorSeed','Чаша под белым сводом',silk.x+6,silk.y+7],['breathVessel','Оставленный стол',ark.x-12,ark.y+7],['brokenCrown','У основания пустой рамы',reach.x,reach.y+3]];
 w.installLoreChest=chest;
 if(w.generatorVersion>=11){for(let y=2;y<H-2;y++)for(let x=2;x<W-2;x++)if(w.roadMask[y*W+x]&&desertAt(w,x,y)){w.roadMask[y*W+x]=0;w.tiles[y*W+x]=[2,4].includes(w.naturalTiles[y*W+x])?w.naturalTiles[y*W+x]:15;}w.roads=w.roads.flatMap(route=>{const parts=[];let part=[];for(const p of route){if(desertAt(w,...p)){if(part.length>1)parts.push(part);part=[];}else part.push(p);}if(part.length>1)parts.push(part);return parts;});}

}
export function populateLore(w){
 if(!supported(w))return;
 w.loreState={version:1,notes:[],commissioned:false,receipts:[],riftCooldown:0,exposure:0};
 for(const plan of w.loreChestPlans||[])w.installLoreChest(...plan);delete w.installLoreChest;
 const ark=w.loreGeography.ark,camp=w.places.find(z=>z.id==='emralaan'),other=w.places.find(z=>z.id==='nomad-well');
 const add=(role,faction,x,y,name)=>{const e=w.safeSpawn(role,faction,x,y,name);e.loreActor=true;return e;};
 const camps=w.generatorVersion>=11?w.places.filter(z=>z.nomadClan):[camp,other];
 for(const [j,z]of camps.entries())for(let i=0;i<9;i++){
  const e=add(i%3===0?'nomadArcher':'nomad',z.faction,z.x-6+(i%3)*5,z.y-4+Math.floor(i/3)*4,i===0&&j===0?'Укротитель ветра':'Всадник '+z.name);
  e.race='emralaan';e.mounted=true;e.hp=e.maxHp=i===0&&j===0?180:100;e.inventory={gold:12,sword:1,...(e.role==='nomadArcher'?{bow:1,arrow:35}:{})};if(i===0&&j===0)e.inventory.windKnot=1;
 }
 for(const z of camps)for(let i=0;i<4;i++){const e=add('fairy','fairies',z.x-5+i*3,z.y+8,'Крылатая у '+(i%2?'ремней':'костра'));e.race='fairy';e.inventory={cloth:4,arrow:30};}
 const rescuer=add('arctRescuer','arktaria',(w.generatorVersion>=11?ark.gate.x/TILE:ark.x),(w.generatorVersion>=11?ark.gate.y/TILE:ark.y+85),'Встречающий на уступе');rescuer.race='arctarian';rescuer.hp=rescuer.maxHp=230;rescuer.inventory={breathSuit:8,cloth:20,ore:20};
 for(let i=0;i<10;i++){const e=add('arctarian','arktaria',ark.x+Math.cos(i)*(8+i*1.6),ark.y+Math.sin(i)*(7+i*1.4),'Мастер тихой чаши');e.race='arctarian';e.hp=e.maxHp=200;e.inventory={ore:2};e.work={...e.home};}
 const b=w.buildings[w.loreGeography.chapelBuilding-1],keeper=add('relicKeeper','chapel',b.workSpot.x/TILE,b.workSpot.y/TILE,'Смотритель Безгласной часовни');keeper.inventory={hushLens:1,hammer:1,armor:1,gold:18};keeper.hp=keeper.maxHp=130;keeper.workBuildingId=b.id;keeper.work={...b.workSpot};keeper.home={...b.workSpot};
 const chief=w.entities.find(e=>e.faction==='red'&&e.role==='brute');if(chief){chief.name='Хранитель нити';chief.inventory.threadSpool=1;}
 // A few cave animals inhabit the abandoned garden, not a second city-sized crowd.
 const silk=w.places.find(z=>z.id==='silk-road');for(let i=0;i<8;i++)w.safeSpawn('caveSpider','silk',silk.x-9+i*2.5,silk.y-5+i%3*3);
 w.entities.find(e=>e.role==='wizard').name='Волшебник Софос';
}
export function purpleAt(w,p){if(!supported(w))return false;return w.arkAtmosphere?!!w.arkAtmosphere[Math.floor(p.y/TILE)*W+Math.floor(p.x/TILE)]:w.tile(p.x/TILE,p.y/TILE)===16;}
export function canBreathe(w,p=w.player){return !purpleAt(w,p)||p.inventory?.breathSuit>0&&p.breathSuitWorn===true||p.race==='arctarian';}
export function toggleBreathSuit(w){const p=w.player;if(!(p.inventory.breathSuit>0))return {ok:false,message:'Одеяния нет в сумке.'};p.breathSuitWorn=!p.breathSuitWorn;return {ok:true,message:p.breathSuitWorn?'Швы сомкнулись. Дыхание слышно только внутри.':'Лицевая оболочка открыта.'};}
export function acceptBreathSuit(w,e){if(e?.role!=='arctRescuer'||!w.canInteract(w.player,e,155))return {ok:false,message:'Подойдите к встречающему на верхнем уступе.'};if(w.player.inventory.breathSuit>0)return {ok:false,message:'Он касается уже выданной оболочки и показывает, как сомкнуть швы.'};if(!(e.inventory.breathSuit>0))return {ok:false,message:'Пустые крюки. Новых оболочек пока нет.'};e.inventory.breathSuit--;w.player.inventory.breathSuit=1;w.player.breathSuitWorn=true;w.loreState.exposure=0;return {ok:true,message:'Он осторожно подгоняет оболочку по плечам. Сквозь прозрачное лицо виден спокойный кивок. Вы получили и надели одеяние закрытого дыхания.'};}
export function loreHostility(w,a,b){if(!a.loreActor&&!b.loreActor)return null;if((b.race==='emralaan'||b.faction==='emralaan')&&['guard','archer','escort','escortArcher','hunter'].includes(a.role))return true;if(a.race==='emralaan'||a.faction==='emralaan')return b===w.player||b.race==='emralaan'&&a.faction!==b.faction||['oak','salt','north','red','ash','thorn'].includes(b.faction);if(a.race==='arctarian')return false;if(a.role==='fairy')return false;if(a.role==='relicKeeper')return a.aggressor===b.id||b===w.player&&w.player.weaponDrawn&&D(a,b)<210;return null;}
export function loreAI(w,e,dt){if(!e.loreActor)return false;
 if(e.role==='relicKeeper'){if(D(e,e.work)>20)w.navigate(e,e.work,dt,70);else e.state='watchingRelic';return true;}
 if(e.race==='arctarian'){if(alienWorkerAI(w,e,dt))return true;if(e.aggressor){const a=e.aggressor==='player'?w.player:w.entityById.get(e.aggressor);if(a&&D(a,e)<240){w.move(e,e.x+(e.x-a.x)*2,e.y+(e.y-a.y)*2,100,dt);e.state='flee';return true;}}
  if(e.role==='arctRescuer'&&e.inventory.breathSuit<2&&e.inventory.cloth>=2&&e.inventory.ore>=2){e.shellWork=(e.shellWork||0)+dt;if(e.shellWork>=30){e.shellWork=0;e.inventory.cloth-=2;e.inventory.ore-=2;e.inventory.breathSuit++;}}e.state=e.role==='arctRescuer'?'offeringShell':'quietWork';if(D(e,e.home)>60)w.move(e,e.home.x,e.home.y,75,dt);return true;}
 if(e.role==='fairy'){const threat=w.nearby(e,210).find(o=>o===w.player&&o.weaponDrawn||o.enemyId&&o.faction!=='emralaan');if(threat){w.move(e,e.x+(e.x-threat.x)*2,e.y+(e.y-threat.y)*2,110,dt);e.state='flee';return true;}const rider=w.nearby(e,240).find(o=>o.mounted&&(o.hp<o.maxHp&&e.inventory.cloth>0||o.role==='nomadArcher'&&o.inventory.arrow<15&&e.inventory.arrow>0));if(rider){if(D(e,rider)>48)w.move(e,rider.x,rider.y,80,dt);else{e.serviceWork=(e.serviceWork||0)+dt;if(e.serviceWork>=4){e.serviceWork=0;if(rider.hp<rider.maxHp&&e.inventory.cloth>0){e.inventory.cloth--;rider.hp=Math.min(rider.maxHp,rider.hp+15);}else{const n=Math.min(10,e.inventory.arrow);e.inventory.arrow-=n;rider.inventory.arrow+=n;}}}e.state='tendingRider';return true;}e.state='byBlueFire';}
 if(!e.patrolPoint||e.timer<=0){e.patrolPoint={x:e.home.x+(w.random()-.5)*(e.mounted?900:180),y:e.home.y+(w.random()-.5)*(e.mounted?750:180)};e.timer=10+w.random()*15;}
 w.move(e,e.patrolPoint.x,e.patrolPoint.y,e.mounted?115:45,dt);if(e.mounted)e.state='riding';return true;
}
export function observeSite(w,site){if(!w.loreState||!w.canInteract(w.player,site,130))return {ok:false,message:'Подойдите ближе.'};if(!w.loreState.notes.includes(site.id)){w.loreState.notes.push(site.id);w.log('Зарисовка в журнале: '+site.title+'.');}return {ok:true,message:site.text};}
export function crossRift(w,rift,{outcome=null}={}){
 if(!w.loreState||w.player.hp<=0||w.elapsed<w.loreState.riftCooldown||w.deathReport&&!w.deathReport.acknowledged)return {ok:false};
 w.loreState.riftCooldown=w.elapsed+8;const fatal=(outcome??w.random())<.12;
 if(fatal){w.player.hp=0;w.die(w.player,{name:'Нестабильный разлом',role:'rift',deathReason:'Разлом сомкнулся во время перехода.'});return {ok:true,fatal:true};}
 // Rejection-sample safe open ground; neither walls, purple air nor another tear is a destination.
 for(let i=0;i<2000;i++){const target=point(12+w.random()*(W-24),12+w.random()*(H-24));if(w.blocked(target.x,target.y)||purpleAt(w,target)||w.interiorAt(target)||w.rifts.some(r=>D(r,target)<8*TILE))continue;w.player.x=target.x;w.player.y=target.y;w.player.action=null;w.player.pendingStrike=null;w.player.lockedTargetId=null;w.rebuildSpatial();w.log('Звук шагов оборвался. Под ногами уже другая земля.');return {ok:true,fatal:false};}
 return {ok:false,message:'Воздух дрогнул, но не пропустил вас.'};
}
export function updateLore(w,dt){
 if(!supported(w)||!w.loreState)return;
 for(const r of w.rifts){const t=w.elapsed*.11+r.phase;r.x=r.anchor.x+Math.sin(t)*r.drift;r.y=r.anchor.y+Math.sin(t*.73)*r.drift*.65;}
 const p=w.player;if(p.role==='absent')return;const helper=w.entities.find(e=>e.role==='arctRescuer'&&e.hp>0);if(helper&&!(p.inventory.breathSuit>0)&&w.canInteract(p,helper,150)){const gift=acceptBreathSuit(w,helper);if(gift.ok)w.log(gift.message);}
 if(!canBreathe(w)){const old=w.loreState.exposure||0;w.loreState.exposure=old+dt;if(!w.loreState.airWarning||w.elapsed>w.loreState.airWarning+8){w.log('Нечем дышать! Покиньте фиолетовый воздух или наденьте закрытое одеяние.');w.loreState.airWarning=w.elapsed||.001;}const hurt=Math.max(0,w.loreState.exposure-AIR_GRACE)-Math.max(0,old-AIR_GRACE);p.hp=Math.max(0,p.hp-AIR_DAMAGE*hurt);if(p.hp<=0){w.die(p,{name:'Фиолетовое дыхание чаши',role:'atmosphere',deathReason:'Спустился под фиолетовую черту без закрытого одеяния.'});return;}}else w.loreState.exposure=0;

 for(const r of w.rifts)if(D(r,p)<r.radius+12){crossRift(w,r);break;}
}

// A shared continuous field defines the rim and atmosphere, independently of roads and water.
export function arkRadius(a,t){return a.phase===undefined?1:1+.12*Math.sin(t*3+a.phase)+.075*Math.sin(t*5-a.phase*.7)+.035*Math.sin(t*9+a.rotation);}
export function arkBasin(a,x,y){const dx=(x-a.x)/a.rx,dy=(y-a.y)/a.ry;return (dx*dx+dy*dy)/arkRadius(a,Math.atan2(dy,dx))**2;}
export function desertAt(w,x,y){const d=w.loreGeography.desert,dx=(x-d.x)/d.rx,dy=(y-d.y)/d.ry;return dx*dx+dy*dy<1+.07*Math.sin(y*.04);}
