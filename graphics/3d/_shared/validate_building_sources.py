"""Read-only audit for fixed-canvas modular architecture, separate from cropped props."""
import bpy,bmesh,json,hashlib,struct,sys,tempfile
import numpy as np
from pathlib import Path
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
ROOT=Path(__file__).resolve().parents[2]

def validate():
    catalog=json.loads((ROOT/'sprites/manifest.json').read_text())['catalog'];entries=[e for e in catalog if e.get('components') and e.get('spriteReady')];parts=0
    for e in entries:
        bpy.ops.wm.open_mainfile(filepath=str(ROOT/'3d'/e['id']/(e['id']+'.blend')),load_ui=False)
        s=bpy.context.scene;cfg=json.loads(s['sprite_export_json']);assert cfg['kind']=='components' and cfg['asset']==e['id'];assert s['building_contract_version']==1;assert s.render.film_transparent;assert s.camera.data.type=='ORTHO'
        hashes=json.loads(s['building_export_hashes']);assert set(hashes)==set(e['components'])
        objs=[o for o in bpy.data.collections['ASSET • replace with your character'].objects if o.type=='MESH'];assert set(o.get('building_component') for o in objs)==set(e['components'])
        for o in objs:
            bm=bmesh.new();bm.from_mesh(o.data);bm.normal_update()
            if bm.faces and all(edge.is_manifold for edge in bm.edges):assert bm.calc_volume(signed=True)>=-1e-8,(e['id'],o.name,'inverted closed volume')
            elif o.get('building_component') in ['floor','roof','default']:assert all(f.normal.z>=-1e-5 for f in bm.faces),(e['id'],o.name,'inverted roof/floor')
            elif e['id']=='door':assert all(f.normal.y<=1e-5 for f in bm.faces),(o.name,'inverted portal face')
            bm.free()
        if e['id'].startswith('building_'):
            assert e['assembly']['sourceCanvas']==dict(size=[480,480],footprint=[48,160,384,320],anchor=[0,0])
            for x,y,px,py in [(-6.3,10.5,48,160),(6.3,-10.5,432,480)]:
                p=world_to_camera_view(s,s.camera,Vector((x,y,0)));assert abs(p.x*480-px)<.001 and abs((1-p.y)*480-py)<.001,(e['id'],'ground footprint drift')
        for name,c in e['components'].items():
            data=(ROOT/'sprites'/c['file']).read_bytes();assert hashlib.sha256(data).hexdigest()[:16]==c['hash']==hashes[name];assert struct.unpack('!II',data[16:24])==(c['frameWidth'],c['frameHeight']);assert c['frameWidth']==c['frameHeight']==cfg['outputSize']
            im=bpy.data.images.load(str(ROOT/'sprites'/c['file']),check_existing=False);im.colorspace_settings.name='Non-Color';w,h=im.size;p=np.empty(w*h*4,np.float32);im.pixels.foreach_get(p);p=p.reshape(h,w,4)[::-1];alpha=p[:,:,3];assert alpha.any(),(e['id'],name,'empty')
            if e['id']=='door':
                assert alpha[0].all() and alpha[:,0].all(),(name,'portal boundary gap')
                if name=='open' or name.endswith('_open'):assert not alpha[130:250,140:240].any(),'blocked open door'
            else:assert not (alpha[0].any() or alpha[:,0].any() or alpha[:,-1].any()),(e['id'],name,'clipped')
            bpy.data.images.remove(im);parts+=1
        assert not bpy.data.libraries,e['id']
        for im in bpy.data.images:
            if im.source=='FILE':assert im.packed_file,(e['id'],'external image')
    result=dict(status='passed',objects=len(entries),components=parts,matching_source_hashes=parts,external_dependencies=0)
    (Path(tempfile.gettempdir())/'world_wonder_building_audit.json').write_text(json.dumps(result));return result

if __name__=='__main__':result=validate()
