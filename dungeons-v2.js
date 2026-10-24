import {W,H,TILE,point} from './content.js';
export function placeDungeonEntrances(w,r){
 const titles=['Глотка горы','Колодец без звёзд','Погребённый тракт','Норы Серого клыка','Расколотые копи','Шахта потерянных голосов','Пещеры чёрной воды','Катакомбы изгнанников','Логово костоломов','Провал старого леса'];
 const kinds=['road','forest','underwater','forest','road','forest','underwater','forest'];w.dungeonEntrances=[];
 for(let i=0;i<kinds.length;i++){
  const kind=kinds[i];let location;
  for(let attempt=0;attempt<8000;attempt++){
   let x,y;
   if(kind==='underwater'&&w.generatorVersion>=12&&!w.lakes.length){if(!w.riverPaths?.length)break;const river=w.riverPaths[Math.floor(r()*w.riverPaths.length)],p=river.points[Math.floor(r()*river.points.length)];x=Math.round(p[0]);y=Math.round(p[1]);}
   else if(kind==='underwater'){const l=w.lakes[Math.floor(r()*w.lakes.length)],angle=r()*Math.PI*2,rad=r()*.6;x=Math.floor(l.x+Math.cos(angle)*l.rx*rad);y=Math.floor(l.y+Math.sin(angle)*l.ry*rad);}
   else if(kind==='road'){const road=w.roads[Math.floor(r()*w.roads.length)],index=Math.floor(r()*(road.length-1)),a=road[index],b=road[index+1],t=r();x=Math.round(a[0]+(b[0]-a[0])*t+(r()<.5?-7:7));y=Math.round(a[1]+(b[1]-a[1])*t+(r()<.5?-6:6));}
   else {x=15+Math.floor(r()*(W-30));y=15+Math.floor(r()*(H-30));}
   if(x<8||y<8||x>W-8||y>H-8)continue;const tile=w.tile(x,y);
   if(w.cities.some(z=>Math.hypot(z.x-x,z.y-y)<z.r+40)||Math.hypot(x-(w.generatorVersion>=3?w.places.find(z=>z.id==='cathedral').x:300),y-(w.generatorVersion>=3?w.places.find(z=>z.id==='cathedral').y:298))<40||w.dungeonEntrances.some(d=>Math.hypot(d.x/TILE-x,d.y/TILE-y)<24)||w.blocked((x+.5)*TILE,(y+.5)*TILE,true))continue;
   if(kind==='underwater'?(w.generatorVersion>=12?![2,4].includes(tile):tile!==2):tile===2||tile===4)continue;
   if(kind==='forest'&&w.depth[y*W+x]<9)continue;
   location=point(x+.5,y+.5);break;
  }
  if(!location)continue;
  const d={id:'dungeon-'+i,name:titles.splice(Math.floor(r()*titles.length),1)[0],kind,...location,seed:w.seed+':dungeon:'+i,theme:i%3,rooms:18+Math.floor(r()*13)};w.dungeonEntrances.push(d);
  // Keep the portal readable without renumbering persistent trees.
  for(const t of w.treesNear(d,130)){t.hidden=true;t.wood=0;}
 }
}
export function generateDungeonMap(w,r){
 const spec=w.dungeonSpec;
 w.cities=[];w.territories=[];w.places=[];w.dungeonEntrances=[];w.tiles=new Uint8Array(W*H).fill(7);w.solids=new Uint8Array(W*H).fill(1);w.depth=new Uint8Array(W*H);w.trees=[];w.treeChunks=new Map();w.decor=[];w.buildings=[];w.districts=[];w.resources=[];w.roads=[];w.landmarks=[];w.library=point(-1000,-1000);w.chest=w.library;
 const floor=(x,y)=>{if(x>3&&y>3&&x<W-3&&y<H-3){const i=Math.floor(y)*W+Math.floor(x);w.tiles[i]=3;w.solids[i]=0;}};
 const ellipse=(x,y,rx,ry)=>{for(let yy=Math.floor(y-ry);yy<=y+ry;yy++)for(let xx=Math.floor(x-rx);xx<=x+rx;xx++)if(((xx-x)/rx)**2+((yy-y)/ry)**2<1)floor(xx,yy);};
 const rooms=[{x:27,y:28,rx:6,ry:5}];
 for(let attempt=0;rooms.length<spec.rooms&&attempt<5000;attempt++){
  const room={x:20+Math.floor(r()*145),y:20+Math.floor(r()*120),rx:4+Math.floor(r()*7),ry:4+Math.floor(r()*6)};
  if(rooms.every(a=>Math.hypot((a.x-room.x)/1.1,a.y-room.y)>a.rx+room.rx+5))rooms.push(room);
 }
 for(const room of rooms){if(spec.theme===0){for(let y=room.y-room.ry;y<=room.y+room.ry;y++)for(let x=room.x-room.rx;x<=room.x+room.rx;x++)floor(x,y);}else{ellipse(room.x,room.y,room.rx,room.ry);for(let i=0;i<3;i++)ellipse(room.x+(r()-.5)*room.rx,room.y+(r()-.5)*room.ry,room.rx*(.5+r()*.4),room.ry*(.5+r()*.4));}}
 const edges=[],connected=[0],remaining=rooms.slice(1).map((_,i)=>i+1);
 while(remaining.length){let best=Infinity,edge;for(const a of connected)for(const b of remaining){const d=Math.hypot(rooms[a].x-rooms[b].x,rooms[a].y-rooms[b].y)*(1+r()*.3);if(d<best){best=d;edge=[a,b];}}edges.push(edge);connected.push(edge[1]);remaining.splice(remaining.indexOf(edge[1]),1);}
 for(let i=0;i<Math.floor(rooms.length/5);i++){const a=Math.floor(r()*rooms.length),b=Math.floor(r()*rooms.length);if(a!==b&&!edges.some(e=>e.includes(a)&&e.includes(b)))edges.push([a,b]);}
 for(const [a,b]of edges){let x=rooms[a].x,y=rooms[a].y;const dest=rooms[b],width=1+Math.floor(r()*2);while(x!==dest.x||y!==dest.y){ellipse(x,y,width+1,width+1);if((r()<.53&&x!==dest.x)||y===dest.y)x+=Math.sign(dest.x-x);else y+=Math.sign(dest.y-y);}ellipse(x,y,width+1,width+1);}
 w.rooms=rooms;w.tunnelEdges=edges;w.dungeonBounds={x:5,y:5,w:180,h:155};w.spawn=point(rooms[0].x+.5,rooms[0].y+.5);Object.assign(w.player,w.spawn);
 w.dungeonExit={id:'exit',...w.spawn,name:'Лестница на поверхность'};w.places=[{id:'exit',name:'Выход на поверхность',x:rooms[0].x+.5,y:rooms[0].y+.5,r:4}];
 w.walls=w.solids.slice();w.explored=new Uint8Array(W*H);w.visibleCells=new Uint8Array(W*H);w.revealCell=null;
 for(const [i,room]of rooms.entries())if(i>0&&i%4===0){w.landmarks.push({id:'cache-'+i,name:['Сундук старателей','Тайник изгнанников','Забытые припасы'][spec.theme],...point(room.x+.5,room.y+.5),inventory:{gold:15+Math.floor(r()*50),arrow:5+Math.floor(r()*12),ration:1+Math.floor(r()*3),ore:2+Math.floor(r()*5)}});}
}
export function populateDungeon(w){
 for(const [i,room]of w.rooms.entries())if(i&&Math.hypot(room.x-w.rooms[0].x,room.y-w.rooms[0].y)>15){
  const roles=w.dungeonSpec.theme===0?['bandit','banditArcher','brute']:w.dungeonSpec.theme===1?['caveSpider','caveBat','wolf']:['bandit','caveSpider','banditArcher'];
  for(let j=0,n=1+(i%3===0?1:0);j<n;j++){const e=w.safeSpawn(roles[(i+j)%roles.length],'underground',room.x+.5+j,room.y+.5);e.ambush={...e.home};if(!e.role.startsWith('cave'))e.inventory.ration=1;}
 }
}
export function revealDungeon(w){
 const px=Math.floor(w.player.x/TILE),py=Math.floor(w.player.y/TILE),key=py*W+px;if(w.revealCell===key)return;w.revealCell=key;w.visibleCells.fill(0);
 for(let y=Math.max(0,py-10);y<=py+10;y++)for(let x=Math.max(0,px-10);x<=px+10;x++)if(x<W&&y<H&&Math.hypot(x-px,y-py)<10&&w.lineClear(w.player,point(x+.5,y+.5))){const i=y*W+x;w.visibleCells[i]=1;w.explored[i]=1;}
 const visible=w.visibleCells.slice();for(let y=Math.max(1,py-11);y<Math.min(H-1,py+12);y++)for(let x=Math.max(1,px-11);x<Math.min(W-1,px+12);x++){const i=y*W+x;if(w.solids[i]&&[i-1,i+1,i-W,i+W].some(n=>visible[n]&&!w.solids[n])){w.visibleCells[i]=1;w.explored[i]=1;}}
}
