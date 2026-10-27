"""Fit a fallen gown to evaluated legs; repair baked assets without replacing their other poses."""
import math,json
from mathutils import Vector

def fit(points,envelope,t):
    u=max(0,min(1,(t-.22)/.65));damp=1-.48*u*u*(3-2*u);cache={};out=[]
    for point in points:
        q=point.copy();q.y*=damp
        if point.z<1.22:
            z=round(point.z,6)
            if z not in cache:
                section=[p for p in envelope if abs(p.z-point.z)<.12]
                if section:
                    bx=.345-.10*max(0,(point.z-.16)/1.12)**1.8;by=.28-.10*((point.z-.16)/1.12);lower=min(p.y for p in section);upper=max(p.y for p in section)
                    cache[z]=(bx,by,max(bx,max(abs(p.x) for p in section)+.045),(lower+upper)/2,max(by*damp,(upper-lower)*.615+.035))
                else:cache[z]=None
            params=cache[z]
            if params:
                bx,by,rx,cy,ry=params;angle=math.atan2(point.y/by,point.x/bx);q.x=rx*math.cos(angle);q.y=cy+ry*math.sin(angle)
        out.append(q)
    return out

def repair_saved():
    import bpy
    s=bpy.context.scene;cfg=json.loads(s['sprite_export_json']);clip=cfg['clips'].get('death');skirt=bpy.data.objects.get('COSTUME long skirt')
    if not clip or not skirt:return {'status':'not applicable'}
    root=bpy.data.objects['CHARACTER_ROOT'];body=bpy.data.objects['RIG_body'];c=bpy.data.collections['ASSET • replace with your character'];points=[v.co.copy() for v in skirt.data.shape_keys.key_blocks['Basis'].data];samples=0
    for j in range((clip['frames']-1)*4+1):
        f=clip['start']+j*.25;t=j/((clip['frames']-1)*4);s.frame_set(math.floor(f),subframe=f%1);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();inv=body.matrix_world.inverted();envelope=[]
        for o in c.objects:
            if o.type=='MESH' and o.name.startswith(('Tailored trouser thigh','Trouser knee','Shaped boot calf','Boot upper')):
                ev=o.evaluated_get(dg);mesh=ev.to_mesh();m=inv@ev.matrix_world;envelope.extend(m@v.co for v in mesh.vertices);ev.to_mesh_clear()
        key=skirt.data.shape_keys.key_blocks.get(f'Drape_{f:.2f}')
        if key is None:raise AssertionError(('missing baked drape key',f))
        for vertex,point in zip(key.data,fit(points,envelope,t)):vertex.co=point
        skirt.data.update();s.frame_set(math.floor(f),subframe=f%1);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();low=100.
        for o in c.objects:
            if o.type in {'MESH','CURVE'} and not o.hide_render:
                ev=o.evaluated_get(dg);mesh=ev.to_mesh();low=min(low,min((ev.matrix_world@v.co).z for v in mesh.vertices));ev.to_mesh_clear()
        root.location.z+=.002-low;root.keyframe_insert('location',frame=f);samples+=1
    s.frame_set(cfg['clips']['idle']['start'])
    return dict(status='repaired',samples=samples)
