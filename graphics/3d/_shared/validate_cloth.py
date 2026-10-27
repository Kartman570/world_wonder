"""Check covered leg vertices against the evaluated closed skirt surface."""
import bpy,json,math
from mathutils import Vector
from mathutils.bvhtree import BVHTree

def validate():
    s=bpy.context.scene;cfg=json.loads(s['sprite_export_json']);skirt=bpy.data.objects.get('COSTUME long skirt')
    if skirt is None:return {'status':'not applicable'}
    old=(s.frame_current,s.frame_subframe);worst=0.;tests=0;bad=[]
    try:
        for name,clip in cfg['clips'].items():
            span=clip['frames'] if clip['loop'] else clip['frames']-1
            for j in range(span*4+1):
                f=clip['start']+j*.25;s.frame_set(math.floor(f),subframe=f%1);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get()
                ev=skirt.evaluated_get(dg);m=ev.to_mesh();inv=skirt.matrix_world.inverted();tree=BVHTree.FromPolygons([v.co for v in m.vertices],[p.vertices[:] for p in m.polygons]);ev.to_mesh_clear()
                for part in bpy.data.collections['ASSET • replace with your character'].objects:
                    if part.type!='MESH' or not part.name.startswith(('Tailored trouser thigh','Trouser knee','Shaped boot calf')):continue
                    ev=part.evaluated_get(dg);m=ev.to_mesh();matrix=inv@ev.matrix_world
                    for v in m.vertices:
                        p=matrix@v.co
                        if not .37<p.z<1.16:continue
                        loc,normal,_,_=tree.find_nearest(p)
                        penetration=(p-loc).dot(normal);worst=max(worst,penetration);tests+=1
                        if penetration>.015:bad.append((name,f,part.name,round(penetration,4)))
                    ev.to_mesh_clear()
        if bad:raise AssertionError(str(bad[:12]))
        return dict(status='passed',vertex_checks=tests,max_penetration=worst)
    finally:s.frame_set(old[0],subframe=old[1])


def validate_apron():
    s=bpy.context.scene;cfg=json.loads(s['sprite_export_json']);apron=bpy.data.objects.get('COSTUME apron')
    if apron is None:return {'status':'not applicable'}
    old=(s.frame_current,s.frame_subframe);worst=0.;count=0;where=None
    try:
        for name,c in cfg['clips'].items():
            if name=='death':continue
            span=c['frames'] if c['loop'] else c['frames']-1
            for i in range(span*4+1):
                f=c['start']+i*.25;s.frame_set(math.floor(f),subframe=f%1);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();ev=apron.evaluated_get(dg);m=ev.to_mesh();tree=BVHTree.FromPolygons([v.co for v in m.vertices],[p.vertices[:] for p in m.polygons]);ev.to_mesh_clear();inv=apron.matrix_world.inverted()
                for part in bpy.data.objects:
                    if not part.name.startswith(('Tailored trouser thigh','Trouser knee')):continue
                    ev=part.evaluated_get(dg);m=ev.to_mesh();mat=inv@ev.matrix_world
                    for v in m.vertices:
                        p=mat@v.co
                        if 1.02<p.z<1.23 and abs(p.x)<.17:
                            hit,_,_,_=tree.ray_cast(Vector((p.x,-2,p.z)),Vector((0,1,0)))
                            if hit:
                                gap=hit.y-p.y;count+=1
                                if gap>worst:worst=gap;where=(name,f)
                    ev.to_mesh_clear()
        if worst>.005:raise AssertionError(('apron penetration',worst,where))
        return dict(status='passed',vertex_checks=count,max_penetration=worst)
    finally:s.frame_set(old[0],subframe=old[1])
