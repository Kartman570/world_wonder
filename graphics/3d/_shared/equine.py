"""Equine anatomy and gait source shared by mounts and standalone equines."""
import bpy,math,json
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parents[2]

def make(ns,parent,unicorn=False,tack=False):
    c=ns['c'];ell=ns['ell'];rod=ns['rod'];material=ns['material'];box=ns['box']
    coat=material('Equine charcoal coat' if unicorn else 'Equine bay coat',(.045,.052,.053) if unicorn else (.115,.055,.023),rough=.78,texture=145)
    mane=material('Equine mane',(.012,.014,.014),rough=.9,texture=180);hoof=material('Equine horn hoof',(.026,.025,.021),rough=.68,texture=95);muzzle=material('Equine soft muzzle',(.06,.055,.05),rough=.88,texture=90)
    dark=material('Equine eye',(.003,.003,.002),rough=.18);leather=material('Equine bridle leather',(.07,.035,.017),rough=.8,texture=100);metal=material('Equine bridle iron',(.14,.15,.16),metal=.7,rough=.45)
    created=[]
    def attach(o,p=parent):
        o.parent=p;created.append(o);return o
    def E(n,p,sz,m=coat,pivot=parent):return attach(ell('EQUINE '+n,p,sz,m),pivot)
    def R(n,a,b,r,m=coat,r2=None,pivot=parent):return attach(rod('EQUINE '+n,a,b,r,m,r2=r2),pivot)
    def empty(n,p=(0,0,0),par=parent):
        o=bpy.data.objects.new('EQUINE '+n,None);c.objects.link(o);o.parent=par;o.location=p;return o
    torso=empty('torso');head=empty('head',(0,-1.03,1.98),torso)
    E('barrel',(0,0,1.38),(.34,.86,.43),pivot=torso)
    E('ribcage',(0,-.32,1.46),(.365,.56,.43),pivot=torso)
    E('croup',(0,.62,1.46),(.355,.39,.40),pivot=torso)
    E('withers',(0,-.48,1.72),(.23,.30,.20),pivot=torso)
    E('chest',(0,-.64,1.35),(.29,.28,.40),pivot=torso)
    o=E('rising neck',(0,-.78,1.82),(.235,.29,.50),pivot=torso);o.rotation_euler.x=-.48
    E('poll',(0,0,.20),(.15,.17,.21),pivot=head)
    o=E('long face',(0,-.15,-.015),(.13,.19,.30),pivot=head);o.rotation_euler.x=-.55
    E('muzzle',(0,-.31,-.20),(.145,.15,.11),muzzle,head)
    E('lower jaw',(0,-.08,-.16),(.13,.17,.16),pivot=head)
    for side in [-1,1]:
        E('cheek',(side*.10,-.015,-.055),(.07,.12,.13),pivot=head)
        E('nostril',(side*.123,-.37,-.19),(.018,.045,.027),dark,head)
        E('eye',(side*.134,-.08,.12),(.018,.032,.023),dark,head)
        E('upper eyelid',(side*.134,-.08,.143),(.026,.038,.011),pivot=head)
        ear=E('ear',(side*.105,.015,.40),(.047,.065,.17),pivot=head);ear.rotation_euler=(.10,side*.20,0)
        o=E('inner ear',(side*.105,-.041,.41),(.023,.009,.10),muzzle,head);o.rotation_euler.y=side*.20
    # A joined crest of tapering locks follows the neck, rather than a cylindrical mane.
    for i in range(17):
        u=i/16;y=-.91+.42*u;z=2.23-.51*u
        o=E('mane lock',(.018,y+.05,z),(.065,.06,.15),mane,torso);o.rotation_euler.x=-.30
    tail=empty('tail',(0,.84,1.62),torso)
    for i in range(9):
        u=i/8;E('tail lock',(.025*math.sin(i*2.4),.09+.17*u,-.12-.83*u),(.065-.025*u,.085,.24-.07*u),mane,tail)
    if unicorn:
        horn=material('Mount dark horn',(.19,.14,.08),rough=.58,texture=80)
        R('single forehead horn',(0,-.16,.27),(0,-.40,.88),.075,horn,.002,head)
        for i in range(13):
            t=i/14;a=Vector((0,-.16,.27)).lerp(Vector((0,-.40,.88)),t)
            E('horn growth ridge',tuple(a),(.076*(1-t),.073*(1-t),.012),horn,head)
    if tack:
        E('saddle blanket',(0,.03,1.76),(.38,.43,.13),leather,torso)
        E('saddle seat',(0,.07,1.87),(.25,.30,.08),leather,torso)
        for y in [-.21,.35]:E('saddle raised rim',(0,y,1.91),(.28,.065,.10),leather,torso)
        for side in [-1,1]:
            R('bridle cheekpiece',(side*.15,-.02,.24),(side*.15,-.31,-.18),.014,leather,pivot=head)
            R('noseband',(side*.15,-.31,-.17),(0,-.45,-.17),.017,leather,pivot=head)
            R('reins',(side*.15,-1.35,1.80),(side*.15,-.15,2.10),.010,leather,pivot=torso)
            R('stirrup leather',(side*.29,.03,1.85),(side*.38,.03,1.12),.018,leather,pivot=torso)
            R('stirrup tread',(side*.34,-.05,1.11),(side*.43,-.05,1.11),.018,metal,pivot=torso)
    # Fuse overlapping anatomical masses into continuous skin surfaces.
    for pivot in [torso,head]:
        pieces=[o for o in list(pivot.children) if o.type=='MESH' and len(o.data.materials) and o.data.materials[0]==coat]
        bpy.ops.object.select_all(action='DESELECT')
        for o in pieces:o.select_set(True)
        bpy.context.view_layer.objects.active=pieces[0];bpy.ops.object.join();o=bpy.context.object;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        rem=o.modifiers.new('Continuous anatomy','REMESH');rem.mode='VOXEL';rem.voxel_size=.018 if pivot==torso else .010;bpy.ops.object.modifier_apply(modifier=rem.name)
        smooth=o.modifiers.new('Anatomical surface','SMOOTH');smooth.factor=1.2;smooth.iterations=4;bpy.ops.object.modifier_apply(modifier=smooth.name)
        for face in o.data.polygons:face.use_smooth=True
    # Deformed tubes are rebuilt at quarter-frame samples from anatomical joint paths.
    limbs=[]
    for side in [-1,1]:
        for front in [True,False]:
            x=side*.255;y=-.59 if front else .62
            upper=empty(('fore' if front else 'hind')+' limb '+str(side))
            joints=[Vector((side*.18,y,1.50 if front else 1.46)),Vector((x,y+(.015 if front else -.28),.88 if front else 1.02)),Vector((x,y+.08,.28 if front else .59)),Vector((x,y,.17))]
            if front:joints=[joints[0],joints[1],Vector((x,y,.17))]
            meshes=[]
            for k,(a,b) in enumerate(zip(joints,joints[1:])):
                radius=([.125,.050] if front else [.17,.08,.045])[k]
                profile=([.35,1.16,1.,.72,.46] if k==0 else [.85,.65,.55,.65,.85])
                axis=(b-a).normalized();right=Vector((1,0,0));depth=axis.cross(right);verts=[];faces=[]
                for j,r in enumerate(profile):
                    center=a.lerp(b,j/4)
                    for i in range(20):
                        angle=i*math.tau/20;verts.append(tuple(center+right*(radius*r*math.cos(angle))+depth*(radius*r*math.sin(angle))))
                faces=[tuple(reversed(range(20)))]
                for j in range(4):
                    for i in range(20):faces.append((j*20+i,j*20+(i+1)%20,(j+1)*20+(i+1)%20,(j+1)*20+i))
                faces.append(tuple(range(80,100)));mesh=bpy.data.meshes.new('Equine articulated anatomy');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('EQUINE '+('fore' if front else 'hind')+' segment',mesh);c.objects.link(o);o.parent=upper;mesh.materials.append(coat)
                for face in mesh.polygons:face.use_smooth=True
                o.shape_key_add(name='Basis');meshes.append((o,[v.co.copy() for v in o.data.vertices],a.copy(),b.copy()))
                E('joint',tuple(b),(.060,.065,.065),pivot=upper)
            foot=empty(('fore' if front else 'hind')+' hoof '+str(side),tuple(joints[-1]))
            verts=[];faces=[];n=24
            for z,w,d,cy in [(-.012,.048,.065,0),(-.10,.065,.087,-.012),(-.165,.070,.098,-.018)]:
                for i in range(n):
                    a=math.tau*i/n;verts.append((w*math.cos(a),cy+d*math.sin(a),z))
            faces=[tuple(reversed(range(n)))]
            for j in range(2):
                for i in range(n):faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
            faces.append(tuple(range(2*n,3*n)));mesh=bpy.data.meshes.new('Sloping hoof capsule');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('EQUINE hoof capsule',mesh);c.objects.link(o);o.parent=foot;mesh.materials.append(hoof)
            for f in mesh.polygons:f.use_smooth=True
            limbs.append(dict(front=front,side=side,x=x,y=y,joints=joints,meshes=meshes,foot=foot,joint_meshes=[o for o in upper.children if o.name.startswith('EQUINE joint')]))
    return dict(parent=parent,torso=torso,head=head,tail=tail,limbs=limbs,objects=created)

