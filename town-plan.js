// Independent tile-engine implementation of the geometric approach used by
// watabou/TownGeneratorOS: relaxed Voronoi wards, shared-edge streets, parcels
// split perpendicular to their longest frontage. No GPL source is included.
import {Delaunay} from './vendor/d3-delaunay.js';
import {polygonArea,centroid,clipHalfPlane,insetPolygon,convexHull,MinHeap,seededRandom} from './map-geometry.js';
const key=p=>p.map(v=>v.toFixed(4)).join(',');
function parcels(poly,r,out=[],depth=0){if(poly.length<3)return out;const area=polygonArea(poly);if(area<130||depth>7){if(area>35)out.push(poly);return out;}let a,b,longest=0;for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],d=Math.hypot(q[0]-p[0],q[1]-p[1]);if(d>longest){longest=d;a=p;b=q;}}const nx=(b[0]-a[0])/longest,ny=(b[1]-a[1])/longest,projections=poly.map(p=>p[0]*nx+p[1]*ny),lo=Math.min(...projections),hi=Math.max(...projections),cut=lo+(hi-lo)*(.4+r()*.2),left=clipHalfPlane(poly,nx,ny,cut-.6),right=clipHalfPlane(poly,-nx,-ny,-cut-.6);if(left.length<3||right.length<3||polygonArea(left)<25||polygonArea(right)<25){out.push(poly);return out;}parcels(left,r,out,depth+1);parcels(right,r,out,depth+1);return out;}
export function createTownPlan(w,z,r){
 if(z.urbanSeed!==undefined)r=seededRandom(z.urbanSeed);
 const count=z.kind==='capital'?12:z.kind==='town'?7:4,n=count*4,phase=r()*6.283,twist=(r()-.5)*.7,points=[];
 for(let i=0;i<n;i++){const a=i<count?phase+i*Math.PI*(3-Math.sqrt(5)):phase+(i-count)*Math.PI*2/(n-count),radius=i<count?(i?Math.sqrt(i/count)*(.62+r()*.08):0):1.08+r()*.18;points.push([Math.cos(a)*radius*(1+.1*Math.sin(a*3+phase)),Math.sin(a+twist*radius*.4)*radius*(.95+.08*Math.cos(a*2-phase))]);}
 for(let pass=0;pass<3;pass++){const v=Delaunay.from(points).voronoi([-3,-3,3,3]);for(let i=0;i<count;i++){const p=v.cellPolygon(i);if(p)points[i]=centroid(p.slice(0,-1));}}
 const voronoi=Delaunay.from(points).voronoi([-3,-3,3,3]),polys=Array.from({length:count},(_,i)=>voronoi.cellPolygon(i).slice(0,-1));let mx=0,my=0;for(const poly of polys)for(const[x,y]of poly){mx=Math.max(mx,Math.abs(x));my=Math.max(my,Math.abs(y));}const sx=(z.rx-2)/mx,sy=(z.ry-2)/my;
 const wards=polys.map((poly,i)=>{const p=poly.map(([x,y])=>[z.x+x*sx,z.y+y*sy]),c=centroid(p);return {id:i,polygon:p,center:c,area:polygonArea(p),type:i===0?'square':i%5===0?'craft':i%4===0?'garden':'residential'};});
 const edges=new Map(),vertices=new Map(),vertex=p=>{const k=key(p);if(!vertices.has(k))vertices.set(k,{id:vertices.size,p,edges:[]});return vertices.get(k);};
 for(const ward of wards)for(let i=0;i<ward.polygon.length;i++){const a=vertex(ward.polygon[i]),b=vertex(ward.polygon[(i+1)%ward.polygon.length]),k=a.id<b.id?a.id+':'+b.id:b.id+':'+a.id;if(edges.has(k))edges.get(k).wards.push(ward.id);else edges.set(k,{a:a.id,b:b.id,points:[a.p,b.p],wards:[ward.id],length:Math.hypot(a.p[0]-b.p[0],a.p[1]-b.p[1])});}
 const verts=[...vertices.values()];for(const edge of edges.values()){verts[edge.a].edges.push(edge);verts[edge.b].edges.push(edge);}
 const boundary=[...edges.values()].filter(e=>e.wards.length===1),outline=[];let at=boundary[0]?.a,previous=-1;for(let i=0;i<=boundary.length;i++){outline.push(verts[at].p);const edge=boundary.find(e=>(e.a===at||e.b===at)&&(e.a===at?e.b:e.a)!==previous);if(!edge)break;const next=edge.a===at?edge.b:edge.a;previous=at;at=next;if(at===boundary[0].a)break;}
 z.outline=outline.length>=boundary.length-1?outline:convexHull(wards.flatMap(a=>a.polygon));
 const lots=[];for(const ward of wards){if(ward.id===0)continue;const inset=insetPolygon(ward.polygon,2.5);ward.parcels=parcels(inset,r);for(const poly of ward.parcels){const center=centroid(poly);lots.push({center,polygon:poly,ward:ward.id,area:polygonArea(poly)});}}
 z.wardPlan={algorithm:'relaxed-voronoi',wards,edges:[...edges.values()],vertices:verts.map(v=>({id:v.id,p:v.p})),lots};z.pattern='wards';return z.wardPlan;
}
export function mainTownStreets(z){const plan=z.wardPlan,verts=plan.vertices,adj=verts.map(()=>[]);for(const e of plan.edges){adj[e.a].push([e.b,e.length]);adj[e.b].push([e.a,e.length]);}const nearest=p=>verts.reduce((a,b)=>Math.hypot(a.p[0]-p[0],a.p[1]-p[1])<Math.hypot(b.p[0]-p[0],b.p[1]-p[1])?a:b).id,goal=nearest(plan.wards[0].center),routes=[];
 for(const gate of z.gatePlan){const start=nearest([gate.x,gate.y]),heap=new MinHeap(),cost=new Float64Array(verts.length).fill(Infinity),prev=new Int32Array(verts.length).fill(-1);cost[start]=0;heap.push(start,0);while(heap.length){const{id}=heap.pop();if(id===goal)break;for(const[j,d]of adj[id])if(cost[id]+d<cost[j]){cost[j]=cost[id]+d;prev[j]=id;heap.push(j,cost[j]);}}const ids=[];for(let i=goal;i>=0;i=prev[i]){ids.push(i);if(i===start)break;}routes.push([[gate.x,gate.y],...ids.reverse().map(i=>verts[i].p),plan.wards[0].center,[z.x,z.y]]);}
 plan.arteries=routes;return routes;
}
