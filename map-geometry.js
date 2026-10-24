// Geometry and priority queue shared by the regional and town generators.
export class MinHeap{
 constructor(){this.items=[];}
 push(id,cost){const a=this.items;let i=a.length;a.push({id,cost});while(i){const p=(i-1)>>1;if(a[p].cost<=cost)break;a[i]=a[p];i=p;}a[i]={id,cost};}
 pop(){const a=this.items,first=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let j=i*2+1;if(j+1<a.length&&a[j+1].cost<a[j].cost)j++;if(a[j].cost>=last.cost)break;a[i]=a[j];i=j;}a[i]=last;}return first;}
 get length(){return this.items.length;}
}
export function polygonArea(p){let a=0;for(let i=0,j=p.length-1;i<p.length;j=i++)a+=p[j][0]*p[i][1]-p[i][0]*p[j][1];return Math.abs(a)/2;}
export function centroid(p){let x=0,y=0,a=0;for(let i=0,j=p.length-1;i<p.length;j=i++){const t=p[j][0]*p[i][1]-p[i][0]*p[j][1];a+=t;x+=(p[j][0]+p[i][0])*t;y+=(p[j][1]+p[i][1])*t;}return Math.abs(a)<1e-8?p[0]:[x/(3*a),y/(3*a)];}
export function pointInPolygon(p,x,y){let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
export function segmentDistance(x,y,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);}
export function clipHalfPlane(p,nx,ny,c){const out=[];for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[j],b=p[i],da=a[0]*nx+a[1]*ny-c,db=b[0]*nx+b[1]*ny-c;if((da<=0)!==(db<=0)){const t=da/(da-db);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}if(db<=0)out.push(b);}return out;}
export function insetPolygon(p,d){let q=p;const center=centroid(p);for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[j],b=p[i],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),sign=((center[0]-a[0])*dy-(center[1]-a[1])*dx)>0?1:-1,nx=dy/len*sign,ny=-dx/len*sign;q=clipHalfPlane(q,-nx,-ny,-a[0]*nx-a[1]*ny-d);if(q.length<3)return [];}return q;}
export function convexHull(points){const pts=points.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);const lower=[],upper=[];for(const p of pts){while(lower.length>=2&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}for(const p of pts.reverse()){while(upper.length>=2&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}return lower.slice(0,-1).concat(upper.slice(0,-1));}
export function smoothPath(points,passes=1){let p=points;for(let k=0;k<passes;k++){const q=[p[0]];for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i];q.push([a[0]*.75+b[0]*.25,a[1]*.75+b[1]*.25],[a[0]*.25+b[0]*.75,a[1]*.25+b[1]*.75]);}q.push(p.at(-1));p=q;}return p;}
export function seededRandom(seed){let a=Number(seed)|0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
