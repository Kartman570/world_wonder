"""Short plantigrade limbs, five digging toes, stance support and low carcass."""
import bpy,json

def validate():
    s=bpy.context.scene;clips=json.loads(s['sprite_export_json'])['clips'];old=(s.frame_current,s.frame_subframe)
    length_error=stance_error=neck_gap=0.;support=4;flight=0.
    try:
        for name,cfg in clips.items():
            span=cfg['frames'] if cfg['loop'] else cfg['frames']-1
            for j in range(span*4+1):
                t=j/(span*4);u=(t*(2 if name=='run' else 1))%1;f=cfg['start']+j*.25;s.frame_set(int(f),subframe=f%1);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();grounded=0
                root=bpy.data.objects['CHARACTER_ROOT']
                if cfg['loop']:assert root.location.xy.length<1e-6,('root motion',name)
                if name=='run':flight=max(flight,root.location.z)
                body=bpy.data.objects['BADGER body'];head=bpy.data.objects['BADGER head'];ev=body.evaluated_get(dg);p=body.matrix_world.inverted()@head.matrix_world.translation;found,near,normal,index=ev.closest_point_on_mesh(p);assert found;neck_gap=max(neck_gap,(body.matrix_world@near-head.matrix_world.translation).length)
                for side in [-1,1]:
                    for front in [True,False]:
                        label='%s %s'%(side,'fore' if front else 'hind');points=[bpy.data.objects['BADGER joint '+label+' '+str(k)].location.copy() for k in range(3)]
                        for a,b,length in zip(points,points[1:],[.13,.16] if front else [.12,.15]):length_error=max(length_error,abs((b-a).length-length))
                        paw=bpy.data.objects['BADGER paw '+label];toes=[o for o in paw.children if o.name.startswith('BADGER toe')];assert len(toes)==5,('toe count',label,len(toes))
                        low=min((o.matrix_world@v.co).z for o in paw.children if o.type=='MESH' for v in o.data.vertices)
                        if low<.006:grounded+=1
                        if name in ['walk','run']:
                            run=name=='run';offset=((.48 if side==-1 else .56) if front else (0 if side==-1 else .10)) if run else ((.25 if side==-1 else .75) if front else (0 if side==-1 else .5));phase=(u+offset)%1
                            if phase<(.30 if run else .68):stance_error=max(stance_error,abs(low-.002))
                if name=='walk':support=min(support,grounded)
        assert length_error<1e-5,('limbs stretch',length_error)
        assert stance_error<.003,('stance paws float',stance_error)
        assert support>=2 and flight>.01,('walk/gallop support',support,flight)
        assert neck_gap<.03,('head detached',neck_gap)
        c=clips['death'];s.frame_set(c['start']+c['frames']-1);dg=bpy.context.evaluated_depsgraph_get();floors={}
        for name in ['BADGER body','BADGER skull']:
            ev=bpy.data.objects[name].evaluated_get(dg);m=ev.to_mesh();floors[name]=min((ev.matrix_world@v.co).z for v in m.vertices);ev.to_mesh_clear()
        assert floors['BADGER body']<.035 and floors['BADGER skull']<.05,('carcass floats',floors)
        return dict(status='passed',max_bone_error=length_error,max_stance_paw_error=stance_error,min_walk_support=support,flight_height=flight,max_neck_gap=neck_gap,corpse_floors=floors)
    finally:s.frame_set(old[0],subframe=old[1])
