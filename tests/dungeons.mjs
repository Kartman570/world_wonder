import assert from 'node:assert/strict';
import {World,W,H,TILE,dist} from '../simulation.js';
import {Expedition} from '../expedition.js';
import {resolveInteraction} from '../interactions.js';
const e=new Expedition(new World('under-the-roots')),surface=e.surface;
assert.equal(new Set(surface.cities.map(z=>z.archetype)).size,3);
assert.equal(new Set(surface.cities.map(z=>z.name)).size,3);
assert.ok(surface.cities.every(z=>z.houseCount>=(z.isVillage?7:12)));
assert.ok(surface.lakes.length>=2);assert.ok([8,9,10].every(t=>surface.tiles.includes(t)));
assert.ok(surface.dungeonEntrances.length>=6);for(const kind of ['road','forest','underwater'])assert.ok(surface.dungeonEntrances.some(d=>d.kind===kind));
for(const d of surface.dungeonEntrances){assert.ok(surface.cities.every(z=>dist(d,{x:z.x*TILE,y:z.y*TILE})>(z.r+40)*TILE));if(d.kind==='underwater')assert.equal(surface.tile(d.x/TILE,d.y/TILE),2);}
console.log('✓ Три разных типа городов, биомы, названия и удалённые входы трёх видов');
const entrance=surface.dungeonEntrances[0];assert.equal(e.enter(entrance.id).ok,false);Object.assign(surface.player,entrance);assert.equal(resolveInteraction(surface).kind,'dungeonEntrance');assert.equal(e.enter(entrance.id).ok,true);const cave=e.current;
assert.ok(cave.rooms.length>=18);assert.ok(cave.entities.length>=15);assert.equal(resolveInteraction(cave).kind,'dungeonExit');
const visited=new Uint8Array(W*H),queue=[Math.floor(cave.spawn.y/TILE)*W+Math.floor(cave.spawn.x/TILE)];visited[queue[0]]=1;for(let k=0;k<queue.length;k++){const i=queue[k];for(const n of [i-1,i+1,i-W,i+W])if(n>=0&&n<W*H&&!cave.solids[n]&&!visited[n]){visited[n]=1;queue.push(n);}}
assert.equal(queue.length,cave.solids.reduce((n,t)=>n+(t===0),0),'Все пещеры, ниши и туннели должны быть связаны');
const degree=new Map();for(const [a,b]of cave.tunnelEdges){degree.set(a,(degree.get(a)||0)+1);degree.set(b,(degree.get(b)||0)+1);}assert.ok([...degree.values()].some(n=>n>=3));assert.ok(cave.tunnelEdges.length>=cave.rooms.length);
assert.ok(cave.entities.every(n=>!cave.blocked(n.x,n.y)));assert.ok(cave.landmarks.every(l=>visited[Math.floor(l.y/TILE)*W+Math.floor(l.x/TILE)]));
const duplicate=new World(entrance.seed,{dungeonSpec:entrance});assert.deepEqual(cave.tiles,duplicate.tiles);assert.deepEqual(cave.tunnelEdges,duplicate.tunnelEdges);
console.log('✓ Пещеры связаны, есть развилки и циклы, враги и сундуки достижимы, генерация воспроизводима');
const fisher=surface.entities.find(n=>n.role==='fisher');Object.assign(fisher,fisher.work);fisher.timer=0;fisher.inventory.fish=0;surface.entities=[fisher];surface.rebuildSpatial();const elapsed=surface.elapsed;e.update(.15);assert.ok(surface.elapsed>elapsed);assert.equal(fisher.inventory.fish,1);assert.equal(surface.player,cave.player);assert.ok(!surface.nearby(entrance,100).some(n=>n.id==='player'));
assert.ok(cave.explored.some(n=>n));assert.ok(!cave.visibleFrom(cave.player,cave.entities.find(n=>dist(n,cave.player)>TILE*10)));
const enemy=cave.entities[0],loot={...enemy.inventory};cave.damage(cave.player,enemy,10000);assert.equal(enemy.hp<=0,true);const corpse=cave.corpses.find(c=>c.name===enemy.name);assert.deepEqual(corpse.inventory,loot);const chest=cave.landmarks[0];cave.loot(cave.player,chest);assert.deepEqual(chest.inventory,{});
const snapshot=Expedition.restore(e.save());assert.equal(snapshot.current.dungeonSpec.id,entrance.id);assert.equal(snapshot.current.player,snapshot.surface.player);assert.deepEqual(snapshot.current.player.inventory,cave.player.inventory);assert.deepEqual(snapshot.current.explored,cave.explored);assert.equal(snapshot.current.entities[0].hp,enemy.hp);
assert.equal(snapshot.leave(),true);assert.equal(snapshot.current,snapshot.surface);assert.equal(snapshot.current.player.x,entrance.x);assert.equal(snapshot.enter(entrance.id).ok,true);assert.equal(snapshot.current.entities[0].hp,enemy.hp);assert.deepEqual(snapshot.current.landmarks[0].inventory,{});
console.log('✓ Поверхность живёт во время спуска; нет копии игрока; враги, добыча и карта сохраняются после выхода и загрузки');
const d=snapshot.current;d.player.inventory={gold:77,sword:1};Object.assign(d.player,d.rooms[3]&&{x:(d.rooms[3].x+.5)*TILE,y:(d.rooms[3].y+.5)*TILE});const deathPoint={x:d.player.x,y:d.player.y};d.die(d.player);snapshot.update(.01);assert.equal(snapshot.current,snapshot.surface);assert.equal(snapshot.current.player.x,snapshot.surface.respawn.x);assert.deepEqual(snapshot.current.player.inventory,{});assert.ok(d.corpses.some(c=>c.formerPlayer&&c.x===deathPoint.x&&c.inventory.gold===77));
console.log('✓ Смерть возвращает в собор, а тело с реальными вещами остаётся в том же подземелье');

for(const regionSeed of ['caverns-one','caverns-two']){
 const region=new World(regionSeed);
 for(const entrance of region.dungeonEntrances){const dungeon=new World(entrance.seed,{dungeonSpec:entrance});for(const room of dungeon.rooms)assert.ok(dungeon.path(dungeon.spawn,{x:(room.x+.5)*TILE,y:(room.y+.5)*TILE}).length,'Разорванное подземелье '+entrance.id);}
}
console.log('✓ В двух дополнительных регионах все камеры каждого подземелья достижимы от входа');
