import {updateCampaign,campaignEvent} from './campaign.js';
import {initializeProjects,projectAI} from './city-projects.js';
import {tradePrice} from './settlement-services.js';
import {updateCompanions,companionHostility,companionAI} from './companions.js';
import {initializeEcology,updateEcology} from './ecology.js';
import {initializeEvents,updateEvents,eventActorAI,raidAI} from './world-events.js';
import {initializeIndustry,industryAI,updateIndustry} from './industry.js';
import {initializeContracts,rescueAI,updateContracts,CONTRACT_TYPES,contractProgress,contractText,claimContracts} from './contracts.js';
import {normalizeCrafts,tickCraft,cancelCraft,armorReduction,grantSkill} from './crafts.js';
import {configurePrisons,furnishPrisons,rasterPrisons,closedCellAt,initializeLaw,recordCrime,lawTick,lawActorAI,legalHostility,prisonDefeat,cityMemory,migrateLawResidents} from './law.js';
import {normalizeCombat,toggleWeapon,aimPlayer,attackPlayer as playerStrike,tickCombat,guardWarnings,combatAI,retreat} from './combat.js';
import {moveActor,bodyRadius,canOccupy,settleBodies} from './actor-collision.js';
import {normalizeStamina,MAX_STAMINA} from './player-movement.js';
import {populateSettlementPeople,ROLE_ROOMS} from './settlement-people.js';
import {settlementInside} from './settlement-shapes.js';
import {ensureRoyalCourts,createWorkSites,populateSociety,foresterAI,heraldNews,royalOffers,makeCampDetails} from './society.js';
import {riverCenter} from './settlements.js';
import {buildSanctuary,furnishSanctuary,populateSanctuary} from './sanctuary.js';
import {configureGeography,surfaceTile,generateRoads,generateCity,finalizeHydrology} from './worldgen.js';
import {placeDungeonEntrances,generateDungeonMap,populateDungeon,revealDungeon} from './dungeons.js';
import {TILE,W,H,VERSION,point,PLACES,CITIES,ITEMS,ANIMALS,ROLES,BANDITS,GUARDS,RANGED,TRADE,LANDMARKS,FACTIONS,questOffers} from './content.js';
import {PathPlanner} from './pathfinding.js';
import {prepareRooms} from './interiors.js';
export const SIM_STEP=.15;
export const LOCAL_EVENT_RADIUS=10*TILE;
export {TILE,W,H,PLACES,ITEMS,ANIMALS,ROLES,TRADE,FACTIONS,questOffers};
export function rng(seed){let a=0;for(const c of String(seed))a=(a*31+c.charCodeAt(0))|0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const CITY_IDS=CITIES.map(c=>c.id),PEACE=['fisher','hunter','forester','smith','cook','herbalist','mayor','quartermaster','citizen','miner','gatherer','king','herald','tailor','farmer','farmerTrader','armorer','bowyer','leatherworker','provisioner'];
export class World{
 constructor(seed='734291',{generatorVersion=8,dungeonSpec=null}={}){
  this.dungeonSpec=dungeonSpec;this.version=VERSION;this.generatorVersion=generatorVersion;this.seed=seed;this.places=PLACES.map(z=>({...z}));this.cities=this.places.filter(z=>CITY_IDS.includes(z.id));this.geographyRandom=rng(String(seed)+':geography');this.river={x:392,phase:0,a:15,b:5};this.lake={x:510,y:369,rx:25,ry:19};if(generatorVersion===1){const r=this.geographyRandom,j=n=>Math.round((r()-.5)*n);for(const z of this.places){if(z.id==='cathedral')continue;z.x+=j(CITY_IDS.includes(z.id)?24:60);z.y+=j(CITY_IDS.includes(z.id)?24:50);}for(let pass=0;pass<8&&this.cities.some((a,i)=>this.cities.some((b,j)=>i<j&&Math.hypot(a.x-b.x,a.y-b.y)<316));pass++)for(const z of this.cities){const base=PLACES.find(p=>p.id===z.id);z.x=Math.round((z.x+base.x)/2);z.y=Math.round((z.y+base.y)/2);}const slots=this.cities.map(z=>({x:z.x,y:z.y}));for(let i=slots.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[slots[i],slots[j]]=[slots[j],slots[i]];}this.cities.forEach((z,i)=>Object.assign(z,slots[i]));this.river={x:365+r()*70,phase:r()*Math.PI*2,a:12+r()*22,b:3+r()*7};const lake=this.places.find(z=>z.id==='lake');this.lake={x:lake.x,y:lake.y,rx:20+r()*14,ry:14+r()*12};}if(generatorVersion>=2&&!dungeonSpec)configureGeography(this,this.geographyRandom);this.random=rng(seed);this.time=8*60;this.elapsed=0;this.entities=[];this.corpses=[];this.events=[];this.id=0;this.kills=0;this.killCounts={};this.relicReturned=false;this.quest=false;this.quests=[];this.discovery=[];this.effects=[];this.projectiles=[];this.storages={};this.warehouses={};this.caravanStats={arrived:0,lost:0};this.accumulator=0;this.aiTick=0;this.pathQueue=[];this.pathCache=new Map();this.entityById=new Map();this.escortsByLeader=new Map();this.roomGrid=new Uint16Array(W*H);this.interiorRevision=2;this.motion=new Map();this.choppedTrees=new Set();this.spatial=new Map();this.visited=[];this.returnedRelics=[];this.relicVault={};this.woodPiles=[];this.clearedDungeons=[];this.respawn=point(300,298);
  this.territories=[{name:'Западная застава',...point(177,301),owner:'oak',pressure:0},{name:'Каменный брод',...point(315,170),owner:'north',pressure:0},{name:'Восточная развилка',...point(448,301),owner:'salt',pressure:0},{name:'Южный перевал',...point(340,380),owner:'thorn',pressure:0}];
  this.player={id:'player',role:'player',name:'Странник',...point(300,298),hp:100,maxHp:100,stamina:MAX_STAMINA,maxStamina:MAX_STAMINA,dir:4,inventory:{gold:65,sword:1,bow:1,arrow:35,ration:6,axe:1},faction:'player',cooldown:0,attack:0,weapon:'sword',weaponMode:'melee',equipment:{melee:'sword',ranged:'bow'}};
  this.debugMode=false;this.makeMap();if(this.spawn&&!this.dungeonSpec)Object.assign(this.player,this.spawn);this.populate();if(this.generatorVersion>=4&&!this.dungeonSpec){if(this.generatorVersion>=8)ensureRoyalCourts(this);else populateSociety(this);};this.assignResidents();initializeLaw(this);initializeIndustry(this);initializeContracts(this);initializeEvents(this);initializeEcology(this);initializeProjects(this);this.rebuildSpatial();normalizeCombat(this);settleBodies(this);this.rebuildSpatial();this.resetMotion();
 }
 log(text,{at=null,personal=!at}={}){const observed=personal||!!(at&&dist(at,this.player)<=LOCAL_EVENT_RADIUS&&this.visibleFrom(this.player,at));const event={text,time:this.time,scope:personal?'personal':'local',observed,...(at?{x:at.x,y:at.y}:{})};this.events.unshift(event);this.events.length=Math.min(120,this.events.length);this.onEvent?.(text,event);}
 eventObservable(event){return event?.scope==='personal'||event?.observed===true;}
 normalizeEquipment(){const p=this.player;if(!p.equipment)p.equipment={melee:p.inventory.sword?'sword':p.inventory.axe?'axe':null,ranged:p.inventory.bow?'bow':null};if(!['sword','axe','hammer',null].includes(p.equipment.melee))p.equipment.melee=null;if(!['bow',null].includes(p.equipment.ranged))p.equipment.ranged=null;if(!['melee','ranged'].includes(p.weaponMode))p.weaponMode=p.weapon==='bow'?'ranged':'melee';const selected=p.equipment[p.weaponMode];p.weapon=selected&&(p.inventory[selected]||0)>0?selected:null;if(!p.weapon){if(!p.unarmedCombat){p.weaponDrawn=false;p.pendingStrike=null;}p.lockedTargetId=null;}return p.weapon;}
 equip(mode,item){const allowed=mode==='melee'?['sword','axe','hammer',null]:mode==='ranged'?['bow',null]:[];if(!allowed.includes(item)||(item&&!(this.player.inventory[item]>0)))return {ok:false,message:'Это оружие нельзя установить в выбранный слот.'};this.player.equipment??={melee:null,ranged:null};this.player.equipment[mode]=item;this.normalizeEquipment();return {ok:true};}
 switchWeapon(){this.normalizeEquipment();const p=this.player,next=p.weaponMode==='melee'?'ranged':'melee',item=p.equipment[next];if(!item||!(p.inventory[item]>0))return {ok:false,message:'Другой слот пуст или оружия нет в сумке. Настройте слоты в инвентаре.'};p.weaponMode=next;p.lockedTargetId=null;p.pendingStrike=null;p.drawUntil=this.elapsed+.25;this.normalizeEquipment();return {ok:true,message:(next==='melee'?'Ближний бой: ':'Дальний бой: ')+ITEMS[p.weapon].name};}
 debugTravel(target){if(!this.debugMode)return {ok:false,message:'Быстрое перемещение доступно только в debug-режиме.'};if(!target||!Number.isFinite(target.x)||!Number.isFinite(target.y)||target.x<TILE||target.y<TILE||target.x>=(W-1)*TILE||target.y>=(H-1)*TILE)return {ok:false,message:'Выберите точку внутри карты.'};let destination={x:target.x,y:target.y};if(this.blocked(destination.x,destination.y,true)){let found=false;for(let r=1;r<=12&&!found;r++)for(let dy=-r;dy<=r&&!found;dy++)for(let dx=-r;dx<=r;dx++){const candidate=point(Math.floor(target.x/TILE)+dx+.5,Math.floor(target.y/TILE)+dy+.5);if(!this.blocked(candidate.x,candidate.y,true)){destination=candidate;found=true;break;}}if(!found)return {ok:false,message:'Рядом нет свободного места.'};}cancelCraft(this);Object.assign(this.player,destination);this.player.action=null;this.current(this.player,0);this.rebuildSpatial();this.log('DEBUG · быстрое перемещение: '+(target.name||'точка карты'));return {ok:true};}

 cancelCraft(){return cancelCraft(this);}
 factionName(id){if(!id||id==='sanctuary')return 'Собор';return this.places.find(z=>z.id===id)?.name||FACTIONS[id]||'Подземные обитатели';}
 get night(){const h=this.time%1440/60;return h<6||h>=20;}
 tile(x,y){x=Math.floor(x);y=Math.floor(y);return x<0||y<0||x>=W||y>=H?2:this.tiles[y*W+x];}
 placeAt(p){return this.places.find(z=>dist(p,point(z.x,z.y))<z.r*TILE);}
 inCity(p){return this.cities.find(z=>z.kind?settlementInside(z,p.x/TILE,p.y/TILE):Math.abs(p.x/TILE-z.x)<(z.rx||25)&&Math.abs(p.y/TILE-z.y)<(z.ry||25));}
 riverX(y){if(this.generatorVersion>=4&&!this.dungeonSpec)return riverCenter(this,y);const r=this.river;let center=r.x+Math.sin(y*.022+r.phase)*r.a+Math.sin(y*.061+r.phase)*r.b;if(this.generatorVersion>=3&&!this.dungeonSpec)for(const z of this.cities){const along=r.axis==='horizontal'?z.x:z.y,across=r.axis==='horizontal'?z.y:z.x,extent=r.axis==='horizontal'?z.rx:z.ry,width=r.axis==='horizontal'?z.ry:z.rx,delta=Math.abs(y-along);if(delta<extent+35&&Math.abs(center-across)<width+15){const blend=Math.min(1,(extent+35-delta)/20),target=across+(Math.sign(r.x-across)||1)*(width+15);center+=(target-center)*blend;}}return center;}
 makeMap(){
  if(this.dungeonSpec){generateDungeonMap(this,rng(this.seed));this.planner=new PathPlanner({tiles:this.tiles,solids:this.solids,depth:this.depth,width:W,height:H,tile:TILE});return;}
  this.tiles=new Uint8Array(W*H);this.solids=new Uint8Array(W*H);this.depth=new Uint8Array(W*H);this.trees=[];this.treeChunks=new Map();this.decor=[];this.buildings=[];this.districts=[];this.resources=[];this.roads=[];this.roadMask=new Uint8Array(W*H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
   const lake=((x-this.lake.x)/this.lake.rx)**2+((y-this.lake.y)/this.lake.ry)**2<1;
   this.tiles[y*W+x]=this.generatorVersion>=2?surfaceTile(this,x,y):lake?2:Math.abs(x-this.riverX(y))<4?4:0;
  }

  const road=points=>{this.roads.push(points);for(let j=1;j<points.length;j++){const [ax,ay]=points[j-1],[bx,by]=points[j],len=Math.hypot(bx-ax,by-ay)*2;for(let k=0;k<=len;k++){const x=Math.round(ax+(bx-ax)*k/len),y=Math.round(ay+(by-ay)*k/len);for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=W||yy>=H)continue;const t=this.tile(xx,yy);this.tiles[yy*W+xx]=t===4||t===2||(this.generatorVersion>=4&&t===5)?5:1;this.roadMask[yy*W+xx]=1;}}}};
  this.paintRoad=road;
  if(this.generatorVersion>=2)generateRoads(this,road,this.geographyRandom);else if(!this.generatorVersion){
  road([[88,300],[145,301],[177,301],[236,318],[300,315],[365,301],[412,301],[448,301],[490,315],[548,300]]);
  road([[316,58],[315,110],[292,145],[315,170],[304,207],[300,270],[300,315]]);
  road([[177,301],[171,253],[177,198]]);road([[448,301],[438,249],[446,203]]);
  road([[88,300],[98,353],[121,423]]);road([[548,300],[543,348],[537,369]]);
  road([[300,315],[320,354],[340,380],[339,407]]);road([[448,301],[457,350],[471,389]]);
  road([[316,58],[372,69],[417,86],[459,74]]);road([[315,110],[365,106]]);
  }else{
   const hub=[280+Math.floor(this.geographyRandom()*65),325+Math.floor(this.geographyRandom()*20)];
   this.cities.forEach((z,i)=>{const horizontal=Math.abs(hub[0]-z.x)>Math.abs(hub[1]-z.y),sign=Math.sign(horizontal?hub[0]-z.x:hub[1]-z.y),out=[z.x+(horizontal?sign*38:0),z.y+(horizontal?0:sign*38)];const bend=horizontal?[Math.round((out[0]+hub[0])/2),out[1]+Math.floor(this.geographyRandom()*35)-17]:[out[0]+Math.floor(this.geographyRandom()*35)-17,Math.round((out[1]+hub[1])/2)];road([[z.x,z.y],out,bend,hub]);Object.assign(this.territories[i],point(...bend));});
   road([hub,[320,315],[300,315],[300,302]]);
   for(const z of this.places.filter(z=>!CITY_IDS.includes(z.id)&&!['cathedral','lake','grove'].includes(z.id))){const junctions=this.roads.flat().filter(p=>this.cities.every(c=>Math.hypot(p[0]-c.x,p[1]-c.y)>38));const junction=junctions.sort((a,b)=>Math.hypot(a[0]-z.x,a[1]-z.y)-Math.hypot(b[0]-z.x,b[1]-z.y))[0]||hub;const bend=[Math.round((z.x+junction[0])/2)+Math.floor(this.geographyRandom()*25)-12,Math.round((z.y+junction[1])/2)];road([junction,bend,[z.x,z.y]]);}
   const south=this.places.find(z=>z.id==='thorn');Object.assign(this.territories[3],point(south.x,south.y-25));
  }
  const clear=(x,y,w,h,t=3)=>{for(let yy=Math.floor(y);yy<y+h;yy++)for(let xx=Math.floor(x);xx<x+w;xx++)if(xx>=0&&yy>=0&&xx<W&&yy<H)this.tiles[yy*W+xx]=t;};
  if(this.generatorVersion>=3)buildSanctuary(this,clear);else {clear(290,288,20,24,3);this.buildings.push({x:294,y:291,w:12,h:10,type:'cathedral',name:'СОБОР ПОСЛЕДНЕГО СВЕТА'});}
  for(const z of this.cities){
   if(this.generatorVersion>=2){generateCity(this,z,clear,this.geographyRandom);continue;}
   clear(z.x-26,z.y-26,53,53,0);clear(z.x-4,z.y-25,9,51,3);clear(z.x-25,z.y-4,51,9,3);clear(z.x-9,z.y-9,19,19,3);
   // Ring walls have four broad gates; all roads continue through these openings.
   for(const side of [-1,1])for(const off of [-25,5]){this.buildings.push({x:z.x+off,y:z.y+side*25,w:20,h:1,type:'wall',city:z.id},{x:z.x+side*25,y:z.y+off,w:1,h:20,type:'wall',city:z.id});}
   for(const side of [-1,1])for(const a of [-1,1])this.buildings.push({x:z.x+side*24-1,y:z.y+a*24-1,w:3,h:3,type:'tower',city:z.id});
   const cr=this.generatorVersion?this.geographyRandom:()=>0;const castleWidth=14+(this.generatorVersion?Math.floor(cr()*2):0);this.buildings.push({x:z.x-7,y:z.y-22,w:castleWidth,h:9,type:'castle',name:'ЗАМОК · '+z.name.toUpperCase(),city:z.id});
   this.districts.push({name:'ЗАМКОВЫЙ ДВОР',...point(z.x,z.y-11),city:z.id},{name:'ЦЕНТРАЛЬНАЯ ПЛОЩАДЬ',...point(z.x,z.y),city:z.id},{name:'ВОСТОЧНЫЙ ЖИЛОЙ КВАРТАЛ',...point(z.x+16,z.y+15),city:z.id},{name:'ЗАПАДНЫЙ ЖИЛОЙ КВАРТАЛ',...point(z.x-16,z.y+15),city:z.id},{name:'РЕМЕСЛЕННЫЙ РЯД',...point(z.x-16,z.y-6),city:z.id},{name:'ГЛАВНЫЕ ВРАТА',...point(z.x,z.y+25),city:z.id});
   for(const dx of [-21,-13,10,18])for(const dy of [9,17,-19]){const b={x:z.x+dx+(this.generatorVersion?Math.floor(cr()*2):0),y:z.y+dy+(this.generatorVersion?Math.floor(cr()*2):0),w:5+(this.generatorVersion?Math.floor(cr()*2):0),h:5,type:'house',city:z.id};if(dy===-19&&dx===-13){b.x=z.x+dx;b.w=5;}this.buildings.push(b);clear(b.x-1,b.y-1,b.w+2,b.h+3,3);}
   const shops=[['smith','КУЗНИЦА'],['inn','ТРАКТИР'],['warehouse','СКЛАД'],['apothecary','ТРАВЫ']];if(this.generatorVersion)for(let i=3;i>0;i--){const j=Math.floor(cr()*(i+1));[shops[i],shops[j]]=[shops[j],shops[i]];}for(const [i,[dx,dy]]of [[-20,-9],[12,-9],[-20,1],[12,1]].entries()){const [type,name]=shops[i];this.buildings.push({x:z.x+dx,y:z.y+dy,w:7,h:5,type,name,city:z.id});}
   for(const dx of [-7,5])for(const dy of [-6,5])this.buildings.push({x:z.x+dx,y:z.y+dy,w:2,h:1,type:'stall',city:z.id});
   clear(z.x-20,z.y+28,14,9,6);clear(z.x+9,z.y+28,13,9,6);
   if(this.generatorVersion&&cr()<.5){for(const b of this.buildings.filter(b=>b.city===z.id))b.x=2*z.x-b.x-b.w+1;}
   const water=point(z.x+34,z.y+14);for(let y=z.y+10;y<z.y+19;y++)for(let x=z.x+31;x<z.x+38;x++)this.tiles[y*W+x]=2;
   z.fishing=point(z.x+30,z.y+14);z.lumber=point(z.x-33,z.y+6);z.hunt=point(z.x-36,z.y+19);z.mine=point(z.x+34,z.y-12);
   this.warehouses[z.id]={gold:650,ration:45,fish:z.id==='salt'?45:10,log:z.id==='oak'?60:15,ore:z.id==='north'?60:15,hide:12,herb:12,bait:100,arrow:150};
  }
  for(const z of this.places.filter(p=>['red','ash','thorn'].includes(p.id))){clear(z.x-9,z.y-7,19,15,1);for(let i=0;i<6;i++)this.buildings.push({x:z.x-8+i%3*6,y:z.y-6+Math.floor(i/3)*9,w:3,h:3,type:'tent'});}
  for(const z of this.places.filter(p=>['ruins','barrow','shrine','cross','quarry'].includes(p.id)))clear(z.x-5,z.y-5,11,11,1);
  const cross=this.places.find(z=>z.id==='cross');this.buildings.push({x:cross.x-4,y:cross.y-7,w:8,h:5,type:'inn',name:'СТАРЫЙ ПОСТОЯЛЫЙ ДВОР'});
  if(this.generatorVersion>=2)finalizeHydrology(this);configurePrisons(this);prepareRooms(this.buildings);for(const prison of this.prisons||[])prison.buildingId=this.buildings.find(b=>b.city===prison.city&&b.prison).id;furnishPrisons(this);if(this.generatorVersion>=3)furnishSanctuary(this);if(this.generatorVersion>=4){createWorkSites(this);makeCampDetails(this);}this.rasterizeBuildings();this.planner=new PathPlanner({tiles:this.tiles,solids:this.solids,depth:this.depth,width:W,height:H,tile:TILE});
  // Multi-source distance from roads and clearings makes deeper forest progressively slower.
  const q=new Int32Array(W*H);let head=0,tail=0;this.depth.fill(255);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;if([1,3,5,6].includes(this.tiles[i])){this.depth[i]=0;q[tail++]=i;}}
  while(head<tail){const i=q[head++],d=this.depth[i]+1;if(d>18)continue;const x=i%W,y=Math.floor(i/W);for(const n of [x>0?i-1:-1,x<W-1?i+1:-1,y>0?i-W:-1,y<H-1?i+W:-1])if(n>=0&&this.depth[n]>d){this.depth[n]=d;q[tail++]=n;}}
  for(let y=2;y<H-2;y++)for(let x=2;x<W-2;x++){const i=y*W+x;if(![0,8,9,10].includes(this.tiles[i])||this.solids[i])continue;const town=this.cities.some(z=>Math.abs(x-z.x)<(z.rx||25)+3&&Math.abs(y-z.y)<(z.ry||25)+3);const biome=this.tiles[i],density=town?.015:biome===8?.012:biome===10?.04:biome===9?.12:.10+Math.min(18,this.depth[i])*.013;if(this.random()<density){const t={id:this.trees.length,x:(x+.2+this.random()*.6)*TILE,y:(y+.2+this.random()*.6)*TILE,s:.7+this.random()*.7,type:this.random()<.65?0:1,wood:3};this.trees.push(t);const k=this.chunkKey(t,16);if(!this.treeChunks.has(k))this.treeChunks.set(k,[]);this.treeChunks.get(k).push(t);}else if(this.random()<.012)this.decor.push({x:x*TILE,y:y*TILE,s:this.random()});}
  for(const z of this.cities){for(let i=0;i<25;i++)this.resources.push({id:this.resources.length,kind:'herb',...point(z.x-(z.rx?z.rx+8:32)-this.random()*12,z.y-24+this.random()*50),amount:2});for(let i=0;i<12;i++)this.resources.push({id:this.resources.length,kind:'ore',...point(z.x+(z.rx?z.rx+10:32)+this.random()*7,z.y-12+this.random()*7),amount:4});}
  for(let i=0;i<110;i++){const x=15+this.random()*(W-30),y=15+this.random()*(H-30);if(!this.blocked(x*TILE,y*TILE))this.resources.push({id:this.resources.length,kind:'herb',...point(x,y),amount:2});}
  if(this.generatorVersion>=4)for(const z of this.cities)for(let i=0;i<16;i++)this.resources.push({id:this.resources.length,kind:'fiber',...point(z.x-z.rx+4+i%4*3,z.y+z.ry+5+Math.floor(i/4)*2),amount:4});
  this.landmarks=LANDMARKS.map(l=>{const z=this.places.find(z=>z.id===l.place);return {...l,...point(z.x,z.y),inventory:{[l.item]:l.id==='supply'?3:1}};});if(this.generatorVersion<3)this.library=point(296,294);this.chest=point(121,423);this.relicAvailable=true;if(this.generatorVersion>=2)placeDungeonEntrances(this,this.geographyRandom);
 }
 rasterizeBuildings(){
  this.solids.fill(0);this.roomGrid.fill(0);
  for(const b of this.buildings)for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++){
   if(['stall','cityFlag'].includes(b.type))continue;const i=y*W+x;if(b.type==='cage'){this.roomGrid[i]=b.id;this.tiles[i]=3;continue;}
   if(b.enterable){const interior=x>b.x&&x<b.x+b.w-1&&y>b.y&&y<b.y+b.h-1;const door=y===b.door.y&&x===b.door.x;
    if(interior||door){this.roomGrid[i]=b.id;this.tiles[i]=3;continue;}}
   this.solids[i]=1;
  }
  for(const f of this.workProps||[])if(f.solid)for(let y=f.y;y<f.y+f.h;y++)for(let x=f.x;x<f.x+f.w;x++)if(x>0&&y>0&&x<W&&y<H)this.solids[y*W+x]=1;
  this.walls=this.solids.slice();rasterPrisons(this);
  for(const b of this.buildings)for(const f of b.furniture||[])if(f.solid)for(let y=f.y;y<f.y+f.h;y++)for(let x=f.x;x<f.x+f.w;x++)this.solids[y*W+x]=1;
 }
 interiorAt(p){const x=Math.floor(p.x/TILE),y=Math.floor(p.y/TILE);if(x<0||y<0||x>=W||y>=H)return null;const id=this.roomGrid[y*W+x];return id?this.buildings[id-1]:null;}
 visibleFrom(viewer,target){if(this.dungeonSpec)return dist(viewer,target)<10*TILE&&this.lineClear(viewer,target);const inside=this.interiorAt(target);return !inside||inside.type==='cage'||inside.id===this.interiorAt(viewer)?.id;}
 canInteract(a,b,radius=85){return dist(a,b)<radius&&this.visibleFrom(a,b)&&this.lineClear(a,b);}
 assignResidents(migrate=false){
  const roleRoom={...(this.generatorVersion>=8?ROLE_ROOMS:{}),smith:'smith',cook:'inn',herbalist:'apothecary',quartermaster:'warehouse',mayor:'castle',king:'castle',tailor:'tailor'},workers=['fisher','hunter','forester','miner','gatherer','king','herald','tailor','farmer'];
  for(const z of this.cities){const houses=this.buildings.filter(b=>b.city===z.id&&b.type==='house'),store=this.buildings.find(b=>b.city===z.id&&b.type==='warehouse');let resident=0;
   if(!this.entities.some(e=>e.role==='gatherer'&&e.faction===z.id)){const e=this.add('gatherer',z.id,z.x-11,z.y+7);e.work=point(z.x-34,z.y-5);}
   for(const e of this.entities.filter(e=>e.faction===z.id)){
    const worker=workers.includes(e.role);const room=(this.generatorVersion>=8&&e.role==='mayor')?(this.buildings.find(b=>b.city===z.id&&['townhall','castle'].includes(b.type))||houses[0]):roleRoom[e.role]?this.buildings.find(b=>b.city===z.id&&b.type===roleRoom[e.role]):e.role==='citizen'||e.role==='herald'||worker?houses[resident++%houses.length]:null;
    if(!room)continue;e.homeBuildingId=room.id;e.home={...room.workSpot};if(worker)e.deliveryPoint={...store.workSpot};
    if(roleRoom[e.role]){e.workBuildingId=room.id;e.work=e.shopkeeper?{...room.workSpot}:e.role==='king'?point(room.x+6.5,room.y+2.5):e.role==='mayor'&&this.generatorVersion>=4&&room.type==='castle'?point(room.x+10.5,room.y+6.5):{...room.workSpot};if(!migrate||['idle','working','sleep'].includes(e.state)||this.blocked(e.x,e.y))Object.assign(e,e.work);}
    else if(this.blocked(e.x,e.y)||this.night)Object.assign(e,room.workSpot);
    e.nav=null;e.route=[];e.routeDest=null;e.pathPending=false;
   }
  }
 }

 resetMotion(){for(const e of this.entities){let p=this.motion.get(e.id);if(!p){p={};this.motion.set(e.id,p);}p.x=e.x;p.y=e.y;p.walk=e.walk||0;p.attack=e.attack||0;}}
 renderPose(e,alpha=this.accumulator/SIM_STEP){if(e===this.player)return {x:e.x,y:e.y,walk:e.walk||0,attack:e.attack||0};const p=this.motion.get(e.id);if(!p||dist(p,e)>TILE*3)return {x:e.x,y:e.y,walk:e.walk||0,attack:e.attack||0};alpha=Math.max(0,Math.min(1,alpha));return {x:p.x+(e.x-p.x)*alpha,y:p.y+(e.y-p.y)*alpha,walk:p.walk+((e.walk||0)-p.walk)*alpha,attack:p.attack+((e.attack||0)-p.attack)*alpha};}

 blocked(x,y,swimmer=false){const tx=Math.floor(x/TILE),ty=Math.floor(y/TILE);return tx<1||ty<1||tx>=W-1||ty>=H-1||!!this.solids[ty*W+tx]||closedCellAt(this,x,y)||(!swimmer&&[2,4].includes(this.tile(tx,ty)));}
 terrain(p){const x=Math.floor(p.x/TILE),y=Math.floor(p.y/TILE),t=this.tile(x,y);if(this.dungeonSpec&&t!==2)return {name:t===12?'Катакомбы · каменные плиты':t===14?'Обвал · щебень':t===5?'Каменная переправа':t===13?'Пещера · каменистая почва':'Подземелье · каменные своды',speed:t===14?.72:1,water:false};if(t===2)return {name:'Озеро · спокойная вода',speed:.48,water:true,current:{x:0,y:0}};if(t===4){const r=this.river;const along=r.axis==='horizontal'?x:y,derivative=this.generatorVersion>=5?(this.riverX(along+1)-this.riverX(along-1))/2:r.a*.022*Math.cos(along*.022+r.phase)+r.b*.061*Math.cos(along*.061+r.phase);return {name:this.river.axis==='horizontal'?'Река · течение на восток':'Река · течение на юг',speed:.48,water:true,current:this.river.axis==='horizontal'?{x:52,y:derivative*52}:{x:derivative*52,y:52}};}if(t===8)return {name:'Луговина',speed:1,water:false};if(t===9)return {name:'Заболоченный лес',speed:.65,water:false};if(t===10)return {name:'Каменистые холмы',speed:.8,water:false};if(t===5)return {name:'Мост',speed:1,water:false};if([1,3,6].includes(t))return {name:t===1?'Тракт':t===3?'Мощёная улица':'Поля',speed:1,water:false};const d=Math.min(18,this.depth[y*W+x]||0);return {name:d>11?'Глухой лес':d>4?'Лес':'Опушка',speed:Math.max(.5,1-d*.028),depth:d,water:false};}
 move(e,tx,ty,speed,dt){return moveActor(this,e,tx,ty,speed,dt);}
 toggleWeapon(){return toggleWeapon(this);}
 aimPlayer(point,options){return aimPlayer(this,point,options);}

 current(e,dt){const t=this.terrain(e);if(t.water&&e===this.player){if(canOccupy(this,e,e.x+t.current.x*dt,e.y))e.x+=t.current.x*dt;if(canOccupy(this,e,e.x,e.y+t.current.y*dt))e.y+=t.current.y*dt;e.swimming=true;}else e.swimming=false;}
 add(role,faction,x,y,name){const animal=ANIMALS[role];let hp=animal?.hp||(['brute'].includes(role)?135:GUARDS.includes(role)?110:role==='merchant'?160:role==='wizard'||role==='dummy'?999:60);const e={id:++this.id,role,faction,...point(x,y),home:point(x,y),name:name||animal?.name||ROLES[role]||role,hp,maxHp:hp,dir:4,cooldown:0,attack:0,timer:this.random()*6,inventory:{},state:'idle',target:null,walk:0,nav:null};
  if(GUARDS.includes(role)||BANDITS.includes(role)||role==='hunter')e.inventory={gold:7+Math.floor(this.random()*15),[RANGED.includes(role)?'bow':'sword']:1,...(RANGED.includes(role)?{arrow:45}:{} )};
  if(PEACE.includes(role))e.inventory={gold:20,...e.inventory};if(role==='forester')e.inventory.axe=1;
  if(role==='smith')e.inventory={gold:220,sword:5,bow:3,arrow:90,axe:4,hammer:3,ore:15,log:10};if(role==='cook')e.inventory={gold:170,ration:20,fish:6,meat:8};if(role==='herbalist')e.inventory={gold:100,herb:12};if(role==='fisher')e.inventory.bait=20;
  this.entities.push(e);this.entityById.set(e.id,e);return e;
 }
 safeSpawn(role,faction,x,y,name){if(this.blocked(x*TILE,y*TILE)){for(let r=1;r<8;r++){let found=false;for(let dy=-r;dy<=r&&!found;dy++)for(let dx=-r;dx<=r;dx++)if(!this.blocked((x+dx)*TILE,(y+dy)*TILE)){x+=dx;y+=dy;found=true;break;}if(found)break;}}return this.add(role,faction,x,y,name);}
 populate(){
  if(this.dungeonSpec){populateDungeon(this);return;}
  if(this.generatorVersion>=3)populateSanctuary(this);else {this.add('wizard','sanctuary',300,294);for(let i=0;i<3;i++)this.add('dummy','sanctuary',303+i*.7,298);}
  for(const z of this.cities){
   if(this.generatorVersion>=8){populateSettlementPeople(this,z);continue;}
   for(const [dx,dy]of (z.gates||[[0,23],[0,-23],[-23,0],[23,0]])){this.add('guard',z.id,z.x+dx-1,z.y+dy);this.add('archer',z.id,z.x+dx+1,z.y+dy);}
   for(let i=0;i<4;i++)this.add('guard',z.id,z.x-3+i*2,z.y-10);this.add('guard',z.id,z.x-3,z.y+3);this.add('guard',z.id,z.x+3,z.y+3);
   for(let i=0;i<(z.isVillage?8:18);i++){const dx=[-19,-11,12,20][i%4],dy=[15,23,-11][Math.floor(i/4)%3];const e=this.safeSpawn('citizen',z.id,z.x+dx,z.y+dy,'Житель '+['Альма','Ярек','Лина','Бор','Тея','Никлас'][i%6]);e.city=z.id;if(i<5){e.x=(z.x-5+i*2)*TILE;e.y=(z.y+2+i%2)*TILE;}}
   this.add('mayor',z.id,z.x,z.y-11,'Бургомистр '+({oak:'Ольгерд',salt:'Эсса',north:'Радован'})[z.id]);this.add('quartermaster',z.id,z.x-11,z.y+3);
   this.add('smith',z.id,z.x-16,z.y-3,'Кузнец '+({oak:'Бран',salt:'Торст',north:'Ильмар'})[z.id]);this.add('cook',z.id,z.x+15,z.y-3,'Трактирщик '+({oak:'Мирон',salt:'Сава',north:'Тарен'})[z.id]);this.add('herbalist',z.id,z.x+15,z.y+7);
   for(let i=0;i<2;i++){const fisher=this.add('fisher',z.id,z.x+8+i,z.y+2);fisher.work={...z.fishing};const hunter=this.add('hunter',z.id,z.x-8-i,z.y+8);hunter.work={...z.hunt};const f=this.add('forester',z.id,z.x-22,z.y+6+i*2);f.work={...z.lumber};const miner=this.add('miner',z.id,z.x+23,z.y-8+i);miner.work={...z.mine};}
   // Local wildlife gives hunters a real, reachable hunting ground.
   for(let i=0;i<12;i++){const role=['deer','hare','boar','fox','elk','wolf'][i%6];this.safeSpawn(role,'wild',z.x-(z.rx?z.rx+8:32)-this.random()*14,z.y+11+this.random()*20);}
  }
  for(const z of this.places.filter(z=>['red','ash','thorn'].includes(z.id))){for(let i=0;i<12;i++){const role=['bandit','banditArcher','brute','raider'][i%4];this.safeSpawn(role,z.id,z.x-5+this.random()*10,z.y-2+this.random()*7);}}
  // Each road has independent strong and weak ambush groups, rather than guaranteed outcomes.
  for(let i=0;i<(this.generatorVersion?4:8);i++){const z=this.territories[this.generatorVersion?Math.floor(i/2):i%3],faction=this.generatorVersion?['red','ash'][Math.floor(i/2)]:(i%2?'red':'ash');const n=this.generatorVersion?(i<2?6:2):2+Math.floor(this.random()*4);for(let j=0;j<n;j++){const e=this.safeSpawn(j%3===0?'banditArcher':'bandit',faction,z.x/TILE+4+this.random()*4,z.y/TILE+5+this.random()*3);e.ambush={x:z.x,y:z.y};}}
  const animalRoles=Object.keys(ANIMALS).filter(r=>!r.startsWith('cave'));for(let i=0;i<255;i++){let x,y;do{x=8+this.random()*(W-16);y=8+this.random()*(H-16);}while(this.blocked(x*TILE,y*TILE)||this.placeAt(point(x,y)));this.add(animalRoles[i%animalRoles.length],'wild',x,y);}
  for(let i=0;i<6;i++)this.spawnCaravan(this.cities[i%3].id,this.cities[(i+1)%3].id,i);
 }
 spawnCaravan(origin,destination,index=0){const z=this.cities.find(c=>c.id===origin),m=this.add('merchant',origin,z.x+(index%2?1:-1)*2,z.y+(this.generatorVersion>=4?2:10),'Караван '+['«Иволга»','«Северный ветер»','«Три сосны»','«Медный звон»','«Тихая река»','«Вереск»'][index%6]);m.destination=destination;m.caravan=true;m.inventory={gold:120,ration:8,[z.specialty]:18};m.leg=0;m.departed=this.elapsed;m.rest=index*3;
  const guards=2+Math.floor(this.random()*4);for(let j=0;j<guards;j++){const e=this.add(j%2?'escortArcher':'escort',origin,z.x-3+j*2,z.y+(this.generatorVersion>=4?4:12));e.leader=m.id;e.offset={x:(j%2?1:-1)*65,y:65+Math.floor(j/2)*45};}return m;
 }
 chunkKey(e,size=8){return Math.floor(e.x/(TILE*size))+','+Math.floor(e.y/(TILE*size));}
 rebuildSpatial(){this.spatial.clear();this.entityById.clear();this.escortsByLeader.clear();for(const e of this.entities){this.entityById.set(e.id,e);if(e.leader){if(!this.escortsByLeader.has(e.leader))this.escortsByLeader.set(e.leader,[]);this.escortsByLeader.get(e.leader).push(e);}}for(const e of this.entities)if(e.hp>0){const k=this.chunkKey(e);if(!this.spatial.has(k))this.spatial.set(k,[]);this.spatial.get(k).push(e);}const k=this.chunkKey(this.player);if(!this.spatial.has(k))this.spatial.set(k,[]);this.spatial.get(k).push(this.player);}
 nearby(e,r=420){const out=[],size=8*TILE,x=Math.floor(e.x/size),y=Math.floor(e.y/size),n=Math.ceil(r/size);for(let dy=-n;dy<=n;dy++)for(let dx=-n;dx<=n;dx++)for(const o of this.spatial.get((x+dx)+','+(y+dy))||[])if(o!==e&&o.hp>0&&dist(e,o)<r)out.push(o);return out;}
 treesNear(e,r=400){const out=[],size=16*TILE,x=Math.floor(e.x/size),y=Math.floor(e.y/size),n=Math.ceil(r/size);for(let dy=-n;dy<=n;dy++)for(let dx=-n;dx<=n;dx++)for(const t of this.treeChunks.get((x+dx)+','+(y+dy))||[])if(t.wood>0&&dist(t,e)<r)out.push(t);return out;}
 hostile(a,b){if(a===b||b.hp<=0||a.hp<=0||['wizard','dummy'].includes(a.role)||['wizard','dummy'].includes(b.role))return false;if(!this.dungeonSpec&&(dist(a,this.respawn)<34*TILE||dist(b,this.respawn)<34*TILE))return false;if(b.captive&&a.faction===b.captor)return false;if(a===this.player)return false;if(a.rioter)return b.faction===a.prisonCity&&!b.rioter&&!b.cellId;if(a.fleeingPrisoner||b.fleeingPrisoner)return false;
  if(BANDITS.includes(a.role))return b===this.player||(!ANIMALS[b.role]&&b.faction!==a.faction&&b.faction!=='sanctuary');
  if(GUARDS.includes(a.role)){const legal=legalHostility(this,a,b);return legal===true||b.rioter&&b.prisonCity===a.faction||(!b.fleeingPrisoner&&BANDITS.includes(b.role))||(ANIMALS[b.role]?.aggressive&&dist(b,a.home)<800);}
  const companionEnemy=companionHostility(this,a,b);if(companionEnemy!==null)return companionEnemy;
  if(a.role==='hunter')return !!ANIMALS[b.role]||BANDITS.includes(b.role);
  if(ANIMALS[a.role]&&a.aggressor===b.id)return true;
  if(ANIMALS[a.role]?.aggressive)return b===this.player||['deer','hare','fox','goat'].includes(b.role)||['hunter','forester'].includes(b.role);
  return a.aggressor===b.id;
 }
 lineClear(a,b){const d=dist(a,b),n=Math.ceil(d/20);for(let i=1;i<n;i++){const x=(a.x+(b.x-a.x)*i/n)/TILE,y=(a.y+(b.y-a.y)*i/n)/TILE;if(this.walls[Math.floor(y)*W+Math.floor(x)]||closedCellAt(this,x*TILE,y*TILE))return false;}return true;}
 damage(a,b,amount){if(b.role==='dummy'){this.effects.push({x:b.x,y:b.y-40,text:'Попадание · тренировка',life:.8,color:'#e2c78e'});return;}if(b.hp<=0||b.role==='wizard')return;if(b===this.player&&GUARDS.includes(a.role)&&!b.imprisoned&&legalHostility(this,a,b)===false)return;if(b===this.player)amount=Math.max(1,Math.round(amount*(1-armorReduction(b))));else if(b.inventory.armor)amount=Math.max(1,Math.round(amount*.55));b.hp-=amount;b.aggressor=a.id;this.effects.push({x:b.x,y:b.y-30,text:'−'+amount,life:1,color:a===this.player?'#ebcc83':'#e3917b'});if(a===this.player&&CITY_IDS.includes(b.faction)){recordCrime(this,b.faction,b.hp<=0?'murder':'assault');}if(b.hp<=0)this.die(b,a);}
 hit(a,b,ranged=RANGED.includes(a.role)||(a===this.player&&a.weapon==='bow')){if(a.cooldown>0||b.hp<=0)return false;if(b.role==='wizard')return false;if(b.role==='dummy'){a.cooldown=.5;a.attack=.25;this.effects.push({x:b.x,y:b.y-35,text:ranged?'Попадание · тренировка':'−17 · тренировка',life:1,color:'#e1c67e'});return true;}
  const d=dist(a,b);if(ranged&&d>60&&(a.inventory.arrow||0)>0){if(d>400||!this.lineClear(a,b))return false;a.inventory.arrow--;a.cooldown=1.7;a.attack=.3;const error=(this.random()-.5)*(a===this.player?.06:.13),angle=Math.atan2(b.y-a.y,b.x-a.x)+error;this.projectiles.push({x:a.x,y:a.y-14,vx:Math.cos(angle)*420,vy:Math.sin(angle)*420,owner:a.id,faction:a.faction,target:b.id,damage:a===this.player?23:14,life:1.3});return true;}
  if(d>65||!this.lineClear(a,b))return false;a.cooldown=a===this.player?.55:1.15;a.attack=.25;this.damage(a,b,a===this.player?(a.weapon==='sword'&&a.inventory.sword?19:a.weapon==='axe'&&a.inventory.axe?16:8):ANIMALS[a.role]?.damage|| (a.role==='brute'?20:GUARDS.includes(a.role)?14:10));return true;
 }
 attackPlayer(){return playerStrike(this);}

 die(e,killer){
  if(e===this.player){cancelCraft(this);if(prisonDefeat(this))return;const city=this.inCity(e);if(city){this.storages[city.id]=this.storages[city.id]||{};this.transfer(e.inventory,this.storages[city.id]);this.log('Стража '+city.name+' сохранила ваши вещи. Обратитесь к квартирмейстеру.');}else this.corpses.push({id:++this.id,x:e.x,y:e.y,name:'Ваше тело',inventory:{...e.inventory},player:true,age:0});e.inventory={};Object.assign(e,this.respawn);e.hp=100;e.stamina=MAX_STAMINA;e.maxStamina=MAX_STAMINA;e.wanted=null;e.imprisoned=null;e.unarmedCombat=false;this.detention=null;e.action=null;e.weaponDrawn=false;e.pendingStrike=null;e.lockedTargetId=null;e.stunUntil=0;e.weaponWarnings=null;this.normalizeEquipment();this.time+=30;this.log('Вы вернулись в собор. Вещи остались на месте гибели.');this.onDeath?.();return;}
  const c={id:++this.id,x:e.x,y:e.y,name:e.name,inventory:{...e.inventory},animal:ANIMALS[e.role]?e.role:null,butchered:false,age:0};e.inventory={};this.corpses.push(c);
  if(e.caravan){this.caravanStats.lost++;this.log(e.name+' разграблен на пути в '+this.factionName(e.destination)+'.',{at:e});for(const q of this.quests)if(q.type==='escort'&&q.caravan===e.id&&q.status==='active'){q.status='failed';this.log('Задание провалено: '+q.title);}}
  if(killer===this.player){if(BANDITS.includes(e.role))this.kills++;this.killCounts[e.role]=(this.killCounts[e.role]||0)+1;if(!this.discovery.includes(e.role))this.discovery.push(e.role);this.log(e.name+' повержен.');}
 }
 depositRelics(){let count=0,reward=0;for(const item of ['relic','moonRelic','tideRelic'])if((this.player.inventory[item]||0)>0&&!this.returnedRelics.includes(item)){this.player.inventory[item]--;this.relicVault[item]=(this.relicVault[item]||0)+1;this.returnedRelics.push(item);count++;reward+=item==='relic'?120:180;}if(count){this.player.inventory.gold=(this.player.inventory.gold||0)+reward;this.relicReturned=this.returnedRelics.includes('relic');this.log('Эйрану возвращено реликвий: '+this.returnedRelics.length+'/3. +'+reward+' золота.');}updateCampaign(this);return {count,reward,total:this.returnedRelics.length};}
 transfer(from,to,keys=Object.keys(from)){for(const k of keys){const n=from[k]||0;if(n>0){to[k]=(to[k]||0)+n;delete from[k];}}}
 loot(e,c){this.transfer(c.inventory,e.inventory);}
 butcher(c,e){if(!c.animal||c.butchered)return false;const a=ANIMALS[c.animal];c.inventory.meat=(c.inventory.meat||0)+a.meat;c.inventory.hide=(c.inventory.hide||0)+a.hide;c.butchered=true;this.log(e.name+' разделал тушу: '+a.meat+' мяса, '+a.hide+' шкур.',{at:e,personal:e===this.player});return true;}
 harvest(e,t,dt){if(t.wood<=0)return false;e.state='logging';e.workProgress=(e.workProgress||0)+dt;if(e.workProgress>=6){if(e.role==='forester'&&this.generatorVersion>=4){this.woodPiles.push({id:++this.id,name:'Сложенные брёвна',x:t.x,y:t.y,city:e.faction,worker:e.id,inventory:{log:t.wood}});}else e.inventory.log=(e.inventory.log||0)+t.wood;this.log(e.name+' срубил дерево и '+(e.role==='forester'&&this.generatorVersion>=4?'сложил на земле ':'получил ')+t.wood+' бревна.',{at:e,personal:e===this.player});t.wood=0;this.choppedTrees.add(t.id);if(this.ecology)this.ecology.stumps[t.id]=this.time;e.workProgress=0;return true;}return false;}
 trade(e,key,buy=true){const rules=e.noTrade?null:TRADE[e.role],p=this.player;if(!rules||!(buy?rules.sells:rules.buys).includes(key))return {ok:false,message:'Этот мастер не торгует таким товаром.'};const from=buy?e:p,to=buy?p:e,price=tradePrice(this,e,key,buy);if(!(from.inventory[key]>0))return {ok:false,message:'Товар закончился.'};if((to.inventory.gold||0)<price)return {ok:false,message:'Недостаточно золота у покупателя.'};from.inventory[key]--;to.inventory[key]=(to.inventory[key]||0)+1;to.inventory.gold-=price;from.inventory.gold=(from.inventory.gold||0)+price;campaignEvent(this,'trade',{city:e.faction});return {ok:true};}
 acceptQuest(offer){if(this.quests.some(q=>q.id===offer.id))return 'Это поручение уже записано в журнале.';if(this.quests.filter(q=>q.status==='active').length>=8)return 'Сначала завершите одно из восьми активных поручений.';if(offer.type==='escort'&&!offer.destination)return 'Караван ещё не выбрал маршрут.';normalizeCrafts(this.player);const q={...offer,craftedBaseline:this.player.crafted[offer.item]||0,status:'active',started:this.elapsed,baseline:offer.role==='bandits'?this.kills:(this.killCounts[offer.role]||0)};if(q.type==='courier')this.player.inventory.letter=(this.player.inventory.letter||0)+1;this.quests.push(q);this.log('Получено поручение: '+q.title);return 'Поручение принято. '+this.questText(q);}
 questProgress(q){if(CONTRACT_TYPES.has(q.type))return contractProgress(this,q);switch(q.type){case 'clearDungeon':return this.clearedDungeons.includes(q.dungeon)?1:0;case 'collect':return Math.min(q.count,this.player.inventory[q.item]||0);case 'kill':return Math.min(q.count,(q.role==='bandits'?this.kills:this.killCounts[q.role]||0)-q.baseline);case 'visit':return this.visited.includes(q.place)?1:0;case 'courier':return q.delivered?1:0;case 'escort':return q.arrived?1:0;default:return 0;}}
 heraldNews(city){return heraldNews(this,city);}
 royalOffers(e){return royalOffers(this,e);}
 questText(q){if(CONTRACT_TYPES.has(q.type))return contractText(this,q);if(q.type==='clearDungeon')return 'Зачистить '+(this.dungeonEntrances?.find(d=>d.id===q.dungeon)?.name||'королевские руины')+': '+this.questProgress(q)+'/1';if(q.type==='collect')return ITEMS[q.item].name+': '+this.questProgress(q)+'/'+q.count;if(q.type==='kill')return (q.role==='bandits'?'Разбойники':ANIMALS[q.role]?.name||ROLES[q.role])+': '+this.questProgress(q)+'/'+q.count;if(q.type==='visit')return 'Посетить: '+(this.places.find(z=>z.id===q.place)?.name||'место на поверхности');if(q.type==='courier')return 'Доставить письмо бургомистру: '+this.factionName(q.destination);return 'Сопроводить караван до '+this.factionName(q.destination)+' (держаться в пределах 25 клеток).';}
 completeQuests(e){const messages=claimContracts(this,e);for(const q of this.quests.filter(q=>q.status==='active'&&!CONTRACT_TYPES.has(q.type))){if(q.type==='courier'&&e.role==='mayor'&&q.destination===e.faction&&(this.player.inventory.letter||0)>0){this.player.inventory.letter--;q.delivered=true;}const canClaim=q.type==='courier'?q.delivered&&e.faction===q.destination&&e.role==='mayor':q.type==='escort'?q.arrived&&e.faction===q.destination&&['merchant','quartermaster',...(q.giver==='king'?['king']:[])].includes(e.role):q.city===e.faction&&q.giver===e.role;
   if(canClaim&&this.questProgress(q)>=(q.count||1)){if(q.type==='collect'){this.player.inventory[q.item]-=q.count;e.inventory[q.item]=(e.inventory[q.item]||0)+q.count;}q.status='completed';if(q.city){const m=cityMemory(this,q.city);m.reputation=Math.min(100,m.reputation+5);}this.player.inventory.gold=(this.player.inventory.gold||0)+q.reward;messages.push(q.title+': +'+q.reward+' зол.');this.log('Выполнено: '+q.title);}}
  return messages.join('\n')||'Подходящих выполненных поручений пока нет.';
 }
 update(dt){if(this.dungeonSpec)revealDungeon(this);this.elapsed+=dt;this.time+=dt*.65;const p=this.player;p.cooldown=Math.max(0,p.cooldown-dt);p.attack=Math.max(0,p.attack-dt);p.stamina=Math.min(p.maxStamina||MAX_STAMINA,p.stamina+dt*(p.swimming?3:10));tickCombat(this,p,dt);guardWarnings(this);lawTick(this);this.current(p,dt);for(const fx of this.effects){fx.life-=dt;if(fx.arc===undefined)fx.y-=dt*22;}this.effects=this.effects.filter(f=>f.life>0);
  const extraAction=tickCraft(this,dt);updateIndustry(this);updateContracts(this);updateEvents(this);updateEcology(this);updateCompanions(this);
  if(p.action&&!extraAction){const a=p.action;const target=a.type==='tree'?this.trees[a.id]:a.type==='resource'?this.resources[a.id]:this.corpses.find(c=>c.id===a.corpse);if(!target||dist(p,target)>90)p.action=null;else{a.remaining-=dt;if(a.remaining<=0){if(a.type==='tree'){this.harvest(p,target,6);}else if(a.type==='resource'&&target.amount>0){target.amount--;if(target.industry&&target.amount<=0)target.regrowAt=this.time+240;grantSkill(p,'survival',2);if(target.kind==='honey')p.inventory.wax=(p.inventory.wax||0)+1;p.inventory[target.kind]=(p.inventory[target.kind]||0)+1;this.log('Собрано: '+ITEMS[target.kind].name);}else if(!a.type)this.butcher(target,p);p.action=null;this.onAction?.();}}}

  for(const z of this.places)if(dist(p,point(z.x,z.y))<z.r*TILE&&!this.visited.includes(z.id))this.visited.push(z.id);
  updateCampaign(this);this.updateProjectiles(dt);this.accumulator+=dt;while(this.accumulator>=SIM_STEP){this.step(SIM_STEP);this.accumulator-=SIM_STEP;}
 }
 updateProjectiles(dt){for(const a of this.projectiles){const steps=Math.max(1,Math.ceil(dt*620/8));for(let i=0;i<steps&&a.life>0;i++){a.x+=a.vx*dt/steps;a.y+=a.vy*dt/steps;a.life-=dt/steps;if(a.x<0||a.y<0||a.x>=W*TILE||a.y>=H*TILE||this.walls[Math.floor(a.y/TILE)*W+Math.floor(a.x/TILE)]){a.life=0;break;}const owner=a.owner==='player'?this.player:this.entityById.get(a.owner);const hit=this.nearby(a,40).find(e=>e.id!==a.owner&&dist(e,a)<bodyRadius(e)+7);if(hit&&owner){if(hit.faction!==a.faction||hit.id===a.target){if(hit.role==='dummy'&&owner===this.player){campaignEvent(this,'dummy',{ranged:true,moving:!!hit.moving});if(this.campaign?.status==='active')owner.inventory.arrow=(owner.inventory.arrow||0)+1;}this.damage(owner,hit,a.damage);}a.life=0;}}}this.projectiles=this.projectiles.filter(a=>a.life>0);}
 step(dt){this.resetMotion();this.aiTick++;this.rebuildSpatial();this.processPaths(6);if(this.aiTick%34===0)this.updateTerritories(5.1);for(const c of this.corpses)c.age+=dt;
  for(const e of this.entities){if(e.hp<=0)continue;e.cooldown=Math.max(0,e.cooldown-dt);e.attack=Math.max(0,e.attack-dt);e.timer-=dt;if(tickCombat(this,e,dt))continue;e.craftTimer=(e.craftTimer||0)+dt;
   if(e.role==='dummy'&&e.moving){const target=e.trainingRoute[e.trainingLeg];if(this.move(e,target.x,target.y,75,dt))e.trainingLeg=(e.trainingLeg+1)%e.trainingRoute.length;continue;}if(['wizard','dummy'].includes(e.role))continue;
   if(lawActorAI(this,e,dt)||rescueAI(this,e,dt))continue;if(eventActorAI(this,e,dt)||projectAI(this,e,dt)||industryAI(this,e,dt))continue;
   if(e.role==='citizen'){const drunk=this.nearby(e,110).find(o=>o.drunkard&&o.drink>=3&&!o.cellId&&this.visibleFrom(e,o)&&this.lineClear(e,o));if(drunk){e.state='avoidingDrunk';this.move(e,e.x+(e.x-drunk.x)*3,e.y+(e.y-drunk.y)*3,90,dt);continue;}}
   // Perception is spatially bounded; the whole map stays simulated at a fixed rate.
   let enemy=e.enemyId==='player'?this.player:this.entityById.get(e.enemyId);
   const fighter=GUARDS.includes(e.role)||BANDITS.includes(e.role)||e.role==='hunter'||ANIMALS[e.role]?.aggressive||e.aggressor;
   if(enemy&&(!this.hostile(e,enemy)||dist(e,enemy)>600||!this.visibleFrom(e,enemy)))enemy=null;
   if(fighter&&(e.perceptionAt===undefined||this.elapsed>=e.perceptionAt)){
    let closest=null,best=Infinity;for(const o of this.nearby(e,e.leader?470:RANGED.includes(e.role)?410:280)){const d=dist(e,o);if(d<best&&this.hostile(e,o)&&this.visibleFrom(e,o)){closest=o;best=d;}}
    enemy=closest;e.perceptionAt=this.elapsed+.3+(e.id%4)*.025;
   }
   e.enemyId=enemy?.id;

   if(enemy){combatAI(this,e,enemy,dt);continue;}
   if((e.retreatUntil||0)>this.elapsed){const from=e.retreatFrom==='player'?this.player:this.entityById.get(e.retreatFrom);if(from&&from.hp>0){retreat(this,e,from,dt);continue;}}

   if(companionAI(this,e,dt)||raidAI(this,e,dt))continue;
   if(ANIMALS[e.role]){if(this.dungeonSpec){if(!e.patrolPoint||e.timer<=0){e.patrolPoint=this.rooms[Math.floor(this.random()*this.rooms.length)];e.patrolPoint=point(e.patrolPoint.x+.5,e.patrolPoint.y+.5);e.timer=30;}e.state='roam';this.navigate(e,e.patrolPoint,dt,ANIMALS[e.role].speed*.4);}else this.animalAI(e,dt);continue;}
   if(GUARDS.includes(e.role)){this.guardAI(e,dt);continue;}
   if(BANDITS.includes(e.role)){this.banditAI(e,dt);continue;}
   if(e.role==='merchant'){this.caravanAI(e,dt);continue;}
   if(e.role==='forester'&&this.generatorVersion>=4){foresterAI(this,e,dt);continue;}
   if(e.role==='king'){e.state='holdingCourt';if(dist(e,e.work)>10)this.navigate(e,e.work,dt,75);continue;}
   if(this.night&&PEACE.includes(e.role)){e.state='sleep';this.navigate(e,e.home,dt,90);continue;}
   if(e.role==='herald'){if(dist(e,e.work)>25){e.state='toWork';this.navigate(e,e.work,dt,75);}else {e.state='announcing';if(this.elapsed>=(e.nextAnnouncement||0)){const news=this.heraldNews(e.faction);e.announcement=news[(e.newsIndex||0)%news.length];e.newsIndex=(e.newsIndex||0)+1;e.speechUntil=this.elapsed+10;e.nextAnnouncement=this.elapsed+30;this.log(e.name+': '+e.announcement,{at:e});}}continue;}
   if(['hunter','forester'].includes(e.role)&&this.carcassAI(e,dt))continue;
   if(e.role==='fisher'){if((e.inventory.fish||0)>=6){this.deliverWorker(e,dt,['fish']);continue;}if(dist(e,e.work)>25){e.state='toFish';this.navigate(e,e.work,dt,88);}else{e.state='fishing';if(e.timer<=0&&(e.inventory.bait||0)>0){e.inventory.bait--;e.inventory.fish=(e.inventory.fish||0)+1;e.timer=12+this.random()*8;this.log(e.name+' ('+this.factionName(e.faction)+') поймал рыбу.',{at:e});}}continue;}
   if(e.role==='forester'){if((e.inventory.log||0)>=9||(e.inventory.meat||0)>=6){this.deliverWorker(e,dt,['log','meat','hide']);continue;}let t=this.trees[e.treeId];if(!t||t.wood<=0||dist(t,e.work)>800){if(dist(e,e.work)>180){e.state='toWork';this.navigate(e,e.work,dt,86);continue;}t=this.treesNear(e.work,650).sort((a,b)=>dist(a,e)-dist(b,e))[0];e.treeId=t?.id;}if(t){if(dist(t,e)>30)this.navigate(e,t,dt,80);else this.harvest(e,t,dt);}continue;}
   if(e.role==='hunter'){if((e.inventory.meat||0)>=6){this.deliverWorker(e,dt,['meat','hide']);continue;}if(e.timer<=0||!e.patrolPoint){e.patrolPoint={x:e.work.x+(this.random()-.5)*1000,y:e.work.y+(this.random()-.5)*1000};e.timer=15;}e.state='hunting';this.navigate(e,e.patrolPoint,dt,90);continue;}
   if(e.role==='miner'){if((e.inventory.ore||0)>=12){this.deliverWorker(e,dt,['ore']);continue;}let r=this.resources[e.resourceId];if(!r||!r.amount){r=this.resources.find(r=>r.kind==='ore'&&r.amount>0&&dist(r,e.work)<700);e.resourceId=r?.id;}if(r){if(dist(e,r)>30){e.state='toWork';this.navigate(e,r,dt,80);}else{e.state='mining';if(e.timer<=0){r.amount--;e.inventory.ore=(e.inventory.ore||0)+1;e.timer=6;}}}continue;}
   if(['smith','cook','herbalist','gatherer','tailor','farmer'].includes(e.role)){this.craftAI(e,dt);continue;}
   if(e.role==='citizen'){if(e.timer<=0||!e.patrolPoint){const z=this.cities.find(z=>z.id===e.faction);e.patrolPoint=this.random()<.35?point(z.x+(this.random()-.5)*12,z.y+(this.random()-.5)*12):{x:e.home.x+(this.random()-.5)*220,y:e.home.y+(this.random()-.5)*220};e.timer=12+this.random()*25;}e.state='errands';this.navigate(e,e.patrolPoint,dt,58);continue;}
   if(e.workBuildingId&&dist(e,e.work)>12){e.state='toWork';this.navigate(e,e.work,dt,75);}else e.state='working';
  }
 }
 animalAI(e,dt){const a=ANIMALS[e.role];if(!a.aggressive){const danger=this.nearby(e,200).find(o=>o===this.player||o.role==='hunter'||ANIMALS[o.role]?.aggressive);if(danger){e.state='flee';this.move(e,e.x+(e.x-danger.x)*3,e.y+(e.y-danger.y)*3,a.speed,dt);return;}}
  if(!this.night&&[1,5].includes(this.tile(e.x/TILE,e.y/TILE))){const candidates=[point(e.x/TILE-6,e.y/TILE+7),point(e.x/TILE+6,e.y/TILE-7)].filter(p=>!this.blocked(p.x,p.y));e.patrolPoint=candidates[0]||e.home;}
  if(e.timer<=0||!e.patrolPoint){e.patrolPoint={x:e.home.x+(this.random()-.5)*1000,y:e.home.y+(this.random()-.5)*1000};e.timer=8+this.random()*12;}e.state='roam';this.move(e,e.patrolPoint.x,e.patrolPoint.y,a.speed*.35,dt);
 }
 carcassAI(e,dt){const c=this.corpses.find(c=>c.animal&&(!c.butchered||Object.values(c.inventory).some(n=>n>0))&&dist(e,c)<420);if(!c)return false;if(dist(e,c)>33){e.state='toCarcass';this.navigate(e,c,dt,90);}else if(!c.butchered){e.state='butchering';e.workProgress=(e.workProgress||0)+dt;if(e.workProgress>=3){this.butcher(c,e);e.workProgress=0;}}else{this.loot(e,c);e.state='loot';}return true;}
 deliverWorker(e,dt,items){const delivery=e.deliveryPoint||e.home;if(dist(e,delivery)>30){e.state='delivering';this.navigate(e,delivery,dt,88);return;}const store=this.warehouses[e.faction];this.transfer(e.inventory,store,items);if(e.role==='fisher'){const n=Math.min(12,store.bait||0);if(n){store.bait-=n;e.inventory.bait+=n;}}e.timer=2;e.state='delivered';}
 craftAI(e,dt){e.state='working';const stock=this.warehouses[e.faction];
  if(['gatherer','farmer'].includes(e.role)){const item=e.role==='farmer'?'fiber':'herb';if((e.inventory[item]||0)>=12){this.deliverWorker(e,dt,[item]);return;}let r=this.resources[e.resourceId];if(!r||r.amount<=0){r=this.resources.find(r=>r.kind===item&&r.amount>0&&dist(r,e.role==='farmer'?e.work:e.home)<2200);e.resourceId=r?.id;}if(r){e.state='gathering';if(dist(e,r)>30)this.navigate(e,r,dt,80);else if(e.craftTimer>=5){r.amount--;e.inventory[item]=(e.inventory[item]||0)+1;e.craftTimer=0;}}return;}
  if(e.workBuildingId&&dist(e,e.work)>12){e.state='toWork';this.navigate(e,e.work,dt,75);return;}
  if(e.role==='herbalist'){if(e.inventory.herb<12&&(stock.herb||0)>0){stock.herb--;e.inventory.herb++;}return;}
  if(e.craftTimer<18)return;e.craftTimer=0;
  if(e.role==='tailor'){for(const item of ['fiber','hide'])if((e.inventory[item]||0)<3&&(stock[item]||0)>0){const n=Math.min(3,stock[item]);stock[item]-=n;e.inventory[item]=(e.inventory[item]||0)+n;}if((e.inventory.cloth||0)>=2&&(e.inventory.hide||0)>0){e.inventory.cloth-=2;e.inventory.hide--;e.inventory.coat=(e.inventory.coat||0)+1;}else if((e.inventory.fiber||0)>=3){e.inventory.fiber-=3;e.inventory.cloth=(e.inventory.cloth||0)+1;}}
  if(e.role==='smith'){for(const k of ['ore','log'])if((e.inventory[k]||0)<3&&(stock[k]||0)>0){const n=Math.min(3,stock[k]);stock[k]-=n;e.inventory[k]=(e.inventory[k]||0)+n;}if(e.inventory.ore>=2&&e.inventory.log>=1){e.inventory.ore-=2;e.inventory.log--;const product=(e.inventory.arrow||0)<40?'arrow':(e.inventory.hammer||0)<2?'hammer':'sword';e.inventory[product]=(e.inventory[product]||0)+(product==='arrow'?12:1);}}
  if(e.role==='cook'){for(const k of ['meat','fish'])if((e.inventory[k]||0)<4&&(stock[k]||0)>0){const n=Math.min(4,stock[k]);stock[k]-=n;e.inventory[k]=(e.inventory[k]||0)+n;}const food=e.inventory.fish>=2?'fish':e.inventory.meat>=2?'meat':null;if(food){e.inventory[food]-=2;e.inventory.ration=(e.inventory.ration||0)+3;}}
 }

 guardAI(e,dt){if(e.roadPatrol){e.state='roadPatrol';const goal=e.patrolRoute[e.patrolLeg||0];if(this.navigate(e,goal,dt,75))e.patrolLeg=((e.patrolLeg||0)+1)%e.patrolRoute.length;return;}if(e.royalPost){e.state='royalGuard';if(dist(e,e.home)>10)this.navigate(e,e.home,dt,80);return;}if(e.leader){const m=this.entityById.get(e.leader);if(m?.hp>0){e.state='escorting';if(dist(e,m)>110)this.navigate(e,{x:m.x+e.offset.x,y:m.y+e.offset.y},dt,115);}else{e.state='returning';this.navigate(e,e.home,dt,95);}return;}
  const city=this.inCity(e);if(city){for(const c of this.corpses)if(Object.values(c.inventory).some(n=>n>0)&&dist(c,e)<150){this.storages[city.id]=this.storages[city.id]||{};this.transfer(c.inventory,this.storages[city.id]);}}
  if(e.timer<=0||!e.patrolPoint){e.patrolPoint={x:e.home.x+(this.random()-.5)*230,y:e.home.y+(this.random()-.5)*230};e.timer=12;}e.state='patrol';this.navigate(e,e.patrolPoint,dt,65);
 }
 banditAI(e,dt){const corpse=[...this.corpses,...this.woodPiles,...(this.camps||[])].find(c=>!this.inCity(c)&&Object.values(c.inventory).some(n=>n>0)&&dist(c,e)<220);if(corpse){if(dist(corpse,e)>28){e.state='loot';this.navigate(e,corpse,dt,90);}else{this.loot(e,corpse);this.log(e.name+' забрал добычу'+(corpse.player?' с вашего тела':'')+'.',{at:e});}return;}
  if(e.timer<=0||!e.patrolPoint){let z=e.ambush||this.territories[Math.floor(this.random()*this.territories.length)];e.patrolPoint=this.random()<.8?{x:z.x+(this.random()-.5)*240,y:z.y+(this.random()-.5)*240}:{x:e.home.x,y:e.home.y};e.timer=25+this.random()*35;}e.state='ambush';this.navigate(e,e.patrolPoint,dt,e.role==='raider'?115:85);
 }
 caravanAI(e,dt){const threats=this.nearby(e,350).filter(o=>BANDITS.includes(o.role));const escort=(this.escortsByLeader.get(e.id)||[]).filter(o=>o.hp>0);if(threats.length&&escort.length){e.state='defending';return;}if(e.rest>0){e.rest-=dt;e.state='loading';return;}const dest=this.cities.find(z=>z.id===e.destination);e.state='trading';this.navigate(e,point(dest.x,dest.y+9),dt,92);if(dist(e,point(dest.x,dest.y+9))<40){const store=this.warehouses[dest.id];for(const k of Object.keys(e.inventory).filter(k=>!['gold','sword','bow','arrow'].includes(k))){const n=Math.min(8,e.inventory[k]),pay=Math.min(n,Math.floor((store.gold||0)/ITEMS[k].price));e.inventory[k]-=pay;store[k]=(store[k]||0)+pay;store.gold-=pay*ITEMS[k].price;e.inventory.gold+=pay*ITEMS[k].price;}
   const k=dest.specialty,n=Math.min(18,store[k]||0,Math.floor(e.inventory.gold/ITEMS[k].price));if(n){store[k]-=n;e.inventory[k]=(e.inventory[k]||0)+n;e.inventory.gold-=n*ITEMS[k].price;store.gold+=n*ITEMS[k].price;}
   for(const item of ['grain','flour','honey','bread','medicine','leather']){const qty=Math.min(4,Math.max(0,(store[item]||0)-8),Math.floor((e.inventory.gold||0)/ITEMS[item].price));if(qty){store[item]-=qty;e.inventory[item]=(e.inventory[item]||0)+qty;e.inventory.gold-=qty*ITEMS[item].price;store.gold+=qty*ITEMS[item].price;}}this.caravanStats.arrived++;this.log(e.name+' прибыл в '+dest.name+'. Груз доставлен.',{at:e});for(const q of this.quests)if(q.type==='escort'&&q.status==='active'&&q.caravan===e.id&&q.destination===dest.id){if(dist(this.player,e)<1200&&q.accompanied>=Math.max(20,(this.elapsed-q.started)*.5))q.arrived=true;else {q.status='failed';this.log('Караван прибыл без вас: '+q.title);}}
   for(const guard of (this.escortsByLeader.get(e.id)||[]).filter(o=>o.hp>0)){guard.faction=dest.id;if((store.ration||0)>0){store.ration--;guard.hp=Math.min(guard.maxHp,guard.hp+25);}const n=Math.min(20,store.arrow||0);if(RANGED.includes(guard.role)&&n){store.arrow-=n;guard.inventory.arrow=(guard.inventory.arrow||0)+n;}}if((store.ration||0)>0){store.ration--;e.hp=Math.min(e.maxHp,e.hp+35);}e.faction=dest.id;e.leg++;e.destination=this.cities[(this.cities.indexOf(dest)+1)%3].id;e.rest=15;e.routeDest=null;
  }
  for(const q of this.quests)if(q.type==='escort'&&q.caravan===e.id&&q.status==='active'&&dist(e,this.player)<1200)q.accompanied=(q.accompanied||0)+dt;
 }
 updateTerritories(dt){for(const z of this.territories){const factions=new Set(this.entities.filter(e=>e.hp>0&&(GUARDS.includes(e.role)||BANDITS.includes(e.role))&&dist(z,e)<200).map(e=>e.faction));if(factions.size===1){const f=[...factions][0];if(f!==z.owner){if(z.claim!==f){z.claim=f;z.pressure=0;}z.pressure+=dt;if(z.pressure>=25){z.owner=f;z.pressure=0;this.log(z.name+' — теперь '+this.factionName(f)+'.',{at:z});}}}else z.pressure=0;}}
 path(start,end){return this.planner.find(start,end);}

 walkClear(a,b){const n=Math.ceil(dist(a,b)/12),r=bodyRadius(a);for(let i=1;i<=n;i++){const x=a.x+(b.x-a.x)*i/n,y=a.y+(b.y-a.y)*i/n;for(const [dx,dy]of [[0,0],[r,0],[-r,0],[0,r],[0,-r],[r*.7,r*.7],[-r*.7,r*.7],[r*.7,-r*.7],[-r*.7,-r*.7]])if(this.blocked(x+dx,y+dy,a===this.player))return false;}return true;}
 navigate(e,dest,dt,speed=85){if(dist(e,dest)<500&&this.walkClear(e,dest)){this.move(e,dest.x,dest.y,speed,dt);return dist(e,dest)<30;}const target={x:dest.x,y:dest.y};if(dist(e,target)<25)return true;const changed=!e.nav||dist(e.nav,target)>90;if(changed){e.nav=target;e.routeDest=null;e.route=[];e.routeIndex=0;e.pathPending=false;}
  if(!e.routeDest&&!e.pathPending){this.pathQueue.push({entity:e.id,dest:{...e.nav}});e.pathPending=true;}
  let p=e.route?.[e.routeIndex];if(p){const oldx=e.x,oldy=e.y;if(this.move(e,p.x,p.y,speed,dt))e.routeIndex++;if(Math.hypot(oldx-e.x,oldy-e.y)<.1){e.stuck=(e.stuck||0)+dt;if(e.stuck>2){e.routeDest=null;e.route=[];e.stuck=0;}}else e.stuck=0;}else if(this.lineClear(e,target)&&dist(e,target)<100)this.move(e,target.x,target.y,speed,dt);
  return dist(e,target)<30;
 }
 applyPath(req,route,start=null){const e=this.entityById.get(req.entity);if(!e||e.hp<=0||!e.nav||dist(e.nav,req.dest)>90)return false;e.pathPending=false;if(start&&dist(e,start)>TILE*2){e.routeDest=null;return false;}e.route=route;e.routeIndex=0;e.routeDest=req.dest.x+','+req.dest.y;return true;}
 processPaths(limit){
  if(this.pathService){this.pathService.pump(limit);return;}
  const deadline=this.pathBudgetMs?performance.now()+this.pathBudgetMs:Infinity;let completed=0,slices=0;
  while((this.pathJob||this.pathQueue.length)&&completed<limit&&(slices===0||performance.now()<deadline)){
   if(!this.pathJob){const req=this.pathQueue.shift(),e=this.entityById.get(req.entity);if(!e||e.hp<=0||!e.nav||dist(e.nav,req.dest)>90)continue;this.pathJob={req,start:{x:e.x,y:e.y},iterator:this.planner.search(e,req.dest)};}
   slices++;const next=this.pathJob.iterator.next();if(next.done){this.applyPath(this.pathJob.req,next.value,this.pathJob.start);this.pathJob=null;completed++;}
  }
 }

 save(){return JSON.stringify({version:VERSION,generatorVersion:this.generatorVersion,interiorRevision:2,industryRevision:this.industryRevision,contractRevision:this.contractRevision,living:this.living,ecology:this.ecology,projects:this.projects,projectRevision:this.projectRevision,campaign:this.campaign,camps:this.camps,lawRevision:this.lawRevision,cityMemory:this.cityMemory,prisonStorage:this.prisonStorage,detention:this.detention,cellStates:(this.prisons||[]).flatMap(p=>p.cells.map(c=>({id:c.id,open:c.open}))),dungeonSpec:this.dungeonSpec,explored:this.explored?Array.from(this.explored.keys()).filter(i=>this.explored[i]):undefined,seed:this.seed,time:this.time,elapsed:this.elapsed,events:this.events,storages:this.storages,warehouses:this.warehouses,player:this.player,entities:this.entities.map(e=>({...e,target:null,pathPending:false})),territories:this.territories,corpses:this.corpses,id:this.id,kills:this.kills,killCounts:this.killCounts,quest:this.quest,quests:this.quests,relicReturned:this.relicReturned,relicAvailable:this.relicAvailable,discovery:this.discovery,visited:this.visited,returnedRelics:this.returnedRelics,relicVault:this.relicVault,landmarks:this.landmarks,woodPiles:this.woodPiles,clearedDungeons:this.clearedDungeons,resources:this.resources,chopped:[...this.choppedTrees],caravanStats:this.caravanStats});}
 static restore(raw){const d=JSON.parse(raw),w=new World(d.seed,{generatorVersion:d.generatorVersion??0,dungeonSpec:d.dungeonSpec??null});if(d.version!==VERSION){w.player.inventory={...w.player.inventory,...d.player?.inventory};w.log('Регион расширен. Вещи сохранены; путешествие начинается в новом соборе.');return w;}const lawBlueprint=w.entities;const explored=d.explored;delete d.explored;const chopped=d.chopped||[];delete d.chopped;Object.assign(w,d);if(!d.lawRevision&&w.generatorVersion>=8)migrateLawResidents(w,lawBlueprint);normalizeStamina(w.player);ensureRoyalCourts(w);normalizeCombat(w);if(w.explored&&explored)for(const i of explored)w.explored[i]=1;for(const id of chopped)if(w.trees[id]){w.trees[id].wood=0;w.choppedTrees.add(id);}if(d.interiorRevision!==2||(!d.lawRevision&&w.generatorVersion>=8)){w.assignResidents(true);w.interiorRevision=2;}for(const e of [w.player,...w.entities])if(w.blocked(e.x,e.y,e===w.player)){let fixed=false;for(let r=0;r<=8&&!fixed;r++)for(let dy=-r;dy<=r&&!fixed;dy++)for(let dx=-r;dx<=r;dx++){const p=point(Math.floor(e.x/TILE)+dx+.5,Math.floor(e.y/TILE)+dy+.5);if(!w.blocked(p.x,p.y,e===w.player)){e.x=p.x;e.y=p.y;fixed=true;break;}}}for(const item of w.returnedRelics)w.relicVault[item]??=1;w.lawRevision=d.lawRevision||0;initializeLaw(w,{restored:true});for(const state of d.cellStates||[]){const cell=w.prisons?.flatMap(p=>p.cells).find(c=>c.id===state.id);if(cell)cell.open=state.open;}w.industryRevision=d.industryRevision||0;w.contractRevision=d.contractRevision||0;initializeIndustry(w,{restored:true});initializeContracts(w,{restored:true});w.living=d.living;w.ecology=d.ecology;initializeEvents(w);initializeEcology(w);w.projects=d.projects;w.projectRevision=d.projectRevision||0;initializeProjects(w);w.normalizeEquipment();settleBodies(w);w.rebuildSpatial();w.resetMotion();return w;}
}
