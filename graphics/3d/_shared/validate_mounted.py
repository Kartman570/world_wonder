"""Mounted contact and weapon clearance, sampled between exported frames."""
import bpy,json,math
from mathutils import Vector
from mathutils.bvhtree import BVHTree

def validate():
    s=bpy.context.scene;cfg=json.loads(s['sprite_export_json']);s.frame_set(cfg['clips']['idle']['start']);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get()
    torso=bpy.data.objects['EQUINE torso'];surfaces=[]
    for o in bpy.data.collections['ASSET • replace with your character'].objects:
        if o.type=='MESH' and o.name.startswith('EQUINE') and not o.data.shape_keys and len(o.data.materials) and 'coat' in o.data.materials[0].name:
            surfaces.append((o,BVHTree.FromObject(o,dg)))
    tool=bpy.data.objects.get('PROP sword');bow=bpy.data.objects.get('TOOL bow limbs');string=bpy.data.objects.get('TOOL bowstring');samples=0;penetration=0.;seat_error=0.;rein_error=0.;string_error=0.
    for name,clip in cfg['clips'].items():
        if name=='death':continue
        span=clip['frames'] if clip['loop'] else clip['frames']-1
        for j in range(span*4+1):
            f=clip['start']+j*.25;s.frame_set(math.floor(f),subframe=f%1);bpy.context.view_layer.update();samples+=1
            hips=[bpy.data.objects['RIG_hip'+str(side)].matrix_world.translation for side in [-1,1]];seat=sum(hips,Vector())/2;target=torso.matrix_world@Vector((0,.07,1.90));seat_error=max(seat_error,(seat-target).length)
            if tool and name in ['idle','walk','run','attack']:
                hand=bpy.data.objects['RIG_hand-1'];grip=hand.matrix_world@Vector((0,0,-.09));end=torso.matrix_world@Vector((-.15,-.15,2.10));rein_error=max(rein_error,(grip-end).length)
            if bow:
                if name in ['idle','walk','run']:
                    hand=bpy.data.objects['RIG_hand1'];grip=hand.matrix_world@Vector((0,0,-.09));end=torso.matrix_world@Vector((.15,-.15,2.10));rein_error=max(rein_error,(grip-end).length)
                if name=='attack':
                    ev=string.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=ev.to_mesh();middle=ev.matrix_world@((mesh.vertices[2].co+mesh.vertices[3].co)*.5);ev.to_mesh_clear();hand=bpy.data.objects['RIG_hand1'];grip=hand.matrix_world@Vector((0,-.012,-.09));string_error=max(string_error,(grip-middle).length)
                ev=bow.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=ev.to_mesh();points=[ev.matrix_world@v.co for v in mesh.vertices];ev.to_mesh_clear()
                for point in points:
                    for o,bvh in surfaces:
                        p=o.matrix_world.inverted()@point;near=bvh.find_nearest(p)
                        if near[0] is None:continue
                        signed=(p-near[0]).dot(near[1]);penetration=min(penetration,signed)
                        if signed<-.004:raise AssertionError(('bow inside mount',name,f,o.name,signed))
            if tool:
                for i in range(17):
                    z=-.05-.73*i/16
                    for x in [-.026,.026]:
                        point=tool.matrix_world@Vector((x,0,z))
                        for o,bvh in surfaces:
                            p=o.matrix_world.inverted()@point;near=bvh.find_nearest(p)
                            if near[0] is None:continue
                            signed=(p-near[0]).dot(near[1]);penetration=min(penetration,signed)
                            if signed<-.004:raise AssertionError(('sword inside mount',name,f,o.name,signed))
    if seat_error>.070:raise AssertionError(('saddle contact',seat_error))
    if string_error>.020:raise AssertionError(('bowstring contact',string_error))
    if rein_error>.035:raise AssertionError(('reins contact',rein_error))
    return dict(status='passed',samples=samples,max_saddle_error=seat_error,max_rein_error=rein_error,max_string_error=string_error,min_weapon_signed_distance=penetration)
