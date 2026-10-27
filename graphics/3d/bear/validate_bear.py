"""Plantigrade support, five toes, weighted swiping and head/forepaw clearance."""
import bpy,json,math
from mathutils import Vector
from mathutils.bvhtree import BVHTree

def validate():
    s=bpy.context.scene;clips=json.loads(s['sprite_export_json'])['clips'];old=(s.frame_current,s.frame_subframe)
    length_error=stance_error=neck_gap=attack_support=penetration=0.;support=4;flight=0.;swipe=[];trees={}
    def inside(tree,p):
        direction=Vector((1,.271,.119)).normalized();origin=p.copy();hits=0
        for j in range(32):
            location,normal,index,distance=tree.ray_cast(origin,direction)
            if location is None:break
            hits+=1;origin=location+direction*.00001
        return hits%2==1
    try:
        dg=bpy.context.evaluated_depsgraph_get()
        for name in ['BEAR skull','BEAR lower jaw']:
            o=bpy.data.objects[name];ev=o.evaluated_get(dg);m=ev.to_mesh();trees[name]=BVHTree.FromPolygons([v.co.copy() for v in m.vertices],[tuple(p.vertices) for p in m.polygons]);ev.to_mesh_clear()
        for name,clip in clips.items():
            span=clip['frames'] if clip['loop'] else clip['frames']-1
            for j in range(span*4+1):
                t=j/(span*4);u=(t*(2 if name=='run' else 1))%1;f=clip['start']+j*.25;s.frame_set(int(f),subframe=f%1);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();grounded=0
                body=bpy.data.objects['BEAR body'];head=bpy.data.objects['BEAR head'];ev=body.evaluated_get(dg);point=body.matrix_world.inverted()@head.matrix_world.translation;found,near,normal,index=ev.closest_point_on_mesh(point);assert found;neck_gap=max(neck_gap,(body.matrix_world@near-head.matrix_world.translation).length)
                root=bpy.data.objects['CHARACTER_ROOT']
                if clip['loop']:assert root.location.xy.length<1e-6,('root motion',name)
                if name=='run':flight=max(flight,root.location.z)
                for side in [-1,1]:
                    for front in [True,False]:
                        label='%s %s'%(side,'fore' if front else 'hind');points=[bpy.data.objects['BEAR joint '+label+' '+str(k)].location.copy() for k in range(3)]
                        for a,b,length in zip(points,points[1:],[.38,.43] if front else [.34,.40]):length_error=max(length_error,abs((b-a).length-length))
                        paw=bpy.data.objects['BEAR paw '+label];toes=[o for o in paw.children if o.name.startswith('BEAR toe') and not o.name.startswith('BEAR toe pad')];assert len(toes)==5,('toe count',label,len(toes))
                        low=min((o.matrix_world@v.co).z for o in paw.children if o.type=='MESH' for v in o.data.vertices)
                        if low<.006:grounded+=1
                        if name in ['walk','run']:
                            run=name=='run';offset=((.48 if side==-1 else .56) if front else (0 if side==-1 else .10)) if run else ((.25 if side==-1 else .75) if front else (0 if side==-1 else .5));phase=(u+offset)%1
                            if phase<(.30 if run else .68):stance_error=max(stance_error,abs(low-.002))
                        if name=='attack' and not(front and side==1):attack_support=max(attack_support,abs(low-.002))
                        if name=='attack' and front and side==1:
                            swipe.append(paw.matrix_world.translation.copy())
                            for skull_name,tree in trees.items():
                                target=bpy.data.objects[skull_name];inv=target.matrix_world.inverted()
                                for o in paw.children:
                                    if o.type!='MESH':continue
                                    transform=inv@o.matrix_world
                                    for v in o.data.vertices:
                                        p=transform@v.co;near,normal,index,distance=tree.find_nearest(p)
                                        if near is not None and distance>.004 and (p-near).dot(normal)<0 and inside(tree,p):penetration=max(penetration,(target.matrix_world@near-target.matrix_world@p).length)
                if name=='walk':support=min(support,grounded)
        assert length_error<1e-5,('limbs stretch',length_error)
        assert neck_gap<.04,('head detached from neck',neck_gap)
        assert stance_error<.003,('paw leaves stance ground',stance_error)
        assert attack_support<.003,('three supporting paws move off ground',attack_support)
        assert support>=2 and flight>.025,('walk/gallop support',support,flight)
        assert max(p.z for p in swipe)>.80 and max(p.x for p in swipe)-min(p.x for p in swipe)>.60 and min(p.y for p in swipe)<-.95,('weak forepaw sweep',swipe)
        assert penetration<.01,('forepaw cuts through head',penetration)
        c=clips['death'];s.frame_set(c['start']+c['frames']-1);body=bpy.data.objects['BEAR body'];ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get());m=ev.to_mesh();low=min((ev.matrix_world@v.co).z for v in m.vertices);ev.to_mesh_clear()
        skull=bpy.data.objects['BEAR skull'];ev=skull.evaluated_get(bpy.context.evaluated_depsgraph_get());m=ev.to_mesh();head_low=min((ev.matrix_world@v.co).z for v in m.vertices);ev.to_mesh_clear()
        assert low<.05 and head_low<.08,('corpse floats',low,head_low)
        return dict(status='passed',max_bone_length_error=length_error,max_neck_gap=neck_gap,max_stance_paw_error=stance_error,min_walk_support=support,attack_support_error=attack_support,forepaw_head_penetration=penetration,swipe_x_range=max(p.x for p in swipe)-min(p.x for p in swipe),swipe_height=max(p.z for p in swipe),flight_height=flight,corpse_body_floor=low,corpse_head_floor=head_low)
    finally:s.frame_set(old[0],subframe=old[1])
