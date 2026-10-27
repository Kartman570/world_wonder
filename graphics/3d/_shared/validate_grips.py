"""Verify two-hand contact and weapon shaft clearance from the actual head mesh."""
import bpy,json,math
from mathutils import Vector
from mathutils.bvhtree import BVHTree

def validate():
    s=bpy.context.scene;cfg=json.loads(s['sprite_export_json']);old=(s.frame_current,s.frame_subframe)
    props=[o for o in bpy.data.objects if 'second_hand_grip' in o or 'shaft_limits' in o];worst=0.;clearance=100.;samples=0
    if not props:return {'status':'not applicable'}
    try:
        for name,clip in cfg['clips'].items():
            if name=='death':continue
            span=clip['frames'] if clip['loop'] else clip['frames']-1
            for j in range(span*4+1):
                f=clip['start']+j*.25;s.frame_set(math.floor(f),subframe=f%1);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();head=bpy.data.objects['Anatomical head'];ev=head.evaluated_get(dg);mesh=ev.to_mesh()
                tree=BVHTree.FromPolygons([ev.matrix_world@v.co for v in mesh.vertices],[p.vertices[:] for p in mesh.polygons]);ev.to_mesh_clear()
                for tool in props:
                    if 'second_hand_grip' in tool:
                        target=tool.matrix_world@Vector(tool['second_hand_grip']);error=(bpy.data.objects['RIG_hand-1'].matrix_world.translation-target).length;worst=max(worst,error)
                        if error>.015:raise AssertionError(('second hand contact',name,f,error))
                    if 'shaft_limits' in tool:
                        a,b=tool['shaft_limits']
                        for i in range(33):
                            p=tool.matrix_world@Vector((0,0,a+(b-a)*i/32));near,normal,_,distance=tree.find_nearest(p);signed=distance if (p-near).dot(normal)>=0 else -distance;clearance=min(clearance,signed)
                            if signed<.030:raise AssertionError(('shaft near head',name,f,signed))
                    samples+=1
        return dict(status='passed',samples=samples,max_grip_error=worst,min_head_clearance=clearance)
    finally:s.frame_set(old[0],subframe=old[1])
