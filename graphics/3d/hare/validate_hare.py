"""Paired bounds, planted paws, hind toe-off and a grounded hare carcass."""
import bpy,json,math
from mathutils import Vector

def validate():
    s=bpy.context.scene;clips=json.loads(s['sprite_export_json'])['clips'];old=(s.frame_current,s.frame_subframe)
    length_error=stance_error=neck_gap=0.;bend=99.;roll=flight=extension=0.
    try:
        for name,clip in clips.items():
            span=clip['frames'] if clip['loop'] else clip['frames']-1
            for j in range(span*4+1):
                t=j/(span*4);u=(t*(2 if name=='run' else 1))%1;f=clip['start']+j*.25;s.frame_set(int(f),subframe=f%1);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get()
                body=bpy.data.objects['HARE body'];head=bpy.data.objects['HARE head'];ev=body.evaluated_get(dg);point=body.matrix_world.inverted()@head.matrix_world.translation;found,near,normal,index=ev.closest_point_on_mesh(point);assert found
                neck_gap=max(neck_gap,(body.matrix_world@near-head.matrix_world.translation).length)
                root=bpy.data.objects['CHARACTER_ROOT']
                if clip['loop']:assert root.location.xy.length<1e-6,('root motion',name)
                if name=='run':flight=max(flight,root.location.z)
                for side in [-1,1]:
                    for front in [True,False]:
                        label='%s %s'%(side,'fore' if front else 'hind');points=[bpy.data.objects['HARE joint '+label+' '+str(k)].location.copy() for k in range(3)]
                        for a,b,length in zip(points,points[1:],[.14,.18] if front else [.17,.21]):length_error=max(length_error,abs((b-a).length-length))
                        axis=(points[2]-points[0]).normalized();d=points[1]-points[0];bend=min(bend,(d-axis*d.dot(axis)).dot(Vector((0,1 if front else -1,0))))
                        if name=='run' and not front:extension=max(extension,(points[2]-points[0]).length)
                        if name in ['walk','run']:
                            run=name=='run';offset=(.52 if side==-1 else .56) if front else (0 if side==-1 else .025 if run else .015)
                            phase=(u+offset)%1;stance=(.18 if front else .24) if run else (.35 if front else .40)
                            paw=bpy.data.objects['HARE paw '+label]
                            if name=='run' and not front:roll=max(roll,paw.rotation_euler.x)
                            if phase<stance:
                                low=min((o.matrix_world@v.co).z for o in paw.children if o.type=='MESH' for v in o.data.vertices);stance_error=max(stance_error,abs(low-.002))
        assert length_error<1e-5,('limb length changes',length_error)
        assert bend>=-.0001,('elbow or knee reversed',bend)
        assert stance_error<.003,('paw not planted',stance_error)
        assert neck_gap<.04,('head detached from neck',neck_gap)
        assert roll>.50 and flight>.10 and extension>.30,('weak bound',roll,flight,extension)
        c=clips['death'];s.frame_set(c['start']+c['frames']-1);o=bpy.data.objects['HARE body'];low=min((o.matrix_world@v.co).z for v in o.data.vertices)
        assert low<.04,('corpse propped above ground',low)
        return dict(status='passed',max_bone_length_error=length_error,min_anatomical_bend=bend,max_stance_paw_error=stance_error,max_neck_gap=neck_gap,hind_toe_off_angle=roll,flight_height=flight,max_hind_extension=extension,corpse_body_floor=low)
    finally:s.frame_set(old[0],subframe=old[1])
