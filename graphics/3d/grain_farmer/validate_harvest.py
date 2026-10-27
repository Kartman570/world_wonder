"""Check the evaluated sheaf grip and the sickle's contact with the stems."""
import bpy,json
from mathutils import Vector

def validate():
    s=bpy.context.scene
    clip=json.loads(s['sprite_export_json'])['clips']['work']
    sheaf=bpy.data.objects['PROP grain sheaf']
    hand=bpy.data.objects['RIG_hand-1']
    blade=bpy.data.objects['TOOL sickle blade']
    previous=(s.frame_current,s.frame_subframe)
    grip=0.;cut=float('inf')
    try:
        for j in range(clip['frames']*4+1):
            f=clip['start']+j*.25
            s.frame_set(int(f),subframe=f%1)
            bpy.context.view_layer.update()
            grip=max(grip,(hand.matrix_world@Vector((0,-.012,-.09))-sheaf.matrix_world.translation).length)
            if .10<=j/(clip['frames']*4)<=.35:
                target=sheaf.matrix_world@Vector((0,0,-.20))
                cut=min(cut,min((blade.matrix_world@v.co-target).length for v in blade.data.vertices))
        assert grip<.015,('sheaf detached from palm',grip)
        assert cut<.035,('sickle misses stem base',cut)
        return dict(status='passed',max_sheaf_grip_error=grip,closest_cut_to_stem=cut)
    finally:
        s.frame_set(previous[0],subframe=previous[1])
