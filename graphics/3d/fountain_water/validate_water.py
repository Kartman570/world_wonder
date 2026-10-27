"""Stationary jet landings and hidden droplet resets above a separate stone basin."""
import bpy,math
from mathutils import Vector

def validate():
    s=bpy.context.scene;old=(s.frame_current,s.frame_subframe);last={};reset=0.;landing=0.
    try:
        for j in range(97):
            f=1+j*.25;s.frame_set(int(f),subframe=f%1);dg=bpy.context.evaluated_depsgraph_get()
            for index in range(6):
                o=bpy.data.objects['FOUNTAIN jet '+str(index)];ev=o.evaluated_get(dg);m=ev.to_mesh();end=sum((v.co for v in list(m.vertices)[-8:]),Vector())/8;expected=Vector((.46*math.cos(index*math.tau/6),.46*math.sin(index*math.tau/6),.60));landing=max(landing,(end-expected).length);ev.to_mesh_clear()
            for index in range(10):
                o=bpy.data.objects['FOUNTAIN droplet '+str(index)];opacity=next(n for n in o.data.materials[0].node_tree.nodes if n.label=='Water opacity').outputs[0].default_value
                if index in last and (o.location-last[index][0]).length>.4:reset=max(reset,opacity,last[index][1])
                last[index]=(o.location.copy(),opacity)
        assert landing<1e-5,('jet misses bowl landing',landing)
        assert reset<.02,('visible droplet reset',reset)
        return dict(status='passed',max_landing_error=landing,max_reset_droplet_opacity=reset)
    finally:s.frame_set(old[0],subframe=old[1])
