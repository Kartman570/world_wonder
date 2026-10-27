"""Actual transformed hoop surfaces remain separated from one another and the seed."""
import bpy
from mathutils.bvhtree import BVHTree

def validate():
    s=bpy.context.scene;old=(s.frame_current,s.frame_subframe);gap=100.;seed_gap=100.
    try:
        for j in range(97):
            f=1+j*.25;s.frame_set(int(f),subframe=f%1);bpy.context.view_layer.update();seed=bpy.data.objects['RESONATOR suspended seed'];seed_points=[seed.matrix_world@v.co for v in seed.data.vertices];slabs=[]
            for i in range(3):
                o=bpy.data.objects['RESONATOR hoop '+str(i)];points=[o.matrix_world@v.co for v in o.data.vertices];slabs.append((min(p.z for p in points),max(p.z for p in points)));tree=BVHTree.FromPolygons(points,[tuple(p.vertices) for p in o.data.polygons]);seed_gap=min(seed_gap,min(tree.find_nearest(p)[3] for p in seed_points))
            gap=min(gap,slabs[1][0]-slabs[0][1],slabs[2][0]-slabs[1][1])
        assert gap>.08,('hoops touch',gap)
        assert seed_gap>.05,('seed touches hoop',seed_gap)
        return dict(status='passed',min_hoop_vertical_gap=gap,min_seed_surface_gap=seed_gap)
    finally:s.frame_set(old[0],subframe=old[1])
