import * as v10 from './worldgen-v10.js';
import * as v7 from './worldgen-v7.js';
import {chooseSettlementStyles} from './settlement-shapes.js';
import {generateSettlement} from './settlement-layout.js';
import * as v6 from './worldgen-v6.js';
import * as v5 from './worldgen-v5.js';
import * as v4 from './worldgen-v4.js';
import * as v3 from './worldgen-v3.js';
import {naturalRiver,prepareRiver,gatePlan,gateTile,gateOpening,townWorkRoads,channelCell} from './settlements.js';
import * as v2 from './worldgen-v2.js';
import {W,H,TILE,point} from './content.js';
const pick=(r,a)=>a[Math.floor(r()*a.length)];
export const shuffle=(r,a)=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const stems=['Ворон','Ясен','Берест','Ольх','Кремн','Верес','Рун','Злат','Сив','Туман','Кедр','Медн','Бел','Серебр','Сокол','Ив'];
const endings=['оград','овск','инск','одоль','оречье','обор','оморье','оступ','еж','олесье','овец','еград'];
const adjectives=['Безмолвный','Пепельный','Забытый','Тихий','Медный','Змеиный','Сумрачный','Серебряный','Старый','Соколиный','Зелёный','Чёрный'];
const landscapeNames=['Озеро глухих колоколов','Озеро трёх лун','Чёрная чаша','Лесное зеркало','Серебряная заводь','Вдовий плёс','Вода без берегов','Озеро янтарных сосен'];
export function configureGeography(w,r){
 if(w.generatorVersion>=10)return v10.configureGeography(w,r);
 if(w.generatorVersion===7)return v7.configureGeography(w,r);
 if(w.generatorVersion===6)return v6.configureGeography(w,r);
 if(w.generatorVersion===5)return v5.configureGeography(w,r);
 if(w.generatorVersion===4)return v4.configureGeography(w,r);
 if(w.generatorVersion===3)return v3.configureGeography(w,r);
 if(w.generatorVersion===2)return v2.configureGeography(w,r);
 w.river={x:180+r()*220,phase:r()*Math.PI*2,a:32+r()*16,b:8+r()*8,f:.024+r()*.006,g:.055+r()*.012,axis:r()<.5?'vertical':'horizontal'};if(w.river.axis==='horizontal')w.river.x=150+r()*170;
 // The river already exists. Sample only dry city footprints, with no river-city quota.
 const regionW=w.generatorVersion>=9?720:W,regionH=w.generatorVersion>=9?600:H;
 const archetypes=shuffle(r,['fortress','manor','market']),names=new Set();
 w.cities.forEach((z,i)=>{do{z.name=pick(r,stems)+pick(r,endings);}while(names.has(z.name));names.add(z.name);z.archetype=archetypes[i];z.rx=z.archetype==='market'?39:37+Math.floor(r()*8);z.ry=z.archetype==='market'?33:35+Math.floor(r()*5);z.r=Math.max(z.rx,z.ry)+2;z.palette=i;});
 chooseSettlementStyles(w,r);
 const dry=(z,x,y)=>{const horizontal=w.river.axis==='horizontal',along=horizontal?x:y,across=horizontal?y:x,extent=horizontal?z.rx:z.ry,width=horizontal?z.ry:z.rx;for(let a=along-extent-8;a<=along+extent+8;a+=2)if(Math.abs(naturalRiver(w,a)-across)<width+12)return false;return true;};
 let cities;
 for(let attempt=0;attempt<30000;attempt++){
  const sample=w.cities.map(z=>({x:z.rx+14+Math.floor(r()*(regionW-z.rx*2-28)),y:z.ry+14+Math.floor(r()*(regionH-z.ry*2-28))}));
  if(sample.every((p,i)=>dry(w.cities[i],p.x,p.y)&&sample.every((q,j)=>i===j||Math.hypot(p.x-q.x,p.y-q.y)>335))){cities=sample;break;}
 }
 if(!cities){const candidates=[];for(let y=55;y<=regionH-55;y+=15)for(let x=55;x<=regionW-55;x+=15)if(w.cities.every(z=>dry(z,x,y)))candidates.push({x,y});let best=0;for(let j=0;j<12000;j++){const sample=w.cities.map(z=>pick(r,candidates.filter(p=>p.x>z.rx+10&&p.x<regionW-z.rx-10&&p.y>z.ry+10&&p.y<regionH-z.ry-10))),score=Math.min(...sample.flatMap((p,i)=>sample.slice(i+1).map(q=>Math.hypot(p.x-q.x,p.y-q.y))));if(score>best){best=score;cities=sample;}if(score>335)break;}if(best<=335)throw new Error('No dry separated city sites: '+w.seed);}
 w.cities.forEach((z,i)=>Object.assign(z,cities[i]));
 w.regionName=pick(r,['Земли','Пределы','Долины','Тракты'])+' '+pick(r,['Семи ветров','Угасшего солнца','Янтарного леса','Забытых королей','Серого сокола','Тихих колоколов','Дальнего рубежа']);

 w.biomeSeed=Math.floor(r()*1e6);w.climate=r();
 const occupied=[...w.cities];
 for(const z of w.places.filter(z=>!['cathedral','oak','salt','north'].includes(z.id))){
  for(let a=0;a<2000;a++){const x=25+Math.floor(r()*(regionW-50)),y=25+Math.floor(r()*(regionH-50));if(occupied.every(p=>Math.hypot(x-p.x,y-p.y)>(p.r||12)+z.r+20)){z.x=x;z.y=y;break;}}
  occupied.push(z);
  if(z.id==='lake')z.name=pick(r,landscapeNames);else if(z.id==='grove')z.name=pick(r,['Роща последнего эха','Вересковая чаща','Чёрный бор','Лес потерянных троп','Мшистая падь']);else z.name=pick(r,adjectives)+' '+({red:'лагерь',ash:'стан',thorn:'перевал',ruins:'город',barrow:'курган',shrine:'храм',cross:'постоялый двор',quarry:'карьер'})[z.id];
 }
 const main=w.places.find(z=>z.id==='lake');w.lakes=[{x:main.x,y:main.y,rx:19+r()*20,ry:12+r()*17,phase:r()*6}];
 for(let i=0,n=2+Math.floor(r()*4);i<n;i++){const x=25+r()*(regionW-50),y=25+r()*(regionH-50);if(w.cities.every(z=>Math.hypot(z.x-x,z.y-y)>z.r+45))w.lakes.push({x,y,rx:9+r()*23,ry:7+r()*18,phase:r()*6});}
 w.lake=w.lakes[0];if(w.generatorVersion>=4)prepareRiver(w,r);
}
function hash(x,y,seed){let n=Math.imul(x,374761393)^Math.imul(y,668265263)^seed;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
function noise(x,y,seed){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,s=fx*fx*(3-2*fx),t=fy*fy*(3-2*fy),a=hash(ix,iy,seed)*(1-s)+hash(ix+1,iy,seed)*s,b=hash(ix,iy+1,seed)*(1-s)+hash(ix+1,iy+1,seed)*s;return a*(1-t)+b*t;}
export function surfaceTile(w,x,y){
 if(w.generatorVersion>=10)return v10.surfaceTile(w,x,y);
 if(w.generatorVersion===7)return v7.surfaceTile(w,x,y);
 if(w.generatorVersion===6)return v6.surfaceTile(w,x,y);
 if(w.generatorVersion===5)return v5.surfaceTile(w,x,y);
 if(w.generatorVersion===4)return v4.surfaceTile(w,x,y);
 if(w.generatorVersion===3)return v3.surfaceTile(w,x,y);
 if(w.generatorVersion===2)return v2.surfaceTile(w,x,y);
 for(const l of w.lakes){const dx=(x-l.x)/l.rx,dy=(y-l.y)/l.ry,angle=Math.atan2(dy,dx);if(dx*dx+dy*dy<1+.16*Math.sin(angle*5+l.phase)+.09*Math.cos(angle*9+l.phase))return 2;}
 const across=w.river.axis==='horizontal'?y:x,along=w.river.axis==='horizontal'?x:y;
 if(w.generatorVersion>=4?w.riverMask[y*W+x]:Math.abs(across-w.riverX(along))<3.5+1.7*Math.sin(along*.027+w.river.phase))return 4;
 const moisture=noise(x/48,y/48,w.biomeSeed),height=noise(x/74+18,y/74,w.biomeSeed+71);
 return height>.69?10:moisture<.32+(w.climate-.5)*.12?8:moisture>.73?9:0;
}
const distanceToSegment=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.y-a[1])*dy)/(dx*dx+dy*dy||1)));const q=[a[0]+t*dx,a[1]+t*dy];return {distance:Math.hypot(p.x-q[0],p.y-q[1]),point:q};};
export function generateRoads(w,road,r){
 if(w.generatorVersion>=10)return v10.generateRoads(w,road,r);
 if(w.generatorVersion===7)return v7.generateRoads(w,road,r);
 if(w.generatorVersion===6)return v6.generateRoads(w,road,r);
 if(w.generatorVersion===5)return v5.generateRoads(w,road,r);
 if(w.generatorVersion===4)return v4.generateRoads(w,road,r);
 if(w.generatorVersion===3)return v3.generateRoads(w,road,r);
 if(w.generatorVersion===2)return v2.generateRoads(w,road,r);
 const nodes=w.cities,connected=[nodes[0]],remaining=nodes.slice(1),edges=[];
 while(remaining.length){let edge,best=Infinity;for(const a of connected)for(const b of remaining){const d=Math.hypot(a.x-b.x,a.y-b.y)*(1+r()*.15);if(d<best){best=d;edge=[a,b];}}edges.push(edge);connected.push(edge[1]);remaining.splice(remaining.indexOf(edge[1]),1);}
 if(r()<.8){const pair=[[nodes[0],nodes[1]],[nodes[0],nodes[2]],[nodes[1],nodes[2]]].find(([a,b])=>!edges.some(e=>e.includes(a)&&e.includes(b)));if(pair)edges.push(pair);}
 const outside=(z,t)=>Math.abs(t.x-z.x)>Math.abs(t.y-z.y)?[z.x+Math.sign(t.x-z.x)*(z.rx+8),z.y]:[z.x,z.y+Math.sign(t.y-z.y)*(z.ry+8)];
 w.mainRoads=[];
 for(const [a,b]of edges){const from=outside(a,b),to=outside(b,a),points=[[a.x,a.y],from];for(let k=1;k<=3;k++)points.push([Math.round(from[0]+(to[0]-from[0])*k/4+(r()-.5)*35),Math.round(from[1]+(to[1]-from[1])*k/4+(r()-.5)*35)]);points.push(to,[b.x,b.y]);const smooth=[];for(let j=0;j<points.length-1;j++){const a=points[j],b=points[j+1],prev=points[Math.max(0,j-1)],next=points[Math.min(points.length-1,j+2)];for(let k=0;k<12;k++){const t=k/12,t2=t*t,t3=t2*t;smooth.push([.5*((2*a[0])+(-prev[0]+b[0])*t+(2*prev[0]-5*a[0]+4*b[0]-next[0])*t2+(-prev[0]+3*a[0]-3*b[0]+next[0])*t3),.5*((2*a[1])+(-prev[1]+b[1])*t+(2*prev[1]-5*a[1]+4*b[1]-next[1])*t2+(-prev[1]+3*a[1]-3*b[1]+next[1])*t3)]);}}smooth.push(points.at(-1));road(smooth);w.mainRoads.push(smooth);}
 for(let i=0;i<3;i++){const route=w.mainRoads[i%w.mainRoads.length],p=route[Math.floor(route.length/2)];Object.assign(w.territories[i],point(...p));}
 for(const z of w.places.filter(z=>!['cathedral','oak','salt','north','lake','grove'].includes(z.id))){const candidates=w.roads.flat().filter(p=>w.cities.every(c=>Math.hypot(c.x-p[0],c.y-p[1])>c.r+10));const near=candidates.sort((a,b)=>Math.hypot(a[0]-z.x,a[1]-z.y)-Math.hypot(b[0]-z.x,b[1]-z.y))[0]||w.mainRoads[0][3];road([near,[Math.round((near[0]+z.x)/2+(r()-.5)*25),Math.round((near[1]+z.y)/2)],[z.x,z.y]]);}
 // The sanctuary is a leaf of the road graph, chosen after every through-road exists.
 const cathedral=w.places.find(z=>z.id==='cathedral'),segments=w.roads.flatMap(points=>points.slice(1).map((b,i)=>[points[i],b]));let best;
 for(let attempt=0;attempt<16000;attempt++){const p={x:45+Math.floor(r()*((w.generatorVersion>=9?720:W)-90)),y:45+Math.floor(r()*((w.generatorVersion>=9?600:H)-90))};if(w.cities.some(z=>Math.hypot(z.x-p.x,z.y-p.y)<z.r+70)||w.places.some(z=>z.id!=='cathedral'&&Math.hypot(z.x-p.x,z.y-p.y)<z.r+40))continue;const near=segments.map(([a,b])=>distanceToSegment(p,a,b)).sort((a,b)=>a.distance-b.distance)[0];if(near.distance>=55&&near.distance<=90){let dry=true;for(let y=p.y-24;y<=p.y+24&&dry;y++)for(let x=p.x-26;x<=p.x+26;x++)if([2,4].includes(w.tile(x,y))){dry=false;break;}if(dry){best={...p,near};break;}}}
 if(!best)throw new Error('No detached sanctuary site for seed '+w.seed);
 Object.assign(cathedral,{x:best.x,y:best.y,r:34});const attach=best.near.point.map(Math.round),side=Math.sign(attach[0]-best.x)||1,x=best.x+side*32,y=best.y+27;
 w.cathedralRoad=[attach,[x,attach[1]],[x,y],[best.x,y],[best.x,best.y+22]];road(w.cathedralRoad);
 const camp=w.places.find(z=>z.id==='thorn');Object.assign(w.territories[3],point(camp.x,camp.y));
}
export function generateCity(w,z,clear,r){
 if(w.generatorVersion>=10)return v10.generateCity(w,z,clear,r);
 if(w.generatorVersion===7)return v7.generateCity(w,z,clear,r);
 if(w.generatorVersion===6)return v6.generateCity(w,z,clear,r);
 if(w.generatorVersion===5)return v5.generateCity(w,z,clear,r);
 if(w.generatorVersion===4)return v4.generateCity(w,z,clear,r);
 if(w.generatorVersion===3)return v3.generateCity(w,z,clear,r);
 if(w.generatorVersion===2)return v2.generateCity(w,z,clear,r);
 if(w.generatorVersion>=8)return generateSettlement(w,z,clear,r);
 if(w.generatorVersion>=4)gatePlan(w,z,r);
 const {rx,ry}=z,base=w.buildings.length,occupied=new Set(),street=new Set(),key=(x,y)=>y*W+x;
 const inside=(x,y,pad=0)=>{const dx=Math.abs(x-z.x),dy=Math.abs(y-z.y);return dx<rx-pad&&dy<ry-pad&&(z.archetype!=='market'||dx+dy<rx+ry-10-pad*2);};
 const reserve=(b,pad=1)=>{for(let y=b.y-pad;y<b.y+b.h+pad;y++)for(let x=b.x-pad;x<b.x+b.w+pad;x++)occupied.add(key(x,y));};
 const add=(b,physical=b)=>{b.city=z.id;b.palette=z.palette;w.buildings.push(b);reserve(physical);};
 clear(z.x-rx-1,z.y-ry-1,rx*2+3,ry*2+3,0);
 for(let y=z.y-ry;y<=z.y+ry;y++){
  let run=null;
  for(let x=z.x-rx;x<=z.x+rx+1;x++){
   const wall=inside(x,y)&&![[1,0],[-1,0],[0,1],[0,-1]].every(([dx,dy])=>inside(x+dx,y+dy))&&(w.generatorVersion>=4?!gateOpening(z,x,y):Math.abs(x-z.x)>4&&Math.abs(y-z.y)>4);if(w.generatorVersion>=4&&!z.fortified){if(run!==null){run=null;}continue;}
   if(wall&&run===null)run=x;if(!wall&&run!==null){add({x:run,y,w:x-run,h:1,type:'wall'});run=null;}
  }
 }
 if(w.generatorVersion<4||z.fortified)for(const sx of [-1,1])for(const sy of [-1,1])add({x:z.x+sx*(rx-2)-1,y:z.y+sy*(ry-(z.archetype==='market'?12:2))-1,w:3,h:3,type:'tower'});
 const carve=(x,y,width=3)=>{clear(x-Math.floor(width/2),y-Math.floor(width/2),width,width,3);for(let dy=-Math.floor(width/2);dy<=Math.floor(width/2);dy++)for(let dx=-Math.floor(width/2);dx<=Math.floor(width/2);dx++)street.add(key(x+dx,y+dy));};
 if(w.generatorVersion>=4){for(const g of z.gatePlan){const p=gateTile(z,g);if(g.side==='N'||g.side==='S'){const bendY=z.y+(g.side==='N'?-10:10);for(let y=Math.min(p.y,bendY);y<=Math.max(p.y,bendY);y++)carve(p.x,y,7);for(let x=Math.min(p.x,z.x);x<=Math.max(p.x,z.x);x++)carve(x,bendY,5);for(let y=Math.min(bendY,z.y);y<=Math.max(bendY,z.y);y++)carve(z.x,y,5);}else{const bendX=z.x+(g.side==='W'?-10:10);for(let x=Math.min(p.x,bendX);x<=Math.max(p.x,bendX);x++)carve(x,p.y,7);for(let y=Math.min(p.y,z.y);y<=Math.max(p.y,z.y);y++)carve(bendX,y,5);for(let x=Math.min(bendX,z.x);x<=Math.max(bendX,z.x);x++)carve(x,z.y,5);}}}else {for(let y=z.y-ry;y<=z.y+ry;y++)carve(z.x,y,7);for(let x=z.x-rx;x<=z.x+rx;x++)carve(x,z.y,7);}
 const plaza=z.archetype==='fortress'?6:8;clear(z.x-plaza,z.y-plaza,plaza*2+1,plaza*2+1,3);
 for(let y=z.y-plaza-1;y<=z.y+plaza+1;y++)for(let x=z.x-plaza-1;x<=z.x+plaza+1;x++)street.add(key(x,y));
 const mainStreets=new Set(street);
 const lanesX=z.archetype==='fortress'?[-17,17]:[-23,22],lanesY=z.archetype==='market'?[-19,18]:[-15,15];
 for(const dx of (z.archetype==='market'?[]:lanesX))for(let y=z.y-ry+3;y<z.y+ry-3;y++)if(inside(z.x+dx,y,2))carve(z.x+dx,y,2);
 for(const dy of (z.archetype==='market'?[]:lanesY))for(let x=z.x-rx+3;x<z.x+rx-3;x++)if(inside(x,z.y+dy,2))carve(x,z.y+dy,2);
 if(z.archetype==='market'){
  const line=(a,b)=>{const n=Math.max(Math.abs(a[0]-b[0]),Math.abs(a[1]-b[1]));for(let i=0;i<=n;i++)carve(z.x+Math.round(a[0]+(b[0]-a[0])*i/n),z.y+Math.round(a[1]+(b[1]-a[1])*i/n),2);};
  const ax=rx-10,ay=ry-10,ring=[[-ax+7,-ay],[ax-7,-ay],[ax,-ay+7],[ax,ay-7],[ax-7,ay],[-ax+7,ay],[-ax,ay-7],[-ax,-ay+7]];
  for(let i=0;i<ring.length;i++)line(ring[i],ring[(i+1)%ring.length]);
  for(const sx of [-1,1])for(const sy of [-1,1])line([sx*5,sy*5],[sx*ax,sy*ay]);
 }
 let canalX=null;
 if(w.generatorVersion<7&&z.archetype==='canal'){
  const horizontal=w.generatorVersion>=4&&z.channelAxis==='horizontal',coordinate=w.generatorVersion>=4?z.channelCoordinate:z.x+(r()<.5?-11:11);canalX=coordinate;
  z.waterway=horizontal?{axis:'horizontal',y:coordinate,width:3,minX:z.x-rx-1,maxX:z.x+rx+1}:{axis:'vertical',x:coordinate,width:3,minY:z.y-ry-1,maxY:z.y+ry+1};
  for(let along=horizontal?z.x-rx-1:z.y-ry-1;along<=(horizontal?z.x+rx+1:z.y+ry+1);along++)for(let off=-1;off<=1;off++){const x=horizontal?along:coordinate+off,y=horizontal?coordinate+off:along,i=key(x,y);w.tiles[i]=street.has(i)||w.roadMask[i]?5:4;occupied.add(i);}
 }
 const fits=(b,relaxed=false)=>{for(let y=b.y-1;y<=b.y+b.h+1;y++)for(let x=b.x-1;x<=b.x+b.w;x++)if(!inside(x,y,2)||occupied.has(key(x,y))||(street.has(key(x,y))&&(!relaxed||mainStreets.has(key(x,y)))))return false;return true;};
 // Large keep occupies one corner, not a mandatory northern block.
 const corners=shuffle(r,[[-rx+8,-ry+7],[rx-22,-ry+7],[-rx+8,ry-18],[rx-22,ry-18]]);
 let castle;
 for(const [dx,dy]of corners){const b={x:z.x+dx,y:z.y+dy,w:14,h:9,type:'castle',name:pick(r,['Замок','Цитадель','Крепость'])+' '+pick(r,['Воронье гнездо','Старый камень','Седой страж','Медный ключ','Высокий двор'])};let valid=true;for(let y=b.y-1;y<=b.y+b.h+1;y++)for(let x=b.x-1;x<=b.x+b.w;x++)if(!inside(x,y,2)||occupied.has(key(x,y)))valid=false;if(valid){castle=b;break;}}
 // Lane patterns sometimes occupy every corner. Clear one reserved keep parcel first.
 if(!castle){castle={x:z.x-rx+4,y:z.y-ry+4,w:14,h:9,type:'castle',name:'Крепость '+z.name};for(let y=castle.y-2;y<castle.y+castle.h+3;y++)for(let x=castle.x-2;x<castle.x+castle.w+3;x++){street.delete(key(x,y));occupied.delete(key(x,y));if(w.tile(x,y)===4)w.tiles[key(x,y)]=3;}}
 for(let y=castle.y-2;y<castle.y+castle.h+3;y++)for(let x=castle.x-2;x<castle.x+castle.w+3;x++)street.delete(key(x,y));
 add(castle);clear(castle.x-1,castle.y-1,castle.w+2,castle.h+3,3);
 const lots=shuffle(r,Array.from({length:(rx*2-10)*(ry*2-10)},(_,i)=>({x:z.x-rx+4+i%(rx*2-10),y:z.y-ry+4+Math.floor(i/(rx*2-10))})));
 const place=(type,name,width=7,height=7)=>{
  for(const relaxed of type==='house'?[false]:[false,true])for(const p of lots){const b={...p,w:width,h:height,type,name};if(!fits(b,relaxed))continue;const physical={...b};if(['smith','inn','warehouse','apothecary','tailor'].includes(type)){b.y+=2;b.h-=2;}add(b,physical);clear(physical.x-1,physical.y-1,physical.w+2,physical.h+3,3);return b;}if(type!=='house'&&w.generatorVersion>=4){for(const side of [-1,1])for(let dy=-24;dy<25;dy+=9){const physical={x:z.x+side*(rx+9),y:z.y+dy,w:width,h:height};let valid=true;for(let y=physical.y-1;y<=physical.y+height+1;y++)for(let x=physical.x-1;x<=physical.x+width;x++)if(x<3||y<3||x>=W-3||y>=H-3||occupied.has(key(x,y))||w.riverMask[key(x,y)]||w.roadMask[key(x,y)]||[2,4].includes(w.tile(x,y)))valid=false;if(!valid)continue;const b={...physical,type,name};b.y+=2;b.h-=2;add(b,physical);clear(physical.x-1,physical.y-1,width+2,height+3,3);z.workshopSuburb=true;return b;}}return null;
 };
 for(const [type,name]of shuffle(r,[...(w.generatorVersion>=4?[['tailor','Ткацкая мастерская']]:[]),['smith','Кузница '+pick(r,['Искра','Железный зуб','Три молота','Уголь и сталь'])],['inn',pick(r,['Трактир «Слепой лис»','Трактир «Медная сова»','Трактир «Семь бочек»','Трактир «Белый олень»'])],['warehouse','Склад '+pick(r,['гильдии','дорожной стражи','торгового двора'])],['apothecary','Лавка '+pick(r,['Мяты','Тысячелистника','Старой ивы','Зелёного листа'])]])){if(!place(type,name))throw new Error('City generation: no workshop lot '+z.id+' '+type);}
 let houses=0;const minimum=z.isVillage?8:14,target=minimum+Math.floor(r()*(z.isVillage?4:12));for(let i=0;i<target;i++)if(place('house',null,5+Math.floor(r()*3),5+Math.floor(r()*2)))houses++;
 for(let i=houses;i<minimum;i++)if(place('house',null,5,5))houses++;
 // A cramped core grows a small suburb beyond its northern gate instead of losing housing.
 if(houses<minimum){z.suburb=true;for(const row of [10,19,28])for(const dx of [-31,-23,-15,-7,7,15,23,31]){if(houses>=minimum)break;const b={x:z.x+dx,y:z.y-ry-row,w:5,h:5,type:'house'};if(w.generatorVersion>=4){let wet=false;for(let yy=b.y-1;yy<b.y+7;yy++)for(let xx=b.x-1;xx<b.x+6;xx++)if(xx<3||yy<3||xx>=W-3||yy>=H-3||occupied.has(key(xx,yy))||w.riverMask[key(xx,yy)]||w.roadMask[key(xx,yy)]||[2,4].includes(w.tile(xx,yy)))wet=true;if(wet)continue;}add(b);clear(b.x-1,b.y-1,7,8,3);houses++;}w.districts.push({name:'ПРЕДМЕСТЬЕ',...point(z.x,z.y-ry-10),city:z.id});}
 if(z.isVillage)castle.name='РАТУША · '+z.name;
 z.houseCount=houses;z.layoutName={fortress:'Крепостной город',canal:'Город каналов',market:'Торговый посад',manor:'Город кварталов'}[z.archetype];if(z.isVillage)z.layoutName='Торговая слобода';
 for(const [dx,dy]of [[-5,-5],[5,-5],[-5,5],[5,5]])add({x:z.x+dx,y:z.y+dy,w:2,h:1,type:'stall'});
 w.districts.push({name:z.layoutName.toUpperCase(),...point(z.x,z.y-9),city:z.id},{name:'РЫНОЧНАЯ ПЛОЩАДЬ',...point(z.x,z.y),city:z.id},{name:'ДВОР ЦИТАДЕЛИ',...point(castle.x+7,castle.y+11),city:z.id},{name:'ЖИЛЫЕ УЛИЦЫ',...point(z.x-rx+12,z.y+ry-7),city:z.id},{name:z.archetype==='canal'?'МОСТОВАЯ СЛОБОДА':'РЕМЕСЛЕННАЯ СЛОБОДА',...point(z.x+rx-12,z.y+ry-7),city:z.id},{name:'ГЛАВНЫЕ ВРАТА',...point(z.x,z.y+ry-1),city:z.id});
 clear(z.x-rx+3,z.y+ry+4,15,8,6);clear(z.x+rx-17,z.y+ry+4,14,8,6);
 z.gates=[[0,ry-2],[0,-ry+2],[-rx+2,0],[rx-2,0]];
 z.fishing=point(z.x+rx+7,z.y+14);z.lumber=point(z.x-rx-10,z.y+6);z.hunt=point(z.x-rx-14,z.y+19);z.mine=point(z.x+rx+12,z.y-12);
 if(w.generatorVersion>=4)townWorkRoads(w,z);else {clear(z.x+rx+8,z.y+10,8,9,2);clear(z.x+rx+6,z.y+11,2,7,0);}
 w.warehouses[z.id]={gold:650,ration:45,fish:z.specialty==='fish'?45:10,log:z.specialty==='log'?60:15,ore:z.specialty==='ore'?60:15,hide:12,herb:12,fiber:45,bait:100,arrow:150};
 z.buildingCount=w.buildings.length-base;
}

