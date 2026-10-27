"""One-view studio for catalog environment objects; same pixel density as characters."""
import bpy,json,math
from pathlib import Path
from mathutils import Vector
from animal_studio import begin as _begin,linearize,DENSITY,ROOT

def begin(asset,lighting=None):
    ns,task=_begin(asset)
    # Each source owns its lights and masks. Keep the established outdoor look
    # of the static catalog without depending on which source was built before it.
    rig=bpy.data.collections['RENDER_RIG']
    for o in list(rig.objects):
        if o.name not in ['SPRITE_CAMERA','Key','Fill','Rim']:bpy.data.objects.remove(o,do_unlink=True)
    lighting=lighting or ('daylight' if task['type']=='static' else 'studio')
    assert lighting in ['daylight','studio']
    for name in ['Key','Fill','Rim']:bpy.data.objects[name].hide_render=lighting!='studio'
    if lighting=='daylight':
        data=bpy.data.lights.new('Environment daylight','SUN');data.energy=2;data.angle=.12;lamp=bpy.data.objects.new('Environment daylight',data);rig.objects.link(lamp);lamp.rotation_euler=(math.radians(15),math.radians(-10),math.radians(-20))
    ns['s']['environment_lighting']=lighting
    return ns,task

def finish(ns,asset,clips=None,size=128,target=.5,anchor=(0,0,0),sources=(),allow_empty=False,alpha_levels=8):
    s=ns['s'];task=next(e for e in json.loads((ROOT/'sprites/manifest.json').read_text())['catalog'] if e['id']==asset);kind=task['type'];assert kind in ['dynamic','static'];clips=clips or {};linearize(ns['c'])
    for light,power in [('Key',350),('Fill',100),('Rim',200)]:bpy.data.objects[light].data.energy=power
    s.world.node_tree.nodes['Background'].inputs[1].default_value=.28
    s.render.resolution_x=s.render.resolution_y=size*2;s.render.resolution_percentage=100;s.render.film_transparent=True;s.render.engine='CYCLES';s.cycles.samples=48;s.cycles.transparent_max_bounces=64;s.view_settings.view_transform='AgX'
    s.camera.data.ortho_scale=size/DENSITY;s.camera.location=(0,-10,10*math.tan(math.radians(30))+target);s.camera.rotation_euler=(Vector((0,0,target))-s.camera.location).to_track_quat('-Z','Y').to_euler()
    cfg=dict(asset=asset,kind=kind,outputSize=size,fps=12,scale=4.2/3.25,crop=True,publish=False,anchorPoint=list(anchor),maxDecodedBytes=134217728,maxAtlasSide=16384,output=str(ROOT/'sprites'),clips=clips)
    if allow_empty:cfg['allowEmptyFrames']=True
    if alpha_levels!=8:cfg['alphaLevels']=alpha_levels
    s['sprite_asset']=asset;s['sprite_postprocess']=True;s['sprite_pixels_per_unit']=DENSITY;s['sprite_export_json']=json.dumps(cfg,indent=2)
    s.timeline_markers.clear()
    for name,clip in clips.items():s.timeline_markers.new('CLIP_'+name,frame=clip['start'])
    first=next(iter(clips.values()),dict(start=1,frames=1));s.frame_start=first['start'];s.frame_end=max([x['start']+x['frames'] for x in clips.values()] or [1]);s.frame_set(first['start'])
    folder=ROOT/'3d'/asset;folder.mkdir(exist_ok=True)
    for path in [ROOT/'3d/_shared'/f for f in ['environment_studio.py','render_single_view.py','sprite_pipeline.py','validate_environment.py']]+[folder/f for f in ['build.py',*sources]]:
        if path.exists():
            text=bpy.data.texts.get(path.name) or bpy.data.texts.new(path.name);text.clear();text.write(path.read_text())
    bpy.ops.outliner.orphans_purge(do_local_ids=True,do_linked_ids=False,do_recursive=True);bpy.ops.wm.save_as_mainfile(filepath=str(folder/(asset+'.blend')),compress=True)

def fit_finish(ns,asset,rotation=-.45,margin=.35,sources=(),alpha_levels=8):
    """Fit evaluated mesh/curve geometry and anchor, keeping the common pixel density."""
    import numpy as np
    ns['root'].rotation_euler[2]=rotation;bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();points=[(0,0,0)]
    for o in ns['c'].objects:
        if o.type not in ['MESH','CURVE','SURFACE','FONT'] or o.hide_render:continue
        ev=o.evaluated_get(dg);mesh=ev.to_mesh();points.extend(tuple(ev.matrix_world@v.co) for v in mesh.vertices);ev.to_mesh_clear()
    p=np.array(points);v=p[:,2]*math.cos(math.pi/6)+p[:,1]*.5;lo,hi=v.min(),v.max();target=float((lo+hi)/(2*math.cos(math.pi/6)));span=max(2*abs(p[:,0]).max(),hi-lo);extent=span+max(margin,span*.05);size=max(32,math.ceil(extent*DENSITY/16)*16)
    finish(ns,asset,size=size,target=target,sources=sources,alpha_levels=alpha_levels)
