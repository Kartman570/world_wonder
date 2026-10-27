let spriteFurniture=null;
export function setFurnitureSprites(draw){spriteFurniture=draw;}
import {drawAlienProp} from './alien-render.js';
import {drawIndustryProp} from './adventure-render.js';
// Rooms occupy the same world coordinates as their exterior; no level switch or teleport.
import {TILE,point} from './content.js';
export const ENTERABLE=new Set(['stable','arkVault','prison','cage','house','smith','inn','warehouse','apothecary','castle','cathedral','library','training','wizardHall','tailor','dungeonGate','townhall','barracks','farmshop','armory','bowshop','leatherworks','provisions']);
export function prepareRooms(buildings){
 for(let i=0;i<buildings.length;i++){
  const b=buildings[i];b.id=i+1;b.enterable=ENTERABLE.has(b.type);if(!b.enterable)continue;
  // Workshops keep their street frontage while gaining usable space toward the rear.
  if(!b.fullRoom&&['smith','inn','warehouse','apothecary','tailor'].includes(b.type)){b.y-=2;b.h+=2;}
  b.door={x:b.x+Math.floor(b.w/2),y:b.y+b.h-1};b.entrance=point(b.door.x+.5,b.door.y+1.55);
  b.workSpot=point(b.x+b.w/2+.5,b.y+2.5);
  b.furniture=[];const add=(kind,x,y,w=1,h=1,solid=true)=>b.furniture.push({kind,x:b.x+x,y:b.y+y,w,h,solid});
  if(b.type==='stable'){add('rack',1,1,2,1);add('barrels',6,1);add('crates',1,4);b.workSpot=point(b.x+4.5,b.y+2.5);}
  if(b.type==='arkVault'){if(b.w>=15){for(const [x,y]of [[3,3],[10,3],[3,9],[10,9]])add('arkNest',x,y,2,2);}else add('arkNest',2,3,2,2);add('arkVessel',6,2,1,1);add('arkResonator',7,5,1,1);b.workSpot=point(b.x+b.w/2,b.y+b.h/2);}
  if(b.type==='cathedral')continue;
  if(b.type==='townhall'){add('table',2,2,2,1);add('shelf',1,1,2,1);}
  if(b.type==='barracks'){for(let j=1;j<b.w-2;j+=3)add('bed',j,1);add('rack',1,4);add('table',4,4,2,1);}
  if(['farmshop','armory','bowshop','leatherworks','provisions'].includes(b.type)){add('counter',3,3,2,1);add(['armory','bowshop'].includes(b.type)?'rack':'crates',1,1,2,1);add(b.type==='leatherworks'?'hideRack':'barrels',5,1);}

  if(b.type==='tailor'){add('loom',1,1,2,2);add('sewingTable',4,1,2,1);add('fiberBundle',1,4);b.workSpot=point(b.x+3.5,b.y+4.5);}
  if(b.type==='dungeonGate'){add('urn',1,1);add('shelf',4,1,2,1);if(b.ruined)add('fallenColumn',1,3,2,1);}
  if(b.type==='house'){add('bed',1,1,1,1);if(b.w>=8){for(let x=3;x<b.w-1;x+=2)add('bed',x,1);add('bed',1,b.h-3);add('table',b.w-3,b.h-3);}else add('table',3,1,1,1);b.workSpot=point(b.x+2.5,b.y+2.5);}
  if(b.type==='smith'){add('forge',1,1);add('brazier',5,4);add('rack',5,1);add('counter',3,3,2,1);add('anvil',1,4);}
  if(b.type==='inn'){add('hearth',1,1);add('barrels',5,1);add('counter',3,3,2,1);add('table',1,4);}
  if(b.type==='apothecary'){add('shelf',1,1,2,1);add('herbs',5,1);add('counter',3,3,2,1);add('herbs',1,4);}
  if(b.type==='warehouse'){add('crates',1,1,2,1);add('crates',5,1);add('counter',3,3,2,1);add('barrels',1,4);}
  if(b.type==='castle'){add('throne',6,1);add('table',2,3,2,1);add('table',10,3,2,1);b.workSpot=point(b.x+7.5,b.y+2.5);}
 }
}
export function roomName(b){return b.name||({house:'Жилой дом',smith:'Кузница',inn:'Трактир',warehouse:'Городской склад',apothecary:'Травная лавка',castle:'Замок',cathedral:'Собор'})[b.type];}
export function arkRoomCell(b,x,y){const cx=b.x+b.w/2,cy=b.y+b.h/2,rx=b.w/2,ry=b.h/2,q=((x+.5-cx)/rx)**2+((y+.5-cy)/ry)**2;if(q>1)return 'outside';if(x===b.door.x&&y>=Math.floor(cy))return 'floor';return ((x+.5-cx)/(rx-1))**2+((y+.5-cy)/(ry-1))**2<1?'floor':'wall';}
export function drawInterior(c,b,night=false){
 if(b.type==='arkVault'){const x=(b.x+b.w/2)*TILE,y=(b.y+b.h/2)*TILE,rx=b.w*TILE/2,ry=b.h*TILE/2;c.fillStyle='#424456';c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();c.fillStyle='#8a8b9e';c.beginPath();c.ellipse(x,y,rx-TILE*.7,ry-TILE*.7,0,0,Math.PI*2);c.fill();for(let i=1;i<5;i++){c.strokeStyle='#b2c2bd44';c.lineWidth=2;c.beginPath();c.ellipse(x,y,(rx-TILE)*i/5,(ry-TILE)*i/5,0,0,Math.PI*2);c.stroke();}c.fillStyle='#acb9ae';c.fillRect(b.door.x*TILE,b.door.y*TILE,TILE,TILE);for(const f of b.furniture)drawFurnishing(c,f);return;}

 const x=b.x*TILE,y=b.y*TILE,w=b.w*TILE,h=b.h*TILE;
 c.fillStyle='#29392f';c.fillRect(x-3,y-3,w+6,h+6);
 c.fillStyle=['castle','wizardHall'].includes(b.type)?'#8a8c77':'#9b8766';c.fillRect(x,y,w,h);
 c.strokeStyle='#4c493643';c.lineWidth=1;
 for(let yy=y+TILE;yy<y+h;yy+=24){c.beginPath();c.moveTo(x+TILE,yy);c.lineTo(x+w-TILE,yy);c.stroke();}
 for(let xx=x+TILE;xx<x+w-TILE;xx+=48){c.beginPath();c.moveTo(xx,y+TILE);c.lineTo(xx,y+h-TILE);c.stroke();}
 c.fillStyle=b.type==='castle'?'#6b5550':'#766b4d';c.fillRect((b.door.x-.15)*TILE,y+2*TILE,TILE*1.3,h-3*TILE);
 // Cutaway walls remain solid even when the roof is hidden.
 c.fillStyle='#546557';c.fillRect(x,y,w,TILE);c.fillRect(x,y,TILE,h);c.fillRect(x+w-TILE,y,TILE,h);
 c.fillRect(x,y+h-TILE,(b.door.x-b.x)*TILE,TILE);c.fillRect((b.door.x+1)*TILE,y+h-TILE,(b.x+b.w-b.door.x-1)*TILE,TILE);
 c.fillStyle='#bdba99';c.fillRect(x,y,w,6);c.fillRect(x,y,6,h);c.fillRect(x+w-6,y,6,h);
 const dx=b.door.x*TILE,dy=b.door.y*TILE;c.fillStyle='#bba981';c.fillRect(dx,dy,TILE,TILE);c.strokeStyle='#665c44';c.strokeRect(dx+3,dy+3,TILE-6,TILE-6);
 for(const f of b.furniture)drawFurnishing(c,f);
 c.font='10px Manrope,system-ui';c.textAlign='center';c.fillStyle='#d6cda8';c.fillText('ВЫХОД',dx+TILE/2,dy+TILE-9);
}
export function drawDoor(c,b){
 const x=(b.door.x+.5)*TILE,y=(b.door.y+1)*TILE;
 c.fillStyle='#1e3029';c.fillRect(x-23,y-53,46,53);
 c.strokeStyle='#ceb78b';c.lineWidth=3;c.strokeRect(x-24,y-54,48,54);
 c.fillStyle='#af9873';c.fillRect(x-28,y,56,7);
 c.fillStyle='#d9bd78';c.beginPath();c.arc(x+15,y-24,2.5,0,7);c.fill();
}

