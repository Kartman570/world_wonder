import assert from 'node:assert/strict';
import {World,W,TILE,TRADE} from '../simulation.js';
import {settlementInside} from '../settlement-shapes.js';
import {naturalRiver,riverCenter} from '../settlements.js';
const patterns=new Set(),palettes=new Set();
for(let seed=0;seed<12;seed++){
 const w=new World('town-types-'+seed);assert.deepEqual(w.cities.map(z=>z.kind).sort(),['capital','town','village']);
 let capitalArea=0,townArea=0;
 for(const z of w.cities){patterns.add(z.pattern);palettes.add(z.style.flag);const bs=w.buildings.filter(b=>b.city===z.id),people=w.entities.filter(e=>e.faction===z.id&&!e.caravan&&!e.leader),traders=people.filter(e=>e.shopkeeper&&!e.noTrade);assert.equal(traders.length,z.traderRoles.length);for(const b of bs)assert.deepEqual(b.style,z.style);for(const p of people.filter(p=>p.role!=='king'))if(p.livery)assert.equal(p.livery,z.style.cloth);
  let area=0;for(let y=z.y-z.ry;y<=z.y+z.ry;y++)for(let x=z.x-z.rx;x<=z.x+z.rx;x++)if(settlementInside(z,x,y)){area++;assert.equal(w.riverMask[y*W+x],0);}
  if(z.kind==='capital'){capitalArea=area;assert.ok(bs.some(b=>b.type==='castle'));assert.ok(bs.filter(b=>b.type==='barracks').length>=2);assert.ok(people.filter(e=>e.barracksId).length>=8);assert.ok(bs.filter(b=>b.type==='statue').length>=4);assert.ok(people.some(e=>e.role==='king'));assert.ok(traders.length>=8);assert.ok(z.houseCount>=38);}
  else {assert.ok(!bs.some(b=>b.type==='castle'||b.type==='barracks'));assert.ok(!people.some(e=>e.role==='king'));if(z.kind==='town'){townArea=area;assert.ok(traders.length>=2&&traders.length<=3);assert.ok(traders.some(e=>['smith','farmerTrader'].includes(e.role)));}else{assert.equal(traders.length,1);assert.ok(!bs.some(b=>['wall','tower'].includes(b.type)));assert.ok(bs.filter(b=>b.type==='house').every(b=>b.w<=5));}}
  for(const b of bs.filter(b=>b.enterable)){assert.ok(!w.blocked(b.entrance.x,b.entrance.y),`${seed} ${z.kind} ${b.type} door blocked`);assert.ok(w.path({x:z.x*TILE,y:z.y*TILE},b.workSpot)?.length,`${seed} ${z.kind} ${b.type} inaccessible`);}
  for(const e of traders){assert.ok(e.workBuildingId,`${e.role} has no shop`);assert.equal(w.interiorAt(e)?.id,e.workBuildingId);}
  for(const e of people.filter(e=>TRADE[e.role]&&!e.shopkeeper)){assert.equal(e.noTrade,true);assert.equal(w.trade(e,Object.keys(e.inventory)[0],true).ok,false);}
  assert.ok(bs.some(b=>b.type==='cityFlag'));
 }
 assert.ok(capitalArea>=townArea*2,'Capital has at least twice the inhabited area');
 for(let a=0;a<480;a+=3)assert.equal(riverCenter(w,a),naturalRiver(w,a));
 if(seed===0){const restored=World.restore(w.save());assert.deepEqual(restored.buildings,w.buildings);assert.deepEqual(restored.cities,w.cities);assert.equal(restored.entities.filter(e=>e.role==='king').length,1);}
}
assert.ok(patterns.size>=6);assert.ok(palettes.size>=5);
console.log('✓ 12 миров: три ранга поселений, 6+ контуров, палитры, король только в столице, казармы, статуи, точный состав торговли, все помещения достижимы, река неизменна');
