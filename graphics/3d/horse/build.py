"""Bay riding horse: fixed anatomical limbs, four-beat walk and suspended gallop."""
from pathlib import Path
import sys,math,json
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
import bpy,bmesh
from mathutils import Vector,Matrix
from animal_studio import begin,clips_for,finish
from equine import make

def smooth(x):
    x=max(0,min(1,x));return x*x*(3-2*x)

def leg_points(hip,toe,front,side):
    length=.35 if front else .50;delta=toe.y-hip.y;angle=.30+.50*delta if front else -.48+.55*delta
    direction=Vector((side*.045,length*math.sin(angle),-length*math.cos(angle))).normalized();first=hip+direction*length
    a,b=(.58,.50) if front else (.50,.46);d=toe-first;distance=max(abs(a-b)+.00001,min(a+b-.00001,d.length));axis=d.normalized();end=first+axis*distance
    pole=Vector((0,-1 if front else 1,0));pole=(pole-axis*pole.dot(axis)).normalized();along=(a*a-b*b+distance*distance)/(2*distance)
    second=first+axis*along+pole*math.sqrt(max(0,a*a-along*along))
    return [hip,first,second,end]

def skin_points(points,front):
    radii=[[.025,.13,.13,.09,.06],[.06,.055,.045,.035,.032],[.032,.030,.028,.030,.045]] if front else [[.025,.17,.17,.12,.075],[.075,.075,.060,.045,.040],[.040,.035,.029,.030,.045]]
    out=[]
    for k in range(3):
        for j in range(5):
            if k and j==0:continue
            u=j/4;center=points[k].lerp(points[k+1],u);axis=(points[k+1]-points[k]).normalized()
            if j==4 and k<2:axis=(axis+(points[k+2]-points[k+1]).normalized()).normalized()
            right=(Vector((1,0,0))-axis*axis.x).normalized();depth=axis.cross(right).normalized();r=radii[k][j]
            for i in range(24):a=i*math.tau/24;out.append(center+right*(r*math.cos(a))+depth*(r*.95*math.sin(a)))
    return out

def rein_centers(head,side,floor_matrix=None):
    a=head.location+head.rotation_euler.to_matrix()@Vector((side*.15,-.31,-.18));b=Vector((side*.15,-.15,1.91))
    def points(sag):
        result=[a.lerp(b,j/8)+Vector((side*.20*math.sin(math.pi*j/8),0,-sag*math.sin(math.pi*j/8))) for j in range(9)]
        if floor_matrix is not None:
            inv=floor_matrix.inverted()
            for j in range(1,8):
                world=floor_matrix@result[j];world.z=max(.009,world.z);result[j]=inv@world
        return result
    low,high=0.,.7
    for k in range(24):
        sag=(low+high)/2;p=points(sag);length=sum((y-x).length for x,y in zip(p,p[1:]))
        if length<1.40:low=sag
        else:high=sag
    return points((low+high)/2)

def rein_skin(centers):
    out=[]
    for j,p in enumerate(centers):
        axis=(centers[min(j+1,8)]-centers[max(j-1,0)]).normalized();right=(Vector((1,0,0))-axis*axis.x).normalized();depth=axis.cross(right).normalized()
        for k in range(8):a=k*math.tau/8;out.append(p+right*(.007*math.cos(a))+depth*(.007*math.sin(a)))
    return out

