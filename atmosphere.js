import {TILE,W} from './content.js';
// Grass is not canopy. Only slow, deep forest outside settlements casts this shade.
export function forestShade(world,p=world.player){
 if(world.dungeonSpec||world.inCity(p)||world.interiorAt(p))return 0;
 const x=Math.floor(p.x/TILE),y=Math.floor(p.y/TILE),tile=world.tile(x,y),depth=Math.min(18,world.depth[y*W+x]||0),terrain=world.terrain(p);
 if(![0,9].includes(tile)||depth<=11||terrain.speed>.7)return 0;
 return Math.min(.18,(depth-11)/7*.18);
}
