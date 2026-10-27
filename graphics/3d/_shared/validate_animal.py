"""Evaluated animal geometry: ground, loop closure, origin and all eight views."""
import bpy,json,math,numpy as np
from mathutils import Matrix

def validate():
    s=bpy.context.scene;c=bpy.data.collections['ASSET • replace with your character'];cfg=json.loads(s['sprite_export_json'])
    old=(s.frame_current,s.frame_subframe);cache={};bounds=np.array([1.,1.,0.,0.]);minimum=99.;samples=0;loops={}
    camera=np.array(s.camera.matrix_world.inverted());scale=s.camera.data.ortho_scale
    def points():
        dg=bpy.context.evaluated_depsgraph_get();out=[]
        for o in c.objects:
            if o.type!='MESH' or o.hide_render:continue
            if o.modifiers or o.data.shape_keys:
                ev=o.evaluated_get(dg);m=ev.to_mesh();a=np.empty(len(m.vertices)*3);m.vertices.foreach_get('co',a);a=a.reshape(-1,3);ev.to_mesh_clear();matrix=np.array(ev.matrix_world)
            else:
                key=o.data.as_pointer()
                if key not in cache:
                    a=np.empty(len(o.data.vertices)*3);o.data.vertices.foreach_get('co',a);cache[key]=a.reshape(-1,3)
                a=cache[key];matrix=np.array(o.matrix_world)
            out.append(a@matrix[:3,:3].T+matrix[:3,3])
        return np.concatenate(out)
    try:
        for name,clip in cfg['clips'].items():
            span=clip['frames'] if clip['loop'] else clip['frames']-1
            for j in range(span*4+1):
                f=clip['start']+j*.25;s.frame_set(math.floor(f),subframe=f%1);bpy.context.view_layer.update();p=points();samples+=1;minimum=min(minimum,float(p[:,2].min()))
                for d in range(8):
                    transform=camera@np.array(Matrix.Rotation(d*math.pi/4,4,'Z'));xy=.5+(p@transform[:2,:3].T+transform[:2,3])/scale;bounds[:2]=np.minimum(bounds[:2],xy.min(axis=0));bounds[2:]=np.maximum(bounds[2:],xy.max(axis=0))
            if clip['loop']:
                s.frame_set(clip['start']);a=points();s.frame_set(clip['start']+span);b=points()
                loops[name]=float(np.max(np.abs(a-b))) if a.shape==b.shape else 100.
                assert loops[name]<1e-5,('loop seam',name,loops[name])
        assert minimum>=-.002,('geometry below ground',minimum)
        assert min(bounds[:2])>=.02 and max(bounds[2:])<=.98,('camera clipping',bounds.tolist())
        return dict(status='passed',samples=samples,view_checks=samples*8,min_geometry_z=minimum,screen_bounds=bounds.tolist(),loop_errors=loops)
    finally:s.frame_set(old[0],subframe=old[1])