def build():
    ns,task=begin('horse');s=ns['s'];c=ns['c'];root=ns['root'];model=make(ns,root,unicorn=False,tack=True);torso=model['torso'];head=model['head'];tail=model['tail'];coat=next(o for o in c.objects if o.name.startswith('EQUINE barrel')).data.materials[0];limbs=[]
    def empty(n,p=(0,0,0)):
        o=bpy.data.objects.new(n,None);c.objects.link(o);o.parent=root;o.location=p;return o
    for o in list(c.objects):
        if o.name.startswith('EQUINE reins'):bpy.data.objects.remove(o,do_unlink=True)
    stirrups=[];reins=[];leather=next(o for o in c.objects if o.name.startswith('EQUINE bridle cheekpiece')).data.materials[0]
    for side in [-1,1]:
        hinge=empty('HORSE stirrup hinge '+str(side),(side*.29,.03,1.85));hinge.parent=torso;bpy.context.view_layer.update()
        for o in list(torso.children):
            if o.name.startswith(('EQUINE stirrup leather','EQUINE stirrup tread')) and side*o.location.x>0:
                world=o.matrix_world.copy();o.parent=hinge;o.matrix_world=world
        stirrups.append((side,hinge))
        v=rein_skin(rein_centers(head,side));f=[tuple(reversed(range(8)))]
        for j in range(8):
            for k in range(8):a=j*8+k;b=j*8+(k+1)%8;f.append((a,b,b+8,a+8))
        f.append(tuple(range(64,72)));m=bpy.data.meshes.new('Horse slack rein');m.from_pydata(v,[],f);m.update();m.materials.append(leather);o=bpy.data.objects.new('HORSE rein '+str(side),m);c.objects.link(o);o.parent=torso
        for poly in m.polygons:poly.use_smooth=True
        o.shape_key_add(name='Basis');reins.append((side,o))
    for old in model['limbs']:
        side,front=old['side'],old['front'];label='%s %s'%(side,'fore' if front else 'hind');foot=old['foot'];foot.name='HORSE foot '+label
        for child in foot.children:
            if child.type=='MESH':
                bm=bmesh.new();bm.from_mesh(child.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(child.data);bm.free()
        upper=old['meshes'][0][0].parent
        for o in list(upper.children):bpy.data.objects.remove(o,do_unlink=True)
        bpy.data.objects.remove(upper,do_unlink=True)
        hip=Vector((side*.20,-.59 if front else .62,1.50 if front else 1.46));toe=Vector((side*.255,hip.y,.17));points=leg_points(hip,toe,front,side);v=skin_points(points,front);rings=len(v)//24;f=[tuple(reversed(range(24)))]
        for j in range(rings-1):
            for k in range(24):a=j*24+k;b=j*24+(k+1)%24;f.append((a,b,b+24,a+24))
        f.append(tuple(range((rings-1)*24,rings*24)));m=bpy.data.meshes.new('Horse continuous leg');m.from_pydata(v,[],f);m.update();m.materials.append(coat);bm=bmesh.new();bm.from_mesh(m);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(m);bm.free();o=bpy.data.objects.new('HORSE leg '+label,m);c.objects.link(o);o.parent=root
        for p in m.polygons:p.use_smooth=True
        o.modifiers.new('Anatomical limb contours','SUBSURF').levels=1;o.shape_key_add(name='Basis');joints=[empty('HORSE joint '+label+' '+str(k),p) for k,p in enumerate(points)];local=[child.matrix_basis@v.co for child in foot.children if child.type=='MESH' for v in child.data.vertices];limbs.append(dict(side=side,front=front,mesh=o,joints=joints,foot=foot,points=local))
    clips=clips_for(task,frames={'idle':8,'walk':12,'run':16,'death':16},fps={'idle':6,'run':20})
    s['animal_design']=json.dumps(dict(species='bay riding horse',equipment='leather bridle, saddle blanket, saddle and iron stirrups',limbs='fixed humerus/radius/cannon and femur/tibia/metatarsus lengths',gait='four-beat walk; two suspended gallop cycles'))
    for name,cfg in clips.items():
        span=cfg['frames'] if cfg['loop'] else cfg['frames']-1
        for j in range(span*4+1):
            frame=cfg['start']+j*.25;t=j/(span*4);u=(t*(2 if name=='run' else 1))%1;p=math.tau*u;s.frame_set(int(frame),subframe=frame%1);fall=smooth((t-.15)/.75) if name=='death' else 0;collapse=smooth(t/.35) if name=='death' else 0;flight=0
            if name=='run':
                for a,b in [(.28,.44),(.78,.92)]:
                    if a<u<b:flight=.065*math.sin(math.pi*(u-a)/(b-a))
            root.location=(1.40*math.sin(math.pi/2*fall)-.20*fall,0,flight);root.rotation_euler=(0,-math.pi/2*fall,0)
            torso.location=(0,0,(-.012+.012*math.cos(2*p) if name in ['walk','run'] else 0)-.15*collapse*(1-fall));torso.rotation_euler=(.025*math.sin(p) if name=='run' else 0,0,0)
            head.location=(-.10*fall,-1.03,1.98);head.rotation_euler=(.018*math.sin(p)*(1-fall),1.0*fall,.012*math.sin(p)*(1-fall));tail.rotation_euler=(.10 if name=='run' else 0,.05*math.sin(p)*(1-fall),.04*math.sin(p)*(1-fall))
            for side,hinge in stirrups:hinge.rotation_euler=(0,side*.50*fall,0);hinge.keyframe_insert('rotation_euler',frame=frame)
            for side,rein in reins:
                key=rein.shape_key_add(name='Pose_%.2f'%frame)
                for v,point in zip(key.data,rein_skin(rein_centers(head,side))):v.co=point
                for f,value in [(frame-.25,0),(frame,1),(frame+.25,0)]:key.value=value;key.keyframe_insert('value',frame=f)
                key.value=0
            tm=Matrix.Translation(torso.location)@torso.rotation_euler.to_matrix().to_4x4()
            for limb in limbs:
                side,front=limb['side'],limb['front'];hip=tm@Vector((side*.20,-.59 if front else .62,1.50 if front else 1.46));toe=Vector((side*.255,-.59 if front else .62,0));pitch=lift=0
                if name in ['walk','run']:
                    run=name=='run';offset=((.48 if side==-1 else .56) if front else (0 if side==-1 else .08)) if run else ((.25 if side==-1 else .75) if front else (0 if side==-1 else .5));phase=(u+offset)%1;stance=(.25 if front else .28) if run else .66;stride=.34 if run else .25
                    if phase<stance:toe.y+=-stride+2*stride*phase/stance;pitch=.22*smooth((phase/stance-.65)/.35)
                    else:
                        q=(phase-stance)/(1-stance);toe.y+=stride-2*stride*smooth(q);lift=(.28 if run else .14)*math.sin(math.pi*q);pitch=.22*(1-smooth(q/.20))-.40*math.sin(math.pi*q)
                elif name=='death':toe.y+=(-.12 if front else .12)*fall;lift=.30*fall
                rot=Matrix.Rotation(pitch,3,'X');toe.z=.002-min((rot@v).z for v in limb['points'])+lift;points=leg_points(hip,toe,front,side)
                for o,point in zip(limb['joints'],points):o.location=point;o.keyframe_insert('location',frame=frame)
                foot=limb['foot'];foot.location=points[-1];foot.rotation_euler=(pitch,0,0);foot.keyframe_insert('location',frame=frame);foot.keyframe_insert('rotation_euler',frame=frame);key=limb['mesh'].shape_key_add(name='Pose_%.2f'%frame)
                for v,point in zip(key.data,skin_points(points,front)):v.co=point
                for f,value in [(frame-.25,0),(frame,1),(frame+.25,0)]:key.value=value;key.keyframe_insert('value',frame=f)
                key.value=0
            for o in [torso,head,tail,root]:
                for prop in ['location','rotation_euler']:o.keyframe_insert(prop,frame=frame)
            if name=='death':
                s.frame_set(int(frame),subframe=frame%1);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();low=100
                for o in c.objects:
                    if o.type=='MESH' and not o.name.startswith('HORSE rein '):
                        ev=o.evaluated_get(dg);m=ev.to_mesh();low=min(low,min((ev.matrix_world@v.co).z for v in m.vertices));ev.to_mesh_clear()
                root.location.z+=max(0,.002-low);root.keyframe_insert('location',frame=frame);bpy.context.view_layer.update()
                for side,rein in reins:
                    key=rein.data.shape_keys.key_blocks['Pose_%.2f'%frame]
                    for v,point in zip(key.data,rein_skin(rein_centers(head,side,torso.matrix_world))):v.co=point
    finish(ns,'horse',clips,source_files=['validate_horse.py'],size=160,target=1.22)
    text=bpy.data.texts.get('equine.py') or bpy.data.texts.new('equine.py');text.clear();text.write((Path(__file__).resolve().parents[1]/'_shared/equine.py').read_text());bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath,compress=True)

if __name__ in ['__main__','character_build']:build()
