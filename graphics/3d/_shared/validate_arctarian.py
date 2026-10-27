"""Arctarian anatomy, two-hand tool contact and casing clearance."""
import bpy,json,math
from mathutils import Vector
from mathutils.bvhtree import BVHTree

def validate():
    s=bpy.context.scene;cfg=json.loads(s['sprite_export_json']);c=bpy.data.collections['ASSET • replace with your character']
    assert not any(o.name.startswith(('Eye','Iris','Brow','Upper eyelid')) for o in c.objects),'Human eye anatomy remains'
    assert bpy.data.objects.get('ARCT chest bioscanner') and bpy.data.objects.get('ARCT arm implant socket')
    assert sum(o.name.startswith('FACE forehead sensory plate') for o in c.objects)==3
    tool=bpy.data.objects.get('PROP arctarian mining probe');dg=bpy.context.evaluated_depsgraph_get();surfaces=[]
    for o in c.objects:
        if o.type=='MESH' and o.name.startswith(('ARCT body core','Anatomical head arctarian')):surfaces.append((o,BVHTree.FromObject(o,dg)))
    def contains(bvh,point):
        direction=Vector((.371,.529,.763)).normalized();origin=point.copy();hits=0
        for _ in range(40):
            hit=bvh.ray_cast(origin,direction,100.)
            if hit[0] is None:return hits%2==1
            hits+=1;origin=hit[0]+direction*.00001
        raise AssertionError('Indeterminate inside test')
    samples=0;grip_error=0.;inside=0.
    if tool:
        for name,clip in cfg['clips'].items():
            if name=='death':continue
            span=clip['frames'] if clip['loop'] else clip['frames']-1
            for j in range(span*4+1):
                f=clip['start']+j*.25;s.frame_set(math.floor(f),subframe=f%1);bpy.context.view_layer.update();samples+=1
                for side,target in [(1,(.18,.008,-.12)),(-1,(-.18,-.262,-.08))]:
                    hand=bpy.data.objects['RIG_hand'+str(side)];grip=hand.matrix_world@Vector((0,-.012,-.09));expected=tool.matrix_world@Vector(target);error=(grip-expected).length;grip_error=max(grip_error,error)
                    if error>.020:raise AssertionError(('probe hand contact',name,f,side,error))
                for y in [-.38,-.28,-.18,-.08,.04]:
                    for angle in [i*math.tau/8 for i in range(8)]:
                        point=tool.matrix_world@Vector((.11*math.cos(angle),y,.11*math.sin(angle)))
                        for o,bvh in surfaces:
                            p=o.matrix_world.inverted()@point;nearest=bvh.find_nearest(p)
                            if nearest[0] is None:continue
                            signed=(p-nearest[0]).dot(nearest[1])
                            penetrating=signed<-.004 and contains(bvh,p)
                            if penetrating:inside=min(inside,signed)
                            if penetrating:raise AssertionError(('probe inside body',name,f,o.name,signed))
    return dict(status='passed',samples=samples,max_grip_error=grip_error,min_signed_distance=inside)
