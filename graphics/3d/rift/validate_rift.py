"""Keep the center open while the non-rigid rim changes through the cycle."""
import bpy,math

def validate():
    s=bpy.context.scene;old=(s.frame_current,s.frame_subframe);o=bpy.data.objects['RIFT ragged atmospheric edge'];minimum=100.;change=0.;base=[v.co.copy() for v in o.data.shape_keys.key_blocks['Basis'].data]
    try:
        for j in range(65):
            f=1+j*.25;s.frame_set(int(f),subframe=f%1);ev=o.evaluated_get(bpy.context.evaluated_depsgraph_get());m=ev.to_mesh()
            for v,p in zip(m.vertices,base):minimum=min(minimum,math.hypot(v.co.x/.5,(v.co.z-1.25)/1.12));change=max(change,(v.co-p).length)
            ev.to_mesh_clear()
        assert minimum>.64,('center filled by geometry',minimum)
        assert change>.08,('rift does not deform',change)
        assert all(o.parent.location[i]==0 for i in range(3)),'rift drifts; engine must move it'
        return dict(status='passed',min_inner_ellipse_radius=minimum,max_edge_deformation=change)
    finally:s.frame_set(old[0],subframe=old[1])
