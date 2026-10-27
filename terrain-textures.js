import {TILE,W,H} from './content.js';
export const groundLod=zoom=>zoom>=1.2?1:zoom>=.6?0:-1;
export const TERRAIN_CACHE_BYTES=64*1024*1024;
export function terrainHash(x,y,seed=719){let h=Math.imul(x,374761393)^Math.imul(y,668265263)^seed;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;}
export function terrainNoise(x,y,seed=719){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);return (terrainHash(ix,iy,seed)*(1-u)+terrainHash(ix+1,iy,seed)*u)*(1-v)+(terrainHash(ix,iy+1,seed)*(1-u)+terrainHash(ix+1,iy+1,seed)*u)*v;}
export function terrainMaterial(w,x,y){x=Math.max(0,Math.min(W-1,x));y=Math.max(0,Math.min(H-1,y));const i=y*W+x,t=w.tile(x,y);
 if(w.dungeonSpec)return ({2:'water',4:'water',7:'cave',11:'catacomb',12:'catacomb',13:'cave',14:'gravel',5:'boards'})[t]||'cave';
 const fixed={1:'soil',2:'water',3:'paving',4:'water',5:'boards',6:'dry_grass',7:'cave',8:'dry_grass',9:'mud',10:'gravel',11:'catacomb',12:'catacomb',13:'forest',14:'gravel',15:'sand',16:'alien',17:'gravel',18:'paving',19:'soil'};
 let m=fixed[t]||((w.depth?.[i]||0)>3?'forest':'grass');
 if(w.biomes&&w.naturalTiles?.[i]===t&&[0,8,9,15].includes(t))m=({1:'sand',2:'gravel',3:'dry_grass',4:'dry_grass',5:'grass',6:'forest',7:'forest',8:'forest',9:'forest',10:'dry_grass',11:'snow',12:'mud'})[w.biomes[i]]||m;
 if(t===0&&(w.depth?.[i]||0)>3&&['grass','dry_grass'].includes(m))m='forest';
 // Shared world-space fields form broad connected patches, never a per-cell checkerboard.
 const patch=terrainNoise(x/7.5,y/7.5,2183);
 if(m==='grass'&&patch>.66)m='dry_grass';if(m==='forest'&&patch<.23)m='mud';
 if(t===0&&[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>[2,4].includes(w.tile(x+dx,y+dy))))m='mud';return m;
}
export function terrainWeights(w,px,py,materialAt=(x,y)=>terrainMaterial(w,x,y)){const warp=12,wx=px+(terrainNoise(px/29,py/29,91)-.5)*warp*2,wy=py+(terrainNoise(px/29,py/29,171)-.5)*warp*2,gx=wx/TILE-.5,gy=wy/TILE-.5,x=Math.floor(gx),y=Math.floor(gy),u=gx-x,v=gy-y,result=new Map();
 for(const [dx,dy,a]of [[0,0,(1-u)*(1-v)],[1,0,u*(1-v)],[0,1,(1-u)*v],[1,1,u*v]]){const m=materialAt(x+dx,y+dy);result.set(m,(result.get(m)||0)+a);}return result;
}
async function bitmap(url){const response=await fetch(url,{cache:'no-cache'});if(!response.ok)throw new Error('Terrain PNG HTTP '+response.status);const blob=await response.blob();return createImageBitmap(blob);}
export class TerrainTextures{
 constructor({manifestUrl=new URL('./graphics/terrain/sprites/manifest.json',import.meta.url),fetcher=globalThis.fetch,imageLoader=bitmap,createCanvas=()=>document.createElement('canvas')}={}){this.manifestUrl=manifestUrl;this.fetcher=(...args)=>fetcher(...args);this.imageLoader=imageLoader;this.createCanvas=createCanvas;this.materials=new Map();this.ready=false;this.revision=0;this.pending=null;this.layer=null;this.mask=null;this.patterns=new Map();this.metrics={builds:0,buildMs:0,decodedBytes:0};}
 warm(onProgress){if(this.pending)return this.pending;this.pending=(async()=>{try{const response=await this.fetcher(this.manifestUrl,{cache:'no-store'});if(!response.ok)throw new Error('Terrain manifest HTTP '+response.status);const m=await response.json(),jobs=[];for(const [id,cfg]of Object.entries(m.materials)){const row={...cfg,images:[]};this.materials.set(id,row);cfg.files.forEach((file,index)=>jobs.push({file,row,index}));}let cursor=0,done=0;await Promise.all(Array.from({length:3},async()=>{while(cursor<jobs.length){const {file,row,index}=jobs[cursor++],image=await this.imageLoader(new URL(file,this.manifestUrl));row.images[index]=image;this.metrics.decodedBytes+=image.width*image.height*4;onProgress?.(++done,jobs.length);}}));this.ready=true;this.revision++;return true;}catch(error){console.warn('Terrain textures unavailable; using procedural ground.',error);return false;}})();return this.pending;}
 paint(c,w,cx,cy,grid=null){if(!this.ready)return false;const started=performance.now(),size=16*TILE,step=8,n=size/step+2,ox=cx*size,oy=cy*size,channels=new Map(),baseX=cx*16-2,baseY=cy*16-2,materials=grid||Array.from({length:20*20},(_,i)=>terrainMaterial(w,baseX+i%20,baseY+Math.floor(i/20))),materialAt=(x,y)=>materials[(y-baseY)*20+x-baseX]||terrainMaterial(w,x,y);
  // Sample on a low-resolution coverage grid; all positions are absolute world coordinates.
  // The cached colour image itself remains full resolution.
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const px=ox+(x-.5)*step,py=oy+(y-.5)*step,weights=terrainWeights(w,px,py,materialAt),variant=terrainNoise(px/310,py/310,451),pixel=y*n+x;for(const [id,weight]of weights){const material=this.materials.get(id);if(!material)continue;for(let k=0;k<material.images.length;k++){const alpha=weight*(material.images.length===1?1:k===0?1-variant:variant),key=id+':'+k;let channel=channels.get(key);if(!channel){channel={material,k,values:new Float32Array(n*n)};channels.set(key,channel);}channel.values[pixel]+=alpha;}}}
  const layer=this.layer??=this.createCanvas(),mask=this.mask??=this.createCanvas();if(layer.width!==size)layer.width=layer.height=size;if(mask.width!==n)mask.width=mask.height=n;const lc=layer.getContext('2d'),mc=mask.getContext('2d'),data=mc.createImageData(n,n);for(let i=0;i<n*n;i++)data.data.set([255,255,255,0],i*4);
  c.save();c.globalCompositeOperation='lighter';
  for(const [key,{material,k,values}]of channels){for(let i=0;i<values.length;i++)data.data[i*4+3]=Math.round(values[i]*255);mc.putImageData(data,0,0);lc.clearRect(0,0,size,size);lc.save();lc.translate(-ox,-oy);let pattern=this.patterns.get(key);if(!pattern){pattern=lc.createPattern(material.images[k],'repeat');const s=material.worldPeriod/material.images[k].width;pattern.setTransform({a:s,b:0,c:0,d:s,e:0,f:0});this.patterns.set(key,pattern);}lc.fillStyle=pattern;lc.fillRect(ox,oy,size,size);lc.restore();lc.save();lc.globalCompositeOperation='destination-in';lc.imageSmoothingEnabled=true;lc.drawImage(mask,1,1,n-2,n-2,0,0,size,size);lc.restore();c.drawImage(layer,ox,oy,size,size);}
  c.restore();this.metrics.builds++;this.metrics.buildMs+=performance.now()-started;return true;
 }
}
