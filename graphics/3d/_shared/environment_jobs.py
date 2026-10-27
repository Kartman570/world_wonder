"""Sequential one-view rendering with validated manifest checkpoints."""
import bpy,json,tempfile,hashlib,struct,traceback,importlib
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[2]
PROGRESS=Path(tempfile.gettempdir())/'world_wonder_sprite_progress.json'

def start_render():
    s=bpy.context.scene;cfg=json.loads(s['sprite_export_json']);asset=cfg['asset'];cfg['progressFile']=str(PROGRESS)
    def job():
        try:
            import render_single_view,sprite_pipeline,render_8_directions;importlib.reload(sprite_pipeline);importlib.reload(render_8_directions);importlib.reload(render_single_view)
            result=render_single_view.render_sheet(cfg);e=result['entry'];data=Path(result['file']).read_bytes();w,h=struct.unpack('!II',data[16:24]);assert (w,h)==(e['frameWidth'],e['frameHeight']*e['frames']);assert hashlib.sha256(data).hexdigest()[:16]==e['hash']
            im=bpy.data.images.load(result['file'],check_existing=False);p=np.empty(len(im.pixels),np.float32);im.pixels.foreach_get(p);alpha=p.reshape(h,w,4)[:,:,3]
            for row in range(e['frames']):
                a=alpha[row*e['frameHeight']:(row+1)*e['frameHeight']];assert a.any() or cfg.get('allowEmptyFrames',False),('empty',row);assert cfg.get('tileable',False) or not(a[0].any() or a[-1].any() or a[:,0].any() or a[:,-1].any()),('clipped',row)
            bpy.data.images.remove(im);s['last_export_hash']=e['hash'];s.frame_set(next(iter(cfg['clips'].values()),dict(start=1))['start']);bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'3d'/asset/(asset+'.blend')),compress=True)
            done=dict(state='done',asset=asset,frames=e['frames'],cell=[e['frameWidth'],e['frameHeight']],size=[w,h],bytes=len(data),hash=e['hash']);bpy.app.driver_namespace['environment_job']=done;PROGRESS.write_text(json.dumps(done))
        except Exception:
            manifest=ROOT/'sprites/manifest.json';m=json.loads(manifest.read_text());e=next(e for e in m['catalog'] if e['id']==asset);e['spriteReady']=False
            for c in e.get('animations',{}).values():c['ready']=False
            manifest.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n');PROGRESS.write_text(json.dumps(dict(state='error',asset=asset,error=traceback.format_exc())))
        return None
    PROGRESS.write_text(json.dumps(dict(state='starting',asset=asset)));bpy.app.timers.register(job,first_interval=.5);return dict(scheduled=asset,progress=str(PROGRESS))
