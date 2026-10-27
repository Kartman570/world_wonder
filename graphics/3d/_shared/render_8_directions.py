"""Export compact PNG + metadata. Read graphics/3d/README.md before editing."""
import bpy, math, zlib, struct, binascii, tempfile
import numpy as np
from pathlib import Path
from mathutils import Matrix
DIRECTION_ORDER=[2,1,0,7,6,5,4,3]
def process_tile(image,size,post,alpha_levels=8):
    w,h=image.size; image.colorspace_settings.name='Non-Color'
    p=np.empty(w*h*4,dtype=np.float32); image.pixels.foreach_get(p); p=p.reshape(h,w,4)[::-1].copy()
    assert w==h and w%size==0, 'Square render must be an integer multiple of output tile size'
    factor=w//size
    # Premultiplied area filter prevents dark fringes on transparent edges.
    p[:,:,:3]*=p[:,:,3:4]
    p=p.reshape(size,factor,size,factor,4).mean(axis=(1,3))
    p[:,:,:3]=np.divide(p[:,:,:3],p[:,:,3:4],out=np.zeros_like(p[:,:,:3]),where=p[:,:,3:4]>0)
    if post:
        rgb=p[:,:,:3]
        # Restrained contrast/saturation and 6-bit channels, tiny ordered dither.
        lum=(rgb*np.array([.2126,.7152,.0722])).sum(axis=2,keepdims=True)
        rgb=lum+(rgb-lum)*.86
        rgb=np.clip((rgb-.5)*1.06+.5,0,1)
        bayer=np.array([[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]],dtype=np.float32)
        dither=(np.tile(bayer,(math.ceil(size/4),math.ceil(size/4)))[:size,:size]/16-.5)*.3
        p[:,:,:3]=np.clip(np.round(rgb*63+dither[:,:,None])/63,0,1)
        # Mostly solid pixel edges, retain a narrow antialias band.
        if not isinstance(alpha_levels,int) or not 2<=alpha_levels<=256:raise ValueError('Invalid alpha quantization levels')
        p[:,:,3]=np.round(p[:,:,3]*(alpha_levels-1))/(alpha_levels-1)
    p[p[:,:,3]==0,:3]=0
    return np.rint(np.clip(p,0,1)*255).astype(np.uint8)
def render_sheet(config=None):
    import sys, json
    from bpy_extras.object_utils import world_to_camera_view
    source_root=next(p for p in [Path(bpy.path.abspath('//')),*Path(bpy.path.abspath('//')).parents] if (p/'_shared').is_dir())
    sys.path.insert(0,str(source_root/'_shared'))
    import importlib, sprite_pipeline
    importlib.reload(sprite_pipeline)
    from sprite_pipeline import clip_plan, write_asset
    scene=bpy.data.scenes['SPRITE_TEMPLATE']
    config=config or json.loads(scene['sprite_export_json'])
    samples, animations=clip_plan(config)
    size=int(config.get('outputSize',128))
    if size<8 or scene.render.resolution_x!=scene.render.resolution_y or scene.render.resolution_x%size or scene.render.resolution_percentage!=100:
        raise ValueError('Square render resolution must be a multiple of outputSize at 100%')
    # Bound allocation before rendering; cropping can only make this smaller.
    if len(samples)*8*size*size*4>int(config.get('maxWorkingBytes',64*1024*1024)):
        raise ValueError('Uncropped atlas exceeds configured working budget')
    out=Path(config.get('output',str(source_root.parent/'sprites')))
    original_filepath=scene.render.filepath; original_frame=scene.frame_current; original_subframe=scene.frame_subframe
    rig=list(bpy.data.collections['RENDER_RIG'].objects); original={o:o.matrix_world.copy() for o in rig}
    tiles=np.zeros((len(samples),8,size,size,4),dtype=np.uint8)
    try:
        # Derive the ground anchor from the actual camera instead of a hand-written constant.
        from mathutils import Vector
        point=world_to_camera_view(scene,scene.camera,Vector((0,0,0)))
        anchor=[point.x,1-point.y]
        with tempfile.TemporaryDirectory(prefix='blender_sprite_') as tmp:
            for row,frame in enumerate(samples):
                scene.frame_set(math.floor(frame),subframe=frame%1)
                for col,source_direction in enumerate(DIRECTION_ORDER):
                    rot=Matrix.Rotation(-source_direction*math.pi/4,4,'Z')
                    for o in rig: o.matrix_world=rot@original[o]
                    bpy.context.view_layer.update()
                    path=Path(tmp)/'frame.png'; scene.render.filepath=str(path)
                    bpy.ops.render.render(write_still=True,scene=scene.name)
                    image=bpy.data.images.load(str(path),check_existing=False)
                    try: tiles[row,col]=process_tile(image,size,bool(scene.get('sprite_postprocess',False)))
                    finally: bpy.data.images.remove(image)
                    bpy.app.driver_namespace['sprite_progress']={'state':'rendering','completed':row*8+col+1,'total':len(samples)*8}
                    if config.get('progressFile'):
                        Path(config['progressFile']).write_text(json.dumps(dict(state='rendering',asset=config['asset'],completed=row*8+col+1,total=len(samples)*8,frame=frame,column=col)))
            return write_asset(out,config,tiles,animations,anchor)
    finally:
        for o in rig: o.matrix_world=original[o]
        scene.frame_set(original_frame,subframe=original_subframe); scene.render.filepath=original_filepath

if __name__=='__main__':
    import sys,json
    args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    config=json.loads(Path(args[0]).read_text()) if args else None
    print(json.dumps(render_sheet(config),indent=2))
