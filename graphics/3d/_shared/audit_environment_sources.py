"""Read-only Blender audit of all completed single-view source files and PNG cells."""
import bpy,json,sys,tempfile,math
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[2]
sys.dont_write_bytecode=True
sys.path.insert(0,str(ROOT/'3d/_shared'))
import validate_environment

def audit():
    catalog=json.loads((ROOT/'sprites/manifest.json').read_text())['catalog'];entries=[e for e in catalog if e.get('spriteReady') and not e.get('components') and e['type'] in ['static','dynamic']];densities=[];cells=0;clips=0;geometry=0
    progress=Path(tempfile.gettempdir())/'world_wonder_source_audit.json'
    for index,e in enumerate(entries):
        bpy.ops.wm.open_mainfile(filepath=str(ROOT/'3d'/e['id']/(e['id']+'.blend')),load_ui=False)
        s=bpy.context.scene;cfg=json.loads(s['sprite_export_json']);assert cfg['asset']==e['id'];assert cfg['kind']==e['type'];assert s['last_export_hash']==e['hash'],e['id'];assert s.camera.data.type=='ORTHO';density=cfg['outputSize']/s.camera.data.ortho_scale;densities.append(density);assert abs(density-128/4.2)<1e-5,(e['id'],density);assert s.render.film_transparent
        if e['type']=='static':
            assert e['frames']==1 and not cfg['clips'];check=validate_environment.validate();assert check['status']=='passed';geometry+=1
        else:
            assert sum(c['frames'] for c in cfg['clips'].values())==e['frames']
            for name,c in cfg['clips'].items():
                target=e['animations'][name];assert target['ready'];assert all(c[k]==target[k] for k in ['frames','fps','loop']),(e['id'],name);clips+=1
        assert bool(cfg.get('tileable'))==bool(e.get('tileable'))
        assert not bpy.data.libraries,('linked library',e['id'])
        for image in bpy.data.images:
            if image.source=='FILE':assert image.packed_file,('unpacked image',e['id'],image.filepath)
        for font in bpy.data.fonts:
            if font.filepath and not font.filepath.startswith('<'):assert font.packed_file,('unpacked font',e['id'],font.filepath)
        im=bpy.data.images.load(str(ROOT/'sprites'/e['file']),check_existing=False);im.colorspace_settings.name='Non-Color';w,h=e['frameWidth'],e['frameHeight'];assert list(im.size)==[w,h*e['frames']];p=np.empty(len(im.pixels),np.float32);im.pixels.foreach_get(p);p=p.reshape(im.size[1],im.size[0],4)[::-1];unique=set()
        for row in range(e['frames']):
            cell=p[row*h:(row+1)*h];a=cell[:,:,3];allowed=e['id'] in ['fairy_field','cutter_ripple'] and row in [0,e['frames']-1];assert a.any() or allowed,('empty cell',e['id'],row)
            if e.get('tileable'):assert np.all(a==1),('tile gap',e['id'],row)
            else:assert not(a[0].any() or a[-1].any() or a[:,0].any() or a[:,-1].any()),('clipped',e['id'],row)
            unique.add(cell.tobytes());cells+=1
        if e['type']=='dynamic':assert len(unique)>1,('frozen effect',e['id'])
        bpy.data.images.remove(im);progress.write_text(json.dumps(dict(state='checking',asset=e['id'],completed=index+1,total=len(entries))))
    result=dict(status='passed',sources=len(entries),static_geometry=geometry,animation_clips=clips,png_cells=cells,pixel_density_range=[min(densities),max(densities)],matching_source_hashes=len(entries),external_dependencies=0)
    progress.write_text(json.dumps(dict(state='done',**result)));return result

if __name__=='__main__':result=audit()
