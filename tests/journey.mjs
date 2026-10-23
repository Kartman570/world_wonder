import assert from 'node:assert/strict';
import {World} from '../simulation.js';
const start=performance.now(),samples=[];
// Losses are an emergent outcome, not a mandatory scripted death in every seed.
for(const seed of ['734291','journey-1','journey-2']){
 const w=new World(seed);
 for(let i=0;i<4000;i++)w.update(.15);
 assert.ok(w.caravanStats.arrived>0,'Обозы должны доставлять груз за десять минут');
 assert.ok(w.entities.every(e=>Number.isFinite(e.x)&&Number.isFinite(e.y)),'Координаты конечны');
 assert.ok(w.entities.every(e=>Object.values(e.inventory).every(n=>n>=0)),'Вещи не уходят в отрицательные значения');
 const saved=w.save(),restored=World.restore(saved);restored.update(.15);assert.deepEqual(restored.caravanStats,w.caravanStats);
 samples.push({seed,deliveries:w.caravanStats.arrived,lostCaravans:w.caravanStats.lost,survivingCaravans:w.entities.filter(e=>e.caravan&&e.hp>0).length,npcs:w.entities.length,saveBytes:saved.length});
}
assert.ok(samples.some(s=>s.lostCaravans>0),'В выборке регионов засады должны приводить к потерям');
assert.ok(samples.some(s=>s.survivingCaravans>0),'Часть караванов должна выживать');
console.log(JSON.stringify({simulatedSecondsPerWorld:600,samples,computeSeconds:Math.round((performance.now()-start)/100)/10},null,2));
