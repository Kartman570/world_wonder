"""Red fox: fine muzzle, large ears, black stockings and a white-tipped brush."""
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

def leg_path(hip,toe,front):
    delta=toe.y-hip.y;length=.25 if front else .24;angle=.20+.9*delta if front else -.40+1.3*delta
    first=hip+Vector((0,length*math.sin(angle),-length*math.cos(angle)));a,b=(.26,.18) if front else (.28,.18)
    d=toe-first;distance=max(abs(a-b)+.00001,min(a+b-.00001,d.length));axis=d.normalized();end=first+axis*distance
    pole=Vector((0,-1 if front else 1,0));pole=(pole-axis*pole.dot(axis)).normalized();along=(a*a-b*b+distance*distance)/(2*distance)
    return [hip,first,first+axis*along+pole*math.sqrt(max(0,a*a-along*along)),end]

def leg_skin(points,front):
    radii=[[.010,.040,.040,.030,.025],[.025,.024,.020,.017,.018],[.018,.016,.014,.014,.018]] if front else [[.012,.060,.065,.050,.036],[.036,.034,.027,.023,.022],[.022,.019,.016,.016,.018]]
    out=[]
    for k in range(3):
        for j in range(5):
            if k and j==0:continue
            u=j/4;center=points[k].lerp(points[k+1],u);axis=(points[k+1]-points[k]).normalized()
            if j==4 and k<2:axis=(axis+(points[k+2]-points[k+1]).normalized()).normalized()
            right=Vector((1,0,0));depth=axis.cross(right).normalized();r=radii[k][j]
            for i in range(20):a=i*math.tau/20;out.append(center+right*(r*math.cos(a))+depth*(r*.92*math.sin(a)))
    return out

