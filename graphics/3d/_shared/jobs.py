"""One-at-a-time Blender MCP rendering; transient progress stays in system temp."""
import bpy,json,tempfile,hashlib,struct
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
PROGRESS=Path(tempfile.gettempdir())/'world_wonder_sprite_progress.json'
def start_render():
    s=bpy.data.scenes['SPRITE_TEMPLATE'];cfg=json.loads(s['sprite_export_json']);asset=cfg['asset'];cfg['progressFile']=str(PROGRESS);cfg['output']=str(ROOT/'sprites')
    bpy.app.driver_namespace['character_job']={'state':'rendering','asset':asset};PROGRESS.write_text(json.dumps(dict(state='starting',asset=asset,completed=0,total=sum(x['frames'] for x in cfg['clips'].values())*8)))
    def job():
        try:
            ns={'__name__':'sprite_export'};p=ROOT/'3d/_shared/render_8_directions.py';exec(compile(p.read_text(),str(p),'exec'),ns)
            result=ns['render_sheet'](cfg);e=result['entry'];data=Path(result['file']).read_bytes();w,h=struct.unpack('!II',data[16:24])
            assert (w,h)==(e['frameWidth']*8,e['frameHeight']*e['frames'])
            assert hashlib.sha256(data).hexdigest()[:16]==e['hash']
            assert all(e['animations'][k]['ready'] for k in cfg['clips'])
            import numpy as np
            im=bpy.data.images.load(result['file'],check_existing=False);pixels=np.empty(len(im.pixels),np.float32);im.pixels.foreach_get(pixels);alpha=pixels.reshape(h,w,4)[:,:,3]
            for row in range(e['frames']):
                for col in range(8):
                    tile=alpha[row*e['frameHeight']:(row+1)*e['frameHeight'],col*e['frameWidth']:(col+1)*e['frameWidth']]
                    assert tile.max()>0, ('empty tile',row,col)
                    assert not (tile[0].any() or tile[-1].any() or tile[:,0].any() or tile[:,-1].any()), ('clipped tile',row,col)
            bpy.data.images.remove(im);del pixels,alpha
            done=dict(state='done',asset=asset,frames=e['frames'],clips=list(cfg['clips']),size=[w,h],cell=[e['frameWidth'],e['frameHeight']],bytes=len(data),hash=e['hash'])
            s['last_export_hash']=e['hash'];s.frame_set(cfg['clips']['idle']['start']);bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'3d'/asset/(asset+'.blend')),compress=True)
            bpy.app.driver_namespace['character_job']=done;PROGRESS.write_text(json.dumps(done))
        except Exception:
            import traceback
            # A failed post-render verification must never leave a ready checkpoint.
            manifest=ROOT/'sprites/manifest.json'
            catalog=json.loads(manifest.read_text())
            for entry in catalog['catalog']:
                if entry['id']==asset:
                    entry['spriteReady']=False
                    for name in cfg['clips']:
                        if name in entry.get('animations',{}):entry['animations'][name]['ready']=False
            manifest.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
            failed=dict(state='error',asset=asset,error=traceback.format_exc());bpy.app.driver_namespace['character_job']=failed;PROGRESS.write_text(json.dumps(failed))
        return None
    bpy.app.timers.register(job,first_interval=.5)
    return dict(scheduled=asset,progress=str(PROGRESS))
