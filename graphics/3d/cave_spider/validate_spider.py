"""Species checks: eight joined legs, alternating support and spinneret emission."""
import bpy,json,math
from mathutils import Vector

def validate():
    s=bpy.context.scene;clips=json.loads(s['sprite_export_json'])['clips'];old=(s.frame_current,s.frame_subframe)
    joins=lengths=emission=0.;support=8;spinheights=[]
    try:
        for name,clip in clips.items():
            span=clip['frames'] if clip['loop'] else clip['frames']-1
            for j in range(span*4+1):
                f=clip['start']+j*.25;s.frame_set(int(f),subframe=f%1);bpy.context.view_layer.update();feet=0
                for side in [-1,1]:
                    for row in range(4):
                        segments=[bpy.data.objects['SPIDER leg %s %s segment %s'%(side,row,k)] for k in range(5)]
                        for a,b in zip(segments,segments[1:]):joins=max(joins,(a.matrix_world@Vector((0,0,1))-b.matrix_world.translation).length)
                        for o,length in zip(segments[1:],[.48,.429,.231,.065]):lengths=max(lengths,abs(o.scale.z-length))
                        toe=segments[-1].matrix_world@Vector((0,0,1))
                        if toe.z<.04:feet+=1
                if name in ['walk','run']:support=min(support,feet)
                for strand in range(3):
                    thread=bpy.data.objects['SPIDER emitted silk %s 0'%strand]
                    if not thread.hide_render:
                        assert name=='web','silk visible outside web clip'
                        nozzle=bpy.data.objects['SPIDER spinneret '+str([-1,1][strand%2])]
                        emission=max(emission,(thread.matrix_world.translation-nozzle.matrix_world@Vector((0,.10,-.015))).length)
                if name=='web':spinheights.append(bpy.data.objects['SPIDER spinneret 1'].matrix_world.translation.z)
        assert joins<1e-5,('leg joints disconnected',joins)
        assert lengths<1e-5,('leg segment length changes',lengths)
        assert support>=4,('insufficient support',support)
        assert emission<1e-5,('web detached from spinnerets',emission)
        assert max(spinheights)-min(spinheights)>.25,('abdomen not raised',spinheights)
        death=clips['death'];s.frame_set(death['start']+death['frames']-1);o=bpy.data.objects['SPIDER abdomen'];low=min((o.matrix_world@v.co).z for v in o.data.vertices)
        assert low<.035,('corpse supported only by legs',low)
        return dict(status='passed',legs=8,max_joint_gap=joins,max_segment_length_error=lengths,minimum_supporting_feet=support,silk_attachment_error=emission,spinneret_lift=max(spinheights)-min(spinheights),corpse_abdomen_floor=low)
    finally:s.frame_set(old[0],subframe=old[1])
