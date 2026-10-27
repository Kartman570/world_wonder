"""Measured pore opening and separation of evaluated breathing lobes."""
import bpy,math

def validate():
    s=bpy.context.scene;old=(s.frame_current,s.frame_subframe);radii=[[100.,0.] for i in range(3)];gap=100.
    try:
        for j in range(97):
            f=1+j*.25;s.frame_set(int(f),subframe=f%1);dg=bpy.context.evaluated_depsgraph_get();boxes=[]
            for index in range(3):
                o=bpy.data.objects['FILTER lobe '+str(index)];group=o.vertex_groups['APERTURE'].index;ev=o.evaluated_get(dg);m=ev.to_mesh();r=sum(math.hypot(v.co.x,v.co.y) for v in m.vertices if any(g.group==group for g in v.groups))/64;radii[index][0]=min(radii[index][0],r);radii[index][1]=max(radii[index][1],r);boxes.append((min((o.matrix_world@v.co).x for v in m.vertices),max((o.matrix_world@v.co).x for v in m.vertices)));ev.to_mesh_clear()
            gap=min(gap,boxes[1][0]-boxes[0][1],boxes[2][0]-boxes[1][1])
        assert gap>.03,('filter lobes intersect',gap)
        assert all(high/low>2.5 for low,high in radii),('pores do not open',radii)
        return dict(status='passed',aperture_radius_ranges=radii,min_lobe_gap=gap)
    finally:s.frame_set(old[0],subframe=old[1])
