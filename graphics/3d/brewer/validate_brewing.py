"""Check both grips and the actual stirring path at quarter frames."""
import bpy,json
from mathutils import Vector

def validate():
    s=bpy.context.scene;clip=json.loads(s['sprite_export_json'])['clips']['work']
    paddle=bpy.data.objects['PROP brewing paddle'];old=(s.frame_current,s.frame_subframe)
    error=0.;tips=[]
    try:
        for j in range(clip['frames']*4+1):
            f=clip['start']+j*.25;s.frame_set(int(f),subframe=f%1);bpy.context.view_layer.update()
            for side,z in [(-1,-.19),(1,.12)]:
                palm=bpy.data.objects['RIG_hand'+str(side)].matrix_world@Vector((0,-.012,-.09))
                error=max(error,(palm-paddle.matrix_world@Vector((0,0,z))).length)
            tips.append(paddle.matrix_world@Vector((0,0,-.93)))
        ranges=[max(v[i] for v in tips)-min(v[i] for v in tips) for i in [0,1]]
        assert error<.015,('paddle grip detached',error)
        assert min(ranges)>.20,('incomplete stirring path',ranges)
        assert min(v.z for v in tips)>.30,('paddle too low',min(v.z for v in tips))
        return dict(status='passed',max_grip_error=error,tip_xy_ranges=ranges,minimum_tip_height=min(v.z for v in tips))
    finally:s.frame_set(old[0],subframe=old[1])