export function finalizeHydrology(w){
 if(w.generatorVersion>=10)return v10.finalizeHydrology(w);
 if(w.generatorVersion===7)return v7.finalizeHydrology(w);
 if(w.generatorVersion===6)return v6.finalizeHydrology(w);
 if(w.generatorVersion===5)return v5.finalizeHydrology(w);
 if(w.generatorVersion===4)return v4.finalizeHydrology(w);
 if(w.generatorVersion>=4)return finalizeWaterAndGates(w);
 if(w.generatorVersion===3)return v3.finalizeHydrology(w);
 if(w.generatorVersion<3){let repairedRoadTiles=0;for(let i=0;i<w.roadMask.length;i++)if(w.roadMask[i]&&[2,4].includes(w.tiles[i])){w.tiles[i]=5;repairedRoadTiles++;}w.hydrology={repairedRoadTiles};return;}
 // Water gates keep planned channels continuous through the ring wall.
 w.buildings=w.buildings.flatMap(b=>{const z=w.cities.find(z=>z.id===b.city),river=z?.waterway;if(b.type!=='wall'||!river||b.x>river.x+1||b.x+b.w<=river.x-1)return [b];const left=Math.max(0,river.x-1-b.x),right=Math.max(0,b.x+b.w-(river.x+2));return [...(left?[{...b,w:left}]:[]),...(right?[{...b,x:river.x+2,w:right}]:[])];});
 for(const z of w.cities){for(let y=z.y-z.ry;y<=z.y+z.ry;y++)for(let x=z.x-z.rx;x<=z.x+z.rx;x++){const i=y*W+x,t=w.tiles[i],channel=z.waterway&&Math.abs(x-z.waterway.x)<=1;if([2,4].includes(t)&&!channel)w.tiles[i]=0;}}
 let bridges=0;for(let i=0;i<w.roadMask.length;i++)if(w.roadMask[i]){if([2,4].includes(w.tiles[i])){w.tiles[i]=5;bridges++;}else if([0,6,8,9,10].includes(w.tiles[i])){const x=i%W,y=Math.floor(i/W),inTown=w.cities.some(z=>Math.abs(x-z.x)<=z.rx+1&&Math.abs(y-z.y)<=z.ry+1),sanctuary=w.places.find(z=>z.id==='cathedral');if(!inTown&&!(Math.abs(x-sanctuary.x)<=26&&Math.abs(y-sanctuary.y)<=24))w.tiles[i]=1;}}
 w.hydrology={repairedRoadTiles:bridges};
}

