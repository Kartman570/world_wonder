import assert from 'node:assert/strict';
import {World as BaseWorld,W,H,TILE,dist} from '../simulation.js';
// Regression fixtures for the previous settlement generation remain stable.
class World extends BaseWorld{constructor(seed,options={}){super(seed,{generatorVersion:7,...options});}}
import {naturalRiver,riverCenter} from '../settlements.js';
let ports=0,inland=0;
for(let i=0;i<16;i++){
 const w=new World('river-first-'+i);w.cities.some(z=>z.port)?ports++:inland++;assert.ok(w.cities.every(z=>!z.waterway&&z.archetype!=='canal'));for(const z of w.cities)for(let y=z.y-z.ry-1;y<=z.y+z.ry+1;y++)for(let x=z.x-z.rx-1;x<=z.x+z.rx+1;x++)assert.equal(w.riverMask[y*W+x],0,'Река не пересекает город или стену');for(const z of w.cities.filter(z=>z.port))assert.ok(z.gatePlan.some(g=>g.reasons.includes('port')));
 for(let a=0;a<(w.river.axis==='horizontal'?W:H);a++){assert.equal(riverCenter(w,a),naturalRiver(w,a),'Архитектура вообще не изменяет реку');assert.ok(Math.abs(riverCenter(w,a)-riverCenter(w,a+.1))<1);}
 const course=Array.from({length:w.river.axis==='horizontal'?W:H},(_,a)=>riverCenter(w,a));assert.ok(Math.max(...course)-Math.min(...course)>50,'Река имеет заметные меандры');let turns=0,last=0;for(let a=1;a<course.length;a++){const delta=course[a]-course[a-1],sign=Math.abs(delta)>.01?Math.sign(delta):0;if(sign&&last&&sign!==last)turns++;if(sign)last=sign;}assert.ok(turns>=2,'У русла несколько плавных поворотов');
 assert.equal(w.entities.filter(e=>e.role==='king').length,3);
 for(const c of w.cities){const b=w.buildings.find(b=>b.city===c.id&&b.type==='castle'),king=w.entities.find(e=>e.role==='king'&&e.faction===c.id);assert.equal(w.interiorAt(king)?.id,b.id);assert.ok(w.entities.filter(e=>e.royalPost&&e.faction===c.id).length>=8);}
 for(const d of w.dungeonEntrances.filter(d=>d.template!=='caves'&&d.kind!=='underwater')){assert.ok(d.buildingId);assert.equal(w.interiorAt(d)?.id,d.buildingId);assert.equal(w.blocked(d.x,d.y),false);const b=w.buildings[d.buildingId-1];assert.equal(w.visibleFrom(b.entrance,d),false);}
 assert.ok(w.mainRoads.every(p=>p.length>40));
 w.time=23*60;for(let j=0;j<30;j++)w.step(.15);for(const k of w.entities.filter(e=>e.role==='king'))assert.ok(dist(k,k.work)<12);
}
assert.ok(ports&&inland,'Есть миры с портами и без единого порта');
const v6=new World('v6-compatibility',{generatorVersion:6});assert.deepEqual(World.restore(v6.save()).tiles,v6.tiles);
const v5=new World('v5-compatibility',{generatorVersion:5});assert.deepEqual(World.restore(v5.save()).tiles,v5.tiles);
const old=new World('v4-compatibility',{generatorVersion:4});assert.deepEqual(World.restore(old.save()).tiles,old.tiles);
console.log('✓ Река первична: неизменное русло, необязательные береговые порты, сухие города, все короли ночью в замках с охраной, лестницы внутри построек, старые карты сохранены');
