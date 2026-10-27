"""Digitigrade contact, neck continuity, bite timing and grounded wolf carcass."""
import bpy,json,math
from mathutils import Vector

def validate():
    s=bpy.context.scene;clips=json.loads(s['sprite_export_json'])['clips'];old=(s.frame_current,s.frame_subframe)
    length_error=stance_error=neck_gap=0.;bend=99.;support=4;flight=0.
    try:
        for name,clip in clips.items():
            span=clip['frames'] if clip['loop'] else clip['frames']-1
            for j in range(span*4+1):
                t=j/(span*4);u=(t*(2 if name=='run' else 1))%1;f=clip['start']+j*.25;s.frame_set(int(f),subframe=f%1);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();grounded=0
                body=bpy.data.objects['WOLF body'];head=bpy.data.objects['WOLF head'];ev=body.evaluated_get(dg);point=body.matrix_world.inverted()@head.matrix_world.translation;found,near,normal,index=ev.closest_point_on_mesh(point);assert found;neck_gap=max(neck_gap,(body.matrix_world@near-head.matrix_world.translation).length)
                root=bpy.data.objects['CHARACTER_ROOT']
                if clip['loop']:assert root.location.xy.length<1e-6,('root motion',name)
                if name=='run':flight=max(flight,root.location.z)
                for side in [-1,1]:
                    for front in [True,False]:
                        label='%s %s'%(side,'fore' if front else 'hind');points=[bpy.data.objects['WOLF joint '+label+' '+str(k)].location.copy() for k in range(4)]
                        for a,b,length in zip(points,points[1:],[.25,.26,.18] if front else [.24,.28,.18]):length_error=max(length_error,abs((b-a).length-length))
                        axis=(points[3]-points[1]).normalized();d=points[2]-points[1];bend=min(bend,(d-axis*d.dot(axis)).dot(Vector((0,-1 if front else 1,0))))
                        if name in ['walk','run']:
                            run=name=='run';offset=((.48 if side==-1 else .56) if front else (0 if side==-1 else .08)) if run else ((.25 if side==-1 else .75) if front else (0 if side==-1 else .5));phase=(u+offset)%1;stance=(.23 if front else .27) if run else .65
                            paw=bpy.data.objects['WOLF paw '+label];low=min((o.matrix_world@v.co).z for o in paw.children if o.type=='MESH' for v in o.data.vertices)
                            if phase<stance:stance_error=max(stance_error,abs(low-.002))
                            if low<.006:grounded+=1
                if name=='walk':support=min(support,grounded)
        assert length_error<1e-5,('limb length changes',length_error)
        assert bend>=-.0001,('carpus or hock reversed',bend)
        assert stance_error<.003,('paw leaves ground in stance',stance_error)
        assert neck_gap<.04,('head detached from neck',neck_gap)
        assert support>=2 and flight>.04,('walk/gallop support',support,flight)
        c=clips['idle'];s.frame_set(c['start']);head=bpy.data.objects['WOLF head'];y0=head.matrix_world.translation.y
        c=clips['attack'];f=c['start']+(c['frames']-1)*.38;s.frame_set(int(f),subframe=f%1);opening=bpy.data.objects['WOLF jaw'].rotation_euler.x
        f=c['start']+(c['frames']-1)*.68;s.frame_set(int(f),subframe=f%1);closing=bpy.data.objects['WOLF jaw'].rotation_euler.x;advance=y0-head.matrix_world.translation.y
        assert opening>.55 and closing<.15 and advance>.18,('bite timing',opening,closing,advance)
        c=clips['death'];s.frame_set(c['start']+c['frames']-1);body=bpy.data.objects['WOLF body'];ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get());m=ev.to_mesh();low=min((ev.matrix_world@v.co).z for v in m.vertices);ev.to_mesh_clear()
        skull=bpy.data.objects['WOLF skull'];ev=skull.evaluated_get(bpy.context.evaluated_depsgraph_get());m=ev.to_mesh();head_low=min((ev.matrix_world@v.co).z for v in m.vertices);ev.to_mesh_clear()
        assert low<.05 and head_low<.06,('corpse floats',low,head_low)
        return dict(status='passed',max_bone_length_error=length_error,min_anatomical_bend=bend,max_stance_paw_error=stance_error,max_neck_gap=neck_gap,min_walk_support=support,flight_height=flight,bite_opening=opening,bite_closing=closing,bite_advance=advance,corpse_body_floor=low,corpse_head_floor=head_low)
    finally:s.frame_set(old[0],subframe=old[1])
