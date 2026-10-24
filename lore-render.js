import {TILE,W,H} from './content.js';
const TAU=Math.PI*2;
const oval=(c,x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();};
const line=(c,pts,color,width=2)=>{c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();};
const poly=(c,pts,color)=>{c.fillStyle=color;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
const sprites=new Map();
function sprite(e,dir,frame,attack){const key=[e.race,e.role,e.faction,dir,frame,attack,e.inventory?.breathSuit>0,e.inventory?.arkCutter>0].join(':');if(sprites.has(key))return sprites.get(key);const image=document.createElement('canvas');image.width=220;image.height=200;const c=image.getContext('2d');c.translate(110,166);const a=dir*Math.PI/4,co=Math.cos(a),si=Math.sin(a),phase=frame*Math.PI/3,P=(u,v,z)=>[u*co-v*si,(u*si+v*co)*.5-z],L=(pts,color,width)=>line(c,pts.map(p=>P(...p)),color,width),O=(u,v,z,rx,ry,color)=>{const [x,y]=P(u,v,z);oval(c,x,y,rx,ry,color);},Q=(pts,color)=>poly(c,pts.map(p=>P(...p)),color);
 if(e.race==='emralaan'){
  const cloak=['#ad7757','#758baf','#ad9a55','#939dab','#8d685a','#848d60'][Number(e.faction?.split('-')[1])]||'#9f8b8c';
  // Four-legged mount, forward horn, saddle and a separate tall rider silhouette.
  for(const side of [-1,1])for(const front of [-1,1]){const swing=Math.sin(phase+side+front)*7;L([[front*23,side*9,30],[front*24+swing,side*9,15],[front*26-swing,side*9,2]],'#c2bca1',5);O(front*26-swing,side*9,2,5,3,'#5b5b51');}
  O(-1,0,34,34,17,'#d7d2b8');Q([[21,-9,36],[23,8,36],[37,6,59],[35,-5,63]],'#c4c5ae');O(41,0,61,13,8,'#e2dfc7');L([[47,0,67],[66,0,82]],'#e8d5a0',4);L([[30,-5,60],[30,-5,82]],'#7f8d81',4);L([[-30,0,39],[-43,0,28],[-48,0,14]],'#8a9283',6);
  Q([[-15,-14,45],[-15,14,45],[12,14,44],[12,-14,44]],'#5d5367');O(-2,0,48,13,6,'#9f7d57');L([[0,-7,62],[-3,-18,41],[5,-18,29]],'#514851',5);L([[0,7,62],[-3,18,41],[5,18,29]],'#514851',5);
  Q([[-4,-7,92],[3,8,92],[5,9,63],[-4,-9,63]],cloak);O(0,0,103,6,10,'#e2cfb9');L([[-3,-5,111],[-12,-7,107]],'#e6d9b5',3);L([[-3,5,111],[-12,7,107]],'#e6d9b5',3);L([[5,-7,102],[5,7,102]],'#687b7d',5);L([[0,-10,88],[12,-17,72],[23,0,63]],'#b7a394',4);
  if(e.role==='nomadArcher'){L([[13,15,110],[27,15,90],[13,15,70]],'#b4a071',3);L([[13,15,110],[13,15,70]],'#ead6a4',1);}else L([[10,13,52],[26+(attack?15:0),13,123]],'#baa883',3);
 }else if(e.race==='fairy'){
  const flap=Math.sin(phase*2)*9;for(const side of [-1,1]){O(-8,side*(15+flap*.3),49,14+flap*.3,27,'#cfdfd05f');L([[-6,0,47],[-17,side*29,68+flap],[-18,side*18,32]],'#b2cfba',1);}
  Q([[0,-5,55],[4,5,55],[2,9,28],[-4,-8,28]],'#819d96');O(0,0,64,5,7,'#d2c6b3');L([[1,-5,47],[8,-10,35]],'#c8b99d',3);L([[1,5,47],[8,10,35]],'#c8b99d',3);L([[0,-4,29],[1,-3,16]],'#7d8a79',2);L([[0,4,29],[1,3,16]],'#7d8a79',2);
 }else{
  const purple=e.role!=='arctRescuer',skin=purple?'#9b86b4':'#8da888',dark=purple?'#635c83':'#526f62';
  L([[-4,-12,43],[-6,-14,24],[-2,-15,4]],dark,13);L([[-4,12,43],[-6,14,24],[-2,15,4]],dark,13);O(0,0,68,25,31,skin);O(-3,0,95,17,18,skin);Q([[13,-13,96],[20,-8,92],[20,8,92],[13,13,96]],dark);L([[15,-9,89],[19,0,86],[15,9,89]],'#d1c7ab',3);for(let i=-7;i<=7;i+=7)L([[17,i,103],[22,i,110]],'#a8bbc0',2);
  L([[-2,-22,79],[0,-31,48],[8,-33,27]],dark,13);L([[-2,22,79],[2,32,52],[17,33,37]],skin,13);O(17,33,37,10,10,'#b9c9bd');L([[17,33,37],[35,33,37]],'#d4d9c8',5);O(19,0,64,6,9,'#b1d8b2');L([[18,-8,76],[18,-6,68]],dark,2);L([[15,-14,48],[17,-5,43]],dark,2);
  if(e.inventory?.arkCutter>0){L([[17,33,37],[39,33,48]],'#c4d6d0',8);for(let i=0;i<3;i++)O(32+i*5,33,47,4,8,'#827c9c');L([[38,28,50],[47,28,57],[47,38,57],[38,38,50]],'#b0ced3',3);}
  if(e.role==='arctRescuer'){L([[15,-14,96],[15,14,96]],'#adc5bd',6);O(4,34,55,10,19,'#ced4b0');O(8,34,66,7,8,'#6a9b9d');}
 }
 sprites.set(key,image);if(sprites.size>512){const k=sprites.keys().next().value;sprites.get(k).width=0;sprites.delete(k);}return image;
}
export function drawLoreActor(c,e,pose){if(!['emralaan','fairy','arctarian'].includes(e.race))return false;const frame=Math.floor((pose.walk||0)*2.5/(Math.PI*2)*6)%6,dir=((Math.round(e.dir||0)%8)+8)%8;oval(c,pose.x,pose.y+4,e.mounted?36:e.race==='arctarian'?24:12,10,'#091a164d');c.drawImage(sprite(e,dir,frame,e.attack>0?1:0),pose.x-110,pose.y-166);return true;}
export function drawLoreTent(c,b,world){if(b.type==='arkVault'){if(world.interiorAt(world.player)?.id===b.id)return false;const x=(b.x+b.w/2)*TILE,y=(b.y+b.h/2)*TILE,rx=b.w*TILE/2,ry=b.h*TILE/2;oval(c,x,y,rx+10,ry+8,'#384859');oval(c,x,y-30,rx,ry,'#9ca9ab');for(let i=1;i<4;i++){c.strokeStyle='#70858a77';c.lineWidth=4;c.beginPath();c.ellipse(x,y-30,rx*i/4,ry*i/4,0,0,Math.PI*2);c.stroke();}const dy=(b.door.y+1)*TILE;oval(c,x,dy-35,26,39,'#2d4c5b');line(c,[[x-24,dy],[x+24,dy]],'#c8cdb1',5);return true;}if(b.type!=='loreTent')return false;const x=b.x*TILE,y=b.y*TILE,w=b.w*TILE,h=b.h*TILE;oval(c,x+w/2,y+h,w*.65,h*.32,'#13201966');poly(c,[[x-8,y+h],[x+w/2,y-30],[x+w+8,y+h]],b.clanColor||(b.loreStyle==='hide'?'#b9a17b':'#7b7883'));poly(c,[[x+w/2,y-30],[x+w/2,y+h],[x+w+8,y+h]],'#5c5c68');poly(c,[[x+w*.38,y+h],[x+w/2,y+h*.4],[x+w*.62,y+h]],'#202d30');line(c,[[x+w/2,y-30],[x+w/2,y+h*.4]],'#cab185',4);return true;}
export function drawLoreSite(c,s,time){const x=s.x,y=s.y;
 switch(s.style){
 case'blueFire':oval(c,x,y,34,14,'#3c4355');poly(c,[[x-20,y],[x-8,y-50-Math.sin(time*5)*9],[x+2,y-20],[x+12,y-42],[x+22,y]],'#86c5db');break;
 case'pine':line(c,[[x,y],[x-15,y-55],[x+8,y-108]],'#7a6c4c',14);for(let i=0;i<4;i++)oval(c,x-12+i*8,y-70-i*15,36-i*5,16,'#506451');break;
 case'mirrors':case'ribs':for(let i=0;i<4;i++){const xx=x+(i-1.5)*45;c.fillStyle=s.style==='mirrors'?'#293b48':'#9ca4a0';c.fillRect(xx-18,y-28+(i%2)*6,36,s.style==='mirrors'?26:8);line(c,[[xx-15,y-24],[xx+15,y-24]],s.style==='mirrors'?'#b7c9b5':'#6a8a87',2);}break;
 case'web':for(let i=-3;i<=3;i++){line(c,[[x-150,y+i*16],[x,y-85+i*8],[x+160,y+i*17]],'#bac4ba88',2);line(c,[[x+i*35,y+75],[x+i*20,y-160]],'#d5d8bf55',1);}break;
 case'pods':for(let i=0;i<5;i++){oval(c,x+(i%3-1)*35,y-Math.floor(i/3)*35,15,23,'#a3a88b');oval(c,x+(i%3-1)*35,y-Math.floor(i/3)*35-4,9,17,'#4c6f59');}break;
 case'barrier':for(let i=-3;i<=3;i++){c.fillStyle='#8d9994';c.fillRect(x+i*48-9,y-105,18,115);}line(c,[[x-155,y-95],[x+155,y-95]],'#bbc5b4',8);line(c,[[x-155,y-25],[x+155,y-25]],'#718b8a',4);break;
 case'hull':oval(c,x,y-55,145,70,'#a0aaa4');poly(c,[[x-145,y-55],[x+145,y-55],[x+115,y-6],[x-100,y-6]],'#52686b');for(let i=-2;i<=2;i++)line(c,[[x+i*43,y-8],[x+i*40,y+35+Math.sin(time+i)*5]],'#9cbcb744',6);break;
 case'vault':oval(c,x,y,105,55,'#505d70');oval(c,x,y-20,98,63,'#8f9da1');oval(c,x,y,25,29,'#354b5a');line(c,[[x-21,y+7],[x+21,y+7]],'#a7beb4',3);break;
 case'frame':for(const side of [-1,1]){line(c,[[x+side*95,y+15],[x+side*95,y-130],[x+side*50,y-172]],'#b4b9ab',17);line(c,[[x+side*95,y-95],[x+side*80,y-110]],'#606d70',4);}break;
 case'shell':oval(c,x,y-25,34,52,'#9bada5');oval(c,x,y-55,22,23,'#426d78');line(c,[[x-27,y],[x+27,y]],'#d2c8a3',4);break;
 case'workbench':c.fillStyle='#a3b1a8';c.fillRect(x-70,y-35,140,22);for(let i=0;i<4;i++)line(c,[[x-50+i*32,y-35],[x-50+i*32,y-65]],'#bacdbb',6);break;
 case'eye':oval(c,x,y-25,45,20,'#bbb195');line(c,[[x-40,y-25],[x+40,y-25]],'#655f58',3);line(c,[[x-32,y-58],[x+32,y+5]],'#685b4e',5);break;
 case'road':c.fillStyle='#4b4f51';c.fillRect(x-110,y-60,220,120);for(let i=0;i<4;i++){c.fillStyle='#c4c0a4';c.fillRect(x-90+i*55,y-4,25,5);}break;
 default:oval(c,x,y,28,12,'#a6a187');oval(c,x,y-4,20,9,'#4d6c70');
 }
}
export function drawRift(c,r,time){c.save();c.translate(r.x,r.y-35);const pulse=1+Math.sin(time*3+r.phase)*.16;c.scale(pulse,pulse);c.shadowColor='#93bcca';c.shadowBlur=18;c.fillStyle='#152e42';c.beginPath();for(let i=0;i<=24;i++){const a=i/24*TAU,rr=1+.13*Math.sin(a*5+time);const x=Math.cos(a)*26*rr,y=Math.sin(a)*48*rr;i?c.lineTo(x,y):c.moveTo(x,y);}c.fill();c.shadowBlur=0;c.strokeStyle='#b4ced7';c.lineWidth=2;c.stroke();for(let i=0;i<5;i++)line(c,[[-15,(-35+i*16+time*12)%80-40],[14,(-35+i*16+time*12)%80-44]],'#adc5b477',1);c.restore();}
export function drawPurpleAir(c,w,bounds,time){if(!w.loreGeography)return;const a=w.loreGeography.ark;if(a.x*TILE<bounds.left-a.rx*TILE||a.x*TILE>bounds.right+a.rx*TILE||a.y*TILE<bounds.top-a.ry*TILE||a.y*TILE>bounds.bottom+a.ry*TILE)return;
 for(let y=Math.max(0,Math.floor(bounds.top/TILE));y<=Math.min(H-1,Math.ceil(bounds.bottom/TILE));y++)for(let x=Math.max(0,Math.floor(bounds.left/TILE));x<=Math.min(W-1,Math.ceil(bounds.right/TILE));x++)if(w.arkAtmosphere?w.arkAtmosphere[y*W+x]:w.tile(x,y)===16){c.fillStyle='#b48ad122';c.fillRect(x*TILE,y*TILE,TILE+1,TILE+1);line(c,[[x*TILE,y*TILE+25+Math.sin(time+x*.1)*5],[x*TILE+42,y*TILE+25]],'#c3a2d72b',5);}}
