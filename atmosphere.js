import {TILE,W} from './content.js';
// Grass is not canopy. Only slow, deep forest outside settlements casts this shade.
export function forestShade(world,p=world.player){
 if(world.dungeonSpec||world.inCity(p)||world.interiorAt(p))return 0;
 const x=Math.floor(p.x/TILE),y=Math.floor(p.y/TILE),tile=world.tile(x,y),depth=Math.min(18,world.depth[y*W+x]||0),terrain=world.terrain(p);
 if(![0,9].includes(tile)||depth<=11||terrain.speed>.7)return 0;
 return Math.min(.18,(depth-11)/7*.18);
}

export const AIR_GRACE=12,AIR_DAMAGE=4;
export function atmospherePressure(w){
 if(w.dungeonSpec||!w.loreGeography)return 0;const p=w.player,a=w.loreGeography.ark;
 if(w.tile(p.x/TILE,p.y/TILE)!==16)return 0;
 const d=((p.x/TILE-a.x)/a.rx)**2+((p.y/TILE-a.y)/a.ry)**2;
 return .28+Math.max(0,1-d/.4)*.28;
}
export function breathingDanger(w){return !w.dungeonSpec&&w.tile(w.player.x/TILE,w.player.y/TILE)===16&&!(w.player.inventory.breathSuit>0&&w.player.breathSuitWorn)&&w.player.race!=='arctarian';}
export function drawEdgePressure(c,w,width,height,forest=forestShade(w),time=w.elapsed){
 const purple=atmospherePressure(w),danger=breathingDanger(w),exposure=w.loreState?.exposure||0;
 const pulse=danger?Math.pow((1+Math.sin(time*5.8))/2,5):0;
 const strength=Math.max(forest*3,purple),panic=danger?Math.min(1,.15+exposure/24):0;
 if(!strength&&!panic)return;
 c.save();c.translate(width/2,height/2);c.scale(width/2,height/2);
 const g=c.createRadialGradient(0,0,.04,0,0,1.42),rgb=purple||panic?'57,20,83':'3,15,13';
 g.addColorStop(0,`rgba(${rgb},0)`);g.addColorStop(.25,`rgba(${rgb},${panic*pulse*.23})`);g.addColorStop(.55,`rgba(${rgb},${Math.min(.62,strength*.16+panic*pulse*.55)})`);g.addColorStop(.85,`rgba(${rgb},${Math.min(.9,strength*.68+panic*(.22+pulse*.6))})`);g.addColorStop(1,`rgba(${rgb},${Math.min(.96,strength+panic*.6)})`);
 c.fillStyle=g;c.fillRect(-1,-1,2,2);c.restore();
 if(danger){c.save();c.textAlign='center';c.font='bold 16px system-ui';c.fillStyle='#f1cdf9';c.shadowColor='#351544';c.shadowBlur=9;c.fillText(exposure<AIR_GRACE?'НЕЧЕМ ДЫШАТЬ · покиньте туман или наденьте одеяние':'УДУШЬЕ · наденьте одеяние закрытого дыхания',width/2,Math.max(85,height*.17));c.font='12px system-ui';c.fillText(exposure<AIR_GRACE?'Воздуха осталось: '+Math.ceil(AIR_GRACE-exposure)+' сек.':'Здоровье убывает',width/2,Math.max(105,height*.17+23));c.restore();}
}
