import {W,H,TILE,point} from './content.js';
export function riverCenter(w,along){
 const r=w.river,city=w.cities.find(z=>z.archetype==='canal');let center=r.x+Math.sin(along*.022+r.phase)*r.a+Math.sin(along*.061+r.phase)*r.b;
 if(city){const mid=r.axis==='horizontal'?city.x:city.y,extent=r.axis==='horizontal'?city.rx:city.ry,d=Math.abs(along-mid),blend=Math.max(0,Math.min(1,(extent+42-d)/24));center+=(city.channelCoordinate-center)*blend;}
 for(const z of w.cities.filter(z=>z!==city)){const mid=r.axis==='horizontal'?z.x:z.y,across=r.axis==='horizontal'?z.y:z.x,extent=r.axis==='horizontal'?z.rx:z.ry,width=r.axis==='horizontal'?z.ry:z.rx,d=Math.abs(along-mid);if(d<extent+45&&Math.abs(center-across)<width+18){const blend=Math.min(1,(extent+45-d)/24);center+=(across+(Math.sign(r.x-across)||1)*(width+18)-center)*blend;}}
 return center;
}
export function prepareRiver(w,r){
 const city=w.cities.find(z=>z.archetype==='canal');city.channelAxis=w.river.axis;city.channelCoordinate=(w.river.axis==='horizontal'?city.y:city.x)+(r()<.5?-11:11);
 w.riverMask=new Uint8Array(W*H);w.riverRoute=[];const length=w.river.axis==='horizontal'?W:H;
 for(let a=0;a<=length+4;a+=4){const center=riverCenter(w,a);w.riverRoute.push(w.river.axis==='horizontal'?[a,center]:[center,a]);}
 for(let j=1;j<w.riverRoute.length;j++){const a=w.riverRoute[j-1],b=w.riverRoute[j],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*2);for(let k=0;k<=n;k++){const x=Math.round(a[0]+(b[0]-a[0])*k/n),y=Math.round(a[1]+(b[1]-a[1])*k/n);for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++)if(dx*dx+dy*dy<=12&&x+dx>=0&&x+dx<W&&y+dy>=0&&y+dy<H)w.riverMask[(y+dy)*W+x+dx]=1;}}
 // No occupied landmark clearing may cut the course of a river.
 for(const z of w.places.filter(z=>!['cathedral','lake','grove','oak','salt','north'].includes(z.id))){const dry=(x,y)=>{for(let dy=-9;dy<=9;dy++)for(let dx=-11;dx<=11;dx++)if(w.riverMask[(y+dy)*W+x+dx])return false;return true;};if(dry(z.x,z.y))continue;for(let a=0;a<3000;a++){const x=25+Math.floor(r()*(W-50)),y=25+Math.floor(r()*(H-50));if(dry(x,y)&&w.cities.every(c=>Math.hypot(c.x-x,c.y-y)>c.r+35)&&w.places.every(p=>p===z||Math.hypot(p.x-x,p.y-y)>25)){z.x=x;z.y=y;break;}}}
 const village=w.cities.find(z=>z.archetype==='market');village.isVillage=true;village.fortified=false;village.rx=39;village.ry=33;village.r=41;
 for(const z of w.cities)if(!z.isVillage)z.fortified=true;
}
export const channelCell=(z,x,y)=>!!z.waterway&&(z.waterway.axis==='horizontal'?Math.abs(y-z.waterway.y)<=1:Math.abs(x-z.waterway.x)<=1);
export function gatePlan(w,z,r){
 const gates=[];const add=(side,offset,reason)=>{const existing=gates.find(g=>g.side===side&&Math.abs(g.offset-offset)<10);if(existing){if(!existing.reasons.includes(reason))existing.reasons.push(reason);return;}gates.push({side,offset,reasons:[reason]});};
 for(const side of ['N','S','W','E']){const horizontal=side==='N'||side==='S',limit=horizontal?z.rx-9:z.ry-9;let first=null,last=null;const flush=()=>{if(first!==null)add(side,Math.round((first+last)/2),'road');first=last=null;};for(let offset=-limit;offset<=limit;offset++){const x=z.x+(horizontal?offset:side==='W'?-z.rx+1:z.rx-1),y=z.y+(horizontal?side==='N'?-z.ry+1:z.ry-1:offset),dx=side==='W'?-6:side==='E'?6:0,dy=side==='N'?-6:side==='S'?6:0;let outside=false;for(let j=-4;j<=4;j++){const ox=x+dx+(horizontal?j:0),oy=y+dy+(horizontal?0:j);if(w.roadMask[oy*W+ox])outside=true;}if(w.roadMask[y*W+x]&&outside){if(first===null)first=offset;last=offset;}else flush();}flush();}
 if(!gates.length)add('S',0,'road');
 const candidates=['N','S','W','E'].map(side=>{const horizontal=side==='N'||side==='S',x=z.x+(horizontal?0:side==='W'?-z.rx-15:z.rx+15),y=z.y+(horizontal?side==='N'?-z.ry-15:z.ry+15:0);let score=0;for(let dy=-10;dy<=10;dy+=2)for(let dx=-10;dx<=10;dx+=2)score+=w.tile(x+dx,y+dy)===0?2:w.tile(x+dx,y+dy)===9?1:0;return {side,x,y,score:score+r()*.1};}).sort((a,b)=>b.score-a.score);
 const logging=candidates[0];add(logging.side,0,'logging');z.loggingTarget=point(logging.x+.5,logging.y+.5);z.gatePlan=gates;
 z.primaryGate=gates.find(g=>g.reasons.includes('road'));return gates;
}
export function gateTile(z,g,inside=0){const horizontal=g.side==='N'||g.side==='S';return {x:z.x+(horizontal?g.offset:g.side==='W'?-z.rx+inside:z.rx-inside),y:z.y+(horizontal?g.side==='N'?-z.ry+inside:z.ry-inside:g.offset)};}
export function gateOpening(z,x,y){return z.gatePlan.some(g=>{const p=gateTile(z,g);return g.side==='N'||g.side==='S'?Math.abs(x-p.x)<=4&&Math.abs(y-p.y)<3:Math.abs(y-p.y)<=4&&Math.abs(x-p.x)<3;});}
export function townWorkRoads(w,z){
 z.lumber={...z.loggingTarget};const gate=z.gatePlan.find(g=>g.reasons.includes('logging')),p=gateTile(z,gate,0);w.paintRoad([[p.x,p.y],[z.lumber.x/TILE,z.lumber.y/TILE]]);
 z.gates=z.gatePlan.map(g=>{const p=gateTile(z,g,2);return [p.x-z.x,p.y-z.y];});
 const main=gateTile(z,z.primaryGate),dx=z.primaryGate.side==='W'?-1:z.primaryGate.side==='E'?1:0,dy=z.primaryGate.side==='N'?-1:z.primaryGate.side==='S'?1:0,fx=main.x+dx*40,fy=main.y+dy*40;
 z.fishing=point(fx+.5,fy+.5);const waterX=Math.max(2,Math.min(W-10,dx?fx-2:fx+1)),waterY=Math.max(2,Math.min(H-10,dx?fy+1:fy-2));
 for(let y=waterY;y<waterY+6;y++)for(let x=waterX;x<waterX+6;x++)w.tiles[y*W+x]=2;
 w.paintRoad([[main.x,main.y],[fx,fy]]);
}
