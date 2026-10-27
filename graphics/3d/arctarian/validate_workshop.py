"""Vessel support, tool ownership and handoff/storage/tuning contacts."""
import bpy,json,math
from mathutils import Vector

def validate():
    s=bpy.context.scene;cfg=json.loads(s['sprite_export_json']);clip=cfg['clips']['work'];span=clip['frames'];samples=0;errors={'vessel':0.,'dock':0.,'holster':0.,'ring':0.}
    groups={key:bpy.data.objects['PROP '+key] for key in ['old_attached','new_attached','old_carried','new_carried']}
    for j in range(span*4+1):
        f=clip['start']+j*.25;t=j/(span*4);s.frame_set(math.floor(f),subframe=f%1);bpy.context.view_layer.update();samples+=1
        visible=[key for key,o in groups.items() if any(not child.hide_render for child in o.children if child.type=='MESH')]
        if len(visible)!=1:raise AssertionError(('attachment ownership',f,visible))
        left=bpy.data.objects['RIG_hand-1'].matrix_world@Vector((0,-.012,-.09));right=bpy.data.objects['RIG_hand1'].matrix_world@Vector((0,-.012,-.09));bowl=bpy.data.objects['PROP living bowl'].matrix_world.translation
        errors['vessel']=max(errors['vessel'],(left-bowl).length)
        if any(a<=t<=b for a,b in [(.12,.16),(.44,.46),(.90,.92)]):
            dock=bpy.data.objects['PROP forearm tool dock'].matrix_world.translation;errors['dock']=max(errors['dock'],(right-dock).length)
        if any(a<=t<=b for a,b in [(.24,.34),(.70,.80)]):
            holster=bpy.data.objects['PROP workshop holster'].matrix_world@Vector((0,0,.07));errors['holster']=max(errors['holster'],(right-holster).length)
        if .50<=t<=.60:
            notch=bpy.data.objects['PROP tuning notch'].matrix_world.translation;errors['ring']=max(errors['ring'],(right-notch).length)
    if max(errors.values())>.020:raise AssertionError(('workshop contact',errors))
    return dict(status='passed',samples=samples,max_contact_errors=errors)
