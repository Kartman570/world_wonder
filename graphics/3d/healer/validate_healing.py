"""Verify the mortar's support and the evaluated pestle foot inside its bowl."""
import bpy,json,math
from mathutils import Vector

def validate():
    s=bpy.context.scene;clip=json.loads(s['sprite_export_json'])['clips']['work']
    mortar=bpy.data.objects['PROP medicine mortar'];pestle=bpy.data.objects['PROP medicine pestle'];foot=bpy.data.objects['TOOL medicine pestle foot']
    old=(s.frame_current,s.frame_subframe);support=grip=penetration=0.;minimum=99.
    try:
        for j in range(clip['frames']*4+1):
            f=clip['start']+j*.25;s.frame_set(int(f),subframe=f%1);bpy.context.view_layer.update()
            palm=bpy.data.objects['RIG_hand-1'].matrix_world@Vector((0,-.012,-.09))
            support=max(support,(palm-mortar.matrix_world@Vector((0,0,-.012))).length)
            palm=bpy.data.objects['RIG_hand1'].matrix_world@Vector((0,-.012,-.09))
            grip=max(grip,(palm-pestle.matrix_world.translation).length)
            transform=mortar.matrix_world.inverted()@foot.matrix_world
            for v in foot.data.vertices:
                pt=transform@v.co;minimum=min(minimum,pt.z)
                radius=.050+max(0,pt.z-.035)/.095*.035
                penetration=max(penetration,math.hypot(pt.x,pt.y)-radius)
        assert support<.015,('unsupported mortar',support)
        assert grip<.015,('pestle grip detached',grip)
        assert minimum>=.033,('pestle below mortar floor',minimum)
        assert penetration<.003,('pestle crosses bowl wall',penetration)
        return dict(status='passed',support_error=support,pestle_grip_error=grip,min_foot_height=minimum,max_wall_penetration=penetration)
    finally:s.frame_set(old[0],subframe=old[1])
