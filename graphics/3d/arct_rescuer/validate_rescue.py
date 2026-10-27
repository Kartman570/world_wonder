"""Contact checks for kneeling, garment support and pointing gestures."""
import bpy,json,math
from mathutils import Vector

def validate():
    s=bpy.context.scene;cfg=json.loads(s['sprite_export_json']);clip=cfg['clips']['work'];span=clip['frames'];shell=bpy.data.objects['PROP offered breathing garment'];errors={'left_grip':0.,'right_grip':0.,'chest_point':0.};knee_range=[100.,-100.];samples=0
    fingers=[o for o in bpy.data.objects['RIG_hand1'].children if o.name.startswith('Curled finger')];index=min(fingers,key=lambda o:o.location.x)
    knee=next(o for o in s.objects if o.type=='MESH' and o.name.startswith('Trouser knee') and sum(v.co.x for v in o.data.vertices)>0)
    for j in range(span*4+1):
        f=clip['start']+j*.25;t=j/(span*4);s.frame_set(math.floor(f),subframe=f%1);bpy.context.view_layer.update();samples+=1
        for side,key in [(-1,'left_grip'),(1,'right_grip')]:
            if side==1 and .30<t<.82:continue
            hand=bpy.data.objects['RIG_hand'+str(side)];palm=hand.matrix_world@Vector((0,-.012,-.09));corner=shell.matrix_world@Vector((side*.18,.008,.03));errors[key]=max(errors[key],(palm-corner).length)
        if .40<=t<=.52:
            tip=index.matrix_world@Vector((0,0,-1));screen=bpy.data.objects['ARCT chest display'].matrix_world@Vector((0,-.012,0));errors['chest_point']=max(errors['chest_point'],(tip-screen).length)
        if .62<=t<=.72:
            direction=(bpy.data.objects['RIG_hand1'].matrix_world.to_3x3()@Vector((0,0,-1))).normalized()
            if not direction.z<-.65 or not direction.y<-.30:raise AssertionError(('lower basin gesture',f,list(direction)))
        if .20<=t<=.78:
            ev=knee.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=ev.to_mesh();z=min((ev.matrix_world@v.co).z for v in mesh.vertices);ev.to_mesh_clear();knee_range[0]=min(knee_range[0],z);knee_range[1]=max(knee_range[1],z)
    if max(errors.values())>.025:raise AssertionError(('rescue hand contact',errors))
    if knee_range[0]<-.003 or knee_range[1]>.015:raise AssertionError(('kneeling contact',knee_range))
    dead=cfg['clips']['death'];s.frame_set(dead['start']+dead['frames']-1);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();cloth_min=100.
    for o in shell.children:
        if o.type=='MESH':
            ev=o.evaluated_get(dg);mesh=ev.to_mesh();cloth_min=min(cloth_min,min((ev.matrix_world@v.co).z for v in mesh.vertices));ev.to_mesh_clear()
    if cloth_min>.03 or cloth_min<-.003:raise AssertionError(('dropped garment floor',cloth_min))
    return dict(status='passed',samples=samples,max_contact_errors=errors,knee_min_z_range=knee_range,dropped_garment_min_z=cloth_min)
