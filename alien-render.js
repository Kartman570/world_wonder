import {TILE} from './content.js';
const oval=(c,x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
export function drawAlienProp(c,f,time=0){if(!f.kind?.startsWith('ark'))return false;const x=(f.x+f.w/2)*TILE,y=(f.y+f.h/2)*TILE;
 oval(c,x,y+14,35,16,'#192c3444');
 if(f.kind==='arkRock'){for(let i=0;i<Math.min(8,f.worked||0);i++)oval(c,x-50+i*13,y+27+i%2*9,6,3,'#b8b5c8');for(let i=0;i<4;i++){c.fillStyle=['#8d88a4','#777b93','#a4a6aa'][i%3];c.beginPath();c.moveTo(x-50+i*20,y+20);c.lineTo(x-36+i*20,y-40-i%2*25);c.lineTo(x-13+i*20,y+20);c.fill();}return true;}
 if(f.kind==='arkNest'){oval(c,x,y,70,49,'#626779');oval(c,x,y-8,57,39,'#a3b3aa');for(let i=-2;i<=2;i++)oval(c,x+i*17,y-8,6,26,'#8b8b9f');return true;}
 if(f.kind==='arkGarden'){for(let i=0;i<7;i++){const xx=x+Math.cos(i*2.4)*38,yy=y+Math.sin(i*2.4)*24;oval(c,xx,yy,13,23,'#63777e');oval(c,xx,yy-13,10,15,'#baacd1');oval(c,xx,yy-19,4,7,'#c6dbc7');}return true;}
 if(f.kind==='arkFilter'){if(f.fedUntil){oval(c,x,y,55+Math.sin(time*2)*5,28,'#c0a5ce33');}oval(c,x,y,47,25,'#638185');for(let i=-1;i<=1;i++){oval(c,x+i*25,y-35,16,48,'#a3a0ba');oval(c,x+i*25,y-68,11,18,'#5b507a');}return true;}
 if(f.kind==='arkVessel'){oval(c,x,y-17,26,42,'#a0b6ae');oval(c,x,y-37,17,24,'#566d83');oval(c,x,y-40,12,18,'#b19bc499');return true;}
 if(f.kind==='arkResonator'){oval(c,x,y,37,19,'#799095');c.strokeStyle='#b9c9c4';c.lineWidth=8;for(let i=0;i<3;i++){c.beginPath();c.ellipse(x,y-42-i*22,31-i*6,11-i*2,0,0,Math.PI*2);c.stroke();}oval(c,x,y-48,8,12,'#d9c1e3');return true;}
 return false;
}
export function drawRipple(c,fx,time){if(!fx.beam)return false;c.save();c.globalAlpha=Math.min(1,fx.life*3);const dx=fx.tx-fx.x,dy=fx.ty-fx.y,length=Math.hypot(dx,dy);c.translate(fx.x,fx.y-35);c.rotate(Math.atan2(dy,dx));c.strokeStyle='#e0dcfa';c.lineWidth=2;c.beginPath();c.moveTo(0,0);c.lineTo(length,0);c.stroke();for(let i=8;i<length;i+=22){const wave=Math.sin(time*31+i*.2)*5;c.strokeStyle=i%3?'#b6c9dfbb':'#d4b9ed';c.beginPath();c.ellipse(i,wave,7+Math.sin(i+time*24)*3,13,Math.PI/2,0,Math.PI*2);c.stroke();}c.restore();return true;}
