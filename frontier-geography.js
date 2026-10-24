import {W,H} from './content.js';
// Reserve distant border biomes before drainage, settlement and road generation.
export function reserveFrontiers(w,r){
 if(w.generatorVersion<12)return;
 const angle=r()*Math.PI*2,ark={x:Math.round(W/2+Math.cos(angle)*(W/2-180)),y:Math.round(H/2+Math.sin(angle)*(H/2-165)),rx:125,ry:115};let desert;
 for(let i=0;i<100;i++){const a=i===99?angle+Math.PI:r()*Math.PI*2;desert={x:Math.round(W/2+Math.cos(a)*(W/2-280)),y:Math.round(H/2+Math.sin(a)*(H/2-240)),rx:250,ry:205};if(Math.hypot((desert.x-ark.x)/420,(desert.y-ark.y)/370)>1.13)break;}
 w.frontierRegions={ark,desert};
}
export function frontierContains(w,x,y,pad=0){if(!w.frontierRegions)return false;return Object.values(w.frontierRegions).some(a=>((x-a.x)/(a.rx+pad))**2+((y-a.y)/(a.ry+pad))**2<1);}
export function roadForbidden(w,x,y){const a=w.frontierRegions?.ark,d=w.frontierRegions?.desert;if(!a)return false;return ((x-d.x)/(d.rx+18))**2+((y-d.y)/(d.ry+18))**2<1||!w.allowArkRoad&&((x-a.x)/(a.rx+35))**2+((y-a.y)/(a.ry+35))**2<1;}
