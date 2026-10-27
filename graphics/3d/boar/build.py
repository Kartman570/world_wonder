"""Adult wild boar: front-heavy wedge, bristle mane, split hooves and curved tusks."""
from pathlib import Path
import sys,math,json,random
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
import bpy,bmesh
from mathutils import Vector,Matrix
from animal_studio import begin,clips_for,finish

def smooth(x):
    x=max(0,min(1,x));return x*x*(3-2*x)

def curve(t,keys):
    for (a,x),(b,y) in zip(keys,keys[1:]):
        if t<=b:return x+(y-x)*smooth((t-a)/(b-a))
    return keys[-1][1]

def leg_points(hip,toe,front):
    length=.18 if front else .20;delta=toe.y-hip.y
    angle=.34+1.1*delta if front else -.52+1.4*delta
    first=hip+Vector((0,length*math.sin(angle),-length*math.cos(angle)))
    a,b=(.22,.17) if front else (.22,.16)
    d=toe-first;distance=min(a+b-.00001,max(abs(a-b)+.00001,d.length));axis=d.normalized();end=first+axis*distance
    pole=Vector((0,-1 if front else 1,0));pole=(pole-axis*pole.dot(axis)).normalized();along=(a*a-b*b+distance*distance)/(2*distance)
    second=first+axis*along+pole*math.sqrt(max(0,a*a-along*along))
    return [hip,first,second,end]

def skin_points(points,front):
    profiles=[[.025,.085,.082,.065,.052],[.052,.047,.037,.031,.028],[.028,.025,.024,.023,.024]] if front else [[.025,.10,.10,.075,.055],[.055,.05,.04,.033,.027],[.027,.024,.023,.022,.024]]
    out=[]
    for k in range(3):
        for j in range(5):
            if k and j==0:continue
            u=j/4;p=points[k].lerp(points[k+1],u);axis=(points[k+1]-points[k]).normalized()
            if j==4 and k<2:axis=(axis+(points[k+2]-points[k+1]).normalized()).normalized()
            right=Vector((1,0,0));depth=axis.cross(right).normalized();r=profiles[k][j]
            for i in range(24):a=i*math.tau/24;out.append(p+right*(r*math.cos(a))+depth*(r*.90*math.sin(a)))
    return out

