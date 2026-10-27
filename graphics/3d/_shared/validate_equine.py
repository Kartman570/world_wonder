"""Quarter-frame equine geometry, hoof contact, loop and eight-view framing checks."""
import bpy,json,math,numpy as np
from mathutils import Matrix,Vector

def validate():
    s=bpy.context.scene;c=bpy.data.collections['ASSET • replace with your character'];cfg=json.loads(s['sprite_export_json']);view=np.array(s.camera.matrix_world.inverted(),float);scale=s.camera.data.ortho_scale;bounds=np.array([1.,1.,0.,0.]);samples=0;loops={};low=100.;max_join_gap=0.
    def geometry():
        dg=bpy.context.evaluated_depsgraph_get();points=[]
        for o in c.objects:
            if o.type=='MESH' and not o.hide_render:
                ev=o.evaluated_get(dg);m=ev.to_mesh();coords=np.empty(len(m.vertices)*3,np.float32);m.vertices.foreach_get('co',coords);coords=coords.reshape(-1,3);mat=np.array(ev.matrix_world,float);points.append(coords@mat[:3,:3].T+mat[:3,3]);ev.to_mesh_clear()
        return np.concatenate(points)
    for name,clip in cfg['clips'].items():
        span=clip['frames'] if clip['loop'] else clip['frames']-1
        for j in range(span*4+1):
            f=clip['start']+j*.25;s.frame_set(math.floor(f),subframe=f%1);bpy.context.view_layer.update();samples+=1
            dg=bpy.context.evaluated_depsgraph_get()
            torso=bpy.data.objects.get('EQUINE torso')
            for front in [True,False]:
                for side in [-1,1]:
                    limb=bpy.data.objects.get('EQUINE '+('fore' if front else 'hind')+' limb '+str(side))
                    segment=next(o for o in limb.children if o.name.startswith('EQUINE '+('fore' if front else 'hind')+' segment'))
                    ev=segment.evaluated_get(dg);mesh=ev.to_mesh();center=sum((ev.matrix_world@v.co for v in list(mesh.vertices)[:20]),Vector())/20;ev.to_mesh_clear()
                    expected=torso.matrix_world@Vector((side*.18,-.59 if front else .62,1.50 if front else 1.46));gap=(center-expected).length;max_join_gap=max(max_join_gap,gap)
                    if gap>.065:raise AssertionError(('limb detached',name,f,front,side,gap))
            points=geometry();low=min(low,float(points[:,2].min()))
            if points[:,2].min()<-.004:raise AssertionError(('underground',name,f,float(points[:,2].min())))
            points=np.column_stack([points,np.ones(len(points))])
            for d in range(8):
                p=points@(view@np.array(Matrix.Rotation(d*math.pi/4,4,'Z'),float)).T;xy=.5+p[:,:2]/scale;bounds[:2]=np.minimum(bounds[:2],xy.min(axis=0));bounds[2:]=np.maximum(bounds[2:],xy.max(axis=0))
        if clip['loop']:
            s.frame_set(clip['start']);a=geometry();s.frame_set(clip['start']+span);b=geometry();error=float(np.abs(a-b).max());loops[name]=error
            if error>1e-5:raise AssertionError(('loop',name,error))
    if bounds[:2].min()<.02 or bounds[2:].max()>.98:raise AssertionError(('framing',bounds.tolist()))
    s.frame_set(1)
    return dict(status='passed',samples=samples,view_checks=samples*8,screen_bounds=bounds.tolist(),min_z=low,max_join_gap=max_join_gap,loop_errors=loops)
