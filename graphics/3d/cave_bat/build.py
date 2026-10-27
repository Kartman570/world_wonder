"""Cave bat with finger-supported membranes, hovering and a grounded carcass."""
from pathlib import Path
import sys,math,json,random
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
import bpy
from mathutils import Vector,Matrix
from animal_studio import begin,clips_for,finish

def smooth(x):
    x=max(0,min(1,x));return x*x*(3-2*x)

def curve(t,keys):
    for (a,x),(b,y) in zip(keys,keys[1:]):
        if t<=b:return x+(y-x)*smooth((t-a)/(b-a))
    return keys[-1][1]

def wing_points(side,fold):
    def step(p,length,angle):return p+Vector((side*length*math.cos(angle),length*math.sin(angle),0))
    shoulder=Vector((0,0,0));elbow=step(shoulder,.17,.38+.90*fold);wrist=step(elbow,.20,-.85+2.50*fold)
    points=[shoulder,elbow,wrist];chains=[]
    for lengths,angles,folds in [([.15,.13,.10],[.03,.10,.30],[1.60,1.30,1.20]),([.14,.11,.08],[.55,.68,.95],[1.90,2.0,2.10]),([.12,.10,.08],[1.12,1.38,1.68],[2.0,2.50,2.80])]:
        p=wrist.copy();chain=[wrist]
        for length,angle,f in zip(lengths,angles,folds):p=step(p,length,angle-f*fold);points.append(p);chain.append(p)
        chains.append(chain)
    ankle=Vector((side*.010,.29,-.025));body=Vector((0,.18,-.015))
    points.extend([(points[5]+points[8])*.425+wrist*.15,(points[8]+points[11])*.425+wrist*.15,(points[11]+ankle)*.425+wrist*.15,ankle,body])
    thumb=step(wrist,.045,-1.4);claw=thumb+Vector((-side*.007,-.014,-.010))
    bones=[(shoulder,elbow),(elbow,wrist)]
    for chain in chains:bones.extend(zip(chain,chain[1:]))
    bones.extend([(wrist,thumb),(thumb,claw)])
    return points,bones

FACES=[(0,2,1),(2,3,6),(3,4,7),(3,7,6),(4,5,12),(4,12,8),(4,8,7),(2,6,9),(6,7,10),(6,10,9),(7,8,13),(7,13,11),(7,11,10),(1,2,9),(1,9,10),(1,10,11),(1,11,14),(1,14,15),(1,15,16),(1,16,0)]

def membrane_topology():
    weights=[];camber=[];faces=[];lookup={};n=4
    for tri in FACES:
        grid={}
        for i in range(n+1):
            for j in range(n+1-i):
                a,b,cc=1-(i+j)/n,i/n,j/n;w=[0.]*17
                for k,value in zip(tri,[a,b,cc]):w[k]+=value
                key=tuple(w)
                if key not in lookup:lookup[key]=len(weights);weights.append(w);camber.append(27*a*b*cc)
                grid[i,j]=lookup[key]
        for i in range(n):
            for j in range(n-i):
                f=(grid[i,j],grid[i+1,j],grid[i,j+1])
                if len(set(f))==3:faces.append(f)
                if i+j<n-1:
                    f=(grid[i+1,j],grid[i+1,j+1],grid[i,j+1])
                    if len(set(f))==3:faces.append(f)
    return weights,camber,faces