def solve(a,b,L1,L2,sign):
    delta=b-a;d=min(L1+L2-.0001,max(abs(L1-L2)+.0001,delta.length));u=delta.normalized();along=(L1*L1-L2*L2+d*d)/(2*d);h=math.sqrt(max(0,L1*L1-along*along));perp=Vector((0,-u.z,u.y));return a+u*along+perp*h*sign

def pose(model,name,t,frame):
    p=t*math.tau;torso=model['torso'];torso.location=(0,0,0);torso.rotation_euler=(0,0,0)
    bob=.018*math.sin(2*p) if name=='walk' else (.065*math.cos(p) if name=='run' else .005*math.sin(p))
    torso.location.y=.12*max(0,min(1,t/.65)) if name=='death' else 0;torso.location.z=bob-(.60*max(0,min(1,t/.65)) if name=='death' else 0);torso.rotation_euler.x=.025*math.sin(p) if name=='run' else .006*math.sin(p)
    model['head'].rotation_euler=(.025*math.sin(p),0,.015*math.sin(p));model['tail'].rotation_euler=(.04*math.sin(p),.08*math.sin(p),.06*math.cos(p))
    for limb in model['limbs']:
        front=limb['front'];side=limb['side'];x=limb['x'];y=limb['y'];phase=(t+(0 if front else .25)+(.5 if side==1 else 0))%1
        if name=='run':phase=(t+(0 if front else .22)+(.12 if side==1 else 0))%1
        stride=.31 if name=='walk' else .48;lift=0;dy=0;hoof_pitch=0
        if name in ['walk','run']:
            stance=.62 if name=='walk' else .35
            if phase<stance:dy=-stride+2*stride*phase/stance
            else:u=(phase-stance)/(1-stance);dy=stride-2*stride*u;lift=(.15 if name=='walk' else .35)*math.sin(math.pi*u);hoof_pitch=.55*math.sin(math.pi*u)
        a=Vector((side*.18,y,(1.50 if front else 1.46)+bob));tip=Vector((x,y+dy,.17+lift))
        if front:joints=[a,solve(a,tip,.65,.70,1),tip]
        else:
            stifle=a+Vector((0,-.28-.06*math.sin(p),-.44));joints=[a,stifle,solve(stifle,tip,.49,.44,1),tip]
        if name=='death':
            collapse=max(0,min(1,t/.65));joints=[q+Vector((0,.12*collapse,-.60*collapse)) for q in joints];joints[-1].z=.17
        for (o,rest,ra,rb),na,nb in zip(limb['meshes'],joints,joints[1:]):
            rotation=(rb-ra).rotation_difference(nb-na).to_matrix();ratio=(nb-na).length/(rb-ra).length;axis=(rb-ra).normalized();key=o.shape_key_add(name='Pose '+str(frame))
            for v,point in zip(key.data,rest):
                q=point-ra;along=axis*q.dot(axis);v.co=na+rotation@(q-along+along*ratio)
            for f,val in [(frame-.25,0),(frame,1),(frame+.25,0)]:key.value=val;key.keyframe_insert('value',frame=f)
            key.value=0
        for o,pos in zip(limb['joint_meshes'],joints[1:]):o.location=pos;o.keyframe_insert('location',frame=frame)
        limb['foot'].location=joints[-1];limb['foot'].rotation_euler.x=hoof_pitch;limb['foot'].keyframe_insert('location',frame=frame);limb['foot'].keyframe_insert('rotation_euler',frame=frame)
    for o in [torso,model['head'],model['tail']]:o.keyframe_insert('location',frame=frame);o.keyframe_insert('rotation_euler',frame=frame)

