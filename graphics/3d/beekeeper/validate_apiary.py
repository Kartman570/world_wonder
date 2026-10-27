"""Verify hand contact with both comb corners during extraction and inspection."""
import bpy,json
from mathutils import Vector

def validate():
    s=bpy.context.scene;clip=json.loads(s['sprite_export_json'])['clips']['work']
    comb=bpy.data.objects['PROP natural honeycomb'];old=(s.frame_current,s.frame_subframe)
    error=0.;height=[]
    try:
        for j in range(clip['frames']*4+1):
            f=clip['start']+j*.25;s.frame_set(int(f),subframe=f%1);bpy.context.view_layer.update()
            for side in [-1,1]:
                palm=bpy.data.objects['RIG_hand'+str(side)].matrix_world@Vector((0,-.012,-.09))
                error=max(error,(palm-comb.matrix_world@Vector((side*.125,0,.13))).length)
            height.append(comb.matrix_world.translation.z)
        assert error<.015,('comb grip detached',error)
        assert max(height)-min(height)>.35,('no extraction lift',height)
        return dict(status='passed',max_grip_error=error,lift_height=max(height)-min(height))
    finally:s.frame_set(old[0],subframe=old[1])
