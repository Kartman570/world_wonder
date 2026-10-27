// Eight views are fixed; cell geometry, animation lengths and display size are data.
export const SPRITE_DIRECTIONS=8;
export const DEFAULT_DIRECTION_MAP=[0,1,2,3,4,5,6,7];
const modulo=(n,d)=>(n%d+d)%d;
export function sheetGeometry(image,config={}){
 const width=image.naturalWidth||image.width,height=image.naturalHeight||image.height,frameWidth=config.frameWidth??width/SPRITE_DIRECTIONS,frameHeight=config.frameHeight??frameWidth;
 if(!Number.isInteger(frameWidth)||frameWidth<1||!Number.isInteger(frameHeight)||frameHeight<1||height%frameHeight||width!==frameWidth*(config.type==='static'||config.type==='dynamic'||config.directions===1?1:8))throw new Error('Sprite sheet must have 8 equal columns and whole animation rows');
 const rows=height/frameHeight,frames=config.frames??rows,scale=config.scale??.5,fps=config.fps??10,directions=DEFAULT_DIRECTION_MAP,anchor=config.anchor??[.5,190.077/256];
 if(!Number.isInteger(frames)||frames<1||frames!==rows||!Number.isFinite(scale)||scale<=0||!Number.isFinite(fps)||fps<=0)throw new Error('Invalid sprite frame count, scale or fps');
 if(directions.length!==8||new Set(directions).size!==8||directions.some(d=>!Number.isInteger(d)||d<0||d>7))throw new Error('Direction mapping must contain columns 0–7 exactly once');
 if(anchor.length!==2||anchor.some(v=>!Number.isFinite(v)))throw new Error('Anchor must contain two normalized coordinates');
 for(const clip of Object.values(config.animations||{})){const start=clip.start??0,count=clip.frames??frames;if(!Number.isInteger(start)||!Number.isInteger(count)||start<0||count<1||start+count>rows||!(clip.fps??fps)||!Number.isFinite(clip.fps??fps)||(clip.fps??fps)<0)throw new Error('Animation clip outside sprite sheet or invalid fps');}
 return {frameWidth,frameHeight,rows,frames,scale,fps,directions,anchor};
}
export function spriteFrame(geometry,config,dir,seconds,animation='walk'){
 const clip=config.animations?.[animation]||(animation==='idle'?{frames:1}:{}),count=clip.frames??geometry.frames,start=clip.start??0,fps=clip.fps??geometry.fps,index=Math.floor(Math.max(0,seconds)*fps+1e-7),frame=start+(clip.loop===false?Math.min(count-1,index):index%count),direction=geometry.directions[modulo(Math.round(dir||0),8)];
 return {x:direction*geometry.frameWidth,y:frame*geometry.frameHeight,width:geometry.frameWidth,height:geometry.frameHeight,frame,direction};
}
// Standard action names select available clips; models and optional states come from data.
export function actorAnimation(e,pose,walking,config,time=0){
 const clips=config.animations||{},explicit=pose.animation??e.spriteAnimation;
 if(explicit&&clips[explicit])return explicit;
 if(e.hp<=0&&clips.death)return 'death';
 if((e.stunUntil||0)>time&&clips.stunned)return 'stunned';
 if(e.pendingStrike||(pose.attack||0)>0){
  const weapon=e.pendingStrike?.kind||e.weapon||['hammer','axe','sword','bow'].find(k=>e.inventory?.[k]>0),name='attack_'+(weapon==='arkCutter'?'cutter':weapon);
  if(clips[name])return name;if(clips.attack)return 'attack';
 }
 if((e.drawUntil||0)>time){const name=e.weaponDrawn?'draw_weapon':'sheath';if(clips[name])return name;}
 if(e.riding&&clips.ride)return 'ride';
 if(e.swimming&&clips.swim)return 'swim';
 if(walking){if((e.sprinting||pose.sprinting||e.state==='flee')&&clips.run)return 'run';return !config.animations||clips.walk?'walk':'idle';}
 const mapped=config.states?.[e.state];if(mapped&&clips[mapped])return mapped;
 if(e.action?.corpse&&clips.work_knife)return 'work_knife';
 const working=e.action||['fishing','chopping','logging','butchering','gathering','quietWork','craftingGoods','working','mining','harvesting','treating','alienMining','alienHarvest','alienFeeding','alienTuning'].includes(e.state);
 return working&&clips.work?'work':'idle';
}
const modelId=value=>String(value||'').replace(/([a-z0-9])([A-Z])/g,'$1_$2').replaceAll('-','_').toLowerCase();
function indexSprites(manifest){
 const ids=new Map(),roles=new Map(),races=new Map();
 for(const c of manifest.catalog||[])if(c.spriteReady&&(!c.type||c.type==='character')){ids.set(c.id,c.id);for(const role of c.gameRoles||[])if(!roles.has(role))roles.set(role,c.id);for(const race of c.gameRaces||[])if(!races.has(race))races.set(race,c.id);}
 return {ids,roles,races};
}
export function resolveSprite(manifest,e,index=indexSprites(manifest)){
 if(e.sprite)return e.sprite;
 const role=index.ids.get(modelId(e.role))||index.roles.get(e.role);if(role)return role;
 const shared=manifest.roles?.[e.role];if(shared)return shared;
 return index.races.get(e.race)||index.ids.get(modelId(e.race))||manifest.races?.[e.race]||null;
}
async function loadImage(url){
 // Revalidate the PNG too: a manually replaced image can keep the same manifest hash.
 const response=await fetch(url,{cache:'no-cache'});if(!response.ok)throw new Error('Sprite PNG HTTP '+response.status);
 const blob=await response.blob();if(typeof createImageBitmap==='function')return createImageBitmap(blob);
 const objectUrl=URL.createObjectURL(blob);
 try{return await new Promise((resolve,reject)=>{const image=new Image();image.decoding='async';image.onload=async()=>{try{await image.decode();resolve(image);}catch(error){reject(error);}};image.onerror=()=>reject(new Error('Cannot decode PNG '+url));image.src=objectUrl;});}
 finally{URL.revokeObjectURL(objectUrl);}
}
export class SpriteSheets{
 constructor({manifestUrl=new URL('./graphics/sprites/manifest.json',import.meta.url),fetcher=globalThis.fetch,imageLoader=loadImage,warn=message=>console.warn(message),maxConcurrent=3,maxBytes=64*1024*1024,now=()=>performance.now()}={}){
  this.maxConcurrent=Math.max(1,maxConcurrent);this.maxBytes=maxBytes;this.now=now;this.queue=[];this.active=0;this.resources=new Map();this.bytes=0;this.protected=new Set();this.pinned=new Set();this.lastPrepare=-Infinity;
  this.manifestUrl=new URL(manifestUrl,import.meta.url);this.imageLoader=imageLoader;this.warn=warn;this.assets=new Map();this.manifest={};this.motion=new WeakMap();
  this.ready=(async()=>{try{const response=await fetcher(this.manifestUrl,{cache:'no-store'});if(!response.ok)throw new Error('Sprite manifest HTTP '+response.status);const manifest=await response.json();if(!Array.isArray(manifest.catalog))throw new Error('Sprite manifest has no catalog');this.manifest=manifest;this.spriteIndex=indexSprites(manifest);return true;}catch(error){this.warn('PNG sprites unavailable; using procedural graphics. '+error.message);return false;}})();
 }
 assetFor(e){return resolveSprite(this.manifest,e,this.spriteIndex);}
 configFor(id){if(typeof id!=='string')return null;const [owner,key]=id.split('#');const parent=this.manifest.catalog?.find(e=>e.id===owner);const entry=key?parent?.components?.[key]:parent;if(!entry?.spriteReady)return null;return {...entry,animations:Object.fromEntries(Object.entries(entry.animations||{}).filter(([,clip])=>clip.ready!==false))};}
 // Only nearby models enter the queue. Visible draw requests can promote queued work.
 prepare(entities){
  const time=this.now();if(time-this.lastPrepare<250)return;this.lastPrepare=time;
  this.protected=new Set((typeof entities==='function'?entities():entities).map(e=>this.assetFor(e)).filter(Boolean));
  for(const id of this.protected)void this.load(id,0);
  this.trim();
 }
 trim(){
  const time=this.now();
  for(const resource of [...this.resources.values()].sort((a,b)=>a.used-b.used)){
   if(this.bytes<=this.maxBytes)break;
   if(!resource.image||time-resource.used<2000||[...resource.ids].some(id=>(this.protected.has(id)||this.pinned.has(id))))continue;
   this.bytes-=resource.bytes;resource.image.close?.();resource.image=null;this.resources.delete(resource.url);
   for(const id of resource.ids)this.assets.delete(id);
  }
 }
 pump(){
  while(this.active<this.maxConcurrent&&this.queue.length){
   this.queue.sort((a,b)=>b.priority-a.priority);const resource=this.queue.shift();this.active++;
   (async()=>{try{
    const image=await this.imageLoader(resource.url);
    resource.image=image;resource.bytes=(image.naturalWidth||image.width)*(image.naturalHeight||image.height)*4;this.bytes+=resource.bytes;
    resource.used=this.now();resource.resolve(image);
   }catch(error){resource.error=error;resource.resolve(null);}
   finally{this.active--;this.trim();this.pump();}})();
  }
 }
 load(id,priority=1){
  const existing=this.assets.get(id);if(existing){if(existing.resource)existing.resource.priority=Math.max(existing.resource.priority,priority);return existing.promise;}
  const config=this.configFor(id),entry={config,image:null,geometry:null,error:null};this.assets.set(id,entry);
  if(!config&&this.manifest.catalog?.some(e=>e.id===id)){entry.error='Sprite not ready';entry.promise=Promise.resolve(null);return entry.promise;}
  if(!config||typeof config.file!=='string'){
   entry.error='Unknown sprite or missing file';this.warn('Sprite '+id+': '+entry.error);entry.promise=Promise.resolve(null);return entry.promise;
  }
  let url;try{const address=new URL(config.file,this.manifestUrl);if(config.hash)address.searchParams.set('v',config.hash);url=address.href;}catch(error){entry.error=error.message;this.warn('Sprite '+id+': '+entry.error);entry.promise=Promise.resolve(null);return entry.promise;}
  let resource=this.resources.get(url);
  if(!resource){resource={url,ids:new Set(),priority,used:this.now(),image:null,bytes:0};resource.promise=new Promise(resolve=>resource.resolve=resolve);this.resources.set(url,resource);this.queue.push(resource);}
  resource.ids.add(id);resource.priority=Math.max(resource.priority,priority);entry.resource=resource;
  entry.promise=resource.promise.then(image=>{try{
   if(!image)throw resource.error||new Error('Cannot load PNG');
   entry.geometry=sheetGeometry(image,config);entry.image=image;return entry;
  }catch(error){entry.error=error.message;this.warn('Sprite '+id+': '+error.message);return null;}});
  this.pump();return entry.promise;
 }
 async preload(ids){await this.ready;return Promise.all(ids.map(id=>this.load(id)));}
 draw(c,e,pose=e,time=0){
  const id=this.assetFor(e);if(!id)return false;const entry=this.assets.get(id);if(!entry){void this.load(id);return false;}if(!entry.image||!entry.geometry){if(!entry.error)void this.load(id,1);return false;}
  entry.resource.used=this.now();
  let state=this.motion.get(e);const walk=pose.walk||0;
  if(!state){state={x:pose.x,y:pose.y,walk,time,lastMoved:-Infinity,animation:'idle',seconds:0};this.motion.set(e,state);}
  const dt=Math.max(0,time-state.time),moved=Math.abs(walk-state.walk)>1e-5||Math.hypot(pose.x-state.x,pose.y-state.y)>.01;
  if(moved)state.lastMoved=time;const walking=time-state.lastMoved<.18,animation=actorAnimation(e,pose,walking,entry.config,time);
  const token=pose.animationToken??e.spriteAnimationToken;
  const newStrike=animation.startsWith('attack')&&((e.pendingStrike&&e.pendingStrike!==state.strike)||(pose.attack||0)>(state.attack||0)+.01);
  if(state.animation!==animation||state.token!==token||newStrike){state.animation=animation;state.token=token;state.seconds=0;}else state.seconds+=dt;
  if(Number.isFinite(pose.animationSeconds))state.seconds=Math.max(0,pose.animationSeconds);
  Object.assign(state,{x:pose.x,y:pose.y,walk,time,attack:pose.attack||0,strike:e.pendingStrike});const frame=spriteFrame(entry.geometry,entry.config,pose.dir??e.dir,state.seconds,animation),{scale,anchor}=entry.geometry,dw=frame.width*scale,dh=frame.height*scale;
  const smoothing=c.imageSmoothingEnabled;c.imageSmoothingEnabled=false;
  try{c.drawImage(entry.image,frame.x,frame.y,frame.width,frame.height,pose.x-anchor[0]*dw,pose.y-anchor[1]*dh,dw,dh);}finally{c.imageSmoothingEnabled=smoothing;}return true;
 }
}
