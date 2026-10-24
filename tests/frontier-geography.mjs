import assert from 'node:assert/strict';
import {World,W,H,TILE,rng} from '../simulation.js';
import {frontierContains,reserveFrontiers} from '../frontier-geography.js';
import {cityMapPoints,cityMapBounds} from '../city-map.js';
import {segmentDistance} from '../map-geometry.js';
const sectors={ark:new Set(),desert:new Set()};
const seeds=['734291',...Array.from({length:19},(_,i)=>'alpha14-'+(i+1)),'frontier-final-15','frontier-final-42'];
for(const seed of seeds){
 const w=new World(seed);assert.equal(w.generatorVersion,12);
 for(const id of ['ark','desert']){const a=w.frontierRegions[id],angle=Math.atan2(a.y-H/2,a.x-W/2);sectors[id].add(Math.floor((angle+Math.PI)/(Math.PI/2)));assert.ok(Math.hypot((a.x-W/2)/(W/2),(a.y-H/2)/(H/2))>.45,'border region');}
 const a=w.frontierRegions.ark;let elevations=[];for(let k=0;k<32;k++){const t=k*Math.PI/16,x=Math.round(a.x+Math.cos(t)*a.rx*1.12),y=Math.round(a.y+Math.sin(t)*a.ry*1.12);elevations.push(w.elevation[y*W+x]);}assert.ok(elevations.reduce((s,x)=>s+x,0)/elevations.length>70,'Arktaria lies inside an actual mountain range');
 for(const z of w.cities){assert.ok(!frontierContains(w,z.x,z.y,Math.max(z.rx,z.ry)));const points=cityMapPoints(w,z),b=cityMapBounds(z,points);assert.ok(points.some(p=>p.kind==='warehouse'));assert.ok(points.some(p=>p.kind==='gate'));for(const p of points){assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));assert.ok(p.x/TILE>b.left&&p.x/TILE<b.right&&p.y/TILE>b.top&&p.y/TILE<b.bottom);}if(z.kind==='capital')assert.ok(points.some(p=>p.kind==='castle'));}
 assert.equal(w.forestTrails.length,3);for(const trail of w.forestTrails){const camp=w.places.find(z=>z.id===trail.camp);const distance=Math.min(...w.roads.flatMap(path=>path.slice(1).map((b,i)=>segmentDistance(camp.x,camp.y,path[i],b))));assert.ok(distance>=30,'camp stands away from road');assert.ok(w.path(trail.junction,trail.destination).length,'walkable trail connects to main road');assert.equal(w.tile(camp.x,camp.y),8);assert.ok(w.tiles.some((t,i)=>t===19&&w.trailMask[i]));assert.ok(w.treesNear(trail.destination,28*TILE).length>100,'forest surrounds the clearing');}
 const helper=w.entities.find(e=>e.role==='arctRescuer'),miner=w.entities.find(e=>e.role==='arctMiner');assert.ok(!w.blocked(helper.x,helper.y));assert.ok(w.path(helper,miner).length,'pass leads into alien settlement');
 if(seed==='734291'){let wet=0,potential=0;for(let i=0;i<w.tiles.length;i++){if([8,12].includes(w.biomes[i])&&w.elevation[i]>=20&&w.elevation[i]<=83)potential++;if(w.naturalTiles[i]===9)wet++;}assert.ok(wet<potential*.95&&wet>potential*.6,'moderate reduction of wet woodland, not elimination');const restored=World.restore(w.save());assert.deepEqual(restored.frontierRegions,w.frontierRegions);assert.deepEqual(restored.tiles,w.tiles);assert.deepEqual(restored.forestTrails,w.forestTrails);}
 for(const d of w.dungeonEntrances.filter(d=>d.kind==='underwater'))assert.ok([2,4].includes(w.tile(d.x/TILE,d.y/TILE)),'underwater entry belongs to an actual body of water');
 console.log('✓',w.seed,'mountain rim',Math.round(elevations.reduce((s,x)=>s+x,0)/32));
}
for(let i=0;i<128;i++){const w={generatorVersion:12};reserveFrontiers(w,rng('direction-'+i));for(const id of ['ark','desert']){const a=w.frontierRegions[id];sectors[id].add(Math.floor((Math.atan2(a.y-H/2,a.x-W/2)+Math.PI)/(Math.PI/2)));}}
assert.ok(sectors.ark.size===4&&sectors.desert.size===4,'both alien regions can occupy every direction');
console.log('✓ Global border biomes, real mountains, forest clearings/trails, city POIs and save compatibility');
