"""Resetting optical folds are invisible; the center never becomes an opaque screen."""
import bpy

def validate():
    s=bpy.context.scene;old=(s.frame_current,s.frame_subframe);last={};reset=0.
    try:
        for j in range(97):
            f=1+j*.25;s.frame_set(int(f),subframe=f%1);dg=bpy.context.evaluated_depsgraph_get()
            for index in range(8):
                o=bpy.data.objects['PORTAL travelling fold '+str(index)];fade=next(n for n in o.data.materials[0].node_tree.nodes if n.label=='Effect opacity').outputs[0].default_value;ev=o.evaluated_get(dg);m=ev.to_mesh();z=sum(v.co.z for v in m.vertices)/len(m.vertices);ev.to_mesh_clear()
                if index in last and z-last[index][0]<-1:reset=max(reset,fade,last[index][1])
                last[index]=(z,fade)
        assert reset<.015,('visible fold reset',reset)
        return dict(status='passed',max_reset_fold_opacity=reset)
    finally:s.frame_set(old[0],subframe=old[1])
