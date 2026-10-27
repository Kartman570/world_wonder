"""Run with Blender's bundled Python (numpy); no running Blender required."""
import json,sys,tempfile,struct
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'graphics/3d/_shared'))
from sprite_pipeline import clip_plan,compact_tiles,write_asset

for columns in [1,8]:
    tiles=np.zeros((3,columns,12,12,4),np.uint8)
    for frame in range(3):
        for column in range(columns):tiles[frame,column,3:9,4:8]=[frame*50,column*20,100,255]
    image,w,h,anchor=compact_tiles(tiles,[.5,.8])
    assert image.shape==(3*h,columns*w,4)
    for frame in range(3):
        for column in range(columns):assert image[frame*h+h//2,column*w+w//2].tolist()==[frame*50,column*20,100,255]

with tempfile.TemporaryDirectory() as directory:
    root=Path(directory);task=dict(id='flag',type='dynamic',directions=0,file='dynamic/flag/flag_loop.png',spriteReady=False,animations={'loop':dict(description='Keep this artistic brief',ready=False,loop=True)})
    (root/'manifest.json').write_text(json.dumps(dict(catalog=[task])))
    config=dict(asset='flag',kind='dynamic',clips={'loop':dict(start=1,frames=3,fps=12,loop=True)})
    samples,clips=clip_plan(config);assert samples==[1,2,3] and clips['loop']['start']==0
    tiles=np.zeros((3,1,12,12,4),np.uint8);tiles[:,:,3:9,4:8]=[100,50,20,255]
    result=write_asset(root,config,tiles,clips,[.5,.8]);entry=result['entry'];assert entry['spriteReady'] and entry['animations']['loop']['ready'];assert entry['animations']['loop']['description']=='Keep this artistic brief';assert entry['directions']==0
    assert struct.unpack('!II',(root/entry['file']).read_bytes()[16:24])==(entry['frameWidth'],3*entry['frameHeight'])
    (root/'manifest.json').write_text(json.dumps(dict(catalog=[dict(id='oak',type='static',directions=1,file='static/oak/oak_static.png',spriteReady=False,description='Static brief')])) )
    result=write_asset(root,dict(asset='oak',kind='static'),tiles[:1],{},[.5,.8]);entry=result['entry'];assert entry['frames']==1 and 'animations' not in entry and entry['spriteReady'] and entry['description']=='Static brief'

for invalid in [np.zeros((1,1,12,12,4),np.uint8),np.full((1,1,12,12,4),255,np.uint8)]:
    try:compact_tiles(invalid,[.5,.8])
    except ValueError:pass
    else:raise AssertionError('Empty/clipped image accepted')
tile=np.full((3,1,16,16,4),255,np.uint8)
image,w,h,anchor=compact_tiles(tile,[.5,.5],crop=False,allow_bounds=True)
assert image.shape==(48,16,4) and (w,h)==(16,16) and anchor==[.5,.5]
try:compact_tiles(tile,[.5,.5],crop=True,allow_bounds=True)
except ValueError:pass
else:raise AssertionError('Repeating tile was cropped')
try:clip_plan(dict(clips={'loop':dict(frames=3)}))
except ValueError:pass
else:raise AssertionError('Character idle contract lost')
print('PASS: one/eight-column frame order, static/dynamic checkpoints, PNG geometry, artistic briefs and empty/clipped protection')