def build():
    ns,task=begin('boar');s=ns['s'];c=ns['c'];root=ns['root'];ell=ns['ell'];rod=ns['rod'];material=ns['material'];controlled=[]
    coat=material('Wild boar coarse dark coat',(.068,.052,.035),rough=.97,texture=160)
    nodes=coat.node_tree.nodes;links=coat.node_tree.links;coord=nodes.new('ShaderNodeTexCoord');sep=nodes.new('ShaderNodeSeparateXYZ');links.new(coord.outputs['Generated'],sep.inputs[0]);ramp=nodes.new('ShaderNodeValToRGB');ramp.label='FUR_HEIGHT'
    ramp.color_ramp.elements[0].color=(.035,.029,.023,1);ramp.color_ramp.elements[1].color=(.13,.105,.072,1);links.new(sep.outputs['Z'],ramp.inputs[0]);links.new(ramp.outputs[0],nodes.get('Principled BSDF').inputs['Base Color'])
    muzzle=material('Boar leathery muzzle',(.090,.066,.047),rough=.82,texture=130)
    nose=material('Boar nasal disk',(.045,.031,.026),rough=.61,texture=110)
    dark=material('Boar nostrils and mouth',(.008,.006,.005),rough=.72)
    eye=material('Boar small black eyes',(.003,.002,.001),rough=.20)
    ivory=material('Boar stained ivory tusks',(.39,.32,.20),rough=.62,texture=110)
    hoofmat=material('Boar hoof horn',(.025,.021,.017),rough=.66,texture=100)
    inner=material('Boar inner ear',(.10,.069,.054),rough=.96,texture=150)
    mane=material('Boar black mane',(.023,.021,.017),rough=.98)
    def empty(n,loc=(0,0,0),parent=root):
        o=bpy.data.objects.new(n,None);c.objects.link(o);o.parent=parent;o.location=loc;controlled.append(o);return o
    def E(n,p,scale,mat,parent):o=ell(n,p,scale,mat);o.parent=parent;return o
    def R(n,a,b,r,mat,parent,r2=None):o=rod(n,a,b,r,mat,r2=r2);o.parent=parent;return o
    def mesh(n,v,f,mat,parent):
        m=bpy.data.meshes.new(n);m.from_pydata(v,[],f);m.materials.append(mat);m.update();bm=bmesh.new();bm.from_mesh(m);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(m);bm.free();o=bpy.data.objects.new(n,m);c.objects.link(o);o.parent=parent
        for p in m.polygons:p.use_smooth=True
        return o
    def loft(n,sections,mat,parent):
        v=[];f=[];nring=40
        for y,z,w,d in sections:
            for k in range(nring):a=k*math.tau/nring;v.append((w*math.cos(a),y,z+d*math.sin(a)))
        f=[tuple(range(nring))]
        for j in range(len(sections)-1):
            for k in range(nring):a=j*nring+k;b=j*nring+(k+1)%nring;f.append((a,a+nring,b+nring,b))
        f.append(tuple(reversed(range((len(sections)-1)*nring,len(sections)*nring))));o=mesh(n,v,f,mat,parent);o.modifiers.new('Natural contours','SUBSURF').levels=2;return o
    torso=empty('BOAR torso')
    body=loft('BOAR body',[(-.60,.57,.09,.12),(-.50,.59,.22,.26),(-.30,.61,.27,.29),(-.05,.58,.28,.28),(.20,.56,.25,.25),(.43,.54,.21,.23),(.57,.53,.15,.19),(.63,.53,.025,.05)],coat,torso)
    neckbase=Vector((0,-.47,.59));neckaxis=Vector((0,-.22,-.055));neck=empty('BOAR neck',neckbase,torso);head=empty('BOAR head',neckaxis,neck)
    v=[];f=[];depth=neckaxis.normalized().cross(Vector((1,0,0)))
    for j in range(13):
        u=j/12;r=.21*(1-u)+.16*u
        for k in range(32):a=k*math.tau/32;v.append(neckaxis*u+Vector((r*math.cos(a),0,0))+depth*(r*.9*math.sin(a)))
    for j in range(12):
        for k in range(32):a=j*32+k;b=j*32+(k+1)%32;f.append((a,b,b+32,a+32))
    f.extend([tuple(reversed(range(32))),tuple(range(384,416))]);neckskin=mesh('BOAR neck skin',v,f,coat,neck);neckskin.modifiers.new('Neck contours','SUBSURF').levels=1
    skull=loft('BOAR skull',[(.14,.025,.15,.15),(.035,.015,.18,.16),(-.12,-.035,.145,.12),(-.27,-.080,.105,.082),(-.42,-.10,.072,.060),(-.46,-.10,.065,.05)],coat,head)
    E('BOAR nasal disk',(0,-.458,-.10),(.071,.018,.050),nose,head)
    for side in [-1,1]:
        E('BOAR nostril',(side*.031,-.473,-.097),(.014,.005,.010),dark,head)
        E('BOAR eye',(side*.153,-.095,.045),(.007,.012,.009),eye,head)
        E('BOAR brow',(side*.150,-.085,.061),(.019,.037,.012),coat,head)
        E('BOAR cheek shield',(side*.140,.008,-.048),(.047,.13,.10),coat,head)
    jaw=empty('BOAR jaw',(0,-.035,-.095),head);E('BOAR lower jaw',(0,-.17,-.028),(.105,.21,.045),muzzle,jaw)
    E('BOAR mouth seam',(0,-.23,.006),(.089,.17,.005),dark,jaw)
    tusks=[]
    for side in [-1,1]:
        points=[Vector((side*.105,-.23,-.007)),Vector((side*.143,-.25,.012)),Vector((side*.165,-.27,.055)),Vector((side*.163,-.30,.10)),Vector((side*.145,-.32,.13))]
        for k,(a,b) in enumerate(zip(points,points[1:])):tusks.append(R('BOAR lower tusk',a,b,[.018,.014,.010,.005][k],ivory,jaw,[.014,.010,.005,.0005][k]))
        points=[(side*.12,-.20,-.07),(side*.15,-.20,-.095),(side*.17,-.22,-.085)]
        for k,(a,b) in enumerate(zip(points,points[1:])):R('BOAR upper whetter',a,b,.015 if k==0 else .009,ivory,head,.009 if k==0 else .001)
    ears=[]
    for side in [-1,1]:
        ear=empty('BOAR ear '+str(side),(side*.12,.055,.12),head);ears.append((side,ear))
        front=[(0,-.02,.06),(-.055,0,0),(.050,0,0),(side*.10,.035,.19)];back=[(x,y+.014,z) for x,y,z in front];o=mesh('BOAR pointed pinna',front+back,[(0,1,2),(0,2,3),(0,3,1),(4,6,5),(4,7,6),(4,5,7),(1,5,6,2),(2,6,7,3),(3,7,5,1)],coat,ear);o.data.materials.append(inner)
        for p in o.data.polygons:
            if p.index<3:p.material_index=1
        bevel=o.modifiers.new('Soft ear rim','BEVEL');bevel.width=.003;bevel.segments=2
    headparts=[skull]+[o for o in head.children if o.name.startswith(('BOAR brow','BOAR cheek shield'))]
    bpy.ops.object.select_all(action='DESELECT')
    for o in headparts:o.select_set(True)
    bpy.context.view_layer.objects.active=skull;bpy.ops.object.convert(target='MESH');bpy.ops.object.join();skull=bpy.context.object
    rem=skull.modifiers.new('Continuous cheek shields','REMESH');rem.mode='VOXEL';rem.voxel_size=.005;bpy.ops.object.modifier_apply(modifier=rem.name);sm=skull.modifiers.new('Smooth cheek transitions','SMOOTH');sm.factor=.8;sm.iterations=4;bpy.ops.object.modifier_apply(modifier=sm.name)
    parts=[body,neckskin];bpy.ops.object.select_all(action='DESELECT')
    for o in parts:o.select_set(True)
    bpy.context.view_layer.objects.active=body;bpy.ops.object.convert(target='MESH');bpy.ops.object.join();body=bpy.context.object
    rem=body.modifiers.new('Continuous shoulder and neck','REMESH');rem.mode='VOXEL';rem.voxel_size=.010;bpy.ops.object.modifier_apply(modifier=rem.name);sm=body.modifiers.new('Muscle contours','SMOOTH');sm.factor=.7;sm.iterations=3;bpy.ops.object.modifier_apply(modifier=sm.name)
    rest=[v.co.copy() for v in body.data.vertices];axis=neckaxis.normalized();weights=[smooth(((p-neckbase).dot(axis)/neckaxis.length-.10)/.8) for p in rest];body.shape_key_add(name='Basis')
    tail=empty('BOAR tail',(0,.59,.59),torso);tailpoints=[(0,0,0),(0,.09,-.035),(.025,.17,-.09),(.035,.18,-.15)]
    for a,b in zip(tailpoints,tailpoints[1:]):R('BOAR straight tail',a,b,.012,coat,tail,.009)
    for k in range(9):R('BOAR tail tuft',tailpoints[-1],(.035+(k-4)*.003,.18,-.19),.0015,mane,tail,.0002)
    rng=random.Random(592)
    # The mane follows the actual dorsal surface, rather than forming a solid fin.
    bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();ev=body.evaluated_get(dg)
    for k in range(250):
        y=rng.uniform(-.45,.49);x=rng.uniform(-.075,.075);hit,p,n,i=ev.ray_cast(Vector((x,y,1.5)),Vector((0,0,-1)))
        if hit:R('BOAR dorsal bristle',p,p+Vector((rng.uniform(-.015,.015),.025,rng.uniform(.035,.085))),.0013,mane,torso,.00015)
    for k in range(120):
        y=rng.uniform(-.40,.48);side=rng.choice([-1,1]);hit,p,n,i=ev.ray_cast(Vector((side*.6,y,rng.uniform(.50,.70))),Vector((-side,0,0)))
        if hit:R('BOAR coarse guard hair',p,p+n*.022,.001,coat,torso,.00015)
    legmat=coat.copy();legmat.name='Boar limb coat';attr=legmat.node_tree.nodes.new('ShaderNodeAttribute');attr.attribute_name='FurHeight';legmat.node_tree.links.new(attr.outputs['Fac'],next(n for n in legmat.node_tree.nodes if n.label=='FUR_HEIGHT').inputs[0]);zlow=min(p.z for p in rest);zhigh=max(p.z for p in rest);limbs=[]
    for side in [-1,1]:
        for front in [True,False]:
            label='%s %s'%(side,'fore' if front else 'hind');hip=Vector((side*.16,-.35 if front else .37,.57 if front else .55));toe=Vector((side*.17,-.38 if front else .39,.085));points=leg_points(hip,toe,front);v=skin_points(points,front);rings=len(v)//24;f=[tuple(reversed(range(24)))]
            for j in range(rings-1):
                for k in range(24):a=j*24+k;b=j*24+(k+1)%24;f.append((a,b,b+24,a+24))
            f.append(tuple(range((rings-1)*24,rings*24)));o=mesh('BOAR leg '+label,v,f,legmat,root);o.modifiers.new('Smooth limb','SUBSURF').levels=1;attr=o.data.attributes.new('FurHeight','FLOAT','POINT');attr.data.foreach_set('value',[(p.z-zlow)/(zhigh-zlow) for p in v]);o.shape_key_add(name='Basis');joints=[empty('BOAR joint '+label+' '+str(k),p) for k,p in enumerate(points)];foot=empty('BOAR foot '+label)
            for half in [-1,1]:
                x=half*.020;verts=[(x+dx,y,z) for z,width,fronty,backy in [(-.077,.017,-.065,.030),(-.015,.013,-.042,.027)] for dx,y in [(-width,fronty),(width,fronty),(width,backy),(-width,backy)]]
                hoof=mesh('BOAR cloven hoof',verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],hoofmat,foot);bevel=hoof.modifiers.new('Worn hoof edges','BEVEL');bevel.width=.002;bevel.segments=2
                E('BOAR dewclaw',(half*.029,.038,-.031),(.012,.016,.015),hoofmat,foot)
            footpoints=[child.matrix_basis@v.co for child in foot.children if child.type=='MESH' for v in child.data.vertices];limbs.append(dict(side=side,front=front,mesh=o,joints=joints,foot=foot,points=footpoints))
    clips=clips_for(task,frames={'idle':8,'walk':12,'run':16,'death':14,'attack':12},fps={'idle':6,'run':18,'attack':12})
    s['animal_design']=json.dumps(dict(species='wild boar',anatomy='front-heavy muscular wedge, short cloven-hoof legs, long leathery snout, straight tufted tail',attack='short forward rush and upward tusk flick',gait='four-beat walk and two gallop cycles'))
    for name,cfg in clips.items():
        span=cfg['frames'] if cfg['loop'] else cfg['frames']-1
        for j in range(span*4+1):
            frame=cfg['start']+j*.25;t=j/(span*4);u=(t*(2 if name=='run' else 1))%1;p=math.tau*u;s.frame_set(int(frame),subframe=frame%1);fall=smooth((t-.12)/.75) if name=='death' else 0
            rush=curve(t,[(0,0),(.25,-.08),(.55,.36),(.70,.36),(1,0)]) if name=='attack' else 0;flick=curve(t,[(0,0),(.25,-.12),(.55,.32),(.70,.20),(1,0)]) if name=='attack' else 0;flight=0
            if name=='run':
                for a,b in [(.30,.42),(.82,.90)]:
                    if a<u<b:flight=.030*math.sin(math.pi*(u-a)/(b-a))
            root.location=(.56*math.sin(math.pi/2*fall)-.08*fall,-rush,flight);root.rotation_euler=(0,-math.pi/2*fall,0)
            torso.location=(0,0,(-.008+.008*math.cos(p) if name=='run' else -.003+.003*math.cos(2*p) if name=='walk' else 0));torso.rotation_euler=(.025*math.sin(p) if name=='run' else 0,0,.012*math.sin(p) if name=='walk' else 0);torso.scale=(1,1,1+.004*math.sin(p) if name=='idle' else 1)
            neck.rotation_euler=(.018*math.sin(p) if name=='idle' else -flick,0,-.25*fall);head.rotation_euler=(0,.25*fall,0);jaw.rotation_euler=(.04*max(0,flick)/.32,0,0)
            for side,ear in ears:ear.rotation_euler=(-.4*fall,0,side*.035*math.sin(p+side) if name=='idle' else 0)
            tail.rotation_euler=(0,.08*math.sin(p) if name=='idle' else 0,.08*math.sin(p) if name in ['walk','run'] else 0)
            key=body.shape_key_add(name='Neck_%.2f'%frame);q=neck.rotation_euler.to_quaternion();identity=Matrix.Identity(4).to_quaternion()
            for v,point,w in zip(key.data,rest,weights):v.co=neckbase+identity.slerp(q,w)@(point-neckbase) if w else point
            for f,value in [(frame-.25,0),(frame,1),(frame+.25,0)]:key.value=value;key.keyframe_insert('value',frame=f)
            key.value=0;tm=Matrix.Translation(torso.location)@torso.rotation_euler.to_matrix().to_4x4()@Matrix.Diagonal((*torso.scale,1))
            for limb in limbs:
                side,front=limb['side'],limb['front'];hip=tm@Vector((side*.16,-.35 if front else .37,.57 if front else .55));toe=Vector((side*.17,-.38 if front else .39,0));pitch=lift=0
                if name in ['walk','run']:
                    run=name=='run';offset=((.48 if side==-1 else .56) if front else (0 if side==-1 else .10)) if run else ((.25 if side==-1 else .75) if front else (0 if side==-1 else .5));phase=(u+offset)%1;stance=.30 if run else .68;stride=.12 if run else .08
                    if phase<stance:toe.y+=-stride+2*stride*phase/stance;pitch=.23*smooth((phase/stance-.65)/.35)
                    else:
                        phase=(phase-stance)/(1-stance);toe.y+=stride-2*stride*smooth(phase);lift=(.10 if run else .055)*math.sin(math.pi*phase);pitch=.23*(1-smooth(phase/.25))-.25*math.sin(math.pi*phase)
                elif name=='attack':toe.y+=(-.10 if front else .09)*math.sin(math.pi*t);lift=.07*max(0,math.sin(math.tau*t+(0 if front else math.pi)))
                elif name=='death':toe.y+=(-.04 if front else .04)*fall;lift=.18*fall
                rot=Matrix.Rotation(pitch,3,'X');toe.z=.004-min((rot@v).z for v in limb['points'])+lift;points=leg_points(hip,toe,front)
                for o,point in zip(limb['joints'],points):o.location=point
                limb['foot'].location=points[-1];limb['foot'].rotation_euler=(pitch,0,0);key=limb['mesh'].shape_key_add(name='Pose_%.2f'%frame)
                for v,point in zip(key.data,skin_points(points,front)):v.co=point
                for f,value in [(frame-.25,0),(frame,1),(frame+.25,0)]:key.value=value;key.keyframe_insert('value',frame=f)
                key.value=0
            for o in controlled:
                for prop in ['location','rotation_euler','scale']:o.keyframe_insert(prop,frame=frame)
            root.keyframe_insert('location',frame=frame);root.keyframe_insert('rotation_euler',frame=frame)
            if name=='death':
                s.frame_set(int(frame),subframe=frame%1);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();low=100
                for o in c.objects:
                    if o.type=='MESH' and not o.hide_render:
                        ev=o.evaluated_get(dg);m=ev.to_mesh();low=min(low,min((ev.matrix_world@v.co).z for v in m.vertices));ev.to_mesh_clear()
                root.location.z+=max(0,.002-low);root.keyframe_insert('location',frame=frame)
    finish(ns,'boar',clips,source_files=['validate_boar.py'],target=.54)

if __name__ in ['__main__','character_build']:build()
