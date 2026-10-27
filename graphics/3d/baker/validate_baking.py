"""Quarter-frame contacts for supported kneading and two-hand peel feeding."""
import bpy,json
from mathutils import Vector

def validate():
    s=bpy.context.scene;clip=json.loads(s['sprite_export_json'])['clips']['work']
    peel=bpy.data.objects['PROP baking peel'];loaf=bpy.data.objects['TOOL kneaded loaf']
    hands={side:bpy.data.objects['RIG_hand'+str(side)] for side in [-1,1]}
    old=(s.frame_current,s.frame_subframe);support=grip=contact=0.;heights=[]
    try:
        for j in range(clip['frames']*4+1):
            t=j/(clip['frames']*4);f=clip['start']+j*.25
            s.frame_set(int(f),subframe=f%1);bpy.context.view_layer.update()
            palm={side:o.matrix_world@Vector((0,-.012,-.09)) for side,o in hands.items()}
            support=max(support,(palm[-1]-peel.matrix_world@Vector((-.14,.025,.018))).length)
            if .52<=t<=.92:grip=max(grip,(palm[1]-peel.matrix_world@Vector((0,.50,0))).length)
            if t<.4:
                contact=max(contact,(palm[1]-peel.matrix_world@Vector((.012,0,.011+loaf.scale.z*2))).length)
                heights.append(loaf.scale.z)
        assert support<.015,('unsupported blade',support)
        assert grip<.015,('handle grip',grip)
        assert contact<.015,('hand misses dough',contact)
        assert max(heights)-min(heights)>.015,('no kneading deformation',heights)
        return dict(status='passed',support_error=support,handle_grip_error=grip,knead_contact_error=contact,dough_height_range=[min(heights),max(heights)])
    finally:s.frame_set(old[0],subframe=old[1])
