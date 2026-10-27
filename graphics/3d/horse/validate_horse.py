"""Fixed horse skeleton, hoof support, rein anchors/length and grounded fall."""
import bpy,json
from mathutils import Vector
from mathutils.bvhtree import BVHTree

def validate():
    s=bpy.context.scene;clips=json.loads(s['sprite_export_json'])['clips'];old=(s.frame_current,s.frame_subframe)
    length_error=stance_error=rein_gap=rein_error=neck_gap=0.;bend=100.;support=4;flight=0.
    body=bpy.data.objects['EQUINE barrel'];headskin=bpy.data.objects['EQUINE cheek'];tree=BVHTree.FromPolygons([v.co.copy() for v in body.data.vertices],[tuple(p.vertices) for p in body.data.polygons]);headpoints=[v.co.copy() for v in list(headskin.data.vertices)[::20]]
    try:
        for name,cfg in clips.items():
            span=cfg['frames'] if cfg['loop'] else cfg['frames']-1
            for j in range(span*4+1):
                t=j/(span*4);u=(t*(2 if name=='run' else 1))%1;f=cfg['start']+j*.25;s.frame_set(int(f),subframe=f%1);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();grounded=0
                root=bpy.data.objects['CHARACTER_ROOT'];head=bpy.data.objects['EQUINE head']
                if cfg['loop']:assert root.location.xy.length<1e-6,('root slides',name)
                if name=='run':flight=max(flight,root.location.z)
                transform=body.matrix_world.inverted()@headskin.matrix_world;gap=min(tree.find_nearest(transform@p)[3] for p in headpoints);neck_gap=max(neck_gap,gap)
                for side in [-1,1]:
                    for front in [True,False]:
                        label='%s %s'%(side,'fore' if front else 'hind');points=[bpy.data.objects['HORSE joint '+label+' '+str(k)].location.copy() for k in range(4)]
                        for a,b,length in zip(points,points[1:],[.35,.58,.50] if front else [.50,.50,.46]):length_error=max(length_error,abs((b-a).length-length))
                        axis=(points[3]-points[1]).normalized();pole=Vector((0,-1 if front else 1,0));pole=(pole-axis*pole.dot(axis)).normalized();bend=min(bend,(points[2]-points[1]).dot(pole))
                        foot=bpy.data.objects['HORSE foot '+label];low=min((o.matrix_world@v.co).z for o in foot.children if o.type=='MESH' for v in o.data.vertices)
                        if low<.008:grounded+=1
                        if name in ['walk','run']:
                            run=name=='run';offset=((.48 if side==-1 else .56) if front else (0 if side==-1 else .08)) if run else ((.25 if side==-1 else .75) if front else (0 if side==-1 else .5));phase=(u+offset)%1;stance=(.25 if front else .28) if run else .66
                            if phase<stance:stance_error=max(stance_error,abs(low-.002))
                    rein=bpy.data.objects['HORSE rein '+str(side)];ev=rein.evaluated_get(dg);m=ev.to_mesh();centers=[sum((m.vertices[k].co for k in range(i*8,(i+1)*8)),Vector())/8 for i in range(9)];ev.to_mesh_clear();start=head.location+head.rotation_euler.to_matrix()@Vector((side*.15,-.31,-.18));end=Vector((side*.15,-.15,1.91));rein_gap=max(rein_gap,(centers[0]-start).length,(centers[-1]-end).length);rein_error=max(rein_error,abs(sum((b-a).length for a,b in zip(centers,centers[1:]))-1.40))
                if name=='walk':support=min(support,grounded)
        assert length_error<1e-5,('bones stretch',length_error)
        assert stance_error<.003,('hooves leave stance ground',stance_error)
        assert bend>0,('carpus/hock reversed',bend)
        assert support>=2 and flight>.04,('walk/gallop support',support,flight)
        assert rein_gap<1e-5 and rein_error<.003,('loose or stretching reins',rein_gap,rein_error)
        assert neck_gap<.025,('head detached from neck',neck_gap)
        c=clips['death'];s.frame_set(c['start']+c['frames']-1);dg=bpy.context.evaluated_depsgraph_get();floors={}
        for name in ['EQUINE barrel','EQUINE cheek']:
            ev=bpy.data.objects[name].evaluated_get(dg);m=ev.to_mesh();floors[name]=min((ev.matrix_world@v.co).z for v in m.vertices);ev.to_mesh_clear()
        assert floors['EQUINE barrel']<.06 and floors['EQUINE cheek']<.10,('corpse floats',floors)
        return dict(status='passed',max_bone_error=length_error,max_hoof_stance_error=stance_error,min_carpus_hock_bend=bend,min_walk_support=support,flight_height=flight,max_rein_anchor_gap=rein_gap,max_rein_length_error=rein_error,max_head_neck_gap=neck_gap,corpse_floors=floors)
    finally:s.frame_set(old[0],subframe=old[1])