def build():
    ns,task=begin('fox');s=ns['s'];c=ns['c'];root=ns['root'];ell=ns['ell'];rod=ns['rod'];material=ns['material']
    def fur_material(name,axis='Z',tail=False):
        m=material(name,(.15,.16,.14),rough=.92,texture=170);nodes=m.node_tree.nodes;links=m.node_tree.links
        coords=nodes.new('ShaderNodeTexCoord');sep=nodes.new('ShaderNodeSeparateXYZ');links.new(coords.outputs['Generated'],sep.inputs[0])
        ramp=nodes.new('ShaderNodeValToRGB');ramp.label='FUR_BASE_HEIGHT';ramp.color_ramp.interpolation='EASE'
        stops=[(0,(.30,.075,.018)),(.62,(.37,.11,.023)),(.75,(.45,.41,.31)),(1,(.48,.44,.35))] if tail else [(0,(.36,.32,.24)),(.28,(.35,.30,.22)),(.46,(.40,.13,.030)),(.80,(.32,.085,.018)),(1,(.25,.065,.014))]
        for e in list(ramp.color_ramp.elements)[1:]:ramp.color_ramp.elements.remove(e)
        for i,(pos,col) in enumerate(stops):
            e=ramp.color_ramp.elements[0] if i==0 else ramp.color_ramp.elements.new(pos);e.position=pos;e.color=(*col,1)
        links.new(sep.outputs[axis],ramp.inputs[0]);noise=next(n for n in nodes if n.bl_idname=='ShaderNodeTexNoise');contrast=nodes.new('ShaderNodeMapRange');contrast.inputs['To Min'].default_value=.74;contrast.inputs['To Max'].default_value=1.12;links.new(noise.outputs['Fac'],contrast.inputs['Value'])
        mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;links.new(ramp.outputs[0],mix.inputs[1]);links.new(contrast.outputs[0],mix.inputs[2])
        patches=nodes.new('ShaderNodeTexNoise');patches.inputs['Scale'].default_value=12;patches.inputs['Detail'].default_value=3;links.new(coords.outputs['Generated'],patches.inputs['Vector'])
        patch_range=nodes.new('ShaderNodeMapRange');patch_range.inputs['To Min'].default_value=.78;patch_range.inputs['To Max'].default_value=1.12;links.new(patches.outputs['Fac'],patch_range.inputs['Value'])
        final=nodes.new('ShaderNodeMixRGB');final.blend_type='MULTIPLY';final.inputs[0].default_value=1;links.new(mix.outputs[0],final.inputs[1]);links.new(patch_range.outputs[0],final.inputs[2]);links.new(final.outputs[0],nodes.get('Principled BSDF').inputs['Base Color']);return m
    coat=fur_material('Fox rusty red coat');tail_mat=fur_material('Fox white tipped tail','Y',True)
    pale=material('Fox cream throat',(.38,.34,.26),rough=.94,texture=175)
    pawmat=material('Fox black paw fur',(.025,.020,.016),rough=.95,texture=180)
    nose=material('Fox nose and pads',(.020,.021,.018),rough=.53,texture=125)
    eye=material('Fox dark pupil',(.003,.003,.002),rough=.21)
    amber=material('Fox subdued amber iris',(.19,.14,.045),rough=.38)
    tooth=material('Fox worn ivory teeth',(.42,.39,.30),rough=.60)
    mouth=material('Fox oral tissue',(.050,.020,.017),rough=.78)
    tongue=material('Fox tongue',(.10,.035,.025),rough=.75)
    inner=material('Fox ear interior',(.20,.15,.10),rough=.92,texture=170)
    controlled=[]
    def empty(n,loc=(0,0,0),parent=root):
        o=bpy.data.objects.new(n,None);c.objects.link(o);o.parent=parent;o.location=loc;controlled.append(o);return o
    def E(n,p,size,mat,parent):o=ell(n,p,size,mat);o.parent=parent;return o
    def R(n,a,b,r,mat,parent,r2=None):o=rod(n,a,b,r,mat,r2=r2);o.parent=parent;return o
    def mesh(n,v,f,mat,parent):
        m=bpy.data.meshes.new(n);m.from_pydata(v,[],f);m.update();m.materials.append(mat);bm=bmesh.new();bm.from_mesh(m);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(m);bm.free();o=bpy.data.objects.new(n,m);c.objects.link(o);o.parent=parent
        for poly in m.polygons:poly.use_smooth=True
        return o
    def loft(n,sections,mat,parent):
        v=[];f=[];nring=40
        for y,z,w,d in sections:
            for k in range(nring):a=k*math.tau/nring;v.append((w*math.cos(a),y,z+d*math.sin(a)))
        f=[tuple(range(nring))]
        for j in range(len(sections)-1):
            for k in range(nring):a=j*nring+k;b=j*nring+(k+1)%nring;f.append((a,a+nring,b+nring,b))
        f.append(tuple(reversed(range((len(sections)-1)*nring,len(sections)*nring))))
        o=mesh(n,v,f,mat,parent);o.modifiers.new('Smooth anatomical contours','SUBSURF').levels=2;return o
    torso=empty('FOX torso')
    body=loft('FOX body',[(-.50,.60,.040,.090),(-.43,.60,.12,.17),(-.30,.59,.135,.175),(-.10,.57,.115,.145),(.12,.58,.09,.12),(.30,.60,.11,.15),(.43,.61,.12,.15),(.52,.60,.07,.10),(.55,.60,.012,.030)],coat,torso)
    neck=empty('FOX neck hinge',(0,-.38,.66),torso);head=empty('FOX head',(0,-.31,.14),neck)
    axis=Vector((0,-.31,.14));right=Vector((1,0,0));depth=axis.normalized().cross(right);v=[];f=[]
    for j in range(13):
        u=j/12;r=.115*(1-u)+.075*u
        for k in range(32):a=k*math.tau/32;v.append(axis*u+right*(r*math.cos(a))+depth*(r*.94*math.sin(a)))
    for j in range(12):
        for k in range(32):a=j*32+k;b=j*32+(k+1)%32;f.append((a,b,b+32,a+32))
    f.extend([tuple(reversed(range(32))),tuple(range(12*32,13*32))]);nm=mesh('FOX neck skin',v,f,coat,neck);nm.modifiers.new('Smooth neck surface','SUBSURF').levels=1
    skull=loft('FOX skull',[(.07,.02,.075,.080),(-.015,.015,.090,.085),(-.070,-.005,.080,.065),(-.16,-.015,.050,.038),(-.255,-.023,.034,.026),(-.285,-.023,.025,.015)],coat,head)
    E('FOX nose',(0,-.285,-.022),(.034,.020,.023),nose,head)
    E('FOX upper palate',(0,-.16,-.047),(.034,.105,.005),mouth,head)
    jaw=empty('FOX jaw',(0,-.025,-.035),head)
    E('FOX lower jaw',(0,-.12,-.015),(.039,.14,.019),pale,jaw)
    E('FOX lower mouth',(0,-.13,.001),(.038,.125,.006),mouth,jaw)
    E('FOX tongue',(0,-.14,.008),(.018,.080,.005),tongue,jaw)
    for side in [-1,1]:
        E('FOX iris',(side*.075,-.065,.026),(.004,.012,.008),amber,head)
        E('FOX pupil',(side*.078,-.067,.026),(.0015,.007,.005),eye,head)
        E('FOX upper eyelid',(side*.074,-.064,.034),(.006,.014,.0025),coat,head)
        E('FOX nostril',(side*.024,-.302,-.017),(.009,.003,.005),nose,head)
        R('FOX upper canine',(side*.033,-.155,-.044),(side*.030,-.165,-.075),.006,tooth,head,.0008)
        R('FOX lower canine',(side*.027,-.142,.006),(side*.026,-.143,.025),.0045,tooth,jaw,.0007)
        for k in range(4):
            y=-.070-k*.018;R('FOX upper premolar',(side*.037,y,-.045),(side*.035,y-.002,-.057),.003,tooth,head,.0006)
            R('FOX lower premolar',(side*.033,y+.022,.002),(side*.032,y+.020,.011),.0028,tooth,jaw,.0005)
    for k in range(6):
        x=(k-2.5)*.009;R('FOX upper incisor',(x,-.263,-.033),(x,-.264,-.041),.002,tooth,head,.0007)
    dentition=[o for o in c.objects if o.name.startswith(('FOX upper canine','FOX lower canine','FOX upper premolar','FOX lower premolar','FOX upper incisor'))]
    ears=[]
    for side in [-1,1]:
        ear=empty('FOX ear '+str(side),(side*.068,.025,.066),head);ears.append((side,ear));outline=[(-.033,0),(-.048,.060),(-.034,.125),(0,.185),(.038,.135),(.048,.065),(.033,0)]
        front=[(0,-.013,.046)]+[(side*x,0,z) for x,z in outline];back=[(x,y+.006,z) for x,y,z in front];v=front+back;f=[(0,i+1,(i+1)%7+1) for i in range(7)]+[(8,i+9,(i+1)%7+9) for i in range(7)]
        for i in range(7):a=i+1;b=(i+1)%7+1;f.append((a,b,b+8,a+8))
        o=mesh('FOX pinna',v,f,coat,ear);o.data.materials.append(inner)
        for poly in o.data.polygons:
            if poly.index<7:poly.material_index=1
        for a,b in zip(front[1:],front[2:]+front[1:2]):R('FOX ear rim',a,b,.002,coat,ear)
    # Merge the closed neck into the chest, then bend only its weighted skin.
    bpy.ops.object.select_all(action='DESELECT');body.select_set(True);nm.select_set(True);bpy.context.view_layer.objects.active=body;bpy.ops.object.convert(target='MESH');bpy.ops.object.join();body=bpy.context.object
    rem=body.modifiers.new('Continuous chest and neck','REMESH');rem.mode='VOXEL';rem.voxel_size=.006;bpy.ops.object.modifier_apply(modifier=rem.name)
    sm=body.modifiers.new('Soft shoulder transition','SMOOTH');sm.factor=.7;sm.iterations=3;bpy.ops.object.modifier_apply(modifier=sm.name)
    for poly in body.data.polygons:poly.use_smooth=True
    neck_base=Vector((0,-.38,.66));neck_axis=Vector((0,-.31,.14));neck_length=neck_axis.length;neck_axis.normalize();rest=[v.co.copy() for v in body.data.vertices];weights=[smooth(((p-neck_base).dot(neck_axis)/neck_length-.08)/.75) for p in rest];body.shape_key_add(name='Basis')
    tail=empty('FOX tail',(0,.49,.64),torso)
    tv=[];tf=[];centers=[Vector((0,0,0)),Vector((0,.15,-.025)),Vector((0,.34,-.09)),Vector((0,.52,-.18)),Vector((0,.70,-.27))]
    for j,(center,r) in enumerate(zip(centers,[.045,.095,.110,.085,.008])):
        direction=(centers[min(j+1,4)]-centers[max(j-1,0)]).normalized();dep=direction.cross(Vector((1,0,0))).normalized()
        for k in range(24):a=k*math.tau/24;tv.append(center+Vector((r*math.cos(a),0,0))+dep*(r*math.sin(a)))
    tf=[tuple(reversed(range(24)))]
    for j in range(4):
        for k in range(24):a=j*24+k;b=j*24+(k+1)%24;tf.append((a,b,b+24,a+24))
    tf.append(tuple(range(96,120)));o=mesh('FOX bushy tail',tv,tf,tail_mat,tail);o.modifiers.new('Smooth tail fur volume','SUBSURF').levels=2
    rng=random.Random(715);bpy.context.view_layer.update();ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get());surface=ev.to_mesh();surface.calc_loop_triangles();triangles=[([surface.vertices[k].co.copy() for k in tri.vertices],tri.normal.copy(),tri.area) for tri in surface.loop_triangles if (sum((surface.vertices[k].co for k in tri.vertices),Vector())/3-neck_base).dot(neck_axis)/neck_length<.04];ev.to_mesh_clear()
    for points,normal,area in rng.choices(triangles,weights=[t[2] for t in triangles],k=170):
        u=math.sqrt(rng.random());q=rng.random();p=points[0]*(1-u)+points[1]*(u*(1-q))+points[2]*(u*q);R('FOX guard hair',p,p+normal*rng.uniform(.008,.016),.001,coat,torso,.0002)
    coat_leg=coat.copy();coat_leg.name='Fox black stockings';nodes=coat_leg.node_tree.nodes;links=coat_leg.node_tree.links;attribute=nodes.new('ShaderNodeAttribute');attribute.attribute_name='FurHeight';ramp=next(n for n in nodes if n.label=='FUR_BASE_HEIGHT');links.new(attribute.outputs['Fac'],ramp.inputs[0])
    while len(ramp.color_ramp.elements)>2:ramp.color_ramp.elements.remove(ramp.color_ramp.elements[-1])
    for i,(pos,col) in enumerate([(0,(.018,.015,.012)),(.20,(.025,.020,.015)),(.55,(.31,.075,.018)),(1,(.32,.085,.020))]):
        e=ramp.color_ramp.elements[i] if i<2 else ramp.color_ramp.elements.new(pos);e.position=pos;e.color=(*col,1)
    body_low=min(p.z for p in rest);body_high=max(p.z for p in rest)
    limbs=[]
    for side in [-1,1]:
        for front in [True,False]:
            label='%s %s'%(side,'fore' if front else 'hind');hip=Vector((side*(.095 if front else .090),-.34 if front else .34,.68 if front else .65));toe=Vector((hip.x,-.36 if front else .35,.078));points=leg_path(hip,toe,front);verts=leg_skin(points,front);faces=[tuple(reversed(range(20)))];rings=len(verts)//20
            for j in range(rings-1):
                for k in range(20):a=j*20+k;b=j*20+(k+1)%20;faces.append((a,b,b+20,a+20))
            faces.append(tuple(range((rings-1)*20,rings*20)));o=mesh('FOX leg '+label,verts,faces,coat_leg,root);o.modifiers.new('Soft limb contours','SUBSURF').levels=1;height=o.data.attributes.new('FurHeight','FLOAT','POINT');height.data.foreach_set('value',[(p.z-body_low)/(body_high-body_low) for p in verts]);o.shape_key_add(name='Basis');joints=[empty('FOX joint '+label+' '+str(k),p) for k,p in enumerate(points)];paw=empty('FOX paw '+label)
            E('FOX paw body',(0,-.025,-.045),(.037,.060,.029),pawmat,paw);E('FOX pastern',(0,.015,-.020),(.024,.036,.040),pawmat,paw);E('FOX central pad',(0,-.020,-.070),(.030,.040,.006),nose,paw)
            for k,x in enumerate([-.026,-.009,.009,.026]):
                y=-.068 if k in [0,3] else -.077;E('FOX toe',(x,y,-.049),(.010,.029,.024),pawmat,paw);E('FOX toe pad',(x,y,-.070),(.008,.014,.004),nose,paw);R('FOX claw',(x,y-.023,-.042),(x,y-.035,-.046),.0028,nose,paw,.0005)
            paw_points=[child.matrix_basis@v.co for child in paw.children if child.type=='MESH' for v in child.data.vertices]
            limbs.append(dict(side=side,front=front,mesh=o,joints=joints,paw=paw,points=paw_points))
    clips=clips_for(task,frames={'idle':8,'walk':12,'run':16,'death':14,'attack':12},fps={'idle':6,'run':20,'attack':14})
    s['animal_design']=json.dumps(dict(species='red fox',facing='-Y',gait='four beat walk, two gallop cycles in run',limbs='digitigrade fore carpus and hind hock',teeth='upper/lower canines and smaller premolars',tail='long full brush, white tip, carried below back'))
    for name,cfg in clips.items():
        span=cfg['frames'] if cfg['loop'] else cfg['frames']-1
        for j in range(span*4+1):
            frame=cfg['start']+j*.25;t=j/(span*4);u=(t*(2 if name=='run' else 1))%1;p=math.tau*u;s.frame_set(int(frame),subframe=frame%1)
            fall=smooth((t-.12)/.75) if name=='death' else 0;strike=curve(t,[(0,0),(.28,0),(.50,1),(.72,1),(1,0)]) if name=='attack' else 0
            windup=curve(t,[(0,0),(.26,1),(.50,0),(1,0)]) if name=='attack' else 0;flight=0.
            if name=='run':
                for a,b in [(.27,.44),(.75,.92)]:
                    if a<u<b:flight=.055*math.sin(math.pi*(u-a)/(b-a))
            root.location=(.60*math.sin(math.pi/2*fall)-.08*fall,-.20*strike+.035*windup,flight);root.rotation_euler=(0,-math.pi/2*fall,0)
            torso.location=(0,0,(-.015+.012*math.cos(p) if name=='run' else -.005+.004*math.cos(p) if name=='walk' else 0)-.035*strike)
            torso.rotation_euler=(.04*math.sin(2*p) if name=='run' else .025*strike,0,0);torso.scale=(1,1,1+.004*math.sin(p) if name=='idle' else 1)
            neck.rotation_euler=(.20*strike-.08*windup+(.06 if name=='run' else 0),-.40*fall,.045*math.sin(p) if name=='idle' else 0);head.rotation_euler=(0,1.0*fall,0)
            jaw.rotation_euler=(curve(t,[(0,0),(.26,.65),(.48,.65),(.62,.07),(.78,.07),(1,0)]) if name=='attack' else 0,0,0)
            for tooth in dentition:
                hidden=not(name=='attack' and jaw.rotation_euler.x>.12);tooth.hide_render=hidden;tooth.hide_viewport=hidden;tooth.keyframe_insert('hide_render',frame=frame);tooth.keyframe_insert('hide_viewport',frame=frame)
            for side,ear in ears:ear.rotation_euler=(-.65*fall-.80*windup+(-.25 if name=='run' else 0),0,side*.06*math.sin(p+side) if name=='idle' else 0)
            tail.rotation_euler=(.15 if name=='run' else 0,0,.045*math.sin(p)*(1-fall))
            key=body.shape_key_add(name='Neck_%.2f'%frame);nq=neck.rotation_euler.to_quaternion();identity=Matrix.Identity(4).to_quaternion()
            for v,point,w in zip(key.data,rest,weights):
                pt=neck_base+identity.slerp(nq,w)@(point-neck_base) if w else point.copy()
                if name=='run' and w==0:pt.z+=.014*math.sin(2*p)*math.exp(-(point.y/.23)**2)
                v.co=pt
            for f,value in [(frame-.25,0),(frame,1),(frame+.25,0)]:key.value=value;key.keyframe_insert('value',frame=f)
            key.value=0
            tm=Matrix.Translation(torso.location)@torso.rotation_euler.to_matrix().to_4x4()@Matrix.Diagonal((*torso.scale,1))
            for limb in limbs:
                side,front=limb['side'],limb['front'];hip=tm@Vector((side*(.095 if front else .090),-.34 if front else .34,.68 if front else .65));toe=Vector((hip.x,-.36 if front else .35,0));pitch=lift=0.
                if name in ['walk','run']:
                    run=name=='run';offset=((.48 if side==-1 else .56) if front else (0 if side==-1 else .08)) if run else ((.25 if side==-1 else .75) if front else (0 if side==-1 else .50));phase=(u+offset)%1;stance=(.23 if front else .27) if run else .65;stride=.20 if run else .13
                    if phase<stance:
                        toe.y+=-stride+2*stride*phase/stance
                        if run and not front:pitch=.40*smooth((phase/stance-.65)/.35)
                    else:
                        q=(phase-stance)/(1-stance);toe.y+=stride-2*stride*smooth(q);lift=(.15 if run else .075)*math.sin(math.pi*q);pitch=-.45*math.sin(math.pi*q) if front else (.40*(1-smooth(q/.22)) if run else 0)-.35*math.sin(math.pi*q)
                elif name=='attack':toe.y-=root.location.y;lift=.07*windup if front and side==-1 else 0
                elif name=='death':toe.y+=(-.05 if front else .05)*fall;lift=.18*fall
                rotation=Matrix.Rotation(pitch,3,'X');toe.z=.002-min((rotation@v).z for v in limb['points'])+lift
                points=leg_path(hip,toe,front)
                for o,point in zip(limb['joints'],points):o.location=point
                limb['paw'].location=points[-1];limb['paw'].rotation_euler=(pitch,0,0);key=limb['mesh'].shape_key_add(name='Pose_%.2f'%frame)
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
    # Adult fox shoulder height is about 45 cm. Scale geometry and root tracks together.
    root.scale=(.65,.65,.65)
    action=root.animation_data.action
    for layer in action.layers:
        for strip in layer.strips:
            for slot in action.slots:
                bag=strip.channelbag(slot)
                if bag:
                    for fc in bag.fcurves:
                        if fc.data_path=='location':
                            for k in fc.keyframe_points:k.co.y*=.65;k.handle_left.y*=.65;k.handle_right.y*=.65
    finish(ns,'fox',clips,source_files=['validate_fox.py'],target=.43)

if __name__ in ['__main__','character_build']:build()