function finalizeWaterAndGates(w){
 w.buildings=w.buildings.flatMap(b=>{const z=w.cities.find(z=>z.id===b.city);if(b.type!=='wall'||!z?.waterway)return [b];const pieces=[];for(let y=b.y;y<b.y+b.h;y++){let start=null;for(let x=b.x;x<=b.x+b.w;x++){const wall=x<b.x+b.w&&!channelCell(z,x,y);if(wall&&start===null)start=x;if(!wall&&start!==null){pieces.push({...b,x:start,y,w:x-start,h:1});start=null;}}}return pieces;});
 let repairs=0;
 for(let i=0;i<w.tiles.length;i++){const x=i%W,y=Math.floor(i/W),town=w.cities.find(z=>Math.abs(x-z.x)<=z.rx+1&&Math.abs(y-z.y)<=z.ry+1);
  if(town&&[2,4].includes(w.tiles[i])&&!channelCell(town,x,y))w.tiles[i]=0;
  if(!town&&w.riverMask[i]&&!w.roadMask[i]&&![2,4].includes(w.tiles[i]))w.tiles[i]=4;
  if(w.roadMask[i]){if((w.riverMask[i]&&(!town||channelCell(town,x,y)))||[2,4].includes(w.tiles[i])){w.tiles[i]=5;repairs++;}else if(!town&&[0,6,8,9,10].includes(w.tiles[i])){const church=w.places.find(z=>z.id==='cathedral');if(Math.abs(x-church.x)>26||Math.abs(y-church.y)>24)w.tiles[i]=1;}}
 }
 w.hydrology={repairedRoadTiles:repairs};
}
