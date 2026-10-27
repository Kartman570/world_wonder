"""Brown hare: long black-tipped ears, powerful hindquarters and paired bounds."""
from pathlib import Path
import sys,math,json,random
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
import bpy,bmesh
from mathutils import Vector,Matrix
from animal_studio import begin,clips_for,finish

def smooth(x):
    x=max(0,min(1,x));return x*x*(3-2*x)

def leg_path(hip,toe,front):
    a,b=(.14,.18) if front else (.17,.21);d=toe-hip;distance=max(abs(a-b)+.00001,min(a+b-.00001,d.length));axis=d.normalized();end=hip+axis*distance
    pole=Vector((0,1 if front else -1,0));pole=(pole-axis*pole.dot(axis)).normalized();along=(a*a-b*b+distance*distance)/(2*distance)
    return [hip,hip+axis*along+pole*math.sqrt(max(0,a*a-along*along)),end]

def leg_skin(points,front):
    radii=[[.013,.026,.024,.021,.018],[.018,.016,.014,.012,.013]] if front else [[.022,.060,.065,.045,.030],[.030,.027,.022,.018,.017]]
    out=[]
    for k in range(2):
        for j in range(5):
            if k and j==0:continue
            u=j/4;center=points[k].lerp(points[k+1],u);axis=(points[k+1]-points[k]).normalized()
            if j==4 and k==0:axis=(axis+(points[2]-points[1]).normalized()).normalized()
            right=Vector((1,0,0));depth=axis.cross(right).normalized();r=radii[k][j]
            for i in range(20):a=i*math.tau/20;out.append(center+right*(r*math.cos(a))+depth*(r*.90*math.sin(a)))
    return out

