import {cancelCraft} from './crafts.js';
import {normalizeStamina} from './player-movement.js';
import {World,dist,TILE} from './simulation.js';
const shared=['fallenEstates','campaign','cityMemory','prisonStorage','quests','events','storages','warehouses','caravanStats','killCounts','discovery','visited','returnedRelics','relicVault','clearedDungeons'];
const scalar=['life','deathReport','kills','quest','relicReturned'];
export class Expedition{
 constructor(surface=new World()){this.surface=surface;this.current=surface;this.dungeons=new Map();this.returnPoint=null;this.pendingDeath=false;}
 bind(cave){for(const key of shared)cave[key]=this.surface[key];for(const key of scalar)Object.defineProperty(cave,key,{get:()=>this.surface[key],set:value=>this.surface[key]=value,configurable:true});cave.factionName=id=>this.surface.factionName(id);cave.questText=q=>this.surface.questText(q);cave.player=this.surface.player;cave.onDeath=()=>this.pendingDeath=true;}
 enter(id,{debug=false}={}){
  if(this.current!==this.surface)return {ok:false,message:'Сначала вернитесь на поверхность.'};
  const entrance=this.surface.dungeonEntrances?.find(d=>d.id===id);if(!entrance||(!debug&&!this.surface.canInteract(this.surface.player,entrance,100)))return {ok:false,message:'Подойдите ко входу в подземелье.'};
  if(debug&&!this.surface.debugMode)return {ok:false,message:'Debug-режим выключен.'};
  cancelCraft(this.surface);this.returnPoint={x:entrance.x,y:entrance.y};
  let cave=this.dungeons.get(id);if(!cave){cave=new World(entrance.seed,{dungeonSpec:entrance,generatorVersion:this.surface.generatorVersion});this.dungeons.set(id,cave);}
  this.bind(cave);cave.debugMode=this.surface.debugMode;cave.time=this.surface.time;cave.elapsed=this.surface.elapsed;cave.player.action=null;Object.assign(cave.player,cave.spawn);cave.revealCell=null;cave.rebuildSpatial();cave.resetMotion();this.current=cave;cave.log('Спуск: '+entrance.name+'. Выход отмечен лестницей; карта открывается по мере исследования.');return {ok:true};
 }
 leave(death=false){if(this.current===this.surface)return false;cancelCraft(this.current);const cave=this.current;this.surface.debugMode=cave.debugMode;this.surface.time=cave.time;Object.assign(this.surface.player,death?this.surface.respawn:this.returnPoint);this.surface.player.action=null;this.current=this.surface;this.surface.current(this.surface.player,0);this.surface.rebuildSpatial();this.surface.resetMotion();this.pendingDeath=false;return true;}
 background(w,dt){
  // The real player exists in one layer only. Nobody can attack a duplicate on the surface.
  const player=w.player;w.player={id:'absent',role:'absent',faction:'absent',x:-1e9,y:-1e9,hp:0,maxHp:100,stamina:100,cooldown:0,attack:0,inventory:{}};
  try{w.update(dt);}finally{w.player=player;}
 }
 update(dt){if(this.surface.deathReport&&!this.surface.deathReport.acknowledged){if(this.pendingDeath){this.leave(true);return true;}return false;}const active=this.current;if(active!==this.surface)this.background(this.surface,dt);active.update(dt);if(active.dungeonSpec&&active.entities.every(e=>e.hp<=0)&&!this.surface.clearedDungeons.includes(active.dungeonSpec.id)){this.surface.clearedDungeons.push(active.dungeonSpec.id);active.log('Подземелье зачищено. Король примет отчёт об экспедиции.');}for(const cave of this.dungeons.values())if(cave!==active){cave.time=this.surface.time;this.background(cave,dt);}for(const cave of this.dungeons.values())if(cave.entities.every(e=>e.hp<=0)&&!this.surface.clearedDungeons.includes(cave.dungeonSpec.id)){this.surface.clearedDungeons.push(cave.dungeonSpec.id);cave.log('Подземелье зачищено. Король примет отчёт об экспедиции.');}if(this.pendingDeath){this.leave(true);for(const layer of [this.surface,...this.dungeons.values()])for(const e of layer.entities){if(e.enemyId==='player')e.enemyId=null;if(e.aggressor==='player')e.aggressor=null;}return true;}return false;}
 save(){const data=JSON.parse(this.surface.save());data.expedition={active:this.current.dungeonSpec?.id||null,returnPoint:this.returnPoint,dungeons:[...this.dungeons].map(([id,w])=>({id,state:JSON.parse(w.save())}))};return JSON.stringify(data);}
 static restore(raw){const data=JSON.parse(raw),saved=data.expedition;delete data.expedition;const expedition=new Expedition(World.restore(JSON.stringify(data)));if(!saved)return expedition;normalizeStamina(expedition.surface.player);expedition.returnPoint=saved.returnPoint;for(const {id,state}of saved.dungeons||[]){const cave=World.restore(JSON.stringify(state));expedition.bind(cave);expedition.dungeons.set(id,cave);}if(saved.active&&expedition.dungeons.has(saved.active)){expedition.current=expedition.dungeons.get(saved.active);expedition.current.debugMode=false;expedition.current.rebuildSpatial();}return expedition;}
}
