"""Pure export helpers; numpy is bundled with Blender. No bpy dependency."""
import binascii
import hashlib
import json
import math
import re
import struct
import zlib
from pathlib import Path
import numpy as np


def clip_plan(config):
    clips = config.get('clips', {})
    character = config.get('kind', 'character') == 'character'
    if not clips or (character and 'idle' not in clips):
        raise ValueError('At least an idle clip is required')
    rows, animations = [], {}
    for name, clip in clips.items():
        if not clip.get('enabled', True):
            continue
        samples = clip.get('samples')
        if samples is None:
            start, count, step = clip.get('start', 1), clip.get('frames', 1), clip.get('step', 1)
            if not isinstance(count, int) or isinstance(count, bool) or count < 1:
                raise ValueError('Invalid sample count: ' + name)
            samples = [start + i * step for i in range(count)]
        fps = clip.get('fps', config.get('fps', 12))
        if not samples or not all(isinstance(f, (int, float)) and math.isfinite(f) for f in samples) or not math.isfinite(fps) or fps <= 0:
            raise ValueError('Invalid samples/fps: ' + name)
        animations[name] = dict(start=len(rows), frames=len(samples), fps=fps,
                                loop=clip.get('loop', name not in ('attack', 'death')))
        rows.extend(samples)
    if character and 'idle' not in animations:
        raise ValueError('Idle cannot be disabled')
    if not rows:
        raise ValueError('At least one enabled clip is required')
    return rows, animations


def compact_tiles(tiles, anchor, padding=2, crop=True, allow_bounds=False):
    """Same crop for every pose/direction; never crop each frame independently."""
    _, columns, h, w, _ = tiles.shape
    alpha = tiles[..., 3].max(axis=(0, 1))
    ys, xs = np.nonzero(alpha)
    if not len(xs):
        raise ValueError('All exported frames are transparent')
    if allow_bounds and crop:
        raise ValueError('Repeating texture tiles must retain their full extent')
    if not allow_bounds and (np.any(alpha[0]) or np.any(alpha[-1]) or np.any(alpha[:, 0]) or np.any(alpha[:, -1])):
        raise ValueError('Model touches render bounds; enlarge camera ortho_scale before exporting')
    x0, y0, x1, y1 = 0, 0, w, h
    if crop:
        # Include the ground point even when the sprite is airborne.
        x0 = max(0, math.floor(min(xs.min(), anchor[0] * w)) - padding)
        y0 = max(0, math.floor(min(ys.min(), anchor[1] * h)) - padding)
        x1 = min(w, math.ceil(max(xs.max() + 1, anchor[0] * w + 1)) + padding)
        y1 = min(h, math.ceil(max(ys.max() + 1, anchor[1] * h + 1)) + padding)
    cropped = tiles[:, :, y0:y1, x0:x1].copy()
    ch, cw = cropped.shape[2:4]
    sheet = cropped.transpose(0, 2, 1, 3, 4).reshape(len(tiles) * ch, columns * cw, 4)
    return sheet, cw, ch, [(anchor[0] * w - x0) / cw, (anchor[1] * h - y0) / ch]


def png_bytes(rgba):
    """Lossless RGBA with adaptive PNG filters (no Pillow or external encoder)."""
    h, w, _ = rgba.shape
    def chunk(kind, data):
        return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', binascii.crc32(kind + data) & 0xffffffff)
    previous = np.zeros(w * 4, dtype=np.uint8)
    parts = []
    for row in rgba.reshape(h, w * 4):
        left = np.zeros_like(row); left[4:] = row[:-4]
        filters = [row, row - left, row - previous]
        costs = [np.abs(f.view(np.int8).astype(np.int16)).sum() for f in filters]
        kind = int(np.argmin(costs)); parts.append(bytes([kind]) + filters[kind].tobytes()); previous = row
    raw=b''.join(b'\x00'+row.tobytes() for row in rgba)
    compressed=min((zlib.compress(b''.join(parts),9),zlib.compress(raw,9)),key=len)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!2I5B', w, h, 8, 6, 0, 0, 0)) + chunk(b'IDAT', compressed) + chunk(b'IEND', b'')


def write_asset(out, config, tiles, animations, anchor):
    name = config['asset']
    if not re.fullmatch(r'[A-Za-z0-9_-]+', name):
        raise ValueError('asset must be a plain file name')
    out = Path(out)
    path = out / 'manifest.json'
    manifest = json.loads(path.read_text()) if path.exists() else dict(schemaVersion=3,catalog=[],roles={},races={})
    task=next((e for e in manifest['catalog'] if e['id']==name),None)
    kind=config.get('kind','character')
    if kind not in ('character','dynamic','static') or (task and task['type']!=kind):
        raise ValueError('Export kind must match the catalog task')
    if tiles.shape[1] != (8 if kind=='character' else 1):
        raise ValueError('Wrong number of columns for export kind')
    if kind=='character' and config.get('tileable'):
        raise ValueError('Character sheets cannot be repeating texture tiles')
    if kind=='static' and (len(tiles)!=1 or animations):
        raise ValueError('A static object must contain one frame and no clips')
    folder,suffix={'character':('characters','atlas'),'dynamic':('dynamic','loop'),'static':('static','static')}[kind]
    filename=folder+'/'+name+'/'+name+'_'+suffix+'.png'
    if task and task['file']!=filename:
        raise ValueError('Catalog file does not match the canonical export path')
    sheet, width, height, anchor = compact_tiles(tiles, anchor, crop=config.get('crop', True),allow_bounds=config.get('tileable',False))
    max_bytes = config.get('maxDecodedBytes', 16 * 1024 * 1024)
    if sheet.nbytes > max_bytes or max(sheet.shape[:2]) > int(config.get('maxAtlasSide',8192)):
        raise ValueError('Atlas exceeds texture budget; reduce sample count or outputSize')
    encoded = png_bytes(sheet); digest = hashlib.sha256(encoded).hexdigest()[:16]
    entry = dict(file=filename, hash=digest, frameWidth=width, frameHeight=height,
                 frames=len(tiles), fps=config.get('fps', 12), scale=config.get('scale', 1),
                 anchor=anchor, animations=animations)
    if config.get('states'):
        entry['states']=dict(config['states'])
    if config.get('tileable'):entry['tileable']=True
    out = Path(out); out.mkdir(parents=True, exist_ok=True)
    target = out / entry['file']; target.parent.mkdir(parents=True, exist_ok=True); pending = target.with_suffix('.png.tmp'); pending.write_bytes(encoded); pending.replace(target)
    if task is None:
        task=dict(id=name,name=config.get('name',name),type=kind,directions={'character':8,'dynamic':0,'static':1}[kind],gameRoles=config.get('roles',[]))
        if kind!='static':task['animations']={}
        manifest['catalog'].append(task)
    for clip in task.get('animations',{}).values():clip['ready']=False
    for clip_name,clip in animations.items():
        task.setdefault('animations',{}).setdefault(clip_name,{}).update(clip,ready=True)
    task.update({key:value for key,value in entry.items() if key!='animations'})
    task['spriteReady']=True
    if config.get('publish',False):
        for key in ('roles','races'):
            for role in config.get(key,task.get('gameRoles',[]) if key=='roles' else []):
                manifest.setdefault(key,{})[role]=name
    pending=path.with_suffix('.json.tmp');pending.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n');pending.replace(path)
    return dict(file=str(target),manifest=str(path),encodedBytes=len(encoded),decodedBytes=sheet.nbytes,entry=task)
