import {TILE,W,point} from './content.js';
const D=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function initializeAlienEcology(w){
 // Old saves can contain the exact zero-yield spider result, before any loot was taken.
 for(const c of w.corpses)if(c.animal==='caveSpider'&&c.butchered&&c.inventory.meat===0&&c.inventory.hide===0){delete c.inventory.meat;delete c.inventory.hide;c.inventory.spiderChitin=2;c.inventory.venomGland=1;}
 if(w.dungeonSpec||w.generatorVersion<9)return;
 if(!w.alienEcology){const a=w.loreGeography.ark,sites=[];
 const place=(id,kind,name,ox,oy,text)=>{for(let radius=0;radius<24;radius+=2)for(let step=0;step<(radius?16:1);step++){const x=Math.round(a.x+ox+Math.cos(step*Math.PI/8)*radius),y=Math.round(a.y+oy+Math.sin(step*Math.PI/8)*radius),p=point(x+.5,y+.5);if(w.tile(x,y)!==16||w.roadMask[y*W+x]||w.blocked(p.x,p.y)||w.interiorAt(p)||sites.some(s=>D(s,p)<5*TILE)||w.buildings.some(b=>x>b.x-3&&x<b.x+b.w+3&&y>b.y-3&&y<b.y+b.h+3))continue;sites.push({id,kind,name,title:name,text,...p,w:2,h:2,inventory:kind==='arkGarden'?{spore:4}:{},worked:0});return;}};
 for(let i=0;i<5;i++)place('quarry-'+i,'arkRock','Поющий уступ',-53+i*6,-17-i%2*7,'В ровном разрезе нет следов кирки. Крупный хозяин сжимает кольчатую рукоять; камень распадается на одинаковые крупинки.');
 for(let i=0;i<5;i++)place('garden-'+i,'arkGarden','Складчатые чаши',-17+i*9,39+i%2*5,'Мясистые створки раскрываются навстречу руке. Хозяева снимают светлые узелки и уносят их к высоким губчатым столбам.');
 for(let i=0;i<4;i++)place('filter-'+i,'arkFilter','Дышащие столбы',-38+i*23,10,'Нижние складки пьют фиолетовую дымку. Вверху бесшумно открываются влажные отверстия. К ним прикладывают гладкие светлые узелки.');
 for(let i=0;i<4;i++)place('ring-'+i,'arkResonator','Висящие кольца',-35+i*22,-42,'Кольца не соприкасаются. Проходящий хозяин касается нижнего, слушает грудью и поворачивает верхнее.');
 w.alienEcology={version:1,sites,desertInstalled:false,toolReceipts:[],toolShots:0};
 const natives=w.entities.filter(e=>e.race==='arctarian'&&e.role!=='arctRescuer'&&e.hp>0);for(const [i,e]of natives.entries()){e.alienJob=i<4?'quarry':i<7?'garden':'tuner';if(i<4){e.role='arctMiner';e.name='Добытчик поющего уступа';e.inventory.arkCutter=1;}e.alienWork=0;e.alienSite=null;}
 }
 // One-time background remains. They are real bodies and never replenish after looting.
 if(!w.alienEcology.desertInstalled){const d=w.loreGeography.desert;for(let y=-d.ry+12;y<d.ry;y+=19)for(let x=-d.rx+12;x<d.rx;x+=23){if((x/d.rx)**2+(y/d.ry)**2>.91)continue;const xx=Math.round(d.x+x+Math.sin(y*2+x)*3),yy=Math.round(d.y+y+Math.cos(x)*3),p=point(xx+.5,yy+.5);if((w.generatorVersion<10&&w.tile(xx,yy)!==15)||w.blocked(p.x,p.y)||w.interiorAt(p)||w.roadMask[yy*W+xx])continue;w.corpses.push({id:++w.id,...p,name:['Останки чужого путника','Высохшее тело у обломков','Кости под чужим знаменем'][Math.abs(xx+yy)%3],inventory:{},butchered:true,age:0,desertRemains:true});}w.alienEcology.desertInstalled=true;}
 for(const e of w.entities)if(e.race==='emralaan'&&e.mounted&&!e.desertHardened){e.desertHardened=true;e.maxHp+=40;if(e.hp>0){e.hp+=40;e.inventory.armor=1;}}

}
function fx(w,a,b){if(D(w.player,a)<1600)w.effects.push({x:a.x,y:a.y,tx:b.x,ty:b.y,beam:true,life:.3});}
export function alienWorkerAI(w,e,dt){
 if(!e.alienJob||e.aggressor)return false;
 const sites=w.alienEcology?.sites||[],kind=e.alienJob==='quarry'?(e.inventory.ore>=8?'arkFilter':'arkRock'):e.alienJob==='garden'?(e.inventory.spore>0?'arkFilter':'arkGarden'):'arkResonator';let site=sites.find(s=>s.id===e.alienSite&&s.kind===kind);if(!site){const choices=sites.filter(s=>s.kind===kind);site=choices[(Number(e.id)+Math.floor(e.alienCycles||0))%choices.length];e.alienSite=site?.id;e.alienWork=0;}if(!site)return false;
 const spot={x:site.x,y:site.y+95};e.state=kind==='arkRock'?'alienMining':kind==='arkGarden'?'alienHarvest':kind==='arkFilter'?'alienFeeding':'alienTuning';
 if(D(e,spot)>35){w.navigate(e,spot,dt,78);return true;}
 if(kind==='arkGarden'&&!(site.inventory.spore>0)){if(w.time>=(site.regrowAt||0)){site.inventory.spore=4;}else{e.alienSite=null;e.state='quietWork';return true;}}
 if(kind==='arkRock'&&!(e.inventory.arkCutter>0)){e.state='missingTool';return true;}
 e.dir=(Math.round(Math.atan2(site.y-e.y,site.x-e.x)/(Math.PI/4))+8)%8;e.alienWork+=dt;if(kind==='arkRock'&&(e.nextRipple||0)<=w.elapsed){e.nextRipple=w.elapsed+.7;fx(w,e,site);e.attack=.25;}
 if(e.alienWork<(kind==='arkRock'?5:7))return true;e.alienWork=0;e.alienCycles=(e.alienCycles||0)+1;site.worked++;
 if(kind==='arkRock')e.inventory.ore=(e.inventory.ore||0)+2;
 if(kind==='arkGarden'){e.inventory.spore=(e.inventory.spore||0)+1;site.inventory.spore--;if(!site.inventory.spore)site.regrowAt=w.time+45;}
 if(kind==='arkFilter'){if(e.alienJob==='quarry'){site.inventory.ore=(site.inventory.ore||0)+e.inventory.ore;e.inventory.ore=0;}else{e.inventory.spore--;site.inventory.spore=(site.inventory.spore||0)+1;}site.fedUntil=w.time+120;}
 if(kind==='arkResonator')site.phase=(site.phase||0)+1;
 e.alienSite=null;return true;
}
export function stealAlienTool(w,e){const p=w.player;if(!e?.alienJob||e.hp<=0||!(e.inventory.arkCutter>0)||!w.canInteract(p,e,110))return {ok:false,message:'Подойдите к добытчику с рукоятью.'};if(p.weaponDrawn)return {ok:false,message:'Сначала освободите руки.'};e.inventory.arkCutter--;p.inventory.arkCutter=(p.inventory.arkCutter||0)+1;e.aggressor=p.id;e.state='flee';e.pendingStrike=null;w.log('Вы выхватили ребристую рукоять. Добытчик отдёрнул руку и отступает.',{personal:true});return {ok:true,message:'Рукоять в сумке. Её можно установить в дальний слот через I.'};}
export function giveAlienTool(w,{forced=false}={}){const p=w.player,s=w.entities.find(e=>e.role==='wizard'&&e.hp>0);if(!s||!w.canInteract(p,s,130)||!(p.inventory.arkCutter>0))return {ok:false,message:'Подойдите к Софосу.'};const count=p.inventory.arkCutter;delete p.inventory.arkCutter;s.inventory.arkCutter=(s.inventory.arkCutter||0)+count;p.pendingStrike=null;p.lockedTargetId=null;if(p.equipment?.ranged==='arkCutter')p.equipment.ranged=p.inventory.bow>0?'bow':null;p.weaponDrawn=false;w.normalizeEquipment();const used=p.cutterShots>0,message=forced?'Нельзя использовать магические артефакты!!! Сразу отдавай их мне!':used?'Оставь это мне. Больше никогда не пробуй, что оно умеет.':'Хорошо, что ты принёс его мне. Оно не должно оказаться в руках… тех, кто не знает, что это такое.';w.alienEcology.toolReceipts.push({at:w.time,count,forced,used,generation:w.life?.generation||1});s.announcement=message;s.speechUntil=w.elapsed+8;w.log('Софос: «'+message+'»',{personal:true});return {ok:true,message};}
export function updateAlienEcology(w,dt){if(!w.alienEcology||w.player.role==='absent')return;const p=w.player,s=w.entities.find(e=>e.role==='wizard'&&e.hp>0);if(!s)return;
 const held=p.inventory.arkCutter>0&&p.weapon==='arkCutter'&&p.weaponDrawn;
 if(held&&D(p,s)<700&&w.visibleFrom(s,p)&&w.lineClear(s,p)){s.state='seizingArtifact';s.announcement='Нельзя использовать магические артефакты!!! Сразу отдавай их мне!';s.speechUntil=w.elapsed+2;if(D(p,s)<125){const result=giveAlienTool(w,{forced:true});if(result.ok)w.onSophos?.(result.message);}else w.navigate(s,p,dt,210);}
 else if(s.state==='seizingArtifact'||s.state==='returningToHall'){s.state='returningToHall';if(w.navigate(s,s.home,dt,100))s.state='idle';}
}
