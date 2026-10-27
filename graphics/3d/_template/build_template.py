import bpy, math
from mathutils import Vector
from pathlib import Path
BASE=Path(__file__).resolve().parents[2]
scene=bpy.data.scenes.new('SPRITE_TEMPLATE')
bpy.context.window.scene=scene
asset=bpy.data.collections.new('ASSET • replace with your character'); scene.collection.children.link(asset)
rig=bpy.data.collections.new('RENDER_RIG'); scene.collection.children.link(rig)
def move(o,c):
    for col in list(o.users_collection): col.objects.unlink(o)
    c.objects.link(o)
def mat(name,color,metal=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1); p.inputs['Metallic'].default_value=metal; p.inputs['Roughness'].default_value=.38
    return m
# Empty authoring stage; add the model from the catalog here.
root=bpy.data.objects.new('CHARACTER_ROOT',None); asset.objects.link(root)
camdata=bpy.data.cameras.new('Orthographic 30deg'); cam=bpy.data.objects.new('SPRITE_CAMERA',camdata); rig.objects.link(cam); scene.camera=cam
camdata.type='ORTHO'; camdata.ortho_scale=3.25
# Ground origin projects to (128, 190.077) in each 256px tile.
cam.location=(0,-10,10*math.tan(math.radians(30))+.91)
cam.rotation_euler=(Vector((0,0,.91))-cam.location).to_track_quat('-Z','Y').to_euler()
def light(name,loc,power,size):
    d=bpy.data.lights.new(name,'AREA'); d.energy=power; d.shape='DISK'; d.size=size
    o=bpy.data.objects.new(name,d); rig.objects.link(o); o.location=loc; o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
light('Key',(-3,-4,6),450,4); light('Fill',(4,-1,3),220,4); light('Rim',(1,4,5),500,3)
scene.world=bpy.data.worlds.new('Sprite studio'); scene.world.use_nodes=True; scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.22,.25,.3,1); scene.world.node_tree.nodes['Background'].inputs[1].default_value=.4
scene.render.engine='CYCLES'; scene.cycles.samples=32; scene.cycles.use_denoising=True
scene.render.resolution_x=256; scene.render.resolution_y=256; scene.render.resolution_percentage=100
scene.render.film_transparent=True; scene.render.image_settings.file_format='PNG'; scene.render.image_settings.color_mode='RGBA'; scene.render.image_settings.color_depth='8'
scene.view_settings.view_transform='Standard'; scene.render.fps=24; scene.render.filepath='//../sprites/characters/character/character_atlas.png'
scene['sprite_asset']='character'; scene['tile_size']=128; scene['sprite_output_size']=128; scene['sprite_postprocess']=True; scene['directions']=8; scene['camera_elevation_degrees']=30
scene['instructions']='Replace ASSET contents. Feet at Z=0; front=-Y. Run render_8_directions.py. Camera/lights orbit together; asset stays still.'
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D': area.spaces.active.region_3d.view_perspective='CAMERA'
for filename in ['render_8_directions.py']:
    t=bpy.data.texts.new(filename); t.write((BASE/'3d/_shared'/filename).read_text())
import sys
sys.path.insert(0,str(Path(__file__).parent));sys.path.insert(0,str(BASE/'3d/_shared'))
from configure_template import configure
configure(scene)
bpy.ops.wm.save_as_mainfile(filepath=str(BASE/'3d'/'_template'/'sprite_template.blend'))