def build():
    ns,task=begin('cave_bat');s=ns['s'];c=ns['c'];root=ns['root'];ell=ns['ell'];rod=ns['rod'];material=ns['material']
    fur=material('Bat brown grey fur',(.075,.063,.055),rough=.91,texture=190)
    belly=material('Bat throat fur',(.14,.12,.10),rough=.94,texture=190)
    skin=material('Bat wing skin',(.12,.085,.09),rough=.81,texture=165)
    inner=material('Bat ear interior',(.17,.115,.12),rough=.84,texture=130)
    bone=material('Bat wing digits',(.10,.070,.067),rough=.77,texture=130)
    dark=material('Bat nose and claws',(.019,.015,.014),rough=.65)
    eye=material('Bat small dark eyes',(.003,.003,.002),rough=.19)
    tooth=material('Bat natural teeth',(.40,.34,.24),rough=.62)
    controlled=[]
    def empty(n,loc=(0,0,0),parent=root):
        o=bpy.data.objects.new(n,None);c.objects.link(o);o.parent=parent;o.location=loc;controlled.append(o);return o
    def E(n,loc,scale,mat,parent):o=ell(n,loc,scale,mat);o.parent=parent;return o
    def R(n,a,b,r,mat,parent,r2=None):o=rod(n,a,b,r,mat,r2=r2);o.parent=parent;return o
    def segment_object(n,radius,parent,mat=bone):
        verts=[];faces=[];nring=12
        for j,mul in enumerate([1.,.9,.72,.58]):
            for k in range(nring):a=math.tau*k/nring;verts.append((radius*mul*math.cos(a),radius*mul*math.sin(a),j/3))
        faces=[tuple(reversed(range(nring)))]
        for j in range(3):
            for k in range(nring):a=j*nring+k;b=j*nring+(k+1)%nring;faces.append((a,b,b+nring,a+nring))
        faces.append(tuple(range(36,48)));m=bpy.data.meshes.new(n);m.from_pydata(verts,[],faces);m.update();m.materials.append(mat)
        for p in m.polygons:p.use_smooth=True
        o=bpy.data.objects.new(n,m);c.objects.link(o);o.parent=parent;controlled.append(o);return o
    def put(o,a,b):d=b-a;o.location=a;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();o.scale=(1,1,d.length)
    torso=empty('BAT torso')
    E('BAT furred body',(0,.015,0),(.090,.195,.075),fur,torso)
    E('BAT rump',(0,.13,-.005),(.073,.10,.070),fur,torso)
    E('BAT throat',(0,-.105,-.025),(.073,.085,.060),belly,torso)
    head=empty('BAT head',(0,-.195,.030),torso)
    E('BAT skull',(0,0,0),(.078,.078,.062),fur,head)
    E('BAT muzzle fur',(0,-.055,-.019),(.041,.054,.030),fur,head)
    E('BAT nose pad',(0,-.101,-.013),(.026,.019,.014),dark,head)
    for side in [-1,1]:
        E('BAT cheek',(side*.050,-.030,-.025),(.029,.035,.032),fur,head)
        E('BAT eye',(side*.065,-.051,.018),(.007,.007,.007),eye,head)
        E('BAT brow',(side*.065,-.044,.024),(.012,.012,.005),fur,head)
        E('BAT nostril',(side*.012,-.119,-.009),(.004,.002,.0025),eye,head)
    jaw=empty('BAT jaw',(0,-.030,-.027),head)
    E('BAT lower jaw',(0,-.037,-.005),(.035,.040,.014),fur,jaw)
    for side in [-1,1]:
        R('BAT upper canine',(side*.025,-.076,-.025),(side*.023,-.078,-.036),.003,tooth,head,.0005)
        R('BAT lower canine',(side*.022,-.060,0),(side*.022,-.062,.007),.0025,tooth,jaw,.0005)
    ears=[]
    for side in [-1,1]:
        ear=empty('BAT ear '+str(side),(side*.055,.025,.040),head);ears.append((side,ear))
        outline=[(-.027,0),(-.045,.035),(-.044,.080),(-.028,.125),(-.005,.165),(.020,.145),(.043,.095),(.041,.045),(.025,.010)]
        v=[(0,-.010,.065)]+[(side*x,.002+.015*math.sin(math.pi*z/.165),z) for x,z in outline]
        f=[(0,i+1,(i+1)%len(outline)+1) for i in range(len(outline))]
        m=bpy.data.meshes.new('Bat concave pinna');m.from_pydata(v,[],f);m.update();o=bpy.data.objects.new('BAT pinna',m);c.objects.link(o);o.parent=ear;m.materials.append(inner);o.modifiers.new('Ear thickness','SOLIDIFY').thickness=.002
        for p in m.polygons:p.use_smooth=True
        for a,b in zip(v[1:],v[2:]+v[1:2]):R('BAT ear rim',a,b,.0025,fur,ear)
        R('BAT tragus',(side*.006,-.014,.016),(side*.010,-.018,.065),.006,inner,ear,.003)
        for x,z in [(-.022,.105),(.025,.095)]:R('BAT ear cartilage ridge',(0,-.013,.032),(side*x,-.004,z),.0015,bone,ear,.0005)
    # Continuous fur surfaces retain the animal's cheek and shoulder planes.
    for parent,label,voxel in [(torso,'BAT furred body',.004),(head,'BAT skull',.003)]:
        pieces=[o for o in parent.children if o.type=='MESH' and o.data.materials and o.data.materials[0]==fur]
        bpy.ops.object.select_all(action='DESELECT')
        for o in pieces:o.select_set(True)
        bpy.context.view_layer.objects.active=bpy.data.objects[label];bpy.ops.object.join();o=bpy.context.object
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        rem=o.modifiers.new('Continuous fur anatomy','REMESH');rem.mode='VOXEL';rem.voxel_size=voxel;bpy.ops.object.modifier_apply(modifier=rem.name)
        sm=o.modifiers.new('Anatomical smoothing','SMOOTH');sm.factor=.7;sm.iterations=3;bpy.ops.object.modifier_apply(modifier=sm.name)
        for face in o.data.polygons:face.use_smooth=True
    rng=random.Random(311)
    for i in range(105):
        z=rng.uniform(-.95,.95);a=rng.random()*math.tau;n=Vector((math.sqrt(1-z*z)*math.cos(a),math.sqrt(1-z*z)*math.sin(a),z));p=Vector((n.x*.09,n.y*.195+.015,n.z*.075))
        direction=Vector((n.x/.09,n.y/.195,n.z/.075)).normalized();R('BAT body fur',p,p+direction*rng.uniform(.006,.012),.0007,fur,torso,.00015)
    weights,camber,faces=membrane_topology();wings=[]
    for side in [-1,1]:
        pivot=empty('BAT wing root '+str(side),(side*.085,-.10,.010),torso)
        points,bones=wing_points(side,0)
        verts=[tuple(sum((points[k]*a for k,a in enumerate(w)),Vector())) for w in weights]
        m=bpy.data.meshes.new('Bat finger supported membrane');m.from_pydata(verts,[],faces if side==1 else [tuple(reversed(f)) for f in faces]);m.update();m.materials.append(skin)
        o=bpy.data.objects.new('BAT membrane '+str(side),m);c.objects.link(o);o.parent=pivot;o.modifiers.new('Patagium thickness','SOLIDIFY').thickness=.0009
        for p in m.polygons:p.use_smooth=True
        o.shape_key_add(name='Basis')
        segments=[]
        for k in range(13):
            radius=.013 if k==0 else .010 if k==1 else .006 if k==11 else .0035 if k==12 else [.0065,.0045,.003][(k-2)%3]
            segments.append(segment_object('BAT wing %s bone %s'%(side,k),radius,pivot,dark if k==12 else bone))
        wings.append(dict(side=side,pivot=pivot,membrane=o,segments=segments))
    legs=[]
    for side in [-1,1]:
        segments=[segment_object('BAT hind leg %s %s'%(side,k),.009 if k==0 else .006,torso,fur if k==0 else dark) for k in range(2)]
        claws=[segment_object('BAT toe %s %s'%(side,k),.002,torso,dark) for k in range(3)]
        legs.append((side,segments,claws))
    tail_points=[(-.05,.13,-.03),(-.095,.19,-.015),(-.095,.29,-.025),(0,.35,-.035),(.095,.29,-.025),(.095,.19,-.015),(.05,.13,-.03)]
    m=bpy.data.meshes.new('Bat uropatagium');m.from_pydata(tail_points,[],[(0,i+1,i) for i in range(1,6)]);m.update();o=bpy.data.objects.new('BAT tail membrane',m);c.objects.link(o);o.parent=torso;m.materials.append(skin);o.modifiers.new('Tail membrane thickness','SOLIDIFY').thickness=.0009
    R('BAT tail cartilage',(0,.18,-.025),(0,.35,-.035),.003,bone,torso,.001)
    clips=clips_for(task,frames={'idle':8,'walk':12,'run':16,'death':14,'attack':10},fps={'idle':10,'walk':12,'run':20,'attack':14})
    s['animal_design']=json.dumps(dict(species='large brown cave bat',facing='-Y',wings='humerus, radius, three long articulated fingers and free thumb',gait='hovering, flight, fast flight; no ground walk',death='falls onto back with folded wings and ears'))
    for name,cfg in clips.items():
        span=cfg['frames'] if cfg['loop'] else cfg['frames']-1
        for j in range(span*4+1):
            frame=cfg['start']+j*.25;t=j/(span*4);p=math.tau*t;s.frame_set(int(frame),subframe=frame%1)
            dead=smooth((t-.10)/.80) if name=='death' else 0
            strike=curve(t,[(0,0),(.25,0),(.48,1),(.66,1),(1,0)]) if name=='attack' else 0
            cycles={'idle':1,'walk':2,'run':3}.get(name,2);amp={'idle':.65,'walk':.95,'run':1.05}.get(name,.80)
            phase=cycles*p;angle=amp*math.sin(phase)*(1-dead)+.10*dead
            fold=(.10+.45*(.5+.5*math.sin(phase)))*(1-dead)+dead
            root.location=(0,-.17*strike,.65+.014*math.cos(phase*2)-.07*strike-.56*dead);root.rotation_euler=(math.pi*dead,0,0)
            torso.rotation_euler=(.18 if name=='run' else .10 if name=='walk' else .04*strike,0,.025*math.sin(phase)*(1-dead))
            head.rotation_euler=(-.08 if name=='run' else 0,0,0)
            jaw.rotation_euler=(curve(t,[(0,0),(.25,.65),(.42,.65),(.55,.06),(.75,.06),(1,0)]) if name=='attack' else 0,0,0)
            for side,ear in ears:ear.rotation_euler=(-math.pi/2*dead,side*.10*(1-dead),0)
            ankles={}
            for wing in wings:
                side=wing['side'];pivot=wing['pivot'];pivot.rotation_euler=(0,-side*angle,0)
                points,bones=wing_points(side,fold)
                for o,(a,b) in zip(wing['segments'],bones):put(o,a,b)
                key=wing['membrane'].shape_key_add(name='Wing_%.2f'%frame)
                for k,(v,w) in enumerate(zip(key.data,weights)):
                    pt=sum((points[q]*a for q,a in enumerate(w)),Vector());pt.z+=.010*camber[k]*(1-.5*fold);v.co=pt
                for f,value in [(frame-.25,0),(frame,1),(frame+.25,0)]:key.value=value;key.keyframe_insert('value',frame=f)
                key.value=0
                wm=Matrix.Translation(pivot.location)@pivot.rotation_euler.to_matrix().to_4x4();ankles[side]=wm@points[15]
            for side,segments,claws in legs:
                hip=Vector((side*.055,.12,-.025));ankle=ankles[side];knee=hip.lerp(ankle,.52)+Vector((side*.015,0,.025))
                put(segments[0],hip,knee);put(segments[1],knee,ankle)
                for k,o in enumerate(claws):a=ankle+Vector(((k-1)*.010,0,0));put(o,a,a+Vector((0,-.020,-.013)))
            for o in controlled:
                for prop in ['location','rotation_euler','scale']:o.keyframe_insert(prop,frame=frame)
            root.keyframe_insert('location',frame=frame);root.keyframe_insert('rotation_euler',frame=frame)
            if name=='death':
                s.frame_set(int(frame),subframe=frame%1);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();low=100.
                for o in c.objects:
                    if o.type=='MESH':
                        ev=o.evaluated_get(dg);mesh=ev.to_mesh();low=min(low,min((ev.matrix_world@v.co).z for v in mesh.vertices));ev.to_mesh_clear()
                root.location.z+=max(0,.002-low);root.keyframe_insert('location',frame=frame)
    finish(ns,'cave_bat',clips,source_files=['validate_bat.py'],target=.57)

if __name__ in ['__main__','character_build']:build()
