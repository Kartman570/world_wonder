"""Check real hoof contact, invariant limb lengths, neck continuity and tusk rush."""
import bpy,json,math
from mathutils import Vector

def validate():
    s=bpy.context.scene;clips=json.loads(s['sprite_export_json'])['clips'];old=(s.frame_current,s.frame_subframe)
    lengths=stance_error=neck_gap=0.;support=4;flight=0.;nose_positions=[];bend=100.
    try:
        for name,cfg in clips.items():
            span=cfg['frames'] if cfg['loop'] else cfg['frames']-1
            for j in range(span*4+1):
                t=j/(span*4);u=(t*(2 if name=='run' else 1))%1;f=cfg['start']+j*.25;s.frame_set(int(f),subframe=f%1);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();grounded=0
                body=bpy.data.objects['BOAR body'];head=bpy.data.objects['BOAR head'];ev=body.evaluated_get(dg);point=body.matrix_world.inverted()@head.matrix_world.translation;found,near,normal,index=ev.closest_point_on_mesh(point);assert found;neck_gap=max(neck_gap,(body.matrix_world@near-head.matrix_world.translation).length)
                root=bpy.data.objects['CHARACTER_ROOT']
                if cfg['loop']:assert root.location.xy.length<1e-6,('root slides',name)
                if name=='run':flight=max(flight,root.location.z)
                if name=='attack':nose_positions.append(bpy.data.objects['BOAR nasal disk'].matrix_world.translation.copy())
                for side in [-1,1]:
                    for front in [True,False]:
                        label='%s %s'%(side,'fore' if front else 'hind');points=[bpy.data.objects['BOAR joint '+label+' '+str(k)].location.copy() for k in range(4)]
                        for a,b,length in zip(points,points[1:],[.18,.22,.17] if front else [.20,.22,.16]):lengths=max(lengths,abs((b-a).length-length))
                        foot=bpy.data.objects['BOAR foot '+label];hooves=[o for o in foot.children if o.name.startswith('BOAR cloven hoof')];assert len(hooves)==2,('not cloven',label)
                        low=100
                        for o in foot.children:
                            if o.type=='MESH':
                                ev=o.evaluated_get(dg);m=ev.to_mesh();low=min(low,min((ev.matrix_world@v.co).z for v in m.vertices));ev.to_mesh_clear()
                        if low<.009:grounded+=1
                        if name in ['walk','run']:
                            run=name=='run';offset=((.48 if side==-1 else .56) if front else (0 if side==-1 else .10)) if run else ((.25 if side==-1 else .75) if front else (0 if side==-1 else .5));phase=(u+offset)%1
                            if phase<(.30 if run else .68):stance_error=max(stance_error,abs(low-.004))
                            axis=(points[3]-points[1]).normalized();pole=Vector((0,-1 if front else 1,0));pole=(pole-axis*pole.dot(axis)).normalized();bend=min(bend,(points[2]-points[1]).dot(pole))
                if name=='walk':support=min(support,grounded)
        assert lengths<1e-5,('limbs stretch',lengths)
        assert stance_error<.003,('hooves leave ground in stance',stance_error)
        assert support>=2 and flight>.02,('walk/gallop support',support,flight)
        assert bend>0,('carpus or hock reversed',bend)
        assert neck_gap<.045,('neck detached',neck_gap)
        head_lift=max(p.z for p in nose_positions)-nose_positions[0].z;assert head_lift>.10,('tusk flick goes downward',head_lift)
        advance=max(p.y for p in nose_positions)-min(p.y for p in nose_positions);assert advance>.25,('weak rush',advance)
        cfg=clips['death'];s.frame_set(cfg['start']+cfg['frames']-1);dg=bpy.context.evaluated_depsgraph_get();floors={}
        for name in ['BOAR body','BOAR skull']:
            ev=bpy.data.objects[name].evaluated_get(dg);m=ev.to_mesh();floors[name]=min((ev.matrix_world@v.co).z for v in m.vertices);ev.to_mesh_clear()
        assert floors['BOAR body']<.055 and floors['BOAR skull']<.08,('corpse floats',floors)
        return dict(status='passed',max_bone_error=lengths,max_hoof_stance_error=stance_error,min_walk_support=support,min_carpus_hock_bend=bend,max_neck_gap=neck_gap,flight_height=flight,tusk_rush_advance=advance,tusk_flick_height=head_lift,corpse_floors=floors)
    finally:s.frame_set(old[0],subframe=old[1])
