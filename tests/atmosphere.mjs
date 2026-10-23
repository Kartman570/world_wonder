import assert from 'node:assert/strict';
import {World,W,TILE} from '../simulation.js';
import {forestShade} from '../atmosphere.js';
const w=new World('canopy-test'),z=w.cities[0];Object.assign(w.player,{x:(z.x+.5)*TILE,y:(z.y+.5)*TILE});let i=z.y*W+z.x;w.tiles[i]=0;w.depth[i]=18;assert.equal(forestShade(w),0,'Даже глубокая зелень в городе не затемняет экран');
const p={x:20.5*TILE,y:20.5*TILE};i=20*W+20;w.tiles[i]=0;w.depth[i]=10;assert.equal(forestShade(w,p),0,'Опушка и неглубокий лес не затемняются');w.depth[i]=12;assert.ok(forestShade(w,p)>0);w.depth[i]=18;assert.equal(forestShade(w,p),.18);assert.ok(w.terrain(p).speed<.7);w.tiles[i]=1;assert.equal(forestShade(w,p),0,'На дороге нет эффекта кроны');w.tiles[i]=8;assert.equal(forestShade(w,p),0,'Луг не лес');
console.log('✓ Затенение только в глубоком медленном лесу, без эффекта на городской траве, лугах и дорогах');
