const cache=new Map();
const military=new Set(['guard','archer','escort','escortArcher','bandit','banditArcher','raider','brute','hunter']);
const bowmen=new Set(['archer','escortArcher','banditArcher','hunter']);
const factions={oak:'#9da96d',salt:'#8ab1b0',north:'#a5a3bf',red:'#b66e58',ash:'#a39a87',thorn:'#8c9e63'};
const outfits={prisoner:['#c3aa7e','#79664b'],drunkard:['#a58a8a','#60505f'],player:['#8c9a80','#405c50'],king:['#b19a66','#633d46'],wizard:['#738e9f','#3c586e'],guard:['#98a5a2','#4c6560'],archer:['#849576','#495f48'],escort:['#a1a59a','#5c6253'],escortArcher:['#8d9d7b','#53674f'],bandit:['#8e8065','#514e3c'],banditArcher:['#9b8870','#5b5541'],raider:['#9a7560','#5b473b'],brute:['#8f7565','#53453c'],hunter:['#809268','#455f43'],fisher:['#a89c75','#536e6c'],forester:['#ac9170','#665748'],miner:['#aaa18c','#5c655d'],smith:['#b39d87','#4d4c43'],cook:['#d3cbb4','#7b8171'],tailor:['#a6b5b0','#617c78'],herbalist:['#98a581','#50654a'],quartermaster:['#9e9879','#606850'],merchant:['#bba678','#78634e'],herald:['#c1ae79','#6c5844'],mayor:['#b4a88c','#625b5c'],farmer:['#b5aa89','#6e7658'],citizen:['#aba58d','#6d7762']};
export function characterSprite(role,dir=0,frame=0,{faction='neutral',variant=0,weapon='',attack=0,livery='',flagColor='',drawn=true}={}){
 dir=(Math.round(dir)%8+8)%8;frame=(Math.floor(frame)%6+6)%6;variant%=3;attack=Math.max(0,Math.min(2,attack));const key=[role,dir,frame,faction,variant,weapon,attack,livery,flagColor,drawn].join(':');if(cache.has(key))return cache.get(key);
 const image=document.createElement('canvas');image.width=144;image.height=144;const c=image.getContext('2d');c.translate(72,122);const angle=dir*Math.PI/4,co=Math.cos(angle),si=Math.sin(angle),phase=frame*Math.PI/3;
 const P=(u,v,z)=>[u*co-v*si,(u*si+v*co)*.5-z];
 const line=(pts,color,width=1)=>{c.beginPath();pts.map(p=>P(...p)).forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();};
 const poly=(pts,color)=>{c.beginPath();pts.map(p=>P(...p)).forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();};
 const oval=(u,v,z,rx,ry,color)=>{const [x,y]=P(u,v,z);c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();};
 const [baseCoat,shade]=outfits[role]||outfits.citizen,coat=livery||baseCoat,trim=flagColor||factions[faction]||'#b4a373',skin=['#c9aa86','#b89574','#d6ba96'][variant],hair=['#574c3e','#8d7958','#bbb5a0'][variant],armed=(military.has(role)||role==='player')&&drawn&&weapon!=='fists',bow=(bowmen.has(role)||weapon==='bow')&&drawn,robe=['king','wizard'].includes(role),apron=['smith','cook','tailor'].includes(role),hood=['hunter','bandit','banditArcher','raider'].includes(role),bob=Math.sin(phase*2)*.7;
 if(role==='player'&&!drawn&&weapon!=='fists'){line([[-5,-10,44],[-5,-10,14]],'#4c493b',5);line([[-5,-10,52],[-5,-10,44]],'#b8a175',3);}
 const leg=(side)=>{const swing=Math.sin(phase+(side<0?Math.PI:0))*5;line([[0,side*5,25],[swing*.4,side*5,13],[swing,side*5,4]],'#3d493f',6);oval(swing+2,side*5,3,5,3,'#3b352c');line([[swing*.6,side*5,10],[swing,side*5,5]],'#76694f',4);};leg(-1);leg(1);
 if(robe||hood||role==='player'||role==='herbalist')poly([[-4,-10,49+bob],[-6,10,49+bob],[-10,13,robe?8:24],[-10,-13,robe?8:24]],shade);
 const arm=(side,front=false)=>{const u=(armed||weapon==='fists')&&attack?6+attack*4:Math.sin(phase+(side<0?Math.PI:0))*3,hand=[u+2,side*12,29+bob];line([[0,side*9,46+bob],[u,side*13,37+bob],hand],front?coat:shade,6);oval(...hand,3.1,3.6,skin);return hand;};const far=co>=0?-1:1;arm(far);
 poly([[3,-8,47+bob],[3,8,47+bob],[4,8,27+bob],[3,-8,27+bob]],coat);poly([[-3,-9,47+bob],[3,-8,47+bob],[3,-8,27+bob],[-4,-7,27+bob]],shade);poly([[-3,9,47+bob],[3,8,47+bob],[3,8,27+bob],[-4,7,27+bob]],shade);
 if(robe)poly([[3,-8,33],[3,8,33],[5,13,10],[5,-13,10]],coat);
 // Collar, belt, buckle and a distinct faction tabard give the body structure.
 line([[4,-7,45+bob],[5,0,42+bob],[4,7,45+bob]],'#d4c5a3',2);line([[4,-8,29+bob],[5,8,29+bob]],'#4d3e2f',3);oval(5,0,29+bob,2.5,2,'#bd9e61');
 if(armed&&!bow){poly([[5,-5,43+bob],[5,5,43+bob],[6,5,32],[6,-5,32]],trim);for(let j=0;j<3;j++)line([[6,-5,35+j*3],[6,5,35+j*3]],'#d3d6c166',1);}
 if(apron){poly([[5,-5,42],[5,5,42],[6,7,22],[6,-7,22]],role==='cook'?'#e0dac7':role==='tailor'?'#b4c6bc':'#725841');line([[6,-6,28],[6,6,28]],'#544b3977',1);}
 if(role==='prisoner')for(let z=31;z<44;z+=5)line([[5,-7,z],[5,7,z]],'#62583f',2);
 if(role==='herald')poly([[5,-6,43],[5,6,43],[6,6,25],[6,0,21],[6,-6,25]],'#c2a357');
 // Neck, jaw, ears, brow and a projected nose remain readable in all eight views.
 oval(0,0,51+bob,4,5,skin);oval(0,0,59+bob,7.7,9,skin);oval(-2,0,63+bob,7.5,6,hair);for(const side of [-1,1])oval(0,side*7,58+bob,2,3,skin);
 if(si>=-.3){oval(7,0,58+bob,2.8,2.3,skin);for(const side of [-1,1]){const [x,y]=P(6,side*3,61+bob);c.fillStyle='#3a3d32';c.fillRect(x-1,y-1,1.6,1.6);}line([[7,-2,54+bob],[7,2,54+bob]],'#835f48',1);}
 if(['king','wizard','forester','miner','brute'].includes(role))poly([[6,-5,56+bob],[8,0,48+bob],[6,5,56+bob]],role==='wizard'?'#d0c7ac':hair);
 if(hood){oval(-2,0,64+bob,9,8,shade);if(si>=-.3){oval(3,0,59+bob,6,7,skin);if(role!=='hunter')line([[8,-5,56],[8,5,56]],shade,5);}}
 if(['guard','escort','archer','escortArcher'].includes(role)){oval(0,0,65+bob,9,6,'#a3b1aa');line([[0,-9,63+bob],[0,9,63+bob]],'#d1d4bb',2);for(const side of [-1,1])line([[0,side*8,63],[1,side*8,56]],'#81968c',3);if(!bow)line([[-2,0,70],[2,0,74]],trim,4);}
 if(['merchant','fisher','farmer','mayor'].includes(role)){oval(0,0,67+bob,14,4,role==='merchant'?'#6d6650':'#b5a16d');oval(-1,0,70+bob,8,6,role==='merchant'?'#8e8060':'#c9b77b');}
 if(role==='cook'){oval(0,0,68+bob,10,6,'#e3ddca');oval(0,0,73+bob,8,6,'#e3ddca');}
 if(role==='king'){line([[0,-9,67],[0,9,67]],'#d6b96c',5);for(const side of [-1,0,1])poly([[0,side*7-2,68],[0,side*7,77],[0,side*7+2,68]],'#f0d68b');oval(5,0,68,2,2,'#a35543');}
 if(role==='wizard'){poly([[-3,-12,65],[-4,0,89],[3,11,65]],'#617f95');line([[0,-12,65],[0,12,65]],'#b4b7a0',2);}
 const hand=arm(-far,true),[hu,hv,hz]=hand;if(role==='drunkard'){line([[hu+2,hv,hz+3],[hu+2,hv,hz+16]],'#709475',6);line([[hu+2,hv,hz+16],[hu+2,hv,hz+22]],'#bea884',3);}
 if(bow){line([[hu,hv-2,hz+18],[hu+9,hv-1,hz+9],[hu+12,hv,hz],[hu+9,hv+1,hz-10],[hu,hv+2,hz-18]],'#c3a171',2.5);line([[hu,hv-2,hz+18],[hu,hv+2,hz-18]],'#e0d6b6',1);line([[-7,-6,42],[-9,6,22]],'#665840',6);for(let j=0;j<3;j++)line([[-9+j*2,-5,44],[-10+j*2,-4,56]],'#bcaf8e',1);}
 else if(armed){const reach=attack?20+attack*4:5;if(weapon==='hammer'||weapon==='axe'){line([[hu,hv,hz-7],[hu+reach,hv,hz+24-attack*8]],'#b2986d',3);const u=hu+reach,z=hz+24-attack*8;poly(weapon==='hammer'?[[u-8,hv,z+5],[u+9,hv,z+5],[u+9,hv,z-5],[u-8,hv,z-5]]:[[u-3,hv,z+5],[u+13,hv,z+8],[u+13,hv,z-6],[u-3,hv,z-2]],'#b7c0b1');}else line([[hu,hv,hz],[hu+reach,hv,hz+24-attack*8]],'#d5ded1',3);line([[hu-3,hv-4,hz+4],[hu+3,hv+4,hz+4]],'#bd9d62',3);if(['guard','escort','player'].includes(role))poly([[0,far*14,41],[5,far*17,38],[4,far*17,24],[-2,far*14,20],[-5,far*11,29],[-4,far*11,39]],trim);}
 if(['forester','smith','miner'].includes(role)){line([[hu,hv,hz-10],[hu+5,hv,hz+20]],'#a78a60',3);if(role==='miner')line([[hu-8,hv,hz+19],[hu+14,hv,hz+23]],'#b1b7a6',4);else poly([[hu+3,hv,hz+21],[hu+13,hv,hz+23],[hu+13,hv,hz+13],[hu+3,hv,hz+16]],role==='smith'?'#687972':'#b9c1af');}
 if(role==='wizard'||role==='king'){line([[hu+4,hv,2],[hu+4,hv,role==='wizard'?78:50]],role==='wizard'?'#aa9370':'#c1a565',3);oval(hu+4,hv,role==='wizard'?79:51,4,4,role==='wizard'?'#bdd9cf':'#ddbd72');}
 if(role==='fisher')line([[hu,hv,hz],[hu+27,hv,75]],'#bba17a',1.8);
 if(role==='herald'||role==='mayor'){poly([[hu,hv-8,hz+6],[hu,hv+8,hz+6],[hu,hv+8,hz-6],[hu,hv-8,hz-6]],'#e4d5b1');line([[hu,hv-8,hz+7],[hu,hv-8,hz-7]],'#b2a27b',3);}
 if(['herbalist','quartermaster','merchant','citizen'].includes(role)){line([[4,-7,45],[4,7,28]],'#6b5740',2);oval(3,10,27,5,6,'#89714d');}
 cache.set(key,image);return image;
}
export function drawCharacter(c,e,pose=e,{player=false}={}){const frame=Math.floor((pose.walk||0)*2.5/(Math.PI*2)*6),attack=e.pendingStrike?1:(pose.attack||0)>0?2:0;c.drawImage(characterSprite(player?'player':e.role,pose.dir??e.dir,frame,{faction:e.faction,variant:typeof e.id==='number'?e.id%3:0,weapon:player?(e.weapon||'fists'):e.inventory?.hammer?'hammer':e.inventory?.axe?'axe':'',drawn:player?!!e.weaponDrawn:true,attack,livery:player?'':e.livery,flagColor:e.flagColor}),pose.x-72,pose.y-122);}
