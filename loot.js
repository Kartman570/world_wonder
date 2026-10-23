// Keep source inventories separate; the player only receives things actually present.
export function nearbyLootSources(world,anchor=null,p=world.player){
 const groups=[['corpse',world.corpses||[],75],['woodPile',world.woodPiles||[],80],['landmark',world.landmarks||[],90]],sources=[];
 for(const [kind,list,radius]of groups)for(const obj of list){if(!world.canInteract(p,obj,radius))continue;const hasItems=Object.values(obj.inventory||{}).some(n=>n>0),needsButchering=kind==='corpse'&&obj.animal&&!obj.butchered;if(!hasItems&&!needsButchering&&obj!==anchor)continue;sources.push({kind,obj,radius,needsButchering,distance:Math.hypot(p.x-obj.x,p.y-obj.y)});}
 return sources.sort((a,b)=>a.distance-b.distance||String(a.obj.id).localeCompare(String(b.obj.id)));
}
export function takeLoot(world,source,key=null){
 if(!nearbyLootSources(world,source?.obj).some(s=>s.obj===source?.obj))return 0;
 const inventory=source.obj.inventory||{},keys=key===null?Object.keys(inventory):[key];let count=0;
 for(const k of keys){const n=inventory[k]||0;if(n<=0)continue;world.player.inventory[k]=(world.player.inventory[k]||0)+n;delete inventory[k];count+=n;}
 // Relic and chest availability must follow the same real inventory after collection.
 world.relicAvailable=!!world.landmarks?.find(l=>l.id==='relic')?.inventory.relic;
 return count;
}
export function takeAllNearbyLoot(world,anchor=null){let count=0;for(const source of nearbyLootSources(world,anchor))count+=takeLoot(world,source);return count;}
