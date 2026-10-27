"""Shared studio setup for independent animal sources; one density for every species."""
import bpy,json,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
DENSITY=128/4.2

def begin(asset):
    if bpy.context.object and bpy.context.object.mode!='OBJECT':bpy.ops.object.mode_set(mode='OBJECT')
    source=ROOT/'3d/city_guard/build_guard.py';ns={'__file__':str(source),'__name__':'animal_geometry'}
    exec(compile(source.read_text().split('# Natural adult silhouette')[0],str(source),'exec'),ns)
    s=ns['s']
    for key in list(s.keys()):
        if key.endswith('_validation') or key in ['last_export_hash','character_design']:del s[key]
    task=next(e for e in json.loads((ROOT/'sprites/manifest.json').read_text())['catalog'] if e['id']==asset)
    return ns,task

def clips_for(task,frames=None,fps=None):
    clips={};cursor=1;frames=frames or {};fps=fps or {}
    for name,e in task['animations'].items():
        if e.get('optional'):continue
        clips[name]=dict(start=cursor,frames=frames.get(name,e.get('suggestedFrames',8)),fps=fps.get(name,e['fps']),loop=e['loop'])
        cursor+=clips[name]['frames']+5
    return clips

def linearize(collection):
    for o in collection.objects:
        data=[o]+([o.data.shape_keys] if o.type=='MESH' and o.data.shape_keys else [])
        for d in data:
            action=d.animation_data.action if d.animation_data else None
            if not action:continue
            for layer in action.layers:
                for strip in layer.strips:
                    for slot in action.slots:
                        bag=strip.channelbag(slot)
                        if bag:
                            for fc in bag.fcurves:
                                for k in fc.keyframe_points:k.interpolation='CONSTANT' if fc.data_path in ['hide_render','hide_viewport'] else 'LINEAR'

def finish(ns,asset,clips,source_files=(),size=128,target=.5):
    s=ns['s'];linearize(ns['c'])
    for light,power in [('Key',350),('Fill',100),('Rim',200)]:bpy.data.objects[light].data.energy=power
    s.world.node_tree.nodes['Background'].inputs[1].default_value=.28
    s.render.resolution_x=s.render.resolution_y=size*2;s.render.resolution_percentage=100
    s.render.engine='CYCLES';s.cycles.samples=48;s.view_settings.view_transform='AgX'
    s.camera.data.ortho_scale=size/DENSITY
    s.camera.location=(0,-10,10*math.tan(math.radians(30))+target)
    s.camera.rotation_euler=(Vector((0,0,target))-s.camera.location).to_track_quat('-Z','Y').to_euler()
    s['sprite_postprocess']=True;s['sprite_pixels_per_unit']=DENSITY;s['sprite_asset']=asset
    s['sprite_export_json']=json.dumps(dict(asset=asset,outputSize=size,fps=12,scale=4.2/3.25,crop=True,publish=False,maxDecodedBytes=134217728,maxWorkingBytes=268435456,maxAtlasSide=16384,output=str(ROOT/'sprites'),clips=clips),indent=2)
    s.timeline_markers.clear()
    for name,c in clips.items():s.timeline_markers.new('CLIP_'+name,frame=c['start'])
    s.frame_start=1;s.frame_end=max(c['start']+c['frames'] for c in clips.values())
    s.frame_set(clips['idle']['start']);bpy.context.view_layer.update()
    folder=ROOT/'3d'/asset;folder.mkdir(exist_ok=True)
    for path in [ROOT/'3d/_shared'/f for f in ['animal_studio.py','render_8_directions.py','sprite_pipeline.py']]+[folder/f for f in ['build.py',*source_files]]:
        if path.exists():
            text=bpy.data.texts.get(path.name) or bpy.data.texts.new(path.name);text.clear();text.write(path.read_text())
    bpy.ops.outliner.orphans_purge(do_local_ids=True,do_linked_ids=False,do_recursive=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(folder/(asset+'.blend')),compress=True)
