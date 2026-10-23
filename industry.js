import {treatPatient} from './world-events.js';
import {INDUSTRIES,RECIPES} from './adventure-content.js';
import {TILE,W,ITEMS,point,GUARDS} from './content.js';
import {addItems,hasMaterials,removeItems,normalizeCrafts} from './crafts.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function freeRoomSpot(w,b,index=0){const spots=[];for(let y=b.y+1;y<b.y+b.h-1;y++)for(let x=b.x+1;x<b.x+b.w-1;x++){const p=point(x+.5,y+.5);if(!w.blocked(p.x,p.y))spots.push(p);}return spots[(index*3+Math.floor(spots.length/2))%spots.length]||b.workSpot;}
function fieldSpot(w,z,index){const origin=z.lumber||point(z.x-z.rx-10,z.y);for(let r=0;r<18;r++)for(let j=0;j<20;j++){const a=(j+index*3)*Math.PI/10,p={x:origin.x+Math.cos(a)*(r+3)*TILE,y:origin.y+Math.sin(a)*(r+3)*TILE};if(!w.blocked(p.x,p.y)&&!w.inCity(p)&&!w.interiorAt(p)&&!w.terrain(p).water&&!w.roadMask[Math.floor(p.y/TILE)*W+Math.floor(p.x/TILE)])return p;}return origin;}
export function initializeIndustry(w,{restored=false}={}){
 normalizeCrafts(w.player);w.camps??=[];if(w.dungeonSpec||w.generatorVersion<8)return;
 const migrating=!w.industryRevision;
 for(const z of w.cities){const warehouse=w.buildings.find(b=>b.city===z.id&&b.type==='warehouse');if(!warehouse)continue;const store=w.warehouses[z.id];if(!w.workProps.some(f=>f.industry===z.id+'-board'))w.workProps.push({kind:'noticeBoard',industry:z.id+'-board',x:z.x+4,y:z.y+4,w:1,h:1,solid:false});if(migrating){addItems(store,{grain:24,hops:12,honey:8,herb:8});}
  const industryRoles=[...Object.keys(INDUSTRIES),'grainFarmer','beekeeper'];
  for(const [index,role]of industryRoles.entries()){
   const def=INDUSTRIES[role],b=w.buildings.find(b=>b.city===z.id&&b.type===def?.room)||warehouse,work=def?freeRoomSpot(w,b,index):fieldSpot(w,z,index);
   if(!w.workSites.some(s=>s.id===z.id+'-'+role))w.workSites.push({id:z.id+'-'+role,city:z.id,kind:role,name:def?.name||({grainFarmer:'Хлебное поле',beekeeper:'Лесная пасека'})[role],...work});
   if(def){if(!b.furniture.some(f=>f.industry===role))b.furniture.push({kind:def.prop,x:work.x/TILE+.3,y:work.y/TILE-.5,w:1,h:1,solid:false,industry:role});}
   else if(!w.workProps.some(f=>f.industry===z.id+'-'+role)){for(let j=0;j<3;j++)w.workProps.push({kind:role==='beekeeper'?'beehive':'grainSack',industry:z.id+'-'+role,x:Math.floor(work.x/TILE)+j*1.5,y:Math.floor(work.y/TILE)-2,w:1,h:1,solid:false});}
   if(migrating&&!w.entities.some(e=>e.industryRole===role&&e.faction===z.id)){
    const e=w.add(role,z.id,work.x/TILE,work.y/TILE);e.industryRole=role;e.work={...work};e.deliveryPoint={...warehouse.workSpot};e.workBuildingId=def?b.id:null;e.livery=z.style?.cloth;e.flagColor=z.style?.flag;e.noTrade=true;e.inventory={gold:15};const houses=w.buildings.filter(b=>b.city===z.id&&b.type==='house');const house=houses[index%houses.length];e.home={...house.workSpot};e.homeBuildingId=house.id;e.productionTimer=0;
   }
   if(!def&&migrating&&!w.resources.some(r=>r.industry===z.id+'-'+role)){
    const kinds=role==='beekeeper'?['honey','honey','honey']:['grain','grain','grain','grain','hops','hops'];for(const [j,kind]of kinds.entries()){const p=fieldSpot(w,z,index+j);w.resources.push({id:w.resources.length,kind,x:p.x,y:p.y,amount:kind==='honey'?2:4,maxAmount:kind==='honey'?2:4,industry:z.id+'-'+role,regrowAt:w.time+240});}
   }
  }
 }
 if(!restored&&migrating)addItems(w.player.inventory,{campKit:1,cloth:2,fiber:6});w.industryRevision=1;
}
export function updateIndustry(w){if(w.dungeonSpec)return;if(w.time<(w.nextCropCheck||0))return;w.nextCropCheck=w.time+10;for(const r of w.resources)if(r.industry&&r.amount<=0&&w.time>=(r.regrowAt||0)){r.amount=r.maxAmount;r.regrowAt=w.time+240;}
 // Shops buy actual finished products from their own settlement's treasury-backed warehouse.
 const supply={cook:['bread','ale','jerky','stew'],farmerTrader:['grain','hops','honey','wax'],herbalist:['medicine','bandage','salve'],smith:['ingot','nails','tools'],tailor:['rope','bandage','travelCoat'],leatherworker:['leather','travelCoat'],armorer:['shield','armor'],provisioner:['bread','jerky','torch','campKit','rope']};
 for(const e of w.entities){if(e.hp<=0||!e.shopkeeper)continue;const store=w.warehouses[e.faction];for(const k of supply[e.role]||[]){const n=Math.min(4,store[k]||0,Math.max(0,8-(e.inventory[k]||0)),Math.floor((e.inventory.gold||0)/Math.max(1,ITEMS[k].price*.5)));if(n>0){const cost=Math.ceil(n*ITEMS[k].price*.5);store[k]-=n;store.gold=(store.gold||0)+cost;e.inventory.gold-=cost;e.inventory[k]=(e.inventory[k]||0)+n;}}}
}
export function industryAI(w,e,dt){if(!e.industryRole||e.aggressor&&w.entityById.get(e.aggressor)?.hp>0&&distance(e,w.entityById.get(e.aggressor))<400)return false;const role=e.industryRole,store=w.warehouses[e.faction];if(!store)return true;
 if(w.night){e.state='sleep';w.navigate(e,e.home,dt,85);return true;}
 if(role==='grainFarmer'||role==='beekeeper'){
  const items=role==='grainFarmer'?['grain','hops']:['honey','wax'];if(items.reduce((n,k)=>n+(e.inventory[k]||0),0)>=8){w.deliverWorker(e,dt,items);return true;}
  const r=w.resources.filter(r=>r.industry===e.faction+'-'+role&&r.amount>0).sort((a,b)=>distance(a,e)-distance(b,e))[0];if(!r){e.state='waitingForHarvest';return true;}
  e.state=role==='beekeeper'?'tendingBees':'harvestingGrain';if(distance(e,r)>30){w.navigate(e,r,dt,80);return true;}e.productionTimer=(e.productionTimer||0)+dt;if(e.productionTimer>=5){e.productionTimer=0;r.amount--;if(r.amount<=0)r.regrowAt=w.time+240;addItems(e.inventory,{[r.kind]:1});if(role==='beekeeper')addItems(e.inventory,{wax:1});w.log(e.name+' собрал '+ITEMS[r.kind].name+'.',{at:e});}return true;
 }
 const def=INDUSTRIES[role],recipe=RECIPES.find(r=>r.id===def.recipe),input=def.input||recipe.input,output=def.output||recipe.output;
 if(e.production){e.state='craftingGoods';if(distance(e,e.work)>28){w.navigate(e,e.work,dt,80);return true;}e.production.remaining-=dt;if(e.production.remaining<=0){addItems(e.inventory,e.production.output);e.produced=(e.produced||0)+1;e.production=null;w.log(e.name+' завершил работу: '+Object.keys(output).map(k=>ITEMS[k].name).join(', ')+'.',{at:e});}return true;}
 if(role==='healer'&&(e.inventory.medicine||0)>0){const patient=w.nearby(e,350).filter(g=>g.faction===e.faction&&(g.sickness||GUARDS.includes(g.role)&&g.hp<g.maxHp-25)&&!g.enemyId).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];if(patient){e.state='treating';w.navigate(e,patient,dt,95);if(distance(e,patient)<50){if(!treatPatient(w,patient,e.inventory)){e.inventory.medicine--;patient.hp=Math.min(patient.maxHp,patient.hp+45);}w.log(e.name+' перевязал раненого стражника.',{at:e});}return true;}}
 if(def.outputs.some(k=>(e.inventory[k]||0)>=(role==='healer'?4:6))){w.deliverWorker(e,dt,def.outputs);return true;}
 if(!hasMaterials(e.inventory,input)){
  const available=Object.entries(input).some(([k,n])=>(e.inventory[k]||0)<n&&(store[k]||0)>0);
  if(available&&distance(e,e.deliveryPoint)>28){e.state='fetchingSupplies';w.navigate(e,e.deliveryPoint,dt,88);return true;}
  if(available)for(const[k,n]of Object.entries(input)){const take=Math.min(Math.max(0,n-(e.inventory[k]||0)),store[k]||0);if(take>0){store[k]-=take;e.inventory[k]=(e.inventory[k]||0)+take;}}
  if(!hasMaterials(e.inventory,input)){e.state='waitingForSupplies';return true;}
 }
 if(distance(e,e.work)>24){e.state='toWork';w.navigate(e,e.work,dt,80);return true;}
 if(hasMaterials(e.inventory,input)){removeItems(e.inventory,input);e.production={remaining:def.time,output:{...output}};e.state='craftingGoods';}else e.state='waitingForSupplies';return true;
}
