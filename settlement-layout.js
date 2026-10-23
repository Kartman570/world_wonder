import {W,H,TILE,point} from './content.js';
import {settlementInside} from './settlement-shapes.js';
import {gatePlan,gateTile,gateOpening,townWorkRoads} from './settlements.js';
const names={smith:'Кузница',cook:'Трактир',herbalist:'Травная лавка',tailor:'Ткацкая мастерская',farmer:'Фермерская лавка',armorer:'Оружейная палата',bowyer:'Мастер луков',leatherworker:'Кожевенная мастерская',provisioner:'Лавка припасов'};
const shopType={cook:'inn',herbalist:'apothecary',farmer:'farmshop',armorer:'armory',bowyer:'bowshop',leatherworker:'leatherworks',provisioner:'provisions'};
export function generateSettlement(w,z,clear,r){
 gatePlan(w,z,r);const occupied=new Set(),streets=new Set(),footprints=new Set(),buildings=[],key=(x,y)=>y*W+x,inside=(x,y,pad=0)=>settlementInside(z,x,y,pad);
 for(let y=z.y-z.ry;y<=z.y+z.ry;y++)for(let x=z.x-z.rx;x<=z.x+z.rx;x++)if(inside(x,y))w.tiles[key(x,y)]=0;
 const carve=(x,y,width=2)=>{x=Math.round(x);y=Math.round(y);for(let dy=-Math.floor(width/2);dy<=Math.floor(width/2);dy++)for(let dx=-Math.floor(width/2);dx<=Math.floor(width/2);dx++)if(inside(x+dx,y+dy)){w.tiles[key(x+dx,y+dy)]=3;streets.add(key(x+dx,y+dy));}};
 const line=(a,b,width=2)=>{const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*2);for(let j=0;j<=n;j++)carve(a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n,width);};
 const plaza=z.kind==='capital'?10:z.kind==='town'?7:4;
 for(let y=z.y-plaza;y<=z.y+plaza;y++)for(let x=z.x-plaza;x<=z.x+plaza;x++)carve(x,y,1);
 // Search over the actual settlement outline, so concave forms never cut through their own wall.
 const path=(from,to,avoid=true)=>{const sx=Math.round(from.x),sy=Math.round(from.y),tx=Math.round(to.x),ty=Math.round(to.y),start=key(sx,sy),goal=key(tx,ty),queue=[start],prev=new Map([[start,-1]]);for(let j=0;j<queue.length;j++){const i=queue[j];if(i===goal){const route=[];for(let n=i;n!==-1;n=prev.get(n))route.push([n%W,Math.floor(n/W)]);return route.reverse();}const x=i%W,y=Math.floor(i/W);for(const [dx,dy]of [[1,0],[0,1],[-1,0],[0,-1]]){const xx=x+dx,yy=y+dy,n=key(xx,yy);if(!prev.has(n)&&inside(xx,yy)&&(!avoid||!footprints.has(n))){prev.set(n,i);queue.push(n);}}}return null;};
 for(const g of z.gatePlan){const route=path(g,z,false);if(route)for(const [x,y]of route)carve(x,y,5);}
 if(z.streetPattern==='rings'){for(const radius of [.38,.69]){let prev;for(let a=0;a<=Math.PI*2+.05;a+=.06){const p=[z.x+Math.cos(a)*z.rx*radius,z.y+Math.sin(a)*z.ry*radius];if(prev)line(prev,p,1);prev=p;}}}
 else if(z.streetPattern==='lanes'){for(const f of [-.57,-.25,.28,.61])line([z.x+z.rx*f,z.y-z.ry*.85],[z.x+z.rx*f,z.y+z.ry*.85],1);for(const f of [-.52,.52])line([z.x-z.rx*.85,z.y+z.ry*f],[z.x+z.rx*.85,z.y+z.ry*f],1);}
 else if(z.streetPattern==='winding'){for(const side of [-1,1]){let prev;for(let y=-z.ry*.85;y<z.ry*.85;y++){const p=[z.x+side*z.rx*.45+Math.sin(y*.08+z.shapePhase)*6,z.y+y];if(prev)line(prev,p,1);prev=p;}}}
 else for(const side of [-1,1]){line([z.x-z.rx*.8,z.y+side*z.ry*.58],[z.x+z.rx*.8,z.y-side*z.ry*.58],1);}
 const add=(b)=>{b.city=z.id;b.style={...z.style};b.palette=z.palette;buildings.push(b);w.buildings.push(b);for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++)footprints.add(key(x,y));for(let y=b.y-1;y<=b.y+b.h+1;y++)for(let x=b.x-1;x<=b.x+b.w+1;x++)occupied.add(key(x,y));return b;};
 const fit=(b,relax)=>{for(let y=b.y-1;y<=b.y+b.h+1;y++)for(let x=b.x-1;x<=b.x+b.w+1;x++)if(!inside(x,y,2)||occupied.has(key(x,y))||(!relax&&streets.has(key(x,y)))||(Math.abs(x-z.x)<plaza+2&&Math.abs(y-z.y)<plaza+2))return false;return true;};
 if(z.fortified)for(const g of z.gatePlan){const [dx,dy]=g.side==='N'||g.side==='S'?[7,0]:[0,7];for(const side of [-1,1])for(let y=g.y+dy*side-2;y<=g.y+dy*side+1;y++)for(let x=g.x+dx*side-2;x<=g.x+dx*side+1;x++)occupied.add(key(x,y));}
 const lots=[];for(let y=z.y-z.ry+4;y<z.y+z.ry-8;y+=1)for(let x=z.x-z.rx+4;x<z.x+z.rx-8;x++)lots.push({x,y});for(let j=lots.length-1;j;j--){const k=Math.floor(r()*(j+1));[lots[j],lots[k]]=[lots[k],lots[j]];}
 const place=(type,name,width=7,height=7,required=true)=>{for(const relax of [false,true])for(const p of lots){const b={...p,w:width,h:height,type,name};if(fit(b,relax))return add(b);}if(required)throw new Error('No '+type+' lot '+w.seed+' '+z.kind+' '+z.pattern);return null;};
 let castle;if(z.kind==='capital'){castle=place('castle','Замок '+z.name,16,12);place('barracks','Казармы городской стражи',12,9);place('barracks','Двор лучников',10,8);}
 else if(z.kind==='town')place('townhall','Ратуша '+z.name,9,7);
 const originalLots=[...lots];if(castle)lots.sort((a,b)=>Math.hypot(a.x-castle.x,a.y-castle.y)-Math.hypot(b.x-castle.x,b.y-castle.y));place(z.kind==='village'?'cage':'prison',z.kind==='capital'?'Королевская тюрьма':z.kind==='village'?'Сельская клетка':'Городской острог',z.kind==='capital'?17:z.kind==='village'?5:9,z.kind==='capital'?14:z.kind==='village'?7:8);lots.splice(0,lots.length,...originalLots);
 const stock=place('warehouse',z.isVillage?'Общий амбар':'Городские склады',z.isVillage?6:8,z.isVillage?6:7);
 for(const role of z.traderRoles){const b=place(shopType[role]||role,(names[role]||role)+' «'+['У трёх сосен','Медный ключ','Белый камень','Старая липа','Семь дорог'][Math.floor(r()*5)]+'»');b.traderRole=role;}
 const min=z.kind==='capital'?38:z.kind==='town'?16:7,target=min+Math.floor(r()*(z.kind==='capital'?16:z.kind==='town'?9:5));let houses=0;
 for(let j=0;j<target;j++){const b=place('house','Жилой дом',z.isVillage?5:5+Math.floor(r()*3),z.isVillage?5:5+Math.floor(r()*2),false);if(b)houses++;}
 for(let j=houses;j<min;j++){const b=place('house','Жилой дом',5,5,false);if(b)houses++;}
 for(let j=houses;j<min;j++){if(place('house','Малый дом',4,5,false))houses++;}
 for(let j=houses;j<min;j++){if(place('house','Дом у острога',4,4,false))houses++;}
 if(houses<min)throw new Error('Insufficient homes '+w.seed+' '+z.kind+': '+houses);
 for(const b of buildings){const door={x:b.x+Math.floor(b.w/2),y:b.y+b.h+1},route=path(door,z);if(!route)throw new Error('Disconnected building '+b.type+' '+w.seed);for(const [x,y]of route)if(!footprints.has(key(x,y)))carve(x,y,1);for(let y=b.y-1;y<b.y+b.h+2;y++)for(let x=b.x-1;x<b.x+b.w+1;x++)if(inside(x,y)&&!footprints.has(key(x,y)))w.tiles[key(x,y)]=3;}
 // Compact workshops are already full-height, unlike legacy street-front rooms.
 for(const b of buildings)b.fullRoom=true;
 if(z.fortified){let last;for(const p of z.wallBoundary){if(gateOpening(z,p.x,p.y))continue;const b={x:p.x,y:p.y,w:1,h:1,type:'wall',city:z.id,style:{...z.style}};if(last&&last.y===b.y&&last.x+last.w===b.x)last.w++;else {w.buildings.push(b);last=b;}}for(const g of z.gatePlan){const [dx,dy]=g.side==='N'||g.side==='S'?[7,0]:[0,7];for(const side of [-1,1])w.buildings.push({x:g.x+dx*side-1,y:g.y+dy*side-1,w:2,h:2,type:'tower',city:z.id,style:{...z.style}});}}
 const decor=(type,x,y)=>w.buildings.push({x,y,w:1,h:1,type,city:z.id,style:{...z.style}});
 if(z.kind==='capital')for(const [dx,dy]of [[-7,-7],[7,-7],[-7,7],[7,7]])decor('statue',z.x+dx,z.y+dy);
 for(const g of z.gatePlan)decor('cityFlag',g.x+1,g.y+1);decor('cityFlag',z.x+plaza-1,z.y-plaza+1);
 z.houseCount=houses;z.layoutName={capital:'Королевский город',town:'Город ремесленников',village:'Деревня'}[z.kind]+' · '+{oval:'овальный',organic:'неровный контур',twin:'два посада',terraces:'уступчатый',spindle:'вытянутый',fan:'веерный',rounded:'скруглённый'}[z.pattern];
 for(const [name,x,y]of [[z.layoutName,z.x,z.y-plaza-3],['ЦЕНТРАЛЬНАЯ ПЛОЩАДЬ',z.x,z.y],['ЖИЛЫЕ КВАРТАЛЫ',z.x-z.rx*.4,z.y+z.ry*.4],['РЫНОК',z.x+z.rx*.3,z.y],['ГЛАВНЫЕ ВРАТА',z.primaryGate.x,z.primaryGate.y],['СКЛАДЫ',stock.x,stock.y]])w.districts.push({name,...point(x,y),city:z.id});
 if(castle)w.districts.push({name:'КОРОЛЕВСКИЙ ДВОР',...point(castle.x+8,castle.y+13),city:z.id});
 z.hunt=point(z.x-z.rx-14,z.y+19);z.mine=point(z.x+z.rx+12,z.y-12);townWorkRoads(w,z);
 w.warehouses[z.id]={gold:z.kind==='capital'?1400:650,ration:45,fish:15,log:40,ore:30,hide:20,herb:20,fiber:45,bait:100,arrow:150};z.buildingCount=buildings.length;
}
