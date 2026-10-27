"""Run with Blender --background --python tests/blender-sprite-pipeline.py."""
import json
import sys
import tempfile
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'graphics/3d/_shared'))
from sprite_pipeline import clip_plan, compact_tiles, png_bytes, write_asset
config=json.loads((ROOT/'graphics/3d/_template/character.export.example.json').read_text())
rows,clips=clip_plan(config)
assert len(rows)==34 and clips['death']['start']==18 and clips['death']['loop'] is False
assert clips['work']['frames']==8
for bad in [{'clips':{}},{'clips':{'idle':{'frames':0}}},{'clips':{'idle':{'fps':0}}}]:
    try: clip_plan(bad)
    except ValueError: pass
    else: raise AssertionError('invalid clips accepted')
tiles=np.zeros((2,8,128,128,4),dtype=np.uint8)
tiles[:,:,20:90,50:80]=[100,150,200,255]
tiles[1,7,95:100,90:95]=[210,15,140,128]
sheet,w,h,anchor=compact_tiles(tiles,[.5,.75])
assert w<128 and h<128 and sheet.nbytes<tiles.nbytes
assert np.array_equal(sheet.reshape(2,h,8,w,4).transpose(0,2,1,3,4)[1,7,77,42],[210,15,140,128])
assert abs(anchor[0]*w+48-64)<1e-9 and abs(anchor[1]*h+18-96)<1e-9
with tempfile.TemporaryDirectory() as tmp:
    entry=write_asset(tmp,{'asset':'test','id':'test','publish':True},tiles,{'idle':{'start':0,'frames':2}},[.5,.75])
    manifest=json.loads((Path(tmp)/'manifest.json').read_text())
    assert manifest['catalog'][0]==entry['entry']
    assert entry['entry']['file']=='characters/test/test_atlas.png'
    assert not list(Path(tmp).rglob('*.sprite.json'))
    manifest['catalog'][0].update(gameRoles=['smith'],states={'craftingGoods':'work'})
    manifest['catalog'][0]['animations']['attack']={'description':'Attack to be drawn','ready':False}
    (Path(tmp)/'manifest.json').write_text(json.dumps(manifest))
    write_asset(tmp,{'asset':'test','publish':True},tiles,{'idle':{'start':0,'frames':2}},[.5,.75])
    published=json.loads((Path(tmp)/'manifest.json').read_text())
    updated=published['catalog'][0]
    assert len(published['catalog'])==1 and 'assets' not in published
    assert updated['spriteReady'] and updated['animations']['idle']['ready']
    assert updated['animations']['attack']['ready'] is False
    assert published['roles']['smith']=='test'
    assert updated['states']=={'craftingGoods':'work'}
    import bpy
    image=bpy.data.images.load(entry['file'],check_existing=False)
    assert list(image.size)==[w*8,h*2]
    image.colorspace_settings.name='Non-Color'
    pixels=np.empty(w*8*h*2*4,dtype=np.float32);image.pixels.foreach_get(pixels)
    restored=np.rint(np.clip(pixels.reshape(h*2,w*8,4)[::-1],0,1)*255).astype(np.uint8)
    assert np.array_equal(restored,sheet),'PNG must preserve every RGBA pixel'
    bpy.data.images.remove(image)
    assert entry['entry']['hash']==write_asset(tmp,{'asset':'test'},tiles,{'idle':{'start':0,'frames':2}},[.5,.75])['entry']['hash']
    try: write_asset(tmp,{'asset':'test','maxDecodedBytes':1},tiles,{},[.5,.75])
    except ValueError: pass
    else: raise AssertionError('texture budget ignored')
print('PASS: clips, crop, common ground anchor, PNG round trip, deterministic hash, manifest publication and texture budget')
