import assert from 'node:assert/strict';
import {TerrainChunks} from '../terrain-chunks.js';
const savedWorker=globalThis.Worker,savedCanvas=globalThis.OffscreenCanvas;
let requested;
globalThis.OffscreenCanvas=class {};
globalThis.Worker=class {postMessage(job){queueMicrotask(()=>{if(job.type==='init')this.onmessage({data:{type:'ready'}});else{requested=job;this.onmessage({data:{id:job.id,bitmap:{width:768,height:768}}});}});}terminate(){}};
const service=new TerrainChunks({ready:true,materials:new Map()}),w={tile:()=>1};const image=await service.request(w,5,7,1);assert.equal(image.width,768);assert.equal(requested.grid.length,400);assert.ok(requested.grid.every(m=>m==='soil'));assert.equal(requested.cx,5);assert.equal(requested.cy,7);service.dispose();assert.equal(service.available,false);
globalThis.Worker=savedWorker;globalThis.OffscreenCanvas=savedCanvas;
console.log('✓ Terrain worker initialization, compact material-grid jobs, bitmap handoff and disposal');
