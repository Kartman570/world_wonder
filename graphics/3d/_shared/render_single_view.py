"""Single-view environment export. All temporary frames remain outside the project."""
import bpy,json,tempfile,math
from pathlib import Path
import numpy as np
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
from sprite_pipeline import clip_plan,write_asset
from render_8_directions import process_tile

def render_sheet(config=None):
    s=bpy.data.scenes['SPRITE_TEMPLATE'];cfg=config or json.loads(s['sprite_export_json']);kind=cfg['kind'];assert kind in ['static','dynamic'];size=cfg['outputSize']
    if kind=='static':samples,animations=[cfg.get('frame',1)],{}
    else:samples,animations=clip_plan(cfg)
    assert s.render.resolution_x==s.render.resolution_y and s.render.resolution_x%size==0 and s.render.resolution_percentage==100
    if len(samples)*size*size*4>cfg.get('maxDecodedBytes',134217728):raise ValueError('Working sheet exceeds budget')
    tiles=np.zeros((len(samples),1,size,size,4),np.uint8);point=world_to_camera_view(s,s.camera,Vector(cfg.get('anchorPoint',(0,0,0))));anchor=[point.x,1-point.y];old=(s.frame_current,s.frame_subframe,s.render.filepath)
    try:
        with tempfile.TemporaryDirectory(prefix='blender_environment_') as tmp:
            for row,frame in enumerate(samples):
                s.frame_set(math.floor(frame),subframe=frame%1);bpy.context.view_layer.update();s.render.filepath=str(Path(tmp)/'frame.png');bpy.ops.render.render(write_still=True,scene=s.name);im=bpy.data.images.load(s.render.filepath,check_existing=False)
                try:tiles[row,0]=process_tile(im,size,bool(s.get('sprite_postprocess',True)),cfg.get('alphaLevels',8))
                finally:bpy.data.images.remove(im)
                if cfg.get('progressFile'):Path(cfg['progressFile']).write_text(json.dumps(dict(state='rendering',asset=cfg['asset'],completed=row+1,total=len(samples))))
        return write_asset(cfg['output'],cfg,tiles,animations,anchor)
    finally:s.frame_set(old[0],subframe=old[1]);s.render.filepath=old[2]
