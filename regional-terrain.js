import {reserveFrontiers} from './frontier-geography.js';
import {transportMoisture} from './azgaar-climate.js';
// Adapted from Azgaar/Fantasy-Map-Generator's biome classification and
// height -> depression resolution -> accumulated precipitation -> river pipeline.
// Upstream 5165b330c504df2b21f367fd728a51c3f2e23cc5, MIT; vendor/azgaar.LICENSE.
import {W,H} from './content.js';
import {Delaunay} from './vendor/d3-delaunay.js';
import {MinHeap,smoothPath} from './map-geometry.js';
const matrix=[
 [1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,10],
 [3,3,3,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,9,9,9,9,10,10,10],
 [5,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,9,9,9,9,9,9,10,10],
 [5,6,6,6,6,6,6,8,8,8,8,8,8,8,8,8,8,8,8,8,8,9,9,9,10,10],
 [7,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,9,9,9,9,9,10,10]
];
export function classifyBiome(moisture,temperature,height,hasRiver=false,swampThreshold=1){if(height<20)return 0;if(temperature< -5)return 11;if(temperature>=25&&!hasRiver&&moisture<8)return 1;if(temperature> -2&&(moisture>40*swampThreshold&&height<25||moisture>24*swampThreshold&&height>24&&height<60))return 12;return matrix[Math.min((moisture/5)|0,4)][Math.min(Math.max(Math.floor(20-temperature),0),25)];}
const hash=(x,y,s)=>{let n=Math.imul(x,374761393)^Math.imul(y,668265263)^s;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
function noise(x,y,s){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);return (hash(ix,iy,s)*(1-u)+hash(ix+1,iy,s)*u)*(1-v)+(hash(ix,iy+1,s)*(1-u)+hash(ix+1,iy+1,s)*u)*v;}
export function buildRegionalTerrain(w,r){
 reserveFrontiers(w,r);const swampThreshold=w.generatorVersion>=12?1.05:1;
 const step=8,nx=W/step+1,ny=H/step+1,n=nx*ny,points=[],height=new Float32Array(n),temperature=new Float32Array(n),precipitation=new Float32Array(n),seed=Math.floor(r()*2e9),phase=r()*6.28;
 const hills=Array.from({length:12},(_,i)=>({x:r()*W,y:r()*H,sx:80+r()*180,sy:65+r()*150,h:10+r()*30}));
 for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const i=y*nx+x,px=Math.max(0,Math.min(W-1,x*step+(x&&x<nx-1?(r()-.5)*step*.75:0))),py=Math.max(0,Math.min(H-1,y*step+(y&&y<ny-1?(r()-.5)*step*.75:0)));points.push([px,py]);let h=27+noise(px/170,py/170,seed)*19+noise(px/48,py/48,seed+1)*7;for(const hill of hills)h+=hill.h*Math.exp(-(((px-hill.x)/hill.sx)**2+((py-hill.y)/hill.sy)**2));const edge=Math.min(px,py,W-1-px,H-1-py);h-=Math.max(0,35-edge)*.7;const valley=Math.abs(py-(H*.5+Math.sin(px/180+phase)*125));h-=Math.max(0,1-valley/110)*10;if(w.frontierRegions){const a=w.frontierRegions.ark,q=((px-a.x)/a.rx)**2+((py-a.y)/a.ry)**2;h+=65*Math.exp(-q/1.8)-30*Math.exp(-q/.14);}
 height[i]=h;temperature[i]=6+py/H*26-Math.max(0,h-45)*.32+noise(px/230,py/230,seed+6)*6;precipitation[i]=Math.max(2,2+noise(px/130,py/130,seed+3)*20+Math.max(0,Math.sin((px+py*.4)/300+phase))*5-Math.max(0,h-55)*.13);}
 for(let i=0;i<n;i++){const[px,py]=points[i],lee=Math.exp(-(((px-(w.frontierRegions?.desert.x??1000))/250)**2+((py-(w.frontierRegions?.desert.y??210))/210)**2));temperature[i]+=15*lee;precipitation[i]*=1-.82*lee;}
 const climate=transportMoisture(height,nx,ny,r);for(let i=0;i<n;i++)precipitation[i]=precipitation[i]*.7+climate.rain[i]*1.5;
 const triangulation=Delaunay.from(points),neighbors=points.map((_,i)=>Array.from(triangulation.neighbors(i))),filled=new Float32Array(height),drain=new Int32Array(n).fill(-1),seen=new Uint8Array(n),heap=new MinHeap(),order=[];
 // Priority-flood gives every inland depression an outlet, without flattening the
 // visible landscape or drawing a river backwards from a desired city location.
 for(let i=0;i<n;i++)if(height[i]<20||i<nx||i>=n-nx||i%nx===0||i%nx===nx-1){heap.push(i,filled[i]);seen[i]=1;}
 while(heap.length){const {id}=heap.pop();order.push(id);for(const j of neighbors[id])if(!seen[j]){seen[j]=1;filled[j]=Math.max(height[j],filled[id]+.001);drain[j]=id;heap.push(j,filled[j]);}}
 const flux=new Float32Array(precipitation),rivers=new Uint8Array(n),threshold=2100;for(let k=order.length-1;k>=0;k--){const i=order[k];if(drain[i]>=0)flux[drain[i]]+=flux[i];if(flux[i]>threshold&&height[i]>=20)rivers[i]=1;}
 const biomes=new Uint8Array(n);for(let i=0;i<n;i++){const moisture=4+(precipitation[i]+neighbors[i].reduce((s,j)=>s+precipitation[j],0))/(neighbors[i].length+1)+(rivers[i]?Math.min(12,flux[i]/1000):0);biomes[i]=classifyBiome(moisture,temperature[i],height[i],!!rivers[i],swampThreshold);}
 const base=new Uint8Array(W*H),elevation=new Float32Array(W*H),biomeMap=new Uint8Array(W*H);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const gx=x/step,gy=y/step,ix=Math.min(nx-2,Math.floor(gx)),iy=Math.min(ny-2,Math.floor(gy)),u=gx-ix,v=gy-iy,i=iy*nx+ix,h=(height[i]*(1-u)+height[i+1]*u)*(1-v)+(height[i+nx]*(1-u)+height[i+nx+1]*u)*v,j=Math.round(gy)*nx+Math.round(gx),interpolate=field=>(field[i]*(1-u)+field[i+1]*u)*(1-v)+(field[i+nx]*(1-u)+field[i+nx+1]*u)*v,b=classifyBiome(4+interpolate(precipitation),interpolate(temperature),h,!!rivers[j],swampThreshold),k=y*W+x;elevation[k]=h;biomeMap[k]=b;base[k]=h<20?2:h>83?10:[1,2].includes(b)?15:[3,4,10,11].includes(b)?8:[8,12].includes(b)?9:0;}
 // Seasonal wet woodland also gets coherent drained patches; actual marsh basins stay wet.
 if(w.generatorVersion>=12)for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;if(base[i]===9&&biomeMap[i]!==12&&noise(x/70,y/70,seed+31)<.34)base[i]=0;}
 w.naturalTiles=base;w.elevation=elevation;w.biomes=biomeMap;w.riverMask=new Uint8Array(W*H);w.riverFlowX=new Int8Array(W*H);w.riverFlowY=new Int8Array(W*H);w.riverPaths=[];
 const childCount=new Uint8Array(n);for(let i=0;i<n;i++)if(rivers[i]&&drain[i]>=0&&rivers[drain[i]])childCount[drain[i]]++;
 for(let i=0;i<n;i++)if(rivers[i]&&childCount[i]!==1){const cells=[i];let j=drain[i];while(j>=0){cells.push(j);if(!rivers[j]||childCount[j]!==1)break;j=drain[j];}if(cells.length<2)continue;const route=smoothPath(cells.map(k=>points[k]),2),flow=flux[cells.at(-1)],width=Math.min(4,1.2+Math.sqrt(flow/threshold)*.35);w.riverPaths.push({id:w.riverPaths.length+1,points:route,cells,flux:flow,width,source:points[i],mouth:points[cells.at(-1)]});for(let k=1;k<route.length;k++){const a=route[k-1],b=route[k],d=Math.hypot(b[0]-a[0],b[1]-a[1]),steps=Math.max(1,Math.ceil(d*2));for(let t=0;t<=steps;t++){const x=Math.round(a[0]+(b[0]-a[0])*t/steps),y=Math.round(a[1]+(b[1]-a[1])*t/steps);for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++)if(dx*dx+dy*dy<=width*width){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=W||yy>=H)continue;const ii=yy*W+xx;if(base[ii]!==2)base[ii]=4;w.riverMask[ii]=1;w.riverFlowX[ii]=Math.round((b[0]-a[0])/(d||1)*100);w.riverFlowY[ii]=Math.round((b[1]-a[1])/(d||1)*100);}}}}
 // Connected, flooded depressions define lake basins. Their shore follows
 // actual elevation; city placement cannot create a circular pond afterwards.
 const basinLabel=new Int32Array(n).fill(-1),basins=[];for(let i=0;i<n;i++)if(basinLabel[i]<0&&filled[i]-height[i]>1.2&&height[i]<60){const id=basins.length,cells=[i];basinLabel[i]=id;for(let k=0;k<cells.length;k++)for(const j of neighbors[cells[k]])if(basinLabel[j]<0&&filled[j]-height[j]>1.2&&Math.abs(filled[j]-filled[i])<.1){basinLabel[j]=id;cells.push(j);}basins.push({id,cells,level:filled[i],depth:Math.max(...cells.map(j=>filled[j]-height[j]))});}
 const lakes=basins.filter(b=>b.cells.length>=3&&b.depth>2).sort((a,b)=>b.cells.length-a.cells.length).slice(0,8).map(b=>{const xs=b.cells.map(i=>points[i][0]),ys=b.cells.map(i=>points[i][1]),minX=Math.max(0,Math.floor(Math.min(...xs)-12)),maxX=Math.min(W-1,Math.ceil(Math.max(...xs)+12)),minY=Math.max(0,Math.floor(Math.min(...ys)-12)),maxY=Math.min(H-1,Math.ceil(Math.max(...ys)+12));let outlet=b.cells[0];for(const i of b.cells)if(drain[i]>=0&&basinLabel[drain[i]]!==b.id){outlet=drain[i];break;}return {...b,x:(minX+maxX)/2,y:(minY+maxY)/2,rx:(maxX-minX)/2,ry:(maxY-minY)/2,minX,maxX,minY,maxY,outlet};});
 const lakeSeen=new Uint32Array(W*H),queue=new Int32Array(W*H);let stamp=0;const painted=[];
 for(const lake of lakes){let deepest=lake.cells.reduce((a,b)=>height[a]<height[b]?a:b),sx=Math.round(points[deepest][0]),sy=Math.round(points[deepest][1]),origin=sy*W+sx,level=lake.level,water=[];for(let trial=0;trial<12;trial++,level-=.35){stamp++;let head=0,tail=0,leaks=false;queue[tail++]=origin;lakeSeen[origin]=stamp;if(elevation[origin]>=level)break;while(head<tail){const i=queue[head++],x=i%W,y=Math.floor(i/W);if(x<=1||y<=1||x>=W-2||y>=H-2||tail>25000){leaks=true;break;}for(const j of [i-1,i+1,i-W,i+W])if(lakeSeen[j]!==stamp&&elevation[j]<level){lakeSeen[j]=stamp;queue[tail++]=j;}}if(!leaks){water=Array.from(queue.subarray(0,tail));break;}}if(water.length<10)continue;let minX=W,minY=H,maxX=0,maxY=0;for(const i of water){base[i]=2;const x=i%W,y=Math.floor(i/W);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}painted.push({...lake,level,x:(minX+maxX)/2,y:(minY+maxY)/2,rx:(maxX-minX)/2,ry:(maxY-minY)/2,minX,maxX,minY,maxY,area:water.length});}
 lakes.splice(0,lakes.length,...painted);


 w.lakes=lakes;w.lake=lakes[0]||{x:W-15,y:H-15,rx:8,ry:6};w.riverRoute=w.riverPaths.slice().sort((a,b)=>b.flux-a.flux)[0]?.points||[];w.river={x:W/2,axis:'watershed',phase:0,a:0,b:0};w.geography={version:10,source:'Azgaar adapted',seed,wind:climate.wind,mesh:{points,neighbors,height,filled,drain,flux,precipitation,temperature,rivers,biomes,order},rivers:w.riverPaths,lakes};
}
export const BIOME_COLORS=['#2b5057','#b7a16b','#9e9e7a','#9b985d','#7d8b53','#657d48','#435e3d','#356151','#365d52','#465a51','#8b8b6a','#a1adb0','#465d4a'];
export function biomeColor(w,index){if(!w.biomes||![0,8,9,15].includes(w.tiles[index])||w.naturalTiles?.[index]!==w.tiles[index])return null;return BIOME_COLORS[w.biomes[index]];}
