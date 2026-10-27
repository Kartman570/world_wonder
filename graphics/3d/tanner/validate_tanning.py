"""Check grips, cutting plane, downstroke and cleared return at quarter frames."""
import bpy,json
from mathutils import Vector

def validate():
    s=bpy.context.scene;clip=json.loads(s['sprite_export_json'])['clips']['work']
    tool=bpy.data.objects['PROP fleshing knife'];old=(s.frame_current,s.frame_subframe)
    error=plane=0.;stroke=[];returns=[]
    try:
        for j in range(clip['frames']*4+1):
            t=j/(clip['frames']*4);f=clip['start']+j*.25
            s.frame_set(int(f),subframe=f%1);bpy.context.view_layer.update()
            for side in [-1,1]:
                palm=bpy.data.objects['RIG_hand'+str(side)].matrix_world@Vector((0,-.012,-.09))
                error=max(error,(palm-tool.matrix_world@Vector((side*.235,.025,.025))).length)
            edge=tool.matrix_world@Vector((0,-.034,0))
            if .15<=t<=.55:plane=max(plane,abs(edge.y+.634));stroke.append(edge.z)
            if .74<=t<=.88:returns.append(edge.y)
        assert error<.015,('knife grip',error)
        assert plane<.002,('blade leaves work plane',plane)
        assert max(stroke)-min(stroke)>.30,('short downstroke',stroke)
        assert min(returns)>-.55,('blade touches hide on return',returns)
        return dict(status='passed',max_grip_error=error,stroke_plane_error=plane,stroke_length=max(stroke)-min(stroke),return_clearance=min(returns)+.634)
    finally:s.frame_set(old[0],subframe=old[1])
