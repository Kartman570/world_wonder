// Only route calculation leaves the main thread. All inventories and combat have one owner.
import {W,H,TILE} from './content.js';
export class PathService{
 constructor(world){this.world=world;this.pending=new Map();this.serial=0;this.ready=false;this.disposed=false;this.metrics={completed:0,totalMs:0,maxMs:0};world.pathBudgetMs=2;
  try{this.worker=new Worker(new URL('./path-worker.js',import.meta.url),{type:'module'});this.worker.onmessage=e=>this.receive(e.data);this.worker.onerror=()=>this.fail();this.worker.postMessage({type:'init',map:{tiles:world.tiles,solids:world.solids,depth:world.depth,width:W,height:H,tile:TILE}});world.pathService=this;}catch{this.fail();}
 }
 pump(limit=6){if(!this.ready||this.disposed)return;const w=this.world;let count=0;while(this.pending.size<2&&w.pathQueue.length&&count++<limit){const req=w.pathQueue.shift(),e=w.entityById.get(req.entity);if(!e||e.hp<=0||!e.nav||Math.hypot(e.nav.x-req.dest.x,e.nav.y-req.dest.y)>90)continue;const id=++this.serial;this.pending.set(id,{req,start:{x:e.x,y:e.y}});this.worker.postMessage({type:'path',id,start:{x:e.x,y:e.y},dest:req.dest});}}
 receive(data){if(this.disposed)return;if(data.type==='ready'){this.ready=true;this.pump();return;}const task=this.pending.get(data.id);if(!task)return;this.pending.delete(data.id);if(data.type==='error'){this.pending.set(data.id,task);this.fail();return;}this.metrics.completed++;this.metrics.totalMs+=data.ms;this.metrics.maxMs=Math.max(this.metrics.maxMs,data.ms);this.world.applyPath(task.req,data.route,task.start);this.pump();}
 fail(){this.worker?.terminate();this.ready=false;const w=this.world;w.pathService=null;for(const {req}of this.pending.values()){const e=w.entityById.get(req.entity);if(e){e.pathPending=false;e.routeDest=null;}}this.pending.clear();this.disposed=true;}
 dispose(){this.worker?.terminate();this.pending.clear();this.disposed=true;if(this.world.pathService===this)this.world.pathService=null;}
}
