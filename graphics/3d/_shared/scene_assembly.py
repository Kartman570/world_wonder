"""Copy evaluated geometry from completed source assets into a self-contained landmark."""
import bpy,math
from pathlib import Path
from mathutils import Vector,Matrix
from environment_studio import ROOT

def import_asset(ns,asset,offset=(0,0,0),scale=1,angle=0,predicate=None,warp=None):
    path=ROOT/'3d'/asset/(asset+'.blend');assert path.exists(),path
    with bpy.data.libraries.load(str(path),link=False) as (source,target):target.collections=['ASSET • replace with your character']
    collection=target.collections[0];ns['s'].collection.children.link(collection);ns['s'].frame_set(1);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();rotation=Matrix.Rotation(angle,3,'Z');translation=Vector(offset);copied=[]
    for original in list(collection.all_objects):
        if original.type not in ['MESH','CURVE','SURFACE','FONT'] or original.hide_render or (predicate and not predicate(original)):continue
        ev=original.evaluated_get(dg);mesh=bpy.data.meshes.new_from_object(ev,preserve_all_data_layers=True,depsgraph=dg)
        for vertex in mesh.vertices:
            p=ev.matrix_world@vertex.co
            if warp:p=Vector(warp(p))
            vertex.co=rotation@(p*scale)+translation
        obj=bpy.data.objects.new(asset+' • '+original.name,mesh);ns['c'].objects.link(obj);obj.parent=ns['root'];obj['source_asset']=asset;copied.append(obj)
    for original in list(collection.all_objects):bpy.data.objects.remove(original,do_unlink=True)
    bpy.data.collections.remove(collection);return copied
