"""Rendered wing motion, fixed ground anchor, floor and final-body support checks."""
import bpy,json,math,numpy as np
from mathutils import Vector

def validate():
    s=bpy.context.scene;cfg=json.loads(s['sprite_export_json']);c=bpy.data.collections['ASSET • replace with your character'];root=bpy.data.objects['CHARACTER_ROOT'];ranges={};samples=0;lowest=100.;body_final=None
    def points(o,dg):
        ev=o.evaluated_get(dg);mesh=ev.to_mesh();a=np.empty(len(mesh.vertices)*3,np.float32);mesh.vertices.foreach_get('co',a);a=a.reshape(-1,3);m=np.array(ev.matrix_world,float);a=a@m[:3,:3].T+m[:3,3];ev.to_mesh_clear();return a
    for name,clip in cfg['clips'].items():
        span=clip['frames'] if clip['loop'] else clip['frames']-1;heights=[]
        for j in range(span*4+1):
            f=clip['start']+j*.25;s.frame_set(math.floor(f),subframe=f%1);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();samples+=1;body_low=100.
            for o in c.objects:
                if o.type=='MESH' and not o.hide_render:
                    p=points(o,dg);z=float(p[:,2].min());lowest=min(lowest,z)
                    if not o.name.startswith('WING'):body_low=min(body_low,z)
                    if z<-.003:raise AssertionError(('underground',name,f,o.name,z))
            if clip['loop'] and abs(root.location.x)+abs(root.location.y)>1e-5:raise AssertionError(('ground anchor drift',name,f))
            if j%4==0:
                wing=bpy.data.objects['PROP flight wing 1'];tip=wing.matrix_world@Vector((1.12,.52,.04));heights.append(tip.z-root.location.z)
            if name=='death' and j==span*4:body_final=body_low
        if name in ['idle','walk','run','work']:
            delta=max(heights)-min(heights);ranges[name]=delta
            if delta<.30:raise AssertionError(('wing motion aliased or absent',name,delta))
    if body_final is None or body_final>.10:raise AssertionError(('body suspended by wings',body_final))
    return dict(status='passed',samples=samples,min_z=lowest,rendered_wing_ranges=ranges,final_body_min_z=body_final)