def build(asset,unicorn=False,tack=False):
    task=next(x for x in json.loads((ROOT/'sprites/manifest.json').read_text())['catalog'] if x['id']==asset)
    source=ROOT/'3d/city_guard/build_guard.py';ns={'__file__':str(source),'__name__':'equine_base'};exec(compile(source.read_text().split('# Pose controls:')[0],str(source),'exec'),ns)
    c=ns['c'];root=ns['root'];s=ns['s']
    for key in list(s.keys()):
        if key.endswith('_validation') or key in ['last_export_hash','character_design']:del s[key]
    for o in list(c.objects):
        if o!=root:bpy.data.objects.remove(o,do_unlink=True)
    model=make(ns,root,unicorn,tack)
    clips={};cursor=1
    for name,e in task['animations'].items():
        if e.get('optional'):continue
        clips[name]=dict(start=cursor,frames=12 if name in ['run','death'] else e.get('suggestedFrames',8),fps=16 if name=='run' else e['fps'],loop=e['loop']);cursor+=clips[name]['frames']+5
    for name,clip in clips.items():
        span=clip['frames'] if clip['loop'] else clip['frames']-1
        for j in range(span*4+1):
            frame=clip['start']+j*.25;t=j/(span*4)
            root.location=(0,0,0);root.rotation_euler=(0,0,0)
            pose(model,name,t,frame)
            s.frame_set(math.floor(frame),subframe=frame%1);root.location=(0,0,0);root.rotation_euler=(0,0,0)
            if name=='death':
                u=max(0,min(1,(t-.15)/.75));u=u*u*(3-2*u);root.rotation_euler.y=-math.pi/2*u;root.location.x=-.35*u
                bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();low=100.
                for o in c.objects:
                    if o.type=='MESH':
                        ev=o.evaluated_get(dg);mesh=ev.to_mesh();low=min(low,min((ev.matrix_world@v.co).z for v in mesh.vertices));ev.to_mesh_clear()
                root.location.z=.002-low
            root.keyframe_insert('location',frame=frame);root.keyframe_insert('rotation_euler',frame=frame)
    for o in c.objects:
        for data in [o]+([o.data.shape_keys] if o.type=='MESH' and o.data.shape_keys else []):
            action=data.animation_data.action if data.animation_data else None
            if action:
                for layer in action.layers:
                    for strip in layer.strips:
                        for slot in action.slots:
                            bag=strip.channelbag(slot)
                            if bag:
                                for fc in bag.fcurves:
                                    for key in fc.keyframe_points:key.interpolation='LINEAR'
    for light,power in [('Key',350),('Fill',100),('Rim',200)]:bpy.data.objects[light].data.energy=power
    s.world.node_tree.nodes['Background'].inputs[1].default_value=.28;s.render.resolution_x=s.render.resolution_y=448;s.render.resolution_percentage=100;s.render.engine='CYCLES';s.cycles.samples=48;s.view_settings.view_transform='AgX'
    s.camera.data.ortho_scale=7.35;s.camera.location=(0,-10,10*math.tan(math.radians(30))+1.20);s.camera.rotation_euler=(Vector((0,0,1.20))-s.camera.location).to_track_quat('-Z','Y').to_euler()
    s['sprite_postprocess']=True;s['sprite_pixels_per_unit']=128/4.2;s['sprite_asset']=asset
    s['sprite_export_json']=json.dumps(dict(asset=asset,outputSize=224,fps=12,scale=4.2/3.25,crop=True,publish=False,maxDecodedBytes=134217728,maxWorkingBytes=268435456,maxAtlasSide=16384,output=str(ROOT/'sprites'),clips=clips),indent=2)
    s.timeline_markers.clear()
    for name,clip in clips.items():s.timeline_markers.new('CLIP_'+name,frame=clip['start'])
    s.frame_start=1;s.frame_end=cursor;s.frame_set(1)
    for name in ['equine.py','validate_equine.py','render_8_directions.py','sprite_pipeline.py']:
        text=bpy.data.texts.get(name) or bpy.data.texts.new(name);text.clear();text.write((ROOT/'3d/_shared'/name).read_text())
    folder=ROOT/'3d'/asset;folder.mkdir(exist_ok=True);text=bpy.data.texts.get('build.py') or bpy.data.texts.new('build.py');text.clear();text.write((folder/'build.py').read_text())
    bpy.ops.outliner.orphans_purge(do_local_ids=True,do_linked_ids=False,do_recursive=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(folder/(asset+'.blend')),compress=True)
    return model
