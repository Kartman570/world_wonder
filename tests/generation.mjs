import assert from 'node:assert/strict';
import {World as HistoricalWorld,TILE} from '../simulation.js';
// Regression coverage for maps saved before the watershed generator.
class World extends HistoricalWorld{constructor(seed,options={}){super(seed,{generatorVersion:9,...options});}}
import {PLACES} from '../content.js';
const a=new World('atlas-A'),b=new World('atlas-B'),again=new World('atlas-A');
assert.deepEqual(a.tiles,again.tiles);assert.deepEqual(a.buildings,again.buildings);assert.deepEqual(a.places,again.places);
assert.notDeepEqual(a.cities.map(z=>[z.x,z.y]),b.cities.map(z=>[z.x,z.y]));
assert.notDeepEqual(a.roads,b.roads);assert.notDeepEqual(a.river,b.river);assert.notDeepEqual(a.lake,b.lake);
assert.ok(a.tiles.reduce((n,t,i)=>n+(t!==b.tiles[i]),0)>10000);
const plan=(w,id)=>{const z=w.cities.find(z=>z.id===id);return w.buildings.filter(b=>b.city===id&&b.enterable).map(b=>[b.type,b.x-z.x,b.y-z.y,b.w,b.h]);};
for(const z of a.cities)assert.notDeepEqual(plan(a,z.id),plan(b,z.id));
assert.deepEqual(World.restore(a.save()).tiles,a.tiles);assert.deepEqual(World.restore(a.save()).buildings,a.buildings);
const legacy=new World('734291',{generatorVersion:0}),data=JSON.parse(legacy.save());delete data.generatorVersion;
const restored=World.restore(JSON.stringify(data));assert.equal(restored.generatorVersion,0);assert.deepEqual(restored.tiles,legacy.tiles);assert.deepEqual(restored.cities.map(z=>[z.x,z.y]),PLACES.filter(z=>['oak','salt','north'].includes(z.id)).map(z=>[z.x,z.y]));
console.log('✓ Новое зерно меняет географию и планы всех городов; одинаковое воспроизводит мир; старые сохранения сохраняют карту');
for(let seed=0;seed<12;seed++){
 const w=new World('city-validation-'+seed);
 assert.equal(new Set(w.cities.map(z=>z.archetype)).size,3);
 for(const z of w.cities){
  assert.ok(z.houseCount>=(z.isVillage?7:12),`Недостаточно жилых домов ${seed}: ${z.houseCount}`);
  for(const other of w.cities.filter(c=>c.id!==z.id))assert.ok((Math.hypot(z.x-other.x,z.y-other.y)-Math.SQRT2*50)*TILE/195>60);
  const start={x:z.x*TILE,y:(z.y+2)*TILE};
  for(const room of w.buildings.filter(b=>b.city===z.id&&b.enterable)){
   assert.equal(w.blocked(room.entrance.x,room.entrance.y,false),false,`${seed}: ${z.id} ${room.type} entrance`);
   const path=w.path(start,room.workSpot);assert.ok(path?.length,`${seed}: ${z.id} ${room.type} inaccessible`);
  }
 }
}
console.log('✓ В 12 мирах все двери и рабочие места достижимы; города разделены минутой пути');

const previous=new World('legacy-v1',{generatorVersion:1});assert.deepEqual(World.restore(previous.save()).tiles,previous.tiles);console.log('✓ Сохранения предыдущего генератора 1 также восстанавливают прежнюю географию');
