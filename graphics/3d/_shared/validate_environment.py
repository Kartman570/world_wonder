"""Evaluated one-view geometry, common camera margins and animation loop closure."""
import bpy,json,math
import numpy as np

def validate():
    s=bpy.context.scene;cfg=json.loads(s['sprite_export_json']);old=(s.frame_current,s.frame_subframe);bounds=np.array([1.,1.,0.,0.]);samples=0;loops={}
    def geometry():
        dg=bpy.context.evaluated_depsgraph_get();parts=[]
        for o in bpy.data.collections['ASSET • replace with your character'].objects:
            if o.type not in ['MESH','CURVE','SURFACE','FONT'] or o.hide_render:continue
            ev=o.evaluated_get(dg);m=ev.to_mesh();p=np.array([tuple(v.co) for v in m.vertices]);mat=np.array(ev.matrix_world);parts.append(p@mat[:3,:3].T+mat[:3,3]);ev.to_mesh_clear()
        return np.concatenate(parts)
    try:
        clips=cfg.get('clips') or {'still':dict(start=1,frames=1,loop=False)}
        view=np.array(s.camera.matrix_world.inverted())
        for name,c in clips.items():
            span=c['frames'] if c['loop'] else c['frames']-1
            for j in range(span*4+1):
                f=c['start']+j*.25;s.frame_set(math.floor(f),subframe=f%1);bpy.context.view_layer.update();p=geometry();samples+=1;p=p@view[:3,:3].T+view[:3,3];xy=.5+p[:,:2]/s.camera.data.ortho_scale;bounds[:2]=np.minimum(bounds[:2],xy.min(axis=0));bounds[2:]=np.maximum(bounds[2:],xy.max(axis=0))
            if c['loop']:
                s.frame_set(c['start']);a=geometry();s.frame_set(c['start']+span);b=geometry();assert a.shape==b.shape;loops[name]=float(np.abs(a-b).max());assert loops[name]<1e-5,('loop',name,loops[name])
        if cfg.get('tileable'):assert np.all(bounds[:2]<=0) and np.all(bounds[2:]>=1),('tile does not cover camera',bounds.tolist())
        else:assert bounds[:2].min()>.02 and bounds[2:].max()<.98,('camera clips geometry',bounds.tolist())
        return dict(status='passed',samples=samples,screen_bounds=bounds.tolist(),loop_errors=loops)
    finally:s.frame_set(old[0],subframe=old[1])