export function drawFurnishing(c,f){if(spriteFurniture?.(c,f))return;if(drawAlienProp(c,f))return;if(drawIndustryProp(c,f))return;if(drawWorkProp(c,f))return;const fx=f.x*TILE,fy=f.y*TILE,fw=f.w*TILE,fh=f.h*TILE;
  c.fillStyle='#24332c50';c.fillRect(fx+7,fy+10,fw-4,fh-4);
  c.fillStyle=['forge','hearth','anvil'].includes(f.kind)?'#505951':'#715438';c.fillRect(fx+5,fy+5,fw-10,fh-10);
  c.strokeStyle='#bca175';c.strokeRect(fx+5,fy+5,fw-10,fh-10);
  if(['forge','hearth'].includes(f.kind)){const g=c.createRadialGradient(fx+24,fy+24,2,fx+24,fy+24,64);g.addColorStop(0,'#ffbd6666');g.addColorStop(1,'#ffbd6600');c.fillStyle=g;c.fillRect(fx-40,fy-40,128,128);c.fillStyle='#e1a562';c.fillRect(fx+13,fy+13,22,22);}
  if(f.kind==='bed'){c.fillStyle='#b8b6a3';c.fillRect(fx+8,fy+7,fw-16,10);c.fillStyle='#728a7b';c.fillRect(fx+8,fy+19,fw-16,fh-26);}
  if(['rack','shelf','herbs'].includes(f.kind))for(let j=0;j<f.w*5;j++){c.fillStyle=['#b3a369','#789867','#b6b690'][j%3];c.fillRect(fx+10+j*7,fy+12,4,22);}
  if(f.kind==='counter'){c.fillStyle='#bda374';c.fillRect(fx+7,fy+8,fw-14,fh-18);c.fillStyle='#d2c79a';c.fillRect(fx+15,fy+13,20,14);}
  if(f.kind==='barrels'){c.fillStyle='#a08858';c.beginPath();c.ellipse(fx+24,fy+24,16,17,0,0,Math.PI*2);c.fill();}
  if(f.kind==='anvil'){c.fillStyle='#b6bba9';c.fillRect(fx+10,fy+14,30,10);c.fillRect(fx+19,fy+23,12,13);}
  if(['sarcophagus','fallenColumn','pedestal'].includes(f.kind)){c.fillStyle=f.kind==='pedestal'?'#aaa58b':'#848a83';c.fillRect(fx+5,fy+6,fw-10,fh-12);c.fillStyle='#c0bc9f';c.fillRect(fx+8,fy+5,fw-16,7);c.strokeStyle='#414d4a';c.strokeRect(fx+9,fy+15,fw-18,fh-25);if(f.kind==='sarcophagus'){c.strokeStyle='#b3aa87';c.beginPath();c.moveTo(fx+fw/2,fy+15);c.lineTo(fx+fw/2,fy+fh-12);c.moveTo(fx+13,fy+23);c.lineTo(fx+fw-13,fy+23);c.stroke();}if(f.kind==='fallenColumn'){c.fillStyle='#303a36';c.fillRect(fx+22,fy+8,6,fh-16);}}
  if(f.kind==='urn'){c.fillStyle='#aa9169';c.beginPath();c.ellipse(fx+24,fy+26,13,16,0,0,Math.PI*2);c.fill();c.fillStyle='#d1bc90';c.fillRect(fx+15,fy+8,18,6);c.fillStyle='#43443a';c.fillRect(fx+18,fy+8,12,3);}
  if(f.kind==='stalagmite'){c.fillStyle='#a4997e';c.beginPath();c.moveTo(fx+7,fy+40);c.lineTo(fx+21,fy-3);c.lineTo(fx+33,fy+39);c.fill();c.fillStyle='#686e68';c.beginPath();c.moveTo(fx+24,fy+43);c.lineTo(fx+36,fy+12);c.lineTo(fx+45,fy+43);c.fill();}
  if(f.kind==='throne'){c.fillStyle='#9b7757';c.fillRect(fx+8,fy-7,32,45);c.fillStyle='#b2a16b';c.fillRect(fx+13,fy+5,22,25);}
}
function drawWorkProp(c,f){
 const x=f.x*TILE,y=f.y*TILE,w=f.w*TILE,h=f.h*TILE,kind=f.kind;
 const kinds=['dock','loom','sewingTable','fiberBundle','sawhorse','axeBlock','toolRack','fishingRod','bucket','brazier','hideRack','smugglerCart','palisade','weaponRack','campBanner'];if(!kinds.includes(kind))return false;
 const line=(points,color,width=2)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();};
 const ellipse=(xx,yy,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(xx,yy,rx,ry,0,0,Math.PI*2);c.fill();};
 ellipse(x+w/2+5,y+h*.7,w*.5,h*.2,'#101b1650');
 if(kind==='fishingRod'){line([[x+8,y+35],[x+35,y-46]],'#b99c6c',3);line([[x+35,y-46],[x+55,y-15],[x+66,y+36]],'#d6d1ad',1);ellipse(x+66,y+36,3,2,'#c4c2a1');return true;}
 if(kind==='bucket'){c.fillStyle='#8b8e83';c.fillRect(x+9,y+16,29,25);ellipse(x+23.5,y+16,15,5,'#bac3b2');ellipse(x+23.5,y+16,11,3,'#426e7a');ellipse(x+23.5,y+40,14,4,'#606c65');line([[x+10,y+22],[x+12,y+5],[x+32,y+5],[x+37,y+22]],'#a8af9b',2);return true;}
 if(kind==='brazier'){c.fillStyle='#4d5652';c.fillRect(x+10,y+10,28,23);line([[x+13,y+30],[x+8,y+45]],'#35453e',4);line([[x+34,y+30],[x+40,y+45]],'#35453e',4);ellipse(x+24,y+10,19,7,'#a69673');ellipse(x+24,y+9,14,5,'#d5a055');c.fillStyle='#e9bc68';c.beginPath();c.moveTo(x+14,y+8);c.lineTo(x+21,y-16);c.lineTo(x+27,y-2);c.lineTo(x+32,y-11);c.lineTo(x+36,y+9);c.fill();return true;}
 if(kind==='loom'){c.fillStyle='#69553a';c.fillRect(x+6,y-10,9,h+6);c.fillRect(x+w-17,y-10,9,h+6);c.fillStyle='#c0a47a';c.fillRect(x+3,y-12,w-8,10);c.fillRect(x+4,y+h-25,w-8,9);for(let i=0;i<15;i++)line([[x+18+i*(w-40)/14,y],[x+18+i*(w-40)/14,y+h-25]],i%2?'#e5d6ae':'#b7ad8a',1);c.fillStyle='#648780';c.fillRect(x+18,y+h*.35,w-40,h*.42);line([[x+18,y+h*.45],[x+w-22,y+h*.57]],'#d5b97f',5);return true;}
 if(kind==='sewingTable'){c.fillStyle='#6c5338';c.fillRect(x+3,y+18,w-6,h-24);c.fillStyle='#b29970';c.fillRect(x,y+8,w,14);c.fillStyle='#96afa8';c.fillRect(x+12,y+8,w*.6,20);line([[x+w*.35,y+9],[x+w*.4,y+24],[x+w*.6,y+24]],'#dfd3aa',1);ellipse(x+w-17,y+8,5,7,'#d0bc8b');return true;}
 if(kind==='fiberBundle'){for(let i=0;i<9;i++)line([[x+15+i*2,y+38],[x+7+i*5,y+4]],'#c4b878',3);line([[x+7,y+24],[x+39,y+24]],'#867552',3);return true;}
 if(kind==='sawhorse'){line([[x+13,y+14],[x+6,y+42]],'#69553b',5);line([[x+13,y+14],[x+24,y+41]],'#69553b',5);line([[x+w-18,y+14],[x+w-27,y+42]],'#69553b',5);line([[x+w-18,y+14],[x+w-7,y+41]],'#69553b',5);c.fillStyle='#9f8157';c.fillRect(x+4,y+5,w-8,15);ellipse(x+w-4,y+12,6,8,'#d0b584');line([[x+30,y-7],[x+48,y+24]],'#c1c8b4',4);return true;}
 if(kind==='axeBlock'){ellipse(x+24,y+30,19,10,'#785c3b');c.fillStyle='#98764b';c.fillRect(x+5,y+13,38,17);ellipse(x+24,y+13,19,9,'#c0a475');line([[x+17,y+16],[x+31,y-20]],'#9d8359',4);c.fillStyle='#b7c0b5';c.fillRect(x+27,y-23,17,10);return true;}
 if(kind==='palisade'){for(let j=0;j<f.h;j++)for(let i=0;i<3;i++){const xx=x+7+i*14,yy=y+j*TILE;c.fillStyle='#87734f';c.fillRect(xx,yy-13,10,54);c.beginPath();c.moveTo(xx,yy-13);c.lineTo(xx+5,yy-27);c.lineTo(xx+10,yy-13);c.fill();}return true;}
 if(kind==='campBanner'){line([[x+20,y+35],[x+20,y-75]],'#b09a70',4);c.fillStyle=['#9d5848','#6d7357','#77718b'][f.style||0];c.fillRect(x+22,y-74,47,48);c.fillStyle='#dec58e';c.font='25px Georgia';c.textAlign='center';c.fillText(['♧','☷','✣'][f.style||0],x+45,y-41);return true;}
 if(kind==='dock'){c.fillStyle='#876b47';c.fillRect(x,y,TILE,TILE);c.strokeStyle='#443f2e';c.lineWidth=2;for(let j=0;j<6;j++){c.beginPath();c.moveTo(x,y+j*8);c.lineTo(x+TILE,y+j*8);c.stroke();}c.fillStyle='#b8a078';c.fillRect(x+3,y,6,TILE);c.fillRect(x+TILE-9,y,6,TILE);return true;}
 if(kind==='smugglerCart'){c.fillStyle='#71583c';c.fillRect(x+5,y+20,w-10,h-35);c.strokeStyle='#b39768';c.lineWidth=3;c.strokeRect(x+5,y+20,w-10,h-35);ellipse(x+12,y+h-20,11,17,'#313c32');ellipse(x+w-12,y+h-20,11,17,'#313c32');c.fillStyle='#9c8863';c.fillRect(x+25,y+8,w-50,h-30);line([[x+w/2,y+h-10],[x+w/2,y+h+30]],'#a38c62',5);return true;}
 line([[x+9,y+40],[x+9,y-9],[x+w-9,y-9],[x+w-9,y+40]],'#9a805b',5);
 if(kind==='hideRack'){c.fillStyle='#af946a';c.beginPath();c.moveTo(x+20,y);c.lineTo(x+w-20,y+1);c.lineTo(x+w-14,y+20);c.lineTo(x+w-30,y+29);c.lineTo(x+w/2,y+22);c.lineTo(x+30,y+29);c.lineTo(x+14,y+20);c.fill();}
 else for(let i=0;i<3;i++)line([[x+20+i*22,y+25],[x+28+i*22,y-17]],i%2?'#bcc6b8':'#c3aa7a',3);
 return true;
}
