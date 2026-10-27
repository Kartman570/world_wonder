"""Anatomical leg lengths, carpal/hock bend, planted split hooves and antler strike."""
import bpy,json,math
from mathutils import Vector

def validate():
    s=bpy.context.scene;clips=json.loads(s['sprite_export_json'])['clips'];old=(s.frame_current,s.frame_subframe)
    length_error=stance_error=neck_gap=0.;bend=99.;support=4
    try:
        for name,clip in clips.items():
            span=clip['frames'] if clip['loop'] else clip['frames']-1
            for j in range(span*4+1):
                t=j/(span*4);u=(t*(2 if name=='run' else 1))%1;f=clip['start']+j*.25;s.frame_set(int(f),subframe=f%1);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();grounded=0
                body=bpy.data.objects['GOAT ribcage'];head=bpy.data.objects['GOAT head'];ev=body.evaluated_get(dg);point=body.matrix_world.inverted()@head.matrix_world.translation
                found,near,normal,index=ev.closest_point_on_mesh(point);assert found,'missing neck surface';neck_gap=max(neck_gap,(body.matrix_world@near-head.matrix_world.translation).length)
                for side in [-1,1]:
                    for front in [True,False]:
                        label='%s %s'%(side,'fore' if front else 'hind');joints=[bpy.data.objects['GOAT joint '+label+' '+str(k)] for k in range(4)]
                        pts=[o.location.copy() for o in joints]
                        for a,b,length in zip(pts,pts[1:],[.32,.38,.33] if front else [.36,.40,.34]):length_error=max(length_error,abs((b-a).length-length))
                        axis=(pts[3]-pts[1]).normalized();offset=pts[2]-pts[1];perp=offset-axis*offset.dot(axis);bend=min(bend,perp.dot(Vector((0,-1 if front else 1,0))))
                        if name in ['walk','run']:
                            run=name=='run';phase_offset=((.48 if side==-1 else .56) if front else (0 if side==-1 else .08)) if run else ((.25 if side==-1 else .75) if front else (0 if side==-1 else .5))
                            phase=(u+phase_offset)%1;stance=phase<(.28 if run else .65)
                            hoof=bpy.data.objects['GOAT hoof '+label];low=99.
                            for o in hoof.children:
                                if o.name.startswith('GOAT split hoof'):
                                    ev=o.evaluated_get(dg);m=ev.to_mesh();low=min(low,min((ev.matrix_world@v.co).z for v in m.vertices));ev.to_mesh_clear()
                            if stance:stance_error=max(stance_error,abs(low-.0016))
                            if low<.006:grounded+=1
                if name=='walk':support=min(support,grounded)
                if clip['loop']:assert bpy.data.objects['CHARACTER_ROOT'].location.xy.length<1e-6,('root motion',name)
        assert length_error<1e-5,('leg bones stretch',length_error)
        assert neck_gap<.04,('head detached from continuous neck',neck_gap)
        assert bend>=-.0001,('carpus or hock bends wrong way',bend)
        assert stance_error<.003,('hoof loses contact during stance',stance_error)
        assert support>=2,('walk loses support',support)
        c=clips['idle'];s.frame_set(c['start']);head=bpy.data.objects['GOAT head'];high=head.matrix_world.translation.z
        antlers=[o for o in bpy.data.objects if o.name.startswith('GOAT horn')]
        y0=min((o.matrix_world@v.co).y for o in antlers for v in o.data.vertices)
        c=clips['attack'];f=c['start']+(c['frames']-1)*.60;s.frame_set(int(f),subframe=f%1);bpy.context.view_layer.update();drop=high-head.matrix_world.translation.z;advance=y0-min((o.matrix_world@v.co).y for o in antlers for v in o.data.vertices)
        assert drop>.20 and advance>.28,('weak head/antler strike',drop,advance)
        c=clips['death'];s.frame_set(c['start']+c['frames']-1);o=bpy.data.objects['GOAT ribcage'];body_low=min((o.matrix_world@v.co).z for v in o.data.vertices);antler_low=min((o.matrix_world@v.co).z for o in antlers for v in o.data.vertices)
        assert body_low<.07,('corpse propped above ground',body_low)
        assert antler_low>.01,('antlers support the carcass',antler_low)
        return dict(status='passed',max_leg_length_error=length_error,max_neck_gap=neck_gap,min_anatomical_bend=bend,max_stance_sole_error=stance_error,min_walk_support=support,strike_head_drop=drop,strike_antler_advance=advance,corpse_body_floor=body_low,corpse_antler_clearance=antler_low)
    finally:s.frame_set(old[0],subframe=old[1])
