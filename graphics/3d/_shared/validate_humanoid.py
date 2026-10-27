"""Shared quarter-frame pose preflight for humanoids."""
import bpy,math,json,numpy as np
from mathutils import Vector,Matrix

def validate():
    s=bpy.data.scenes['SPRITE_TEMPLATE'];c=bpy.data.collections['ASSET • replace with your character'];cfg=json.loads(s['sprite_export_json']);old=(s.frame_current,s.frame_subframe);design=json.loads(s.get('character_design','{}'));flying=design.get('flying',False)
    bpy.context.view_layer.update();view=np.array(s.camera.matrix_world.inverted(),dtype=float);scale=s.camera.data.ortho_scale
    bounds=np.array([1.,1.,0.,0.]);count=0;errors=[];loops={};minsole=100.
    def geometry():
        dg=bpy.context.evaluated_depsgraph_get();out=[]
        for o in c.objects:
            if o.type in {'MESH','CURVE'} and not o.hide_render:
                ev=o.evaluated_get(dg);m=ev.to_mesh();out.extend(tuple(ev.matrix_world@v.co) for v in m.vertices);ev.to_mesh_clear()
        return np.asarray(out)
    try:
        for name,clip in cfg['clips'].items():
            start=clip['start'];span=clip['frames'] if clip['loop'] else clip['frames']-1
            for j in range(span*4+1):
                f=start+j*.25;s.frame_set(math.floor(f),subframe=f%1);bpy.context.view_layer.update();count+=1;dg=bpy.context.evaluated_depsgraph_get();points=[]
                for o in c.objects:
                    if o.type in {'MESH','CURVE'} and not o.hide_render:
                        ev=o.evaluated_get(dg);points.extend(tuple(ev.matrix_world@Vector(v)) for v in ev.bound_box)
                points=np.column_stack([np.asarray(points),np.ones(len(points))])
                for d in range(8):
                    transform=view@np.array(Matrix.Rotation(d*math.pi/4,4,'Z'),dtype=float);p=points@transform.T;xy=.5+p[:,:2]/scale
                    bounds[:2]=np.minimum(bounds[:2],xy.min(axis=0));bounds[2:]=np.maximum(bounds[2:],xy.max(axis=0))
                for side in [-1,1]:
                    knee=bpy.data.objects['RIG_knee'+str(side)]
                    if not 0<=knee.rotation_euler.x<2.5:errors.append((name,f,'knee limit'))
                    if not flying and name in ['idle','walk','run','stunned','work','work_knife']:
                        ankle=bpy.data.objects['RIG_ankle'+str(side)]
                        toe=ankle.matrix_world.to_3x3()@Vector((0,-1,0))
                        if toe.dot(Vector((0,-1,0)))<.99 and not (design.get('arct_rescue') and name=='work'):errors.append((name,f,'foot twist'))
                        for o in ankle.children:
                            if o.name.startswith('Boot sole'):
                                ev=o.evaluated_get(dg);m=ev.to_mesh();low=min((ev.matrix_world@v.co).z for v in m.vertices);ev.to_mesh_clear();minsole=min(minsole,low)
                                if low<-.002:errors.append((name,f,'foot underground',low))
            if clip['loop']:
                s.frame_set(start);a=geometry();s.frame_set(start+span);b=geometry()
                err=float(np.max(np.abs(a-b))) if a.shape==b.shape else 100.;loops[name]=err
                if err>1e-5:errors.append((name,'loop seam',err))
        if np.min(bounds[:2])<.02 or np.max(bounds[2:])>.98:errors.append(('camera bounds',bounds.tolist()))
        if errors:raise AssertionError(str(errors[:25]))
        return dict(status='passed',samples=count,view_checks=count*8,screen_bounds=bounds.tolist(),min_sole_z=None if flying else minsole,loop_errors=loops,clips=len(cfg['clips']),frames=sum(v['frames'] for v in cfg['clips'].values()))
    finally:s.frame_set(old[0],subframe=old[1])
if __name__=='__main__':print(validate())
