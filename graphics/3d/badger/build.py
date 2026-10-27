"""European badger: low grizzled body, striped wedge face and five digging toes."""
from pathlib import Path
import sys,math,json,random
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
import bpy,bmesh
from mathutils import Vector,Matrix
from animal_studio import begin,clips_for,finish

def smooth(x):
    x=max(0,min(1,x));return x*x*(3-2*x)

def leg_points(hip,toe,front):
    a,b=(.13,.16) if front else (.12,.15);d=toe-hip;distance=min(a+b-.00001,max(abs(a-b)+.00001,d.length));axis=d.normalized();end=hip+axis*distance
    pole=Vector((0,1 if front else -1,0));pole=(pole-axis*pole.dot(axis)).normalized();along=(a*a-b*b+distance*distance)/(2*distance)
    return [hip,hip+axis*along+pole*math.sqrt(max(0,a*a-along*along)),end]

def skin_points(points,front):
    radii=[[.012,.045,.045,.036,.028],[.028,.027,.024,.021,.020]] if front else [[.012,.050,.050,.037,.028],[.028,.027,.024,.021,.020]]
    v=[]
    for k in range(2):
        for j in range(5):
            if k and j==0:continue
            u=j/4;p=points[k].lerp(points[k+1],u);axis=(points[k+1]-points[k]).normalized()
            if k==0 and j==4:axis=(axis+(points[2]-points[1]).normalized()).normalized()
            right=Vector((1,0,0));depth=axis.cross(right).normalized();r=radii[k][j]
            for i in range(24):a=i*math.tau/24;v.append(p+right*(r*math.cos(a))+depth*(r*.95*math.sin(a)))
    return v

