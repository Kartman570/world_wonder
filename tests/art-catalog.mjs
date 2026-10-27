import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {ROLES,ANIMALS} from '../content.js';
import '../adventure-content.js';
import {LORE_ROLES} from '../lore-content.js';
const root=new URL('../graphics/sprites/',import.meta.url),m=JSON.parse(await fs.readFile(new URL('manifest.json',root))),all=m.catalog;
assert.equal(new Set(all.map(e=>e.id)).size,all.length);
for(const role of new Set([...Object.keys(ROLES),...Object.keys(ANIMALS),...Object.keys(LORE_ROLES),'carpenter','groom','horse']))assert.ok(all.some(e=>e.type==='character'&&e.gameRoles.includes(role)),role+' has an artist task');
assert.ok(all.some(e=>e.id==='player'));
for(const e of all){
 assert.match(e.id,/^[a-z0-9_]+$/);assert.ok(['character','static','dynamic'].includes(e.type));
 assert.equal(e.directions,e.type==='character'?8:e.type==='static'?1:0);
 if(e.components){for(const part of Object.values(e.components)){assert.equal(typeof part.spriteReady,'boolean');assert.ok(part.file.startsWith('static/'+e.id+'/'));if(part.spriteReady){const bytes=await fs.readFile(new URL(part.file,root));assert.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(bytes.readUInt32BE(16),part.frameWidth);assert.equal(bytes.readUInt32BE(20),part.frameHeight);assert.equal(part.frames,1);assert.ok(createHash('sha256').update(bytes).digest('hex').startsWith(part.hash));}}assert.ok(!e.file);}else assert.ok(e.file.startsWith(({character:'characters',static:'static',dynamic:'dynamic'})[e.type]+'/'+e.id+'/'));
 assert.equal(typeof e.spriteReady,'boolean');
 if(e.spriteReady&&!e.components){
  const bytes=await fs.readFile(new URL(e.file,root));assert.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a',e.id);
  assert.equal(bytes.readUInt32BE(16),e.frameWidth*(e.type==='character'?8:1),e.id+' columns');assert.equal(bytes.readUInt32BE(20),e.frameHeight*e.frames,e.id+' rows');
  assert.ok(createHash('sha256').update(bytes).digest('hex').startsWith(e.hash),e.id+' hash');
  if(e.type==='static')assert.equal(e.frames,1,e.id+' static frame');
  else {let row=0;for(const clip of Object.values(e.animations).filter(c=>c.ready).sort((a,b)=>a.start-b.start)){assert.equal(clip.start,row,e.id+' clip rows');row+=clip.frames;}assert.equal(row,e.frames,e.id+' total frames');}
 }
 if(e.type==='static'){assert.equal(e.animated,false);assert.ok(e.description.length>10);}
 else {assert.ok(Object.keys(e.animations).length>0);for(const clip of Object.values(e.animations)){assert.ok(clip.description.length>10);assert.equal(typeof clip.loop,'boolean');}}
}
assert.ok(!('assets' in m));assert.equal(all.filter(e=>e.id==='city_guard').length,1);
assert.ok(!all.some(e=>e.id==='robot'));await assert.rejects(fs.access(new URL('robot_8dir.png',root)));
for await(const file of fs.glob('**/*',{cwd:root.pathname,includeChildMatches:true})){assert.ok(!file.endsWith('.sprite.json'));assert.ok(!file.endsWith('.gitkeep'));}
assert.ok(all.find(e=>e.gameRoles?.includes('smith')).animations.work.description.includes('наковальне'));
assert.ok(!all.find(e=>e.id==='horse').animations.attack);
console.log('✓ Artist catalog: all roles/animals, unique IDs, animation descriptions, static/dynamic contracts, folders, migrated guard and no robot');
