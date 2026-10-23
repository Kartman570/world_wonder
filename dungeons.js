import {prepareRooms} from './interiors.js';
import {W,H,TILE,point} from './content.js';
import * as previous from './dungeons-v2.js';
export const DUNGEON_TEMPLATES={caves:'Естественные пещеры',catacombs:'Катакомбы',ruins:'Руины'};
export function placeDungeonEntrances(w,r){
 previous.placeDungeonEntrances(w,r);
 if(w.generatorVersion<3)return;
 const names={caves:['Глотка горы','Пещеры глухого эха','Норы Серого клыка'],catacombs:['Усыпальница семи домов','Катакомбы изгнанников','Крипта безымянных'],ruins:['Затопленные чертоги','Обрушенный некрополь','Руины подземного монастыря']};
 for(const [i,d]of w.dungeonEntrances.entries()){d.template=['caves','catacombs','ruins'][i%3];d.layoutVersion=2;d.name=names[d.template].splice(Math.floor(r()*names[d.template].length),1)[0]||DUNGEON_TEMPLATES[d.template];if(w.generatorVersion>=5&&d.template!=='caves'&&d.kind!=='underwater'){const tx=Math.floor(d.x/TILE),ty=Math.floor(d.y/TILE),b={x:tx-3,y:ty-4,w:7,h:7,type:'dungeonGate',name:(d.template==='ruins'?'Разрушенный храм':'Вход в крипту')+' · '+d.name,ruined:d.template==='ruins',dungeon:d.id};prepareRooms([b]);b.id=w.buildings.length+1;d.buildingId=b.id;w.buildings.push(b);for(let y=b.y-1;y<=b.y+b.h+1;y++)for(let x=b.x-1;x<=b.x+b.w;x++)if(x>0&&y>0&&x<W&&y<H&&!w.riverMask[y*W+x])w.tiles[y*W+x]=3;for(const t of w.treesNear(d,270)){t.hidden=true;t.wood=0;}}}if(w.generatorVersion>=5)w.rasterizeBuildings();
}
export function generateDungeonMap(w,r){
 const spec=w.dungeonSpec;if(!spec.layoutVersion)return previous.generateDungeonMap(w,r);
 const template=spec.template||'caves',natural=template==='caves';w.templateName=DUNGEON_TEMPLATES[template];
 w.cities=[];w.territories=[];w.places=[];w.dungeonEntrances=[];w.tiles=new Uint8Array(W*H).fill(natural?7:11);w.solids=new Uint8Array(W*H).fill(1);w.depth=new Uint8Array(W*H);w.trees=[];w.treeChunks=new Map();w.decor=[];w.dungeonDecor=[];w.buildings=[];w.districts=[];w.resources=[];w.roads=[];w.landmarks=[];w.library=point(-1000,-1000);w.chest=w.library;
 const carve=(x,y,tile=natural?13:12)=>{x=Math.floor(x);y=Math.floor(y);if(x<=3||y<=3||x>=W-3||y>=H-3)return;const i=y*W+x;w.tiles[i]=tile;w.solids[i]=0;};
 const ellipse=(x,y,rx,ry,tile)=>{for(let yy=Math.floor(y-ry);yy<=y+ry;yy++)for(let xx=Math.floor(x-rx);xx<=x+rx;xx++)if(((xx-x)/rx)**2+((yy-y)/ry)**2<1)carve(xx,yy,tile);};
 const rooms=[{x:27,y:28,rx:6,ry:5,section:natural?'cave':'masonry'}];
 for(let attempt=0;rooms.length<spec.rooms&&attempt<10000;attempt++){
  const room={x:18+Math.floor(r()*183),y:18+Math.floor(r()*145),rx:4+Math.floor(r()*6),ry:4+Math.floor(r()*5)};
  if(rooms.every(a=>Math.abs(a.x-room.x)>a.rx+room.rx+4||Math.abs(a.y-room.y)>a.ry+room.ry+4)){room.section=natural?'cave':template==='ruins'&&rooms.length%3!==0?(rooms.length%3===1?'collapse':'flooded'):'masonry';rooms.push(room);}
 }
 for(const room of rooms){
  if(room.section==='masonry')for(let y=room.y-room.ry;y<=room.y+room.ry;y++)for(let x=room.x-room.rx;x<=room.x+room.rx;x++)carve(x,y,12);
  else {ellipse(room.x,room.y,room.rx+1,room.ry+1,room.section==='collapse'?14:13);ellipse(room.x,room.y,room.rx-1,room.ry-1,13);for(let i=0;i<3;i++)ellipse(room.x+(r()-.5)*room.rx,room.y+(r()-.5)*room.ry,room.rx*(.5+r()*.35),room.ry*(.5+r()*.35),13);}
 }
 const edges=[],connected=[0],remaining=rooms.slice(1).map((_,i)=>i+1);
 while(remaining.length){let best=Infinity,edge;for(const a of connected)for(const b of remaining){const d=Math.hypot(rooms[a].x-rooms[b].x,rooms[a].y-rooms[b].y)*(1+r()*.2);if(d<best){best=d;edge=[a,b];}}edges.push(edge);connected.push(edge[1]);remaining.splice(remaining.indexOf(edge[1]),1);}
 for(let i=0;i<Math.floor(rooms.length/4);i++){const a=Math.floor(r()*rooms.length),b=Math.floor(r()*rooms.length);if(a!==b&&!edges.some(e=>e.includes(a)&&e.includes(b)))edges.push([a,b]);}
 w.corridorMask=new Uint8Array(W*H);
 for(const [a,b]of edges){let x=rooms[a].x,y=rooms[a].y;const dest=rooms[b],horizontal=r()<.5;let steps=0;const rough=natural||template==='ruins'&&rooms[a].section!=='masonry'&&rooms[b].section!=='masonry';
  while(true){
   const tile=rough?13:12;
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){carve(x+dx,y+dy,tile);w.corridorMask[(y+dy)*W+x+dx]=1;}
   if(rough&&steps%4===0)ellipse(x,y,2.5,2.2,tile);
   if(x===dest.x&&y===dest.y)break;
   if(rough){if((r()<.55&&x!==dest.x)||y===dest.y)x+=Math.sign(dest.x-x);else y+=Math.sign(dest.y-y);}
   else if(horizontal?(x!==dest.x):(y===dest.y))x+=Math.sign(dest.x-x);else y+=Math.sign(dest.y-y);
   steps++;
  }
 }
 // Lakes leave dry causeways through every primary corridor and a shoreline around each chamber.
 for(const room of rooms.filter(room=>room.section==='flooded')){
  room.lake={x:room.x+1,y:room.y,rx:Math.max(2,room.rx-2),ry:Math.max(2,room.ry-2)};
  const l=room.lake;for(let y=room.y-room.ry;y<=room.y+room.ry;y++)for(let x=room.x-room.rx;x<=room.x+room.rx;x++){const i=y*W+x;if(!w.solids[i]&&((x-l.x)/l.rx)**2+((y-l.y)/l.ry)**2<1)w.tiles[i]=w.corridorMask[i]?5:2;}
 }
 // Natural rock appears around the breaches, while surviving crypt walls retain brickwork.
 for(let y=4;y<185;y++)for(let x=4;x<222;x++){const i=y*W+x;if(w.solids[i]&&[i-1,i+1,i-W,i+W].some(n=>[13,14].includes(w.tiles[n])))w.tiles[i]=7;}
 const decorate=(room,kind,dx,dy,solid=true)=>{const x=room.x+dx,y=room.y+dy,i=y*W+x;if(w.solids[i]||w.corridorMask[i]||[2,5].includes(w.tiles[i]))return;w.dungeonDecor.push({kind,x,y,w:1,h:1,solid});if(solid)w.solids[i]=1;};
 for(const [i,room]of rooms.entries()){
  if(room.section==='masonry'){decorate(room,i%2?'sarcophagus':'shelf',-room.rx+2,-room.ry+2);decorate(room,'urn',room.rx-2,-room.ry+2);decorate(room,'table',-room.rx+2,room.ry-2);}
  else {decorate(room,room.section==='collapse'?'fallenColumn':'stalagmite',-room.rx+2,-room.ry+2);decorate(room,'stalagmite',room.rx-2,room.ry-2);}
  if(i>0&&i%4===0)w.landmarks.push({id:'cache-'+i,name:room.section==='masonry'?'Погребальный ларец':'Тайник под обвалом',...point(room.x+.5,room.y+.5),inventory:{gold:15+Math.floor(r()*50),arrow:5+Math.floor(r()*12),ration:1+Math.floor(r()*3),ore:2+Math.floor(r()*5)}});
 }
 w.rooms=rooms;w.tunnelEdges=edges;w.dungeonBounds={x:4,y:4,w:218,h:181};w.spawn=point(rooms[0].x+.5,rooms[0].y+.5);Object.assign(w.player,w.spawn);w.dungeonExit={id:'exit',...w.spawn,name:'Лестница на поверхность'};w.places=[{id:'exit',name:'Выход на поверхность',x:rooms[0].x+.5,y:rooms[0].y+.5,r:4}];
 w.walls=w.solids.slice();w.explored=new Uint8Array(W*H);w.visibleCells=new Uint8Array(W*H);w.revealCell=null;
}
export function populateDungeon(w){previous.populateDungeon(w);}
export const revealDungeon=previous.revealDungeon;
