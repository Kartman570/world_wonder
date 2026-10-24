// Procedural facade silhouettes and street-side tools remain legible without labels.
const palettes={prison:'#646960',library:'#6c646e',training:'#79734e',wizardHall:'#6b6882',smith:'#463e39',tailor:'#63818b',warehouse:'#7c684e',barracks:'#6a5550',armory:'#596976',bowshop:'#716b46',inn:'#8c5b47',apothecary:'#50694c',farmshop:'#9a8650',stable:'#756043',townhall:'#818277',leatherworks:'#815e43',provisions:'#82734a'};
export function drawArchitecture(c,b,tile,time=0){
 const tone=palettes[b.type];if(!tone)return;const x=b.x*tile,y=b.y*tile,w=b.w*tile,h=b.h*tile,base=y+h;
 c.save();c.lineWidth=3;c.strokeStyle='#453f32';
 // Roofs have different massing as well as different street furniture.
 const roof=(points,color)=>{c.fillStyle=color;c.beginPath();points.forEach(([xx,yy],i)=>i?c.lineTo(xx,yy):c.moveTo(xx,yy));c.closePath();c.fill();c.stroke();};
 if(b.type==='warehouse'){roof([[x-12,y+18],[x+w*.3,y-65],[x+w*.7,y-65],[x+w+12,y+18]],tone);for(let i=1;i<5;i++){c.beginPath();c.moveTo(x+w*i/5,y-48);c.lineTo(x+w*i/5,y+12);c.stroke();}c.fillStyle='#a69572';c.fillRect(x+w*.4,y-42,w*.2,37);c.fillStyle='#423e32';c.fillRect(x+w*.44,y-33,w*.12,28);}
 else if(b.type==='barracks'||b.type==='prison'){c.fillStyle='#72796b';c.fillRect(x-8,y-35,w+16,69);for(let xx=x-8;xx<x+w;xx+=30)c.fillRect(xx,y-51,18,25);c.fillStyle=tone;c.fillRect(x+22,y+20,w-44,10);}
 else if(b.type==='smith'){roof([[x-10,y+24],[x-10,y-20],[x+w*.7,y-45],[x+w+10,y-12],[x+w+10,y+24]],tone);for(let i=0;i<3;i++){c.fillStyle='#2b3030';c.fillRect(x+28+i*45,y-13,29,15);}}
 else if(b.type==='stable'){roof([[x-20,y+24],[x+w*.5,y-80],[x+w+20,y+24]],tone);c.fillStyle='#453d2f';for(let i=0;i<3;i++){c.fillRect(x+22+i*(w-44)/3,y+h*.45,(w-70)/3,h*.5);}}
 else if(b.type==='tailor'||b.type==='apothecary'||b.type==='farmshop'){roof([[x-14,y+15],[x+w*.5,y-60],[x+w+14,y+15],[x+w*.5,y+40]],tone);for(let i=0;i<8;i++){c.fillStyle=i%2?tone:'#c4b995';c.fillRect(x+10+i*(w-20)/8,y+h-115,(w-20)/8,34);}}
 else if(b.type==='inn'){roof([[x-20,y+12],[x+w*.35,y-85],[x+w*.65,y-85],[x+w+20,y+12],[x+w/2,y+42]],tone);c.fillStyle='#cfba8d';c.fillRect(x+w*.43,y-44,w*.14,36);c.fillStyle='#514c3b';c.fillRect(x+w*.46,y-38,w*.08,25);}
 else {roof([[x-14,y+15],[x+w*.5,y-56],[x+w+14,y+15],[x+w*.5,y+40]],tone);}

 // Timber framing, a colored street awning and an occupational sign.
 c.fillStyle='#514a39';for(const xx of [x+7,x+w-15])c.fillRect(xx,y+30,8,h-30);c.fillRect(x,y+h-70,w,7);
 c.fillStyle=tone;c.fillRect(x+12,base-104,w-24,19);c.strokeRect(x+12,base-104,w-24,19);
 const px=x+30,py=base+25;c.translate(px,py);
 const box=(xx,yy,ww=34,hh=28)=>{c.fillStyle='#9e8053';c.fillRect(xx,yy,ww,hh);c.strokeRect(xx,yy,ww,hh);c.beginPath();c.moveTo(xx,yy);c.lineTo(xx+ww,yy+hh);c.stroke();};
 const rack=()=>{c.fillStyle='#6e5136';c.fillRect(0,-48,8,55);c.fillRect(68,-48,8,55);c.fillRect(0,-46,76,7);for(let i=0;i<4;i++){c.strokeStyle='#bdc4bb';c.lineWidth=5;c.beginPath();c.moveTo(14+i*16,-59);c.lineTo(14+i*16,-5);c.stroke();c.strokeStyle='#66503c';c.beginPath();c.moveTo(6+i*16,-18);c.lineTo(22+i*16,-18);c.stroke();}};
 if(b.type==='smith'){c.fillStyle='#403c36';c.fillRect(5,-18,42,14);c.fillRect(15,-7,15,19);c.beginPath();c.moveTo(-8,-25);c.lineTo(57,-25);c.lineTo(44,-13);c.lineTo(5,-13);c.closePath();c.fill();c.fillStyle='#6d5142';c.fillRect(74,-24,38,30);c.fillStyle='#e3a554';c.beginPath();c.ellipse(93,-25,15,8,0,0,7);c.fill();for(let i=0;i<3;i++){c.fillStyle=i%2?'#f6cb6b':'#db7639';c.fillRect(84+i*8,-38-Math.sin(time*5+i)*5,5,15);}c.fillStyle='#4a433b';c.fillRect(w-94,-h-48,27,70);c.fillStyle='#9b9280';c.fillRect(w-99,-h-52,37,9);}
 else if(['barracks','armory','bowshop','training'].includes(b.type)){if(b.type==='bowshop'){c.strokeStyle='#b8a475';c.lineWidth=4;for(let i=0;i<4;i++){c.beginPath();c.arc(i*19,-21,26,-1.2,1.2);c.stroke();c.lineWidth=1;c.beginPath();c.moveTo(i*19+9,-45);c.lineTo(i*19+9,3);c.stroke();c.lineWidth=4;}}else rack();if(b.type==='bowshop'){c.strokeStyle='#c6af75';c.lineWidth=5;c.beginPath();c.arc(39,-h-8,34,-1.3,1.3);c.stroke();c.lineWidth=2;c.beginPath();c.moveTo(48,-h-41);c.lineTo(48,-h+25);c.stroke();}if(b.type==='barracks'){c.fillStyle=b.style?.flag||'#a65f4f';c.fillRect(w-90,-h-35,32,76);c.strokeStyle='#c1b187';c.beginPath();c.moveTo(w-75,-h-10);c.lineTo(w-75,-h+15);c.moveTo(w-87,-h+2);c.lineTo(w-63,-h+2);c.stroke();}}
 else if(b.type==='prison'){c.strokeStyle='#343b39';c.lineWidth=6;for(const xx of [15,w-93]){for(let i=0;i<4;i++){c.beginPath();c.moveTo(xx+i*10,-100);c.lineTo(xx+i*10,-57);c.stroke();}c.beginPath();c.moveTo(xx,-79);c.lineTo(xx+30,-79);c.stroke();}}
 else if(b.type==='library'){box(0,-58,65,65);for(let i=0;i<7;i++){c.fillStyle=['#717b66','#946b59','#968a6b'][i%3];c.fillRect(5+i*8,-52,6,43);}}
 else if(b.type==='wizardHall'){c.fillStyle='#9691af';c.beginPath();c.ellipse(w/2-30,-h-65,65,32,0,Math.PI,Math.PI*2);c.fill();c.fillStyle='#c2bba4';c.fillRect(w/2-34,-h-120,8,30);}
 else if(b.type==='tailor'||b.type==='leatherworks'){for(let i=0;i<4;i++){c.fillStyle=['#a9b8b2','#a16c65','#b7a16d','#74859b'][i];c.fillRect(i*21,-34,18,41);c.beginPath();c.ellipse(i*21+9,-34,9,6,0,0,7);c.fill();c.stroke();}c.fillStyle='#c4b48b';c.fillRect(0,-51,85,5);}
 else if(b.type==='warehouse'||b.type==='provisions'){box(0,-22);box(38,-22);box(19,-53);box(w-95,-22);c.fillStyle='#473c2e';c.fillRect(w*.48,-65,w*.30,50);}
 else if(b.type==='stable'){c.strokeStyle='#b99e6c';c.lineWidth=7;for(let i=0;i<5;i++){c.beginPath();c.moveTo(i*18,-32);c.lineTo(i*18,10);c.stroke();}c.beginPath();c.moveTo(-5,-15);c.lineTo(80,-15);c.stroke();c.fillStyle='#af995b';c.fillRect(92,-16,40,25);}
 else if(b.type==='inn'){c.fillStyle='#8c693f';c.fillRect(0,-20,54,12);c.fillRect(7,-8,6,17);c.fillRect(42,-8,6,17);c.fillStyle='#b6a274';c.fillRect(w-86,-115,34,37);c.fillStyle='#654b32';c.fillRect(w-77,-109,14,22);c.strokeRect(w-63,-105,9,14);}
 else if(b.type==='apothecary'||b.type==='farmshop'){box(0,-10,65,22);for(let i=0;i<5;i++){c.fillStyle=b.type==='farmshop'?'#c4a769':'#74865d';c.beginPath();c.ellipse(7+i*12,-13,8,12,0,0,7);c.fill();}}
 else if(b.type==='townhall'){c.fillStyle='#b4aa8c';for(let i=0;i<3;i++)c.fillRect(w*.3+i*30,-110,10,70);c.fillStyle=b.style?.flag||'#88634a';c.fillRect(w*.5,-h-25,26,42);}
 c.restore();
}
export function drawAlienPlant(c,t){
 const x=t.x,y=t.y,s=t.s||1,k=t.species;c.save();c.translate(x,y);c.scale(s,s);c.strokeStyle='#78969c';c.lineWidth=k===0?11:5;c.fillStyle='#536c7188';c.beginPath();c.ellipse(0,3,k===0?35:18,9,0,0,7);c.fill();
 if(k===0){c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-30,-45,28,-80,0,-140);c.stroke();for(let i=0;i<5;i++){const yy=-45-i*22;c.fillStyle=['#8e91b8','#b1a5ce','#749d9d'][i%3];c.beginPath();c.ellipse(Math.sin(i*2)*18,yy,45-i*5,12,Math.sin(i)*.3,0,7);c.fill();c.stroke();}c.fillStyle='#d1bde0';c.beginPath();c.ellipse(0,-150,9,14,0,0,7);c.fill();}
 else if(k===1){for(let i=0;i<5;i++){const dx=(i-2)*14;c.strokeStyle='#7b8e94';c.beginPath();c.moveTo(0,0);c.lineTo(dx,-25-Math.abs(dx));c.stroke();c.fillStyle='#a48ac0';c.beginPath();c.ellipse(dx,-29-Math.abs(dx),10,19,dx*.015,0,7);c.fill();c.fillStyle='#c1dfc7';c.fillRect(dx-2,-40-Math.abs(dx),4,7);}}
 else{for(let i=0;i<7;i++){c.strokeStyle=i%2?'#a7acbe':'#698e9b';c.lineWidth=4;c.beginPath();c.moveTo(0,0);c.quadraticCurveTo((i-3)*15,-45,(i-3)*10,-65+Math.abs(i-3)*8);c.stroke();}}
 c.restore();
}
