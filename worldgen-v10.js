import {createTownPlan} from './town-plan.js';
import {pointInPolygon} from './map-geometry.js';
import {W,H,TILE,point} from './content.js';
import {chooseSettlementStyles} from './settlement-shapes.js';
import {buildRegionalTerrain} from './regional-terrain.js';
import {generateRegionalRoads} from './regional-roads.js';
import {generateSettlement} from './settlement-layout.js';
const pick=(r,a)=>a[Math.floor(r()*a.length)];
export function configureGeography(w,r){
 buildRegionalTerrain(w,r);chooseSettlementStyles(w,r);for(const z of w.cities){z.rx=Math.round(z.rx*1.25);z.ry=Math.round(z.ry*1.25);z.r=Math.max(z.rx,z.ry)+2;}w.regionName=pick(r,['Долины','Земли','Пределы'])+' '+pick(r,['Семи истоков','Тихих перевалов','Белого ветра','Дальних отрогов']);w.biomeSeed=Math.floor(r()*1e6);w.climate=r();
 const used=new Set();for(const z of w.cities){z.urbanSeed=Math.floor(r()*2e9);createTownPlan(w,z,r);}const dry=(z,x,y)=>{for(let yy=y-z.ry-3;yy<=y+z.ry+3;yy+=2)for(let xx=x-z.rx-3;xx<=x+z.rx+3;xx+=2){if(xx<3||yy<3||xx>=735||yy>=615)return false;if([2,4].includes(w.naturalTiles[yy*W+xx])&&pointInPolygon(z.outline,xx-x+z.x,yy-y+z.y))return false;}return true;};
 for(const z of w.cities){do{z.name=pick(r,['Ясен','Кремн','Ив','Ворон','Берест','Медн','Бел','Ольх'])+pick(r,['оград','одол','оречье','обор','овец','оступ']);}while(used.has(z.name));used.add(z.name);}
 const pools=w.cities.map(z=>{const out=[];for(let k=0;k<18000&&out.length<100;k++){const x=z.rx+12+Math.floor(r()*(740-z.rx*2-24)),y=z.ry+12+Math.floor(r()*(620-z.ry*2-24));if(dry(z,x,y))out.push({x,y});}return out;});let sites,bestDistance=0;for(const a of pools[0])for(const b of pools[1]){const ab=Math.hypot(a.x-b.x,a.y-b.y);if(ab<bestDistance)continue;for(const c of pools[2]){const d=Math.min(ab,Math.hypot(a.x-c.x,a.y-c.y),Math.hypot(b.x-c.x,b.y-c.y));if(d>bestDistance){bestDistance=d;sites=[a,b,c];}}}if(!sites||bestDistance<280)throw new Error('No watershed city sites '+w.seed+' '+bestDistance);w.cities.forEach((z,i)=>{Object.assign(z,sites[i]);createTownPlan(w,z,r);});
 for(const z of w.cities){let best;for(const river of w.riverPaths)for(const[x,y]of river.points)for(let i=0;i<z.outline.length;i++){const a=z.outline[i],b=z.outline[(i+1)%z.outline.length],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1))),bx=a[0]+dx*t,by=a[1]+dy*t,d=Math.hypot(x-bx,y-by);if(d>=9&&d<32&&(!best||d<best.d))best={x,y,bx,by,d};}if(best){const dx=best.bx-best.x,dy=best.by-best.y,n=Math.hypot(dx,dy);z.port=true;z.portSite={x:best.x+dx/n*6,y:best.y+dy/n*6,riverX:best.x,riverY:best.y,side:Math.abs(dx)>Math.abs(dy)?dx>0?'W':'E':dy>0?'N':'S'};}}

 const occupied=[...w.cities];for(const z of w.places.filter(z=>!['cathedral','oak','salt','north'].includes(z.id))){if(z.id==='lake'){Object.assign(z,{x:Math.round(w.lake.x),y:Math.round(w.lake.y)});continue;}let found=false;for(let k=0;k<6000;k++){const x=28+Math.floor(r()*664),y=28+Math.floor(r()*544);if(occupied.some(a=>Math.hypot(a.x-x,a.y-y)<(a.r||15)+z.r+30))continue;let dry=true;for(let yy=y-10;yy<=y+10;yy+=2)for(let xx=x-12;xx<=x+12;xx+=2)if([2,4].includes(w.naturalTiles[yy*W+xx]))dry=false;if(!dry)continue;Object.assign(z,{x,y});found=true;break;}if(!found)throw new Error('No watershed landmark '+z.id);occupied.push(z);z.name=pick(r,['Тихий','Пепельный','Серебряный','Забытый','Каменный'])+' '+({red:'стан',ash:'лагерь',thorn:'перевал',ruins:'город',barrow:'курган',shrine:'храм',cross:'постоялый двор',quarry:'карьер',grove:'бор'})[z.id];}
}
export const surfaceTile=(w,x,y)=>w.naturalTiles[y*W+x];
export const generateRoads=generateRegionalRoads;
export const generateCity=generateSettlement;
export function finalizeHydrology(w){let bridges=0;for(let i=0;i<w.tiles.length;i++){if(w.roadMask[i]){if(w.riverMask[i]||w.naturalTiles[i]===2){w.tiles[i]=5;bridges++;}}else if(w.riverMask[i])w.tiles[i]=w.naturalTiles[i]===2?2:4;}w.hydrology={version:10,bridges,repairedRoadTiles:0};}