def build():
    ns,task=begin('hare');s=ns['s'];c=ns['c'];root=ns['root'];ell=ns['ell'];rod=ns['rod'];material=ns['material']
    coat=material('Hare agouti brown grey',(.18,.15,.10),rough=.93,texture=190)
    pale=material('Hare pale belly fur',(.31,.29,.23),rough=.97,texture=195)
    inner=material('Hare inner ear',(.25,.19,.16),rough=.91,texture=160)
    dark=material('Hare ear tips and tail',(.030,.025,.018),rough=.92,texture=170)
    nose=material('Hare nose and nails',(.045,.032,.024),rough=.66)
    eye=material('Hare dark brown eyes',(.009,.006,.003),rough=.22)
    amber=material('Hare eye surround',(.10,.070,.030),rough=.65)
    controlled=[]
    def empty(n,loc=(0,0,0),parent=root):
        o=bpy.data.objects.new(n,None);c.objects.link(o);o.parent=parent;o.location=loc;controlled.append(o);return o
    def E(n,p,scale,mat,parent):o=ell(n,p,scale,mat);o.parent=parent;return o
    def R(n,a,b,r,mat,parent,r2=None):o=rod(n,a,b,r,mat,r2=r2);o.parent=parent;return o
    def mesh(n,v,f,mats,parent):
        m=bpy.data.meshes.new(n);m.from_pydata(v,[],f);m.update()
        for mat in mats:m.materials.append(mat)
        bm=bmesh.new();bm.from_mesh(m);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(m);bm.free()
        o=bpy.data.objects.new(n,m);c.objects.link(o);o.parent=parent
        for poly in m.polygons:poly.use_smooth=True
        return o
    torso=empty('HARE torso')
    sections=[(-.24,.27,.045,.070),(-.18,.27,.080,.12),(-.05,.25,.10,.12),(.10,.28,.12,.145),(.24,.29,.13,.15),(.33,.27,.08,.10),(.36,.27,.01,.02)]
    v=[];f=[];n=40
    for y,z,w,d in sections:
        for i in range(n):a=i*math.tau/n;v.append((w*math.cos(a),y,z+d*math.sin(a)))
    f=[tuple(range(n))]
    for j in range(len(sections)-1):
        for i in range(n):a=j*n+i;b=j*n+(i+1)%n;f.append((a,a+n,b+n,b))
    f.append(tuple(reversed(range((len(sections)-1)*n,len(sections)*n))))
    body=mesh('HARE body',v,f,[coat,pale],torso)
    for poly in body.data.polygons:
        if poly.center.z<.20:poly.material_index=1
    body.modifiers.new('Smooth hare contours','SUBSURF').levels=2
    E('HARE neck',(0,-.215,.325),(.054,.085,.073),coat,torso)
    head=empty('HARE head',(0,-.265,.355),torso)
    E('HARE skull',(0,0,0),(.062,.067,.060),coat,head)
    E('HARE muzzle',(0,-.064,-.023),(.034,.053,.029),coat,head)
    for side in [-1,1]:E('HARE cheek',(side*.035,-.035,-.024),(.025,.035,.028),coat,head)
    E('HARE chin',(0,-.075,-.042),(.025,.036,.009),pale,head)
    E('HARE nose',(0,-.118,-.025),(.012,.008,.008),nose,head)
    R('HARE lip cleft',(0,-.126,-.030),(0,-.123,-.039),.0008,nose,head)
    for side in [-1,1]:
        E('HARE eye surround',(side*.055,-.025,.015),(.005,.012,.011),amber,head)
        E('HARE eye',(side*.057,-.028,.017),(.003,.010,.0085),eye,head)
        E('HARE upper eyelid',(side*.054,-.024,.025),(.004,.012,.0025),coat,head)
        for k in range(4):R('HARE whisker',(side*.024,-.090,-.025),(side*(.052+k*.006),-.110+k*.010,-.028+k*.006),.00045,coat,head,.0001)
    for parent,label,voxel in [(torso,'HARE body',.004),(head,'HARE skull',.0025)]:
        pieces=[o for o in parent.children if o.type=='MESH' and o.data.materials and o.data.materials[0]==coat and not o.name.startswith('HARE whisker')]
        bpy.ops.object.select_all(action='DESELECT')
        for o in pieces:o.select_set(True)
        bpy.context.view_layer.objects.active=bpy.data.objects[label];bpy.ops.object.convert(target='MESH');bpy.ops.object.join();o=bpy.context.object;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        rem=o.modifiers.new('Continuous hare anatomy','REMESH');rem.mode='VOXEL';rem.voxel_size=voxel;bpy.ops.object.modifier_apply(modifier=rem.name)
        sm=o.modifiers.new('Smooth fur surface','SMOOTH');sm.factor=.65;sm.iterations=3;bpy.ops.object.modifier_apply(modifier=sm.name)
        for poly in o.data.polygons:poly.use_smooth=True
        if parent==torso:body=o
    def ear_material(name,inside):
        mat=material(name,(.18,.15,.10),rough=.93,texture=160);nodes=mat.node_tree.nodes;links=mat.node_tree.links
        uv=nodes.new('ShaderNodeUVMap');uv.uv_map='EarUV';sep=nodes.new('ShaderNodeSeparateXYZ');links.new(uv.outputs['UV'],sep.inputs[0])
        sub=nodes.new('ShaderNodeMath');sub.operation='SUBTRACT';sub.inputs[1].default_value=.5;links.new(sep.outputs['X'],sub.inputs[0])
        absolute=nodes.new('ShaderNodeMath');absolute.operation='ABSOLUTE';links.new(sub.outputs[0],absolute.inputs[0])
        dist=nodes.new('ShaderNodeMath');dist.operation='MULTIPLY';dist.inputs[1].default_value=2;links.new(absolute.outputs[0],dist.inputs[0])
        strip=nodes.new('ShaderNodeValToRGB');strip.color_ramp.interpolation='EASE';strip.color_ramp.elements[0].position=.48;strip.color_ramp.elements[0].color=(.25,.19,.16,1) if inside else (.18,.15,.10,1);strip.color_ramp.elements[1].position=.76;strip.color_ramp.elements[1].color=(.18,.15,.10,1);links.new(dist.outputs[0],strip.inputs[0])
        noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=24;links.new(uv.outputs[0],noise.inputs['Vector'])
        jitter=nodes.new('ShaderNodeMath');jitter.operation='MULTIPLY_ADD';jitter.inputs[1].default_value=.045;jitter.inputs[2].default_value=-.0225;links.new(noise.outputs['Fac'],jitter.inputs[0])
        height=nodes.new('ShaderNodeMath');height.operation='ADD';links.new(sep.outputs['Y'],height.inputs[0]);links.new(jitter.outputs[0],height.inputs[1])
        tip=nodes.new('ShaderNodeValToRGB');tip.color_ramp.interpolation='EASE';tip.color_ramp.elements[0].position=.79;tip.color_ramp.elements[0].color=(0,0,0,1);tip.color_ramp.elements[1].position=.89;tip.color_ramp.elements[1].color=(1,1,1,1);links.new(height.outputs[0],tip.inputs[0])
        mix=nodes.new('ShaderNodeMixRGB');mix.inputs[2].default_value=(.030,.025,.018,1);links.new(tip.outputs[0],mix.inputs[0]);links.new(strip.outputs[0],mix.inputs[1]);links.new(mix.outputs[0],nodes.get('Principled BSDF').inputs['Base Color'])
        return mat
    ear_front=ear_material('Hare smooth inner ear colour',True);ear_back=ear_material('Hare smooth outer ear colour',False)
    ears=[]
    for side in [-1,1]:
        ear=empty('HARE ear '+str(side),(side*.043,.024,.048),head);ears.append((side,ear))
        ev=[];ef=[];rows=25;cols=9
        for back in [False,True]:
            for j in range(rows):
                u=j/(rows-1);width=.042*math.sin(math.pi*u)**.7+.012*(1-u)+.001
                for k in range(cols):
                    x=(k/(cols-1)*2-1)*width;cup=-.012*math.sin(math.pi*u)*(1-(x/width)**2)
                    ev.append((side*.030*u+x,.016*u+(.004 if back else cup),.23*u))
        count=rows*cols
        for back in [0,1]:
            for j in range(rows-1):
                for k in range(cols-1):a=back*count+j*cols+k;ef.append((a,a+1,a+1+cols,a+cols))
        boundary=list(range(cols))+[j*cols+cols-1 for j in range(1,rows)]+list(reversed(range((rows-1)*cols,(rows-1)*cols+cols-1)))+[j*cols for j in range(rows-2,0,-1)]
        for a,b in zip(boundary,boundary[1:]+boundary[:1]):ef.append((a,b,b+count,a+count))
        o=mesh('HARE long black tipped ear',ev,ef,[ear_front,ear_back],ear)
        uv=o.data.uv_layers.new(name='EarUV')
        for loop in o.data.loops:
            index=loop.vertex_index%count;uv.data[loop.index].uv=((index%cols)/(cols-1),(index//cols)/(rows-1))
        for poly in o.data.polygons:
            poly.material_index=0 if poly.index<(rows-1)*(cols-1) else 1
        o.modifiers.new('Soft pinna contours','SUBSURF').levels=1
        for j in range(12):
            u=.08+j*.075;width=.042*math.sin(math.pi*u)**.7+.012*(1-u)+.001
            for edge in [-1,1]:
                p=Vector((side*.030*u+edge*width,.016*u,.23*u));R('HARE ear margin fur',p,p+Vector((edge*.003,0,.003)),.00045,dark if u>.82 else coat,ear,.0001)
    tail=empty('HARE tail',(0,.345,.28),torso)
    E('HARE dark tail back',(0,.028,-.010),(.037,.061,.033),dark,tail)
    E('HARE white tail underside',(0,.029,-.033),(.032,.050,.014),pale,tail)
    rng=random.Random(291);bpy.context.view_layer.update();ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get());surface=ev.to_mesh();surface.calc_loop_triangles()
    triangles=[([surface.vertices[k].co.copy() for k in tri.vertices],tri.normal.copy(),tri.area) for tri in surface.loop_triangles];ev.to_mesh_clear()
    for points,normal,area in rng.choices(triangles,weights=[t[2] for t in triangles],k=120):
        u=math.sqrt(rng.random());w=rng.random();p=points[0]*(1-u)+points[1]*(u*(1-w))+points[2]*(u*w);R('HARE short agouti fur',p,p+normal*rng.uniform(.004,.008),.00065,coat,torso,.00015)
    limbs=[]
    for side in [-1,1]:
        for front in [True,False]:
            label='%s %s'%(side,'fore' if front else 'hind');hip=Vector((side*(.058 if front else .085),-.17 if front else .20,.29 if front else .31));toe=Vector((side*(.055 if front else .09),-.24 if front else .20,.045 if front else .057));points=leg_path(hip,toe,front);verts=leg_skin(points,front);faces=[tuple(reversed(range(20)))];rings=len(verts)//20
            for j in range(rings-1):
                for k in range(20):a=j*20+k;b=j*20+(k+1)%20;faces.append((a,b,b+20,a+20))
            faces.append(tuple(range((rings-1)*20,rings*20)))
            o=mesh('HARE leg '+label,verts,faces,[coat],root);o.shape_key_add(name='Basis')
            joints=[empty('HARE joint '+label+' '+str(k),p) for k,p in enumerate(points)]
            paw=empty('HARE paw '+label)
            E('HARE long hind paw' if not front else 'HARE forepaw',(0,-.023 if front else -.070,-.020),(.024,.048,.021) if front else (.035,.105,.035),coat,paw)
            if front:E('HARE fore pastern',(0,0,-.003),(.014,.018,.019),coat,paw)
            for k in range(3):
                x=(k-1)*(.009 if front else .012);y=-.063 if front else -.164
                R('HARE short nail',(x,y,-.018),(x,y-.007,-.020),.0018,nose,paw,.0005)
            paw_points=[child.matrix_basis@v.co for child in paw.children if child.type=='MESH' for v in child.data.vertices]
            limbs.append(dict(side=side,front=front,mesh=o,joints=joints,paw=paw,points=paw_points))
    clips=clips_for(task,frames={'idle':8,'walk':12,'run':16,'death':12},fps={'idle':6,'run':18})
    s['animal_design']=json.dumps(dict(species='brown hare',facing='-Y',ears='long with black tips',gait='paired hind propulsion, forelimb landing; two bounds per run clip',feet='long hind metatarsal feet rolling onto toes',death='settles on side; ears fold'))
    for name,cfg in clips.items():
        span=cfg['frames'] if cfg['loop'] else cfg['frames']-1
        for j in range(span*4+1):
            frame=cfg['start']+j*.25;t=j/(span*4);u=(t*(2 if name=='run' else 1))%1;p=math.tau*u;s.frame_set(int(frame),subframe=frame%1)
            fall=smooth((t-.10)/.80) if name=='death' else 0
            flight=0.
            if name in ['walk','run']:
                intervals=[(.24,.44,.12),(.66,.975,.07)] if name=='run' else [(.40,.44,.015),(.83,.985,.010)]
                for a,b,height in intervals:
                    if a<u<b:flight=height*math.sin(math.pi*(u-a)/(b-a))
            root.location=(.27*math.sin(math.pi/2*fall)-.035*fall,0,flight);root.rotation_euler=(0,-math.pi/2*fall,0)
            torso.location=(0,0,(-.010+.015*math.cos(p)) if name=='run' else -.004+.005*math.cos(p) if name=='walk' else 0)
            torso.rotation_euler=(.12*math.sin(p) if name=='run' else .025*math.sin(p) if name=='walk' else 0,0,0);torso.scale=(1,1,1+.004*math.sin(p) if name=='idle' else 1)
            head.location=(-.050*fall,-.265,.355);head.rotation_euler=(.04*math.sin(p) if name=='idle' else -.08 if name=='run' else 0,.60*fall,.04*math.sin(p) if name=='idle' else 0)
            for side,ear in ears:ear.rotation_euler=(-1.15*fall+(-1.0 if name=='run' else -.12)*(1-fall),side*.06*math.sin(p+side)*(1-fall),side*.10*math.sin(p+side)*(1-fall))
            tail.rotation_euler=(.20 if name=='run' else 0,0,0)
            tm=Matrix.Translation(torso.location)@torso.rotation_euler.to_matrix().to_4x4()@Matrix.Diagonal((*torso.scale,1))
            for limb in limbs:
                side,front=limb['side'],limb['front'];hip=tm@Vector((side*(.058 if front else .085),-.17 if front else .20,.29 if front else .31));toe=Vector((side*(.055 if front else .09),-.24 if front else .20,0));pitch=0;lift=0
                if name in ['walk','run']:
                    run=name=='run';offset=(.52 if side==-1 else .56) if front else (0 if side==-1 else .025 if run else .015)
                    phase=(u+offset)%1;stance=(.18 if front else .24) if run else (.35 if front else .40);stride=(.12 if front else .21) if run else (.065 if front else .10)
                    if phase<stance:
                        toe.y+=-stride+2*stride*phase/stance
                        if not front:pitch=(.60 if run else .25)*smooth((phase/stance-.60)/.40)
                    else:
                        q=(phase-stance)/(1-stance);toe.y+=stride-2*stride*smooth(q);lift=(.12 if front else .16)*math.sin(math.pi*q)*(1 if run else .45)
                        pitch=-.40*math.sin(math.pi*q) if front else (.60 if run else .25)*(1-smooth(q/.25))-.30*math.sin(math.pi*q)
                rotation=Matrix.Rotation(pitch,3,'X');toe.z=.002-min((rotation@v).z for v in limb['points'])+lift+(.07*fall)
                if name=='death':toe.y+=(-.01 if front else -.06)*fall
                points=leg_path(hip,toe,front)
                for o,point in zip(limb['joints'],points):o.location=point
                limb['paw'].location=points[-1];limb['paw'].rotation_euler=(pitch,0,0)
                key=limb['mesh'].shape_key_add(name='Pose_%.2f'%frame)
                for v,point in zip(key.data,leg_skin(points,front)):v.co=point
                for f,value in [(frame-.25,0),(frame,1),(frame+.25,0)]:key.value=value;key.keyframe_insert('value',frame=f)
                key.value=0
            for o in controlled:
                for prop in ['location','rotation_euler','scale']:o.keyframe_insert(prop,frame=frame)
            root.keyframe_insert('location',frame=frame);root.keyframe_insert('rotation_euler',frame=frame)
            if name=='death':
                s.frame_set(int(frame),subframe=frame%1);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();low=100.
                for o in c.objects:
                    if o.type=='MESH':
                        ev=o.evaluated_get(dg);m=ev.to_mesh();low=min(low,min((ev.matrix_world@v.co).z for v in m.vertices));ev.to_mesh_clear()
                root.location.z+=max(0,.002-low);root.keyframe_insert('location',frame=frame)
    finish(ns,'hare',clips,source_files=['validate_hare.py'],target=.34)

if __name__ in ['__main__','character_build']:build()
