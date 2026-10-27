import {TILE} from './content.js';
// Keep tree IDs and the world's RNG stream stable: saves, logging jobs and stumps refer to IDs.
export function thinTree(seed,id){let h=2166136261;for(const c of String(seed)+':forest-density:'+id)h=Math.imul(h^c.charCodeAt(0),16777619);h^=h>>>16;return (h>>>0)%1000<100;}
export function treeOverlapsClearing(t,p,radius=2*TILE){const s=t.s||1;return t.x+135*s>p.x-radius&&t.x-135*s<p.x+radius&&t.y+30*s>p.y-radius&&t.y-320*s<p.y+radius;}
export function clearForestLandmarks(w){if(w.dungeonSpec)return;const targets=[...(w.dungeonEntrances||[]),...(w.landmarks||[]),...(w.loreSites||[]),...(w.alienEcology?.sites||[])].filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
 for(const t of w.trees||[])if(!t.hidden&&t.wood>0&&thinTree(w.seed,t.id)){t.hidden=true;t.wood=0;}
 for(const p of targets)for(const t of w.treesNear(p,950))if(treeOverlapsClearing(t,p)){t.hidden=true;t.wood=0;}
 if(w.alienFlora)w.alienFlora=w.alienFlora.filter(t=>!targets.some(p=>Math.abs(t.x-p.x)<100+80*(t.s||1)&&t.y>p.y-100&&t.y<p.y+100+160*(t.s||1)));
}
