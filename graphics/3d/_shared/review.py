"""Transient contact sheets for visual QA; never writes extra files into sprites."""
import bpy,json,tempfile
import numpy as np
from pathlib import Path
from sprite_pipeline import png_bytes
ROOT=Path(__file__).resolve().parents[2]
def scene_contact(frames):
    """Small pre-export render strip, without changing the manifest or sprite files."""
    from render_8_directions import process_tile
    from sprite_pipeline import compact_tiles
    from bpy_extras.object_utils import world_to_camera_view
    from mathutils import Vector
    import math
    s=bpy.context.scene;cfg=json.loads(s['sprite_export_json']);size=cfg['outputSize'];old=(s.frame_current,s.frame_subframe,s.render.filepath);tiles=np.zeros((len(frames),1,size,size,4),np.uint8)
    try:
        with tempfile.TemporaryDirectory(prefix='blender_preview_') as tmp:
            for i,f in enumerate(frames):
                s.frame_set(math.floor(f),subframe=f%1);s.render.filepath=str(Path(tmp)/'frame.png');bpy.ops.render.render(write_still=True);im=bpy.data.images.load(s.render.filepath,check_existing=False)
                try:tiles[i,0]=process_tile(im,size,bool(s.get('sprite_postprocess',True)),cfg.get('alphaLevels',8))
                finally:bpy.data.images.remove(im)
        point=world_to_camera_view(s,s.camera,Vector(cfg.get('anchorPoint',(0,0,0))));sheet,w,h,a=compact_tiles(tiles,[point.x,1-point.y],crop=cfg.get('crop',True),allow_bounds=cfg.get('tileable',False));strip=np.concatenate(list(sheet.reshape(len(frames),h,w,4)),axis=1);path=Path(tempfile.gettempdir())/(cfg['asset']+'_scene_review.png');path.write_bytes(png_bytes(strip));return str(path)
    finally:s.frame_set(old[0],subframe=old[1]);s.render.filepath=old[2]

def contact(asset,clip=None,column=2):
    e=next(e for e in json.loads((ROOT/'sprites/manifest.json').read_text())['catalog'] if e['id']==asset);w,h=e['frameWidth'],e['frameHeight'];im=bpy.data.images.load(str(ROOT/'sprites'/e['file']),check_existing=False);im.colorspace_settings.name='Non-Color'
    pixels=np.empty(len(im.pixels),np.float32);im.pixels.foreach_get(pixels);pixels*=255;np.rint(pixels,out=pixels);p=pixels.reshape(im.size[1],im.size[0],4)[::-1].astype(np.uint8);del pixels
    if e['type']!='character':column=0
    c=e['animations'][clip] if e['type']!='static' else dict(start=0,frames=1);out=np.concatenate([p[(c['start']+i)*h:(c['start']+i+1)*h,column*w:(column+1)*w] for i in range(c['frames'])],axis=1);bpy.data.images.remove(im)
    path=Path(tempfile.gettempdir())/(asset+'_'+clip+'_review.png');path.write_bytes(png_bytes(out));return str(path)
