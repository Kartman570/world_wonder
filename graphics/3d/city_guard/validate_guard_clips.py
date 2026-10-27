"""Intermediate-pose checks for all enabled guard clips. Never renders."""
import bpy,json,math
from mathutils import Vector,Matrix
from bpy_extras.object_utils import world_to_camera_view

def validate():
    s=bpy.data.scenes['SPRITE_TEMPLATE'];cfg=json.loads(s['sprite_export_json']);c=bpy.data.collections['ASSET • replace with your character'];cam=s.camera
    original=cam.matrix_world.copy();old=(s.frame_current,s.frame_subframe);errors=[];bounds=[1.,1.,0.,0.];count=0;floor=10.
    def geometry():
        dg=bpy.context.evaluated_depsgraph_get();p=[]
        for o in c.objects:
            if o.type=='MESH':
                ev=o.evaluated_get(dg);m=ev.to_mesh();p.extend(ev.matrix_world@v.co for v in m.vertices);ev.to_mesh_clear()
        return p
    loops={}
    try:
        for name,clip in cfg['clips'].items():
            start=clip['start'];span=clip['frames'] if clip['loop'] else clip['frames']-1
            for j in range(span*4+1):
                f=start+j*.25;s.frame_set(math.floor(f),subframe=f%1);bpy.context.view_layer.update();count+=1
                for side in [-1,1]:
                    knee=bpy.data.objects['RIG_knee'+str(side)]
                    if not 0<=knee.rotation_euler.x<2.5:errors.append((name,f,'knee limit'))
                dg=bpy.context.evaluated_depsgraph_get();points=[]
                for o in c.objects:
                    if o.type=='MESH':
                        ev=o.evaluated_get(dg);points.extend(ev.matrix_world@Vector(v) for v in ev.bound_box)
                for d in range(8):
                    cam.matrix_world=Matrix.Rotation(-d*math.pi/4,4,'Z')@original;bpy.context.view_layer.update()
                    for point in points:
                        p=world_to_camera_view(s,cam,point);bounds=[min(bounds[0],p.x),min(bounds[1],p.y),max(bounds[2],p.x),max(bounds[3],p.y)]
                if name=='death':
                    low=min(p.z for p in geometry());floor=min(floor,low)
                    if low<-.004:errors.append((name,f,'ground penetration',low))
            if clip['loop']:
                s.frame_set(start);a=geometry();s.frame_set(start+span);b=geometry();err=max((x-y).length for x,y in zip(a,b));loops[name]=err
                if err>1e-5:errors.append((name,'loop discontinuity',err))
        if min(bounds[:2])<.015 or max(bounds[2:])>.985:errors.append(('camera margin',bounds))
        if errors:raise AssertionError(str(errors[:20]))
        return dict(status='passed',quarter_frame_samples=count,views_checked=count*8,screen_bounds=bounds,min_death_surface_z=floor,loop_errors=loops)
    finally:
        cam.matrix_world=original;s.frame_set(old[0],subframe=old[1])
if __name__=='__main__':print(validate())
