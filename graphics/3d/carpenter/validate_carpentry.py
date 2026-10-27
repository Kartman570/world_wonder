"""Check actual contacts, tool docks and both hammer blows at subframes."""
import bpy,json
from mathutils import Vector

def validate():
    s=bpy.context.scene;clip=json.loads(s['sprite_export_json'])['clips']['work']
    plank=bpy.data.objects['PROP carpentry plank'];saw=bpy.data.objects['PROP carpenter frame saw'];hammer=bpy.data.objects['PROP carpenter hammer']
    body=bpy.data.objects['RIG_body'];old=(s.frame_current,s.frame_subframe)
    support=grip=dock=plane=0.;ys=[];hits=[]
    try:
        for j in range(clip['frames']*4+1):
            t=j/(clip['frames']*4);f=clip['start']+j*.25
            s.frame_set(int(f),subframe=f%1);bpy.context.view_layer.update()
            left=bpy.data.objects['RIG_hand-1'].matrix_world@Vector((0,-.012,-.09))
            right=bpy.data.objects['RIG_hand1'].matrix_world@Vector((0,-.012,-.09))
            support=max(support,(left-plank.matrix_world@Vector((-.17,0,-.025))).length)
            if t<=.43 or t>=.94:grip=max(grip,(right-saw.matrix_world@Vector((0,.20,0))).length)
            elif .50<=t<=.88:grip=max(grip,(right-hammer.matrix_world.translation).length)
            if .44<=t<=.93:dock=max(dock,(saw.matrix_world.translation-body.matrix_world@Vector((.45,.005,1.20))).length)
            if t<.34:
                edge=plank.matrix_world.inverted()@saw.matrix_world@Vector((0,0,-.185))
                plane=max(plane,abs(edge.x-.17));ys.append(edge.y)
        for t in [.64,.75]:
            f=clip['start']+clip['frames']*t;s.frame_set(int(f),subframe=f%1);bpy.context.view_layer.update()
            face=hammer.matrix_world@Vector((0,-.22,-.0775));nail=plank.matrix_world@Vector((.17,0,.042));hits.append((face-nail).length)
        assert support<.015,('unsupported plank',support)
        assert grip<.015,('tool leaves active hand',grip)
        assert dock<.015,('saw leaves belt dock',dock)
        assert plane<.002,('saw leaves kerf',plane)
        assert max(ys)-min(ys)>.20,('short saw stroke',ys)
        assert max(hits)<.015,('hammer misses nail',hits)
        return dict(status='passed',plank_support_error=support,tool_grip_error=grip,dock_error=dock,saw_plane_error=plane,saw_stroke=max(ys)-min(ys),hammer_hit_errors=hits)
    finally:s.frame_set(old[0],subframe=old[1])
