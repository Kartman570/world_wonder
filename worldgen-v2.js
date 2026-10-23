import {W,H,TILE,point} from './content.js';
const pick=(r,a)=>a[Math.floor(r()*a.length)];
export const shuffle=(r,a)=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const stems=['Ворон','Ясен','Берест','Ольх','Кремн','Верес','Рун','Злат','Сив','Туман','Кедр','Медн','Бел','Серебр','Сокол','Ив'];
const endings=['оград','овск','инск','одоль','оречье','обор','оморье','оступ','еж','олесье','овец','еград'];
const adjectives=['Безмолвный','Пепельный','Забытый','Тихий','Медный','Змеиный','Сумрачный','Серебряный','Старый','Соколиный','Зелёный','Чёрный'];
const landscapeNames=['Озеро глухих колоколов','Озеро трёх лун','Чёрная чаша','Лесное зеркало','Серебряная заводь','Вдовий плёс','Вода без берегов','Озеро янтарных сосен'];
export function configureGeography(w,r){
 // Rejection sampling over the whole region, rather than moving three fixed anchors.
 let cities;
 for(let attempt=0;attempt<3000;attempt++){
  const sample=Array.from({length:3},()=>({x:80+Math.floor(r()*(W-160)),y:80+Math.floor(r()*(H-160))}));
  if(sample.every((a,i)=>Math.hypot(a.x-300,a.y-298)>90&&sample.every((b,j)=>i===j||Math.hypot(a.x-b.x,a.y-b.y)>335))){cities=sample;break;}
 }
 cities??=shuffle(r,[{x:65,y:80},{x:570,y:110},{x:285,y:420}]);
 const archetypes=shuffle(r,['fortress','canal','market']),names=new Set();
 w.cities.forEach((z,i)=>{Object.assign(z,cities[i]);do{z.name=pick(r,stems)+pick(r,endings);}while(names.has(z.name));names.add(z.name);z.archetype=archetypes[i];z.rx=z.archetype==='market'?49+Math.floor(r()*6):z.archetype==='fortress'?37+Math.floor(r()*6):38+Math.floor(r()*7);z.ry=z.archetype==='market'?44+Math.floor(r()*5):35+Math.floor(r()*5);z.r=Math.max(z.rx,z.ry)+2;z.palette=i;});
 w.regionName=pick(r,['Земли','Пределы','Долины','Тракты'])+' '+pick(r,['Семи ветров','Угасшего солнца','Янтарного леса','Забытых королей','Серого сокола','Тихих колоколов','Дальнего рубежа']);
 w.river={x:150+r()*330,phase:r()*Math.PI*2,a:18+r()*40,b:5+r()*12,axis:r()<.5?'vertical':'horizontal'};
 if(w.river.axis==='horizontal')w.river.x=100+r()*260;
 w.biomeSeed=Math.floor(r()*1e6);w.climate=r();
 const occupied=[...w.cities,{x:300,y:298,r:22}];
 for(const z of w.places.filter(z=>!['cathedral','oak','salt','north'].includes(z.id))){
  for(let a=0;a<2000;a++){const x=25+Math.floor(r()*(W-50)),y=25+Math.floor(r()*(H-50));if(occupied.every(p=>Math.hypot(x-p.x,y-p.y)>(p.r||12)+z.r+20)){z.x=x;z.y=y;break;}}
  occupied.push(z);
  if(z.id==='lake')z.name=pick(r,landscapeNames);else if(z.id==='grove')z.name=pick(r,['Роща последнего эха','Вересковая чаща','Чёрный бор','Лес потерянных троп','Мшистая падь']);else z.name=pick(r,adjectives)+' '+({red:'лагерь',ash:'стан',thorn:'перевал',ruins:'город',barrow:'курган',shrine:'храм',cross:'постоялый двор',quarry:'карьер'})[z.id];
 }
 const main=w.places.find(z=>z.id==='lake');w.lakes=[{x:main.x,y:main.y,rx:19+r()*20,ry:12+r()*17,phase:r()*6}];
 for(let i=0,n=2+Math.floor(r()*4);i<n;i++){const x=25+r()*(W-50),y=25+r()*(H-50);if(w.cities.every(z=>Math.hypot(z.x-x,z.y-y)>z.r+45)&&Math.hypot(x-300,y-298)>60)w.lakes.push({x,y,rx:9+r()*23,ry:7+r()*18,phase:r()*6});}
 w.lake=w.lakes[0];
}
function hash(x,y,seed){let n=Math.imul(x,374761393)^Math.imul(y,668265263)^seed;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
function noise(x,y,seed){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,s=fx*fx*(3-2*fx),t=fy*fy*(3-2*fy),a=hash(ix,iy,seed)*(1-s)+hash(ix+1,iy,seed)*s,b=hash(ix,iy+1,seed)*(1-s)+hash(ix+1,iy+1,seed)*s;return a*(1-t)+b*t;}
export function surfaceTile(w,x,y){
 for(const l of w.lakes){const dx=(x-l.x)/l.rx,dy=(y-l.y)/l.ry,angle=Math.atan2(dy,dx);if(dx*dx+dy*dy<1+.16*Math.sin(angle*5+l.phase)+.09*Math.cos(angle*9+l.phase))return 2;}
 const across=w.river.axis==='horizontal'?y:x,along=w.river.axis==='horizontal'?x:y;
 if(Math.abs(across-w.riverX(along))<3.5+1.7*Math.sin(along*.027+w.river.phase))return 4;
 const moisture=noise(x/48,y/48,w.biomeSeed),height=noise(x/74+18,y/74,w.biomeSeed+71);
 return height>.69?10:moisture<.32+(w.climate-.5)*.12?8:moisture>.73?9:0;
}
export function generateRoads(w,road,r){
 // A spanning tree gives each region a different backbone. Extra links form loops.
 const nodes=[...w.cities,{id:'cathedral',x:300,y:313,rx:10,ry:10}],connected=[nodes[0]],remaining=nodes.slice(1),edges=[];
 while(remaining.length){let choice,best=Infinity;for(const a of connected)for(const b of remaining){const d=Math.hypot(a.x-b.x,a.y-b.y)*(1+r()*.18);if(d<best){best=d;choice=[a,b];}}edges.push(choice);connected.push(choice[1]);remaining.splice(remaining.indexOf(choice[1]),1);}
 if(r()<.8)edges.push([nodes[1],nodes[2]]);
 const outside=(z,t)=>{if(z.id==='cathedral')return [300,313];const dx=t.x-z.x,dy=t.y-z.y;return Math.abs(dx)>Math.abs(dy)?[z.x+Math.sign(dx)*(z.rx+7),z.y]:[z.x,z.y+Math.sign(dy)*(z.ry+7)];};
 for(const [i,[a,b]]of edges.entries()){
  const from=outside(a,b),to=outside(b,a),bends=[];
  for(let k=1;k<=3;k++){let x=Math.round(from[0]+(to[0]-from[0])*k/4+(r()-.5)*45),y=Math.round(from[1]+(to[1]-from[1])*k/4+(r()-.5)*45);for(const z of w.cities)if(Math.abs(x-z.x)<z.rx+8&&Math.abs(y-z.y)<z.ry+8){x=z.x+Math.sign(x-z.x||1)*(z.rx+9);}bends.push([x,y]);}
  road([[a.x,a.y],from,...bends,to,[b.x,b.y]]);if(i<3)Object.assign(w.territories[i],point(...bends[1]));
 }
 for(const z of w.places.filter(z=>!['cathedral','oak','salt','north','lake','grove'].includes(z.id))){const candidates=w.roads.flat().filter(p=>w.cities.every(c=>Math.hypot(c.x-p[0],c.y-p[1])>c.r+9));const near=candidates.sort((a,b)=>Math.hypot(a[0]-z.x,a[1]-z.y)-Math.hypot(b[0]-z.x,b[1]-z.y))[0]||[300,313];road([near,[Math.round((near[0]+z.x)/2+(r()-.5)*35),Math.round((near[1]+z.y)/2)],[z.x,z.y]]);}
 const camp=w.places.find(z=>z.id==='thorn');Object.assign(w.territories[3],point(camp.x,camp.y));
}
export function generateCity(w,z,clear,r){
 const {rx,ry}=z,base=w.buildings.length,occupied=new Set(),street=new Set(),key=(x,y)=>y*W+x;
 const inside=(x,y,pad=0)=>{const dx=Math.abs(x-z.x),dy=Math.abs(y-z.y);return dx<rx-pad&&dy<ry-pad&&(z.archetype!=='market'||dx+dy<rx+ry-10-pad*2);};
 const reserve=(b,pad=1)=>{for(let y=b.y-pad;y<b.y+b.h+pad;y++)for(let x=b.x-pad;x<b.x+b.w+pad;x++)occupied.add(key(x,y));};
 const add=(b,physical=b)=>{b.city=z.id;b.palette=z.palette;w.buildings.push(b);reserve(physical);};
 clear(z.x-rx-1,z.y-ry-1,rx*2+3,ry*2+3,0);
 for(let y=z.y-ry;y<=z.y+ry;y++){
  let run=null;
  for(let x=z.x-rx;x<=z.x+rx+1;x++){
   const wall=inside(x,y)&&![[1,0],[-1,0],[0,1],[0,-1]].every(([dx,dy])=>inside(x+dx,y+dy))&&Math.abs(x-z.x)>4&&Math.abs(y-z.y)>4;
   if(wall&&run===null)run=x;if(!wall&&run!==null){add({x:run,y,w:x-run,h:1,type:'wall'});run=null;}
  }
 }
 for(const sx of [-1,1])for(const sy of [-1,1])add({x:z.x+sx*(rx-2)-1,y:z.y+sy*(ry-(z.archetype==='market'?12:2))-1,w:3,h:3,type:'tower'});
 const carve=(x,y,width=3)=>{clear(x-Math.floor(width/2),y-Math.floor(width/2),width,width,3);for(let dy=-Math.floor(width/2);dy<=Math.floor(width/2);dy++)for(let dx=-Math.floor(width/2);dx<=Math.floor(width/2);dx++)street.add(key(x+dx,y+dy));};
 for(let y=z.y-ry;y<=z.y+ry;y++)carve(z.x,y,7);
 for(let x=z.x-rx;x<=z.x+rx;x++)carve(x,z.y,7);
 const plaza=z.archetype==='fortress'?6:8;clear(z.x-plaza,z.y-plaza,plaza*2+1,plaza*2+1,3);
 for(let y=z.y-plaza-1;y<=z.y+plaza+1;y++)for(let x=z.x-plaza-1;x<=z.x+plaza+1;x++)street.add(key(x,y));
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
 if(z.archetype==='canal'){
  canalX=z.x+(r()<.5?-11:11);for(let y=z.y-ry-1;y<=z.y+ry+1;y++)for(let x=canalX-1;x<=canalX+1;x++){const i=key(x,y);w.tiles[i]=Math.abs(y-z.y)<5||lanesY.some(d=>Math.abs(y-z.y-d)<3)?5:4;occupied.add(i);}
 }
 const fits=b=>{for(let y=b.y-1;y<=b.y+b.h+1;y++)for(let x=b.x-1;x<=b.x+b.w;x++)if(!inside(x,y,2)||occupied.has(key(x,y))||street.has(key(x,y)))return false;return true;};
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
  for(const p of lots){const b={...p,w:width,h:height,type,name};if(!fits(b))continue;const physical={...b};if(['smith','inn','warehouse','apothecary'].includes(type)){b.y+=2;b.h-=2;}add(b,physical);clear(physical.x-1,physical.y-1,physical.w+2,physical.h+3,3);return b;}return null;
 };
 for(const [type,name]of shuffle(r,[['smith','Кузница '+pick(r,['Искра','Железный зуб','Три молота','Уголь и сталь'])],['inn',pick(r,['Трактир «Слепой лис»','Трактир «Медная сова»','Трактир «Семь бочек»','Трактир «Белый олень»'])],['warehouse','Склад '+pick(r,['гильдии','дорожной стражи','торгового двора'])],['apothecary','Лавка '+pick(r,['Мяты','Тысячелистника','Старой ивы','Зелёного листа'])]])){if(!place(type,name))throw new Error('City generation: no workshop lot '+z.id+' '+type);}
 let houses=0;const target=14+Math.floor(r()*12);for(let i=0;i<target;i++)if(place('house',null,5+Math.floor(r()*3),5+Math.floor(r()*2)))houses++;
 for(let i=houses;i<14;i++)if(place('house',null,5,5))houses++;
 // A cramped core grows a small suburb beyond its northern gate instead of losing housing.
 if(houses<14){z.suburb=true;for(const dx of [-23,-15,-7,7,15,23]){if(houses>=14)break;const b={x:z.x+dx,y:z.y-ry-10,w:5,h:5,type:'house'};add(b);clear(b.x-1,b.y-1,7,8,3);houses++;}w.districts.push({name:'ПРЕДМЕСТЬЕ',...point(z.x,z.y-ry-10),city:z.id});}
 z.houseCount=houses;z.layoutName={fortress:'Крепостной город',canal:'Город каналов',market:'Торговый посад'}[z.archetype];
 for(const [dx,dy]of [[-5,-5],[5,-5],[-5,5],[5,5]])add({x:z.x+dx,y:z.y+dy,w:2,h:1,type:'stall'});
 w.districts.push({name:z.layoutName.toUpperCase(),...point(z.x,z.y-9),city:z.id},{name:'РЫНОЧНАЯ ПЛОЩАДЬ',...point(z.x,z.y),city:z.id},{name:'ДВОР ЦИТАДЕЛИ',...point(castle.x+7,castle.y+11),city:z.id},{name:'ЖИЛЫЕ УЛИЦЫ',...point(z.x-rx+12,z.y+ry-7),city:z.id},{name:z.archetype==='canal'?'МОСТОВАЯ СЛОБОДА':'РЕМЕСЛЕННАЯ СЛОБОДА',...point(z.x+rx-12,z.y+ry-7),city:z.id},{name:'ГЛАВНЫЕ ВРАТА',...point(z.x,z.y+ry-1),city:z.id});
 clear(z.x-rx+3,z.y+ry+4,15,8,6);clear(z.x+rx-17,z.y+ry+4,14,8,6);
 z.gates=[[0,ry-2],[0,-ry+2],[-rx+2,0],[rx-2,0]];
 z.fishing=point(z.x+rx+7,z.y+14);z.lumber=point(z.x-rx-10,z.y+6);z.hunt=point(z.x-rx-14,z.y+19);z.mine=point(z.x+rx+12,z.y-12);
 clear(z.x+rx+8,z.y+10,8,9,2);clear(z.x+rx+6,z.y+11,2,7,0);
 w.warehouses[z.id]={gold:650,ration:45,fish:z.specialty==='fish'?45:10,log:z.specialty==='log'?60:15,ore:z.specialty==='ore'?60:15,hide:12,herb:12,bait:100,arrow:150};
 z.buildingCount=w.buildings.length-base;
}
