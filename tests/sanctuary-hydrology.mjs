import assert from 'node:assert/strict';
import {World,TILE,W,dist} from '../simulation.js';
import {resolveInteraction} from '../interactions.js';
function segmentDistance(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.y-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a[0]-t*dx,p.y-a[1]-t*dy);}
let bridgeRepairs=0;
for(let seed=0;seed<24;seed++){
 const w=new World('hydrology-'+seed),z=w.places.find(z=>z.id==='cathedral');bridgeRepairs+=w.hydrology.repairedRoadTiles;
 for(let i=0;i<w.tiles.length;i++)if(w.roadMask[i]){assert.ok(![2,4].includes(w.tiles[i]),`${seed}: размыт тракт ${i%W}, ${Math.floor(i/W)}`);const x=i%W,y=Math.floor(i/W),local=w.cities.some(z=>Math.abs(x-z.x)<=z.rx+1&&Math.abs(y-z.y)<=z.ry+1)||Math.abs(x-z.x)<=26&&Math.abs(y-z.y)<=24;if(!local)assert.ok([1,3,5].includes(w.tiles[i]),'Разрыв дорожного покрытия');}
 for(const city of w.cities)for(let y=city.y-city.ry;y<=city.y+city.ry;y++)for(let x=city.x-city.rx;x<=city.x+city.rx;x++)if([2,4].includes(w.tile(x,y)))assert.ok(city.waterway&&(city.waterway.axis==='horizontal'?Math.abs(y-city.waterway.y)<=1:Math.abs(x-city.waterway.x)<=1),`${seed}: случайная вода в городе`);
 assert.ok(w.mainRoads.every(road=>road.slice(1).every((b,i)=>segmentDistance(z,road[i],b)>=50)),'Собор не должен стоять на магистрали');
 assert.deepEqual(w.cathedralRoad.at(-1),[z.x,z.y+22]);assert.equal(w.interiorAt(w.player),null);assert.deepEqual({x:w.player.x,y:w.player.y},w.spawn);assert.equal(w.blocked(w.player.x,w.player.y),false);
 for(const room of w.buildings.filter(b=>b.sanctuary&&b.enterable))assert.ok(w.path(w.spawn,room.workSpot).length,`${seed}: крыло собора недостижимо`);
}
assert.ok(bridgeRepairs>0,'Тестовые зерна должны содержать перезапись дороги поздней водой');
console.log('✓ В 24 мирах дороги не затоплены, городская вода только в руслах, собор стоит в стороне и имеет отдельный подъезд');
const w=new World('sanctuary-tour');
assert.equal(w.libraryShelves.length,4);assert.equal(w.pedestals.length,3);assert.deepEqual(w.relicVault,{});
for(const shelf of w.libraryShelves){Object.assign(w.player,shelf);assert.equal(resolveInteraction(w).kind,'libraryShelf');assert.equal(resolveInteraction(w).obj.tab,shelf.tab);assert.ok(w.path(w.spawn,shelf).length);}
const dummies=w.entities.filter(e=>e.role==='dummy'),positions=dummies.map(e=>({x:e.x,y:e.y}));assert.equal(dummies.filter(e=>e.moving).length,2);assert.equal(dummies.filter(e=>!e.moving).length,2);
w.entities=dummies;w.rebuildSpatial();for(let i=0;i<80;i++)w.update(.15);
for(const [i,e]of dummies.entries()){assert.equal(dist(e,positions[i])>1,!!e.moving);assert.equal(w.interiorAt(e)?.type,'training');}
Object.assign(w.player,w.wizardSpot);w.player.inventory.relic=1;w.player.inventory.moonRelic=1;const cash=w.player.inventory.gold,result=w.depositRelics();assert.equal(result.reward,300);assert.equal(w.player.inventory.gold,cash+300);assert.equal(w.player.inventory.relic,0);assert.equal(w.relicVault.relic,1);assert.equal(w.relicVault.moonRelic,1);assert.equal(w.relicVault.tideRelic,undefined);assert.equal(w.depositRelics().count,0);
const restored=World.restore(w.save());assert.deepEqual(restored.relicVault,w.relicVault);assert.deepEqual(restored.spawn,w.spawn);assert.deepEqual(restored.libraryShelves,w.libraryShelves);
console.log('✓ Полки открывают разные разделы, движущиеся манекены ходят внутри зала, реликвии действительно переносятся в хранилище пьедесталов');
for(const template of ['caves','catacombs','ruins']){
 for(let seed=0;seed<3;seed++){
  const spec={id:'test-'+template,name:template,template,layoutVersion:2,rooms:24,theme:seed,seed:template+'-'+seed},d=new World(spec.seed,{dungeonSpec:spec});
  assert.ok(d.rooms.length>=18);assert.ok(d.dungeonDecor.length>0);for(const room of d.rooms)assert.ok(d.path(d.spawn,{x:(room.x+.5)*TILE,y:(room.y+.5)*TILE}).length,`${template} ${seed}: комната отрезана`);
  if(template==='caves'){assert.ok(d.tiles.includes(13));assert.ok(!d.tiles.includes(12));}
  if(template==='catacombs'){assert.ok(d.tiles.includes(11)&&d.tiles.includes(12));assert.ok(!d.tiles.includes(13));assert.ok(d.dungeonDecor.some(f=>f.kind==='sarcophagus'));}
  if(template==='ruins'){for(const tile of [11,12,13,14,2,5])assert.ok(d.tiles.includes(tile),`${seed}: в руинах отсутствует тип ${tile}`);const i=d.tiles.findIndex(t=>t===2);assert.equal(d.terrain({x:(i%W+.5)*TILE,y:(Math.floor(i/W)+.5)*TILE}).water,true);}
  assert.deepEqual(World.restore(d.save()).tiles,d.tiles);
 }
}
console.log('✓ Пещеры, катакомбы и руины имеют разные тайлы и обстановку; обвалы, озёра и переправы сохраняют доступность камер');
const old=new World('previous-2',{generatorVersion:2});assert.deepEqual(World.restore(old.save()).tiles,old.tiles);console.log('✓ Старые поверхности и пещеры генератора 2 сохраняют прежнюю географию');
