"""Run in Blender against either existing source; preserves models and animation keys."""
import bpy
import json
from pathlib import Path


def configure(scene, config=None):
    base=next(p for p in [Path(bpy.path.abspath('//')),*Path(bpy.path.abspath('//')).parents] if (p/'_shared').is_dir())/'_shared'
    if config is None:
        guard=scene.get('sprite_asset')=='city_guard'
        config={'asset':scene.get('sprite_asset','character'),
                'outputSize':128,'fps':12,'scale':1,'crop':True,'publish':False,
                'maxDecodedBytes':64*1024*1024,'maxWorkingBytes':128*1024*1024,'maxAtlasSide':16384,'output':str(base.parent.parent/'sprites'),
                'clips':{'idle':{'start':1,'frames':1,'fps':4,'loop':True}}}
        if guard:
            config['clips']['walk']={'start':2,'frames':12,'fps':12,'loop':True}
    for name,start,count,fps,loop in [('walk',2,12,12,True),('attack',20,6,12,False),('death',30,8,12,False),('work',40,8,8,True)]:
        config['clips'].setdefault(name,dict(start=start,frames=count,fps=fps,loop=loop,enabled=False))
    scene['sprite_export_json']=json.dumps(config,indent=2)
    scene['sprite_contract_version']=2
    scene['instructions']='Author model/animation only. Edit sprite_export_json clips, then run render_8_directions.py. See graphics/3d/README.md. Root stays in place; feet Z=0; front -Y.'
    for name,frame in [('idle',1),('walk',2),('attack',20),('death',30),('work',40)]:
        marker=scene.timeline_markers.get('CLIP_'+name) or scene.timeline_markers.new('CLIP_'+name)
        marker.frame=frame
    for filename in ['render_8_directions.py','sprite_pipeline.py','configure_template.py']:
        text=bpy.data.texts.get(filename) or bpy.data.texts.new(filename)
        text.clear();text.write((base/filename).read_text())
    return config

if __name__=='__main__':
    configure(bpy.data.scenes['SPRITE_TEMPLATE'])
    bpy.context.preferences.filepaths.save_version=0
    bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath,compress=True)