def build():
    ns,task=begin('badger');s=ns['s'];c=ns['c'];root=ns['root'];ell=ns['ell'];rod=ns['rod'];material=ns['material'];controlled=[]
    coat=material('Badger grizzled coat',(.18,.18,.16),rough=.97,texture=190)
    nodes=coat.node_tree.nodes;links=coat.node_tree.links;coord=nodes.new('ShaderNodeTexCoord');sep=nodes.new('ShaderNodeSeparateXYZ');links.new(coord.outputs['Generated'],sep.inputs[0]);ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.15;ramp.color_ramp.elements[0].color=(.025,.024,.021,1);ramp.color_ramp.elements[1].position=.80;ramp.color_ramp.elements[1].color=(.23,.23,.20,1)
    links.new(sep.outputs['Z'],ramp.inputs[0]);noise=next(n for n in nodes if n.bl_idname=='ShaderNodeTexNoise');contrast=nodes.new('ShaderNodeMapRange');contrast.inputs['To Min'].default_value=.65;contrast.inputs['To Max'].default_value=1.2;links.new(noise.outputs['Fac'],contrast.inputs['Value']);mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;links.new(ramp.outputs[0],mix.inputs[1]);links.new(contrast.outputs[0],mix.inputs[2]);links.new(mix.outputs[0],nodes.get('Principled BSDF').inputs['Base Color'])
    black=material('Badger black leg fur',(.022,.021,.018),rough=.96,texture=180)
    pale=material('Badger ivory face fur',(.38,.36,.29),rough=.97,texture=180)
    nose=material('Badger black nose and pads',(.010,.009,.008),rough=.55,texture=135)
    eye=material('Badger dark eyes',(.002,.002,.0015),rough=.18)
    claw=material('Badger digging claws',(.25,.23,.17),rough=.70,texture=110)
    headmat=pale.copy();headmat.name='Badger longitudinal facial bands';nodes=headmat.node_tree.nodes;links=headmat.node_tree.links;uv=nodes.new('ShaderNodeUVMap');uv.uv_map='HeadUV';sep=nodes.new('ShaderNodeSeparateXYZ');links.new(uv.outputs[0],sep.inputs[0]);ramp=nodes.new('ShaderNodeValToRGB');ramp.label='FACIAL_BANDS';ramp.color_ramp.interpolation='EASE'
    stops=[(0,(.38,.36,.29)),(.005,(.38,.36,.29)),(.020,(.015,.014,.012)),(.17,(.015,.014,.012)),(.195,(.38,.36,.29)),(.305,(.38,.36,.29)),(.33,(.015,.014,.012)),(.48,(.015,.014,.012)),(.495,(.38,.36,.29)),(1,(.38,.36,.29))]
    for i,(pos,col) in enumerate(stops):
        e=ramp.color_ramp.elements[i] if i<2 else ramp.color_ramp.elements.new(pos);e.position=pos;e.color=(*col,1)
    links.new(sep.outputs['X'],ramp.inputs[0]);links.new(ramp.outputs[0],nodes.get('Principled BSDF').inputs['Base Color'])
    def empty(n,loc=(0,0,0),parent=root):
        o=bpy.data.objects.new(n,None);c.objects.link(o);o.parent=parent;o.location=loc;controlled.append(o);return o
    def E(n,p,scale,mat,parent):o=ell(n,p,scale,mat);o.parent=parent;return o
    def R(n,a,b,r,mat,parent,r2=None):o=rod(n,a,b,r,mat,r2=r2);o.parent=parent;return o
    def mesh(n,v,f,mat,parent):
        m=bpy.data.meshes.new(n);m.from_pydata(v,[],f);m.update();m.materials.append(mat);bm=bmesh.new();bm.from_mesh(m);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(m);bm.free();o=bpy.data.objects.new(n,m);c.objects.link(o);o.parent=parent
        for poly in m.polygons:poly.use_smooth=True
        return o
    def loft(n,sections,mat,parent,face=False):
        v=[];f=[];cols=40
        for y,z,w,d in sections:
            for k in range(cols):a=k*math.tau/cols;v.append((w*math.cos(a),y,z+d*math.sin(a)))
        f=[tuple(reversed(range(cols)))]
        for j in range(len(sections)-1):
            for k in range(cols):a=j*cols+k;b=j*cols+(k+1)%cols;f.append((a,b,b+cols,a+cols))
        f.append(tuple(range((len(sections)-1)*cols,len(sections)*cols)));o=mesh(n,v,f,mat,parent);o.modifiers.new('Soft fur contours','SUBSURF').levels=2
        if face:
            uv=o.data.uv_layers.new(name='HeadUV')
            for poly in o.data.polygons:
                us=[(i%cols)/cols for i in poly.vertices];seam=max(us)-min(us)>.5
                for loop,index,u in zip(poly.loop_indices,poly.vertices,us):uv.data[loop].uv=(1 if seam and u==0 else u,(index//cols)/(len(sections)-1))
        return o
    torso=empty('BADGER torso')
    body=loft('BADGER body',[(-.35,.23,.05,.06),(-.28,.24,.13,.12),(-.12,.23,.16,.13),(.08,.24,.18,.14),(.26,.25,.17,.15),(.37,.24,.12,.12),(.42,.23,.02,.04)],coat,torso)
    base=Vector((0,-.28,.25));axis=Vector((0,-.13,-.02));neck=empty('BADGER neck',base,torso);head=empty('BADGER head',axis,neck);depth=axis.normalized().cross(Vector((1,0,0)));v=[];f=[]
    for j in range(13):
        u=j/12;r=.11*(1-u)+.075*u
        for k in range(32):a=k*math.tau/32;v.append(axis*u+Vector((r*math.cos(a),0,0))+depth*(r*.9*math.sin(a)))
    for j in range(12):
        for k in range(32):a=j*32+k;b=j*32+(k+1)%32;f.append((a,b,b+32,a+32))
    f.extend([tuple(reversed(range(32))),tuple(range(384,416))]);neckskin=mesh('BADGER neck skin',v,f,coat,neck)
    skull=loft('BADGER skull',[(.06,.01,.065,.06),(0,0,.095,.075),(-.08,-.01,.075,.055),(-.18,-.025,.045,.030),(-.24,-.027,.020,.015)],headmat,head,True)
    E('BADGER nose',(0,-.24,-.027),(.027,.015,.018),nose,head)
    E('BADGER lower jaw',(0,-.10,-.055),(.060,.11,.018),pale,head)
    ears=[]
    for side in [-1,1]:
        bpy.context.view_layer.update();ev=skull.evaluated_get(bpy.context.evaluated_depsgraph_get());found,near,normal,index=ev.closest_point_on_mesh(Vector((side*.075,-.035,.035)));assert found
        o=E('BADGER eye',near+normal*.0008,(.0025,.008,.006),eye,head);o.rotation_euler=normal.to_track_quat('X','Z').to_euler()
        E('BADGER nostril',(side*.014,-.253,-.024),(.006,.003,.004),eye,head)
        ear=empty('BADGER ear '+str(side),(side*.068,.025,.045),head);ears.append((side,ear));E('BADGER rounded ear',(0,0,.025),(.028,.015,.038),pale,ear);E('BADGER ear center',(0,-.012,.026),(.020,.004,.029),black,ear)
    bpy.ops.object.select_all(action='DESELECT');body.select_set(True);neckskin.select_set(True);bpy.context.view_layer.objects.active=body;bpy.ops.object.convert(target='MESH');bpy.ops.object.join();body=bpy.context.object
    rem=body.modifiers.new('Continuous low shoulder and neck','REMESH');rem.mode='VOXEL';rem.voxel_size=.006;bpy.ops.object.modifier_apply(modifier=rem.name);sm=body.modifiers.new('Muscular contours','SMOOTH');sm.factor=.7;sm.iterations=3;bpy.ops.object.modifier_apply(modifier=sm.name)
    rest=[v.co.copy() for v in body.data.vertices];direction=axis.normalized();weights=[smooth(((p-base).dot(direction)/axis.length-.05)/.8) for p in rest];body.shape_key_add(name='Basis')
    tail=empty('BADGER tail',(0,.39,.25),torso);o=E('BADGER short tail',(0,.065,-.025),(.038,.095,.035),coat,tail);o.rotation_euler.x=-.2
    rng=random.Random(756);bpy.context.view_layer.update();ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get());m=ev.to_mesh();m.calc_loop_triangles();triangles=[([m.vertices[k].co.copy() for k in tri.vertices],tri.normal.copy(),tri.area) for tri in m.loop_triangles if (sum((m.vertices[k].co for k in tri.vertices),Vector())/3-base).dot(direction)/axis.length<.04];ev.to_mesh_clear()
    for points,normal,area in rng.choices(triangles,weights=[t[2] for t in triangles],k=200):
        u=math.sqrt(rng.random());q=rng.random();p=points[0]*(1-u)+points[1]*(u*(1-q))+points[2]*(u*q);R('BADGER stiff guard hair',p,p+normal*rng.uniform(.008,.018),.0008,coat,torso,.00015)
    limbs=[]
    for side in [-1,1]:
        for front in [True,False]:
            label='%s %s'%(side,'fore' if front else 'hind');hip=Vector((side*.105,-.20 if front else .25,.28 if front else .27));toe=Vector((side*.11,-.22 if front else .26,.055));points=leg_points(hip,toe,front);v=skin_points(points,front);rings=len(v)//24;f=[tuple(reversed(range(24)))]
            for j in range(rings-1):
                for k in range(24):a=j*24+k;b=j*24+(k+1)%24;f.append((a,b,b+24,a+24))
            f.append(tuple(range((rings-1)*24,rings*24)));o=mesh('BADGER leg '+label,v,f,black,root);o.modifiers.new('Soft limb contours','SUBSURF').levels=1;o.shape_key_add(name='Basis');joints=[empty('BADGER joint '+label+' '+str(k),p) for k,p in enumerate(points)];paw=empty('BADGER paw '+label)
            E('BADGER broad paw',(0,-.010,-.028),(.042,.056,.024),black,paw);E('BADGER pastern',(0,.010,-.005),(.026,.030,.033),black,paw);E('BADGER sole',(0,-.005,-.048),(.034,.040,.006),nose,paw)
            for k,x in enumerate([-.028,-.014,0,.014,.028]):
                y=-.045 if k in [0,4] else -.058;E('BADGER toe',(x,y,-.029),(.011,.025,.020),black,paw);R('BADGER digging claw',(x,y-.020,-.022),(x,y-(.050 if front else .034),-.035),.003,claw,paw,.0005)
            points=[child.matrix_basis@v.co for child in paw.children if child.type=='MESH' for v in child.data.vertices];limbs.append(dict(side=side,front=front,mesh=o,joints=joints,paw=paw,points=points))
    clips=clips_for(task,frames={'idle':8,'walk':12,'run':16,'death':14},fps={'idle':6,'run':18})
    s['animal_design']=json.dumps(dict(species='European badger',face='white central blaze and two longitudinal black eye bands',body='low broad grizzled back and black underside',feet='five plantigrade digging toes, long fore claws',gait='waddling four-beat walk and low bounding gallop'))
    for name,cfg in clips.items():
        span=cfg['frames'] if cfg['loop'] else cfg['frames']-1
        for j in range(span*4+1):
            f=cfg['start']+j*.25;t=j/(span*4);u=(t*(2 if name=='run' else 1))%1;p=math.tau*u;s.frame_set(int(f),subframe=f%1);fall=smooth((t-.12)/.75) if name=='death' else 0;flight=0
            if name=='run':
                for a,b in [(.30,.44),(.82,.90)]:
                    if a<u<b:flight=.018*math.sin(math.pi*(u-a)/(b-a))
            root.location=(.24*math.sin(math.pi/2*fall)-.04*fall,0,flight);root.rotation_euler=(0,-math.pi/2*fall,0)
            torso.location=(0,0,-.004+.004*math.cos(p) if name in ['walk','run'] else 0);torso.rotation_euler=(.018*math.sin(p) if name=='run' else 0,.025*math.sin(p) if name=='walk' else 0,0);torso.scale=(1,1,1+.004*math.sin(p) if name=='idle' else 1)
            neck.rotation_euler=(.025*math.sin(p) if name=='idle' else 0,0,-.30*fall);head.rotation_euler=(0,.5*fall,0);tail.rotation_euler=(0,0,.04*math.sin(p)*(1-fall))
            for side,ear in ears:ear.rotation_euler=(-.4*fall,0,side*.04*math.sin(p+side) if name=='idle' else 0)
            key=body.shape_key_add(name='Neck_%.2f'%f);q=neck.rotation_euler.to_quaternion();identity=Matrix.Identity(4).to_quaternion()
            for v,point,w in zip(key.data,rest,weights):v.co=base+identity.slerp(q,w)@(point-base) if w else point
            for frame,value in [(f-.25,0),(f,1),(f+.25,0)]:key.value=value;key.keyframe_insert('value',frame=frame)
            key.value=0;tm=Matrix.Translation(torso.location)@torso.rotation_euler.to_matrix().to_4x4()@Matrix.Diagonal((*torso.scale,1))
            for limb in limbs:
                side,front=limb['side'],limb['front'];hip=tm@Vector((side*.105,-.20 if front else .25,.28 if front else .27));toe=Vector((side*.11,-.22 if front else .26,0));pitch=lift=0
                if name in ['walk','run']:
                    run=name=='run';offset=((.48 if side==-1 else .56) if front else (0 if side==-1 else .10)) if run else ((.25 if side==-1 else .75) if front else (0 if side==-1 else .5));phase=(u+offset)%1;stance=.30 if run else .68;stride=.10 if run else .065
                    if phase<stance:toe.y+=-stride+2*stride*phase/stance
                    else:
                        q=(phase-stance)/(1-stance);toe.y+=stride-2*stride*smooth(q);lift=(.065 if run else .035)*math.sin(math.pi*q);pitch=-.25*math.sin(math.pi*q)
                elif name=='death':toe.y+=(-.025 if front else .025)*fall;lift=.08*fall
                rotation=Matrix.Rotation(pitch,3,'X');toe.z=.002-min((rotation@v).z for v in limb['points'])+lift;points=leg_points(hip,toe,front)
                for o,point in zip(limb['joints'],points):o.location=point
                limb['paw'].location=points[-1];limb['paw'].rotation_euler=(pitch,0,0);key=limb['mesh'].shape_key_add(name='Pose_%.2f'%f)
                for v,point in zip(key.data,skin_points(points,front)):v.co=point
                for frame,value in [(f-.25,0),(f,1),(f+.25,0)]:key.value=value;key.keyframe_insert('value',frame=frame)
                key.value=0
            for o in controlled:
                for prop in ['location','rotation_euler','scale']:o.keyframe_insert(prop,frame=f)
            root.keyframe_insert('location',frame=f);root.keyframe_insert('rotation_euler',frame=f)
            if name=='death':
                s.frame_set(int(f),subframe=f%1);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();low=100
                for o in c.objects:
                    if o.type=='MESH':
                        ev=o.evaluated_get(dg);m=ev.to_mesh();low=min(low,min((ev.matrix_world@v.co).z for v in m.vertices));ev.to_mesh_clear()
                root.location.z+=max(0,.002-low);root.keyframe_insert('location',frame=f)
    finish(ns,'badger',clips,source_files=['validate_badger.py'],target=.28)

if __name__ in ['__main__','character_build']:build()
