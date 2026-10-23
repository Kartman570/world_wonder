// Shared by the background worker and the deterministic headless simulation.
class Heap{
 constructor(){this.a=[];}
 push(v){const a=this.a;let i=a.length;a.push(v);while(i){const p=(i-1)>>1;if(a[p].f<=v.f)break;a[i]=a[p];i=p;}a[i]=v;}
 pop(){const a=this.a,out=a[0],v=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1].f<a[c].f)c++;if(a[c].f>=v.f)break;a[i]=a[c];i=c;}a[i]=v;}return out;}
}
export class PathPlanner{
 constructor({tiles,solids,depth,width,height,tile=48}){Object.assign(this,{tiles,solids,depth,width,height,tile});const n=width*height;this.seen=new Uint32Array(n);this.closed=new Uint32Array(n);this.cost=new Float32Array(n);this.parents=new Int32Array(n);this.stamp=0;this.cache=new Map();}
 blocked(x,y){return x<1||y<1||x>=this.width-1||y>=this.height-1||this.solids[y*this.width+x]||this.tiles[y*this.width+x]===2||this.tiles[y*this.width+x]===4;}
 *search(start,destination){
  const {width:w,tile:t}=this;let end={...destination},sx=Math.floor(start.x/t),sy=Math.floor(start.y/t),ex=Math.floor(end.x/t),ey=Math.floor(end.y/t);
  if(this.blocked(ex,ey)){let found=false;for(let r=1;r<8&&!found;r++)for(let dy=-r;dy<=r&&!found;dy++)for(let dx=-r;dx<=r;dx++)if(!this.blocked(ex+dx,ey+dy)){ex+=dx;ey+=dy;end={x:(ex+.5)*t,y:(ey+.5)*t};found=true;break;}if(!found)return [];}
  const origin=sy*w+sx,goal=ey*w+ex,key=origin+':'+goal+':'+end.x+','+end.y;
  if(this.cache.has(key))return this.cache.get(key).map(p=>({...p}));
  if(++this.stamp>=0xffffffff){this.seen.fill(0);this.closed.fill(0);this.stamp=1;}const stamp=this.stamp,heap=new Heap();heap.push({k:origin,g:0,f:0});this.seen[origin]=stamp;this.cost[origin]=0;let found=false,steps=0;
  while(heap.a.length&&steps++<this.width*this.height){const n=heap.pop();if(this.closed[n.k]===stamp)continue;if(n.k===goal){found=true;break;}this.closed[n.k]=stamp;const x=n.k%w,y=Math.floor(n.k/w);
   for(let dir=0;dir<4;dir++){const xx=x+(dir===0?1:dir===1?-1:0),yy=y+(dir===2?1:dir===3?-1:0),k=yy*w+xx;if(this.closed[k]===stamp||this.blocked(xx,yy))continue;const terrain=this.tiles[k],g=n.g+([1,3,5].includes(terrain)?1:2+Math.min(this.depth[k],18)*.05);if(this.seen[k]===stamp&&g>=this.cost[k]-.0001)continue;this.seen[k]=stamp;this.cost[k]=g;this.parents[k]=n.k;heap.push({k,g,f:g+Math.abs(xx-ex)+Math.abs(yy-ey)});}
   if(steps%128===0)yield null;
  }
  if(!found)return [];const nodes=[];let k=goal;while(k!==origin){nodes.push({x:(k%w+.5)*t,y:(Math.floor(k/w)+.5)*t});k=this.parents[k];if(nodes.length>w*this.height)return [];}nodes.reverse();
  const route=[];for(let i=0;i<nodes.length;i++){const a=nodes[i-1],b=nodes[i],c=nodes[i+1];if(!a||!c||i%6===0||(b.x-a.x)!==(c.x-b.x)||(b.y-a.y)!==(c.y-b.y))route.push(b);}route.push(end);
  if(this.cache.size>=350)this.cache.clear();this.cache.set(key,route);return route.map(p=>({...p}));
 }
 find(start,end){const it=this.search(start,end);let next;do{next=it.next();}while(!next.done);return next.value;}
}
