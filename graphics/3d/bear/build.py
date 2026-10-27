"""Brown bear: shoulder hump, plantigrade five-toed paws and a heavy forepaw sweep."""
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

def vector_curve(t,keys):
    for (a,x),(b,y) in zip(keys,keys[1:]):
        if t<=b:return Vector(x).lerp(Vector(y),smooth((t-a)/(b-a)))
    return Vector(keys[-1][1])

def leg_path(hip,toe,front,side,swiping=False):
    a,b=(.38,.43) if front else (.34,.40);delta=toe-hip;distance=max(abs(a-b)+.00001,min(a+b-.00001,delta.length));axis=delta.normalized();end=hip+axis*distance
    pole=Vector((0,1 if front else -1,0)).lerp(Vector((side,.4,-.1)),float(swiping));pole=(pole-axis*pole.dot(axis)).normalized();along=(a*a-b*b+distance*distance)/(2*distance)
    return [hip,hip+axis*along+pole*math.sqrt(max(0,a*a-along*along)),end]

def leg_skin(points,front):
    radii=[[.050,.120,.120,.105,.085],[.085,.085,.075,.060,.050]] if front else [[.040,.140,.145,.110,.080],[.080,.075,.065,.050,.045]]
    out=[]
    for k in range(2):
        for j in range(5):
            if k and j==0:continue
            u=j/4;center=points[k].lerp(points[k+1],u);axis=(points[k+1]-points[k]).normalized()
            if k==0 and j==4:axis=(axis+(points[2]-points[1]).normalized()).normalized()
            q=axis.to_track_quat('Z','Y');right=q@Vector((1,0,0));depth=q@Vector((0,1,0));r=radii[k][j]
            for i in range(24):a=i*math.tau/24;out.append(center+right*(r*math.cos(a))+depth*(r*.95*math.sin(a)))
    return out

def build():
    ns,task=begin('bear');s=ns['s'];c=ns['c'];root=ns['root'];ell=ns['ell'];rod=ns['rod'];material=ns['material']
    def fur(name,head=False):
        mat=material(name,(.12,.085,.045),rough=.95,texture=165);nodes=mat.node_tree.nodes;links=mat.node_tree.links
        coords=nodes.new('ShaderNodeTexCoord');sep=nodes.new('ShaderNodeSeparateXYZ');links.new(coords.outputs['Generated'],sep.inputs[0]);ramp=nodes.new('ShaderNodeValToRGB');ramp.label='FUR_HEIGHT';ramp.color_ramp.interpolation='EASE'
        stops=[(0,(.21,.145,.080)),(.5,(.14,.095,.050)),(1,(.10,.068,.035))] if head else [(0,(.065,.045,.025)),(.45,(.12,.085,.045)),(1,(.20,.14,.075))]
        for e in list(ramp.color_ramp.elements)[1:]:ramp.color_ramp.elements.remove(e)
        for i,(pos,col) in enumerate(stops):
            e=ramp.color_ramp.elements[0] if i==0 else ramp.color_ramp.elements.new(pos);e.position=pos;e.color=(*col,1)
        links.new(sep.outputs['Y' if head else 'Z'],ramp.inputs[0]);noise=next(n for n in nodes if n.bl_idname=='ShaderNodeTexNoise');range_node=nodes.new('ShaderNodeMapRange');range_node.inputs['To Min'].default_value=.72;range_node.inputs['To Max'].default_value=1.10;links.new(noise.outputs['Fac'],range_node.inputs['Value'])
        mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;links.new(ramp.outputs[0],mix.inputs[1]);links.new(range_node.outputs[0],mix.inputs[2]);links.new(mix.outputs[0],nodes.get('Principled BSDF').inputs['Base Color']);return mat
    coat=fur('Bear grizzled brown coat');headmat=fur('Bear lighter muzzle coat',True)
    pawmat=material('Bear paw fur',(.095,.065,.035),rough=.96,texture=175)
    pads=material('Bear dark pads and nose',(.024,.018,.013),rough=.66,texture=135)
    claws=material('Bear curved claw horn',(.19,.15,.10),rough=.71,texture=130)
    eyes=material('Bear small dark eyes',(.006,.004,.002),rough=.22)
    inner=material('Bear ear interior',(.14,.095,.052),rough=.95,texture=160)
    tooth=material('Bear worn teeth',(.39,.34,.24),rough=.68)
    mouth=material('Bear mouth tissue',(.055,.023,.017),rough=.80)
    controlled=[]
    def empty(n,loc=(0,0,0),parent=root):
        o=bpy.data.objects.new(n,None);c.objects.link(o);o.parent=parent;o.location=loc;controlled.append(o);return o
    def E(n,p,size,mat,parent):o=ell(n,p,size,mat);o.parent=parent;return o
    def R(n,a,b,r,mat,parent,r2=None):o=rod(n,a,b,r,mat,r2=r2);o.parent=parent;return o
    def mesh(n,v,f,mat,parent):
        m=bpy.data.meshes.new(n);m.from_pydata(v,[],f);m.update();m.materials.append(mat);bm=bmesh.new();bm.from_mesh(m);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(m);bm.free();o=bpy.data.objects.new(n,m);c.objects.link(o);o.parent=parent
        for p in m.polygons:p.use_smooth=True
        return o
    def loft(n,sections,mat,parent):
        v=[];f=[];nring=40
        for y,z,w,d in sections:
            for k in range(nring):a=k*math.tau/nring;v.append((w*math.cos(a),y,z+d*math.sin(a)))
        f=[tuple(range(nring))]
        for j in range(len(sections)-1):
            for k in range(nring):a=j*nring+k;b=j*nring+(k+1)%nring;f.append((a,a+nring,b+nring,b))
        f.append(tuple(reversed(range((len(sections)-1)*nring,len(sections)*nring))));o=mesh(n,v,f,mat,parent);o.modifiers.new('Soft bear contours','SUBSURF').levels=2;return o
    torso=empty('BEAR torso')
    body=loft('BEAR body',[(-.78,.68,.10,.14),(-.65,.70,.25,.32),(-.40,.78,.34,.40),(-.12,.70,.35,.37),(.18,.68,.32,.35),(.48,.69,.30,.33),(.68,.67,.26,.29),(.82,.62,.15,.20),(.87,.61,.03,.05)],coat,torso)
    neck=empty('BEAR neck hinge',(0,-.61,.75),torso);head=empty('BEAR head',(0,-.25,.02),neck)
    axis=Vector((0,-.25,.02));depth=axis.normalized().cross(Vector((1,0,0)));v=[];f=[]
    for j in range(13):
        u=j/12;r=.19*(1-u)+.14*u
        for k in range(32):a=k*math.tau/32;v.append(axis*u+Vector((r*math.cos(a),0,0))+depth*(r*.94*math.sin(a)))
    for j in range(12):
        for k in range(32):a=j*32+k;b=j*32+(k+1)%32;f.append((a,b,b+32,a+32))
    f.extend([tuple(reversed(range(32))),tuple(range(384,416))]);neckskin=mesh('BEAR neck skin',v,f,coat,neck);neckskin.modifiers.new('Neck contours','SUBSURF').levels=1
    skull=loft('BEAR skull',[(.10,.01,.13,.13),(.01,.01,.18,.16),(-.12,-.01,.16,.13),(-.25,-.045,.105,.075),(-.33,-.050,.09,.055),(-.35,-.050,.025,.020)],headmat,head)
    E('BEAR nose',(0,-.349,-.038),(.095,.029,.052),pads,head)
    for side in [-1,1]:
        E('BEAR eye',(side*.147,-.12,.033),(.006,.012,.009),eyes,head)
        E('BEAR upper eyelid',(side*.145,-.116,.047),(.012,.024,.005),headmat,head)
        E('BEAR nostril',(side*.050,-.374,-.030),(.017,.005,.010),eyes,head)
    jaw=empty('BEAR jaw',(0,-.035,-.070),head)
    E('BEAR lower jaw',(0,-.14,-.016),(.095,.17,.035),headmat,jaw)
    E('BEAR lower mouth',(0,-.14,.010),(.076,.155,.008),mouth,jaw)
    E('BEAR upper palate',(0,-.18,-.074),(.078,.14,.008),mouth,head)
    for side in [-1,1]:
        R('BEAR upper canine',(side*.065,-.19,-.070),(side*.060,-.20,-.112),.010,tooth,head,.001)
        R('BEAR lower canine',(side*.056,-.17,.015),(side*.053,-.18,.042),.008,tooth,jaw,.001)
        for k in range(4):
            y=-.065-k*.026;R('BEAR upper molar',(side*.077,y,-.072),(side*.075,y,-.085),.005,tooth,head,.002)
    dentition=[o for o in c.objects if o.name.startswith(('BEAR upper canine','BEAR lower canine','BEAR upper molar'))]
    ears=[]
    for side in [-1,1]:
        ear=empty('BEAR ear '+str(side),(side*.12,.035,.10),head);ears.append((side,ear));outline=[]
        for k in range(13):a=math.pi*k/12;outline.append((side*.053*math.cos(a),.003,.075*math.sin(a)))
        front=[(0,-.015,.030)]+outline;back=[(x,y+.009,z) for x,y,z in front];v=front+back;count=len(front);f=[(0,k+1,(k+1)%13+1) for k in range(13)]+[(count,k+1+count,(k+1)%13+1+count) for k in range(13)]
        for k in range(13):a=k+1;b=(k+1)%13+1;f.append((a,b,b+count,a+count))
        o=mesh('BEAR rounded pinna',v,f,coat,ear);o.data.materials.append(inner)
        for p in o.data.polygons:
            if p.index<13:p.material_index=1
        for a,b in zip(outline,outline[1:]+outline[:1]):R('BEAR ear rim',a,b,.003,coat,ear)
    for parent,label,parts,voxel in [(torso,'BEAR body',[body,neckskin],.009),(head,'BEAR skull',[skull]+[o for o in head.children if o.name.startswith('BEAR upper eyelid')],.005)]:
        bpy.ops.object.select_all(action='DESELECT')
        for o in parts:o.select_set(True)
        bpy.context.view_layer.objects.active=bpy.data.objects[label];bpy.ops.object.convert(target='MESH');bpy.ops.object.join();o=bpy.context.object
        rem=o.modifiers.new('Continuous bear anatomy','REMESH');rem.mode='VOXEL';rem.voxel_size=voxel;bpy.ops.object.modifier_apply(modifier=rem.name)
        sm=o.modifiers.new('Smooth muscular transitions','SMOOTH');sm.factor=.7;sm.iterations=3;bpy.ops.object.modifier_apply(modifier=sm.name)
        for p in o.data.polygons:p.use_smooth=True
        if parent==torso:body=o
    neck_base=Vector((0,-.61,.75));neck_axis=Vector((0,-.25,.02));neck_len=neck_axis.length;neck_axis.normalize();rest=[v.co.copy() for v in body.data.vertices];weights=[smooth(((p-neck_base).dot(neck_axis)/neck_len-.08)/.75) for p in rest];body.shape_key_add(name='Basis')
    tail=empty('BEAR tail',(0,.82,.64),torso);E('BEAR short tail',(0,.048,-.014),(.065,.11,.060),coat,tail)
    rng=random.Random(901);bpy.context.view_layer.update();ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get());m=ev.to_mesh();m.calc_loop_triangles();triangles=[([m.vertices[k].co.copy() for k in tri.vertices],tri.normal.copy(),tri.area) for tri in m.loop_triangles if (sum((m.vertices[k].co for k in tri.vertices),Vector())/3-neck_base).dot(neck_axis)/neck_len<.04];ev.to_mesh_clear()
    for points,normal,area in rng.choices(triangles,weights=[t[2] for t in triangles],k=240):
        u=math.sqrt(rng.random());q=rng.random();p=points[0]*(1-u)+points[1]*(u*(1-q))+points[2]*(u*q);R('BEAR thick guard hair',p,p+normal*rng.uniform(.014,.030),.0014,coat,torso,.00025)
    legmat=coat.copy();legmat.name='Bear limb fur matched to body';nodes=legmat.node_tree.nodes;attribute=nodes.new('ShaderNodeAttribute');attribute.attribute_name='FurHeight';ramp=next(n for n in nodes if n.label=='FUR_HEIGHT');legmat.node_tree.links.new(attribute.outputs['Fac'],ramp.inputs[0]);zlow=min(p.z for p in rest);zhigh=max(p.z for p in rest)
    limbs=[]
    for side in [-1,1]:
        for front in [True,False]:
            label='%s %s'%(side,'fore' if front else 'hind');hip=Vector((side*.22,-.45 if front else .48,.88 if front else .78));toe=Vector((side*.23,-.48 if front else .49,.10));points=leg_path(hip,toe,front,side);verts=leg_skin(points,front);faces=[tuple(reversed(range(24)))];rings=len(verts)//24
            for j in range(rings-1):
                for k in range(24):a=j*24+k;b=j*24+(k+1)%24;faces.append((a,b,b+24,a+24))
            faces.append(tuple(range((rings-1)*24,rings*24)));o=mesh('BEAR leg '+label,verts,faces,legmat,root);o.modifiers.new('Smooth limb contours','SUBSURF').levels=2;a=o.data.attributes.new('FurHeight','FLOAT','POINT');a.data.foreach_set('value',[(p.z-zlow)/(zhigh-zlow) for p in verts]);o.shape_key_add(name='Basis');joints=[empty('BEAR joint '+label+' '+str(k),p) for k,p in enumerate(points)];paw=empty('BEAR paw '+label)
            E('BEAR broad paw',(0,-.005 if front else .015,-.047 if front else -.050),(.085,.10,.045) if front else (.068,.14,.035),pawmat,paw)
            E('BEAR pastern',(0,.018,-.010),(.055,.065,.065),pawmat,paw)
            E('BEAR sole',(0,.015,-.090),(.066,.070,.009) if front else (.055,.10,.007),pads,paw)
            for k,x in enumerate([-.052,-.026,0,.026,.052]):
                y=[-.073,-.090,-.103,-.10,-.085][k];E('BEAR toe',(x,y,-.052),(.016,.040,.031),pawmat,paw);E('BEAR toe pad',(x,y,-.079),(.012,.020,.006),pads,paw)
                length=.047 if front else .025;p0=Vector((x,y-.027,-.039));p1=p0+Vector((0,-length*.62,-.004));p2=p0+Vector((0,-length,-.020));R('BEAR curved claw',p0,p1,.006,claws,paw,.004);R('BEAR claw tip',p1,p2,.004,claws,paw,.0006)
            paw_points=[child.matrix_basis@v.co for child in paw.children if child.type=='MESH' for v in child.data.vertices];limbs.append(dict(side=side,front=front,mesh=o,joints=joints,paw=paw,points=paw_points))
    clips=clips_for(task,frames={'idle':8,'walk':12,'run':16,'death':14,'attack':16},fps={'idle':6,'run':16,'attack':12})
    s['animal_design']=json.dumps(dict(species='brown bear',facing='-Y',anatomy='high shoulder hump, short tail, rounded ears, plantigrade paws',toes=5,claws='long curved nonretractile fore claws; shorter hind claws',attack='right forepaw sweep; three planted supporting paws'))
    for name,cfg in clips.items():
        span=cfg['frames'] if cfg['loop'] else cfg['frames']-1
        for j in range(span*4+1):
            frame=cfg['start']+j*.25;t=j/(span*4);u=(t*(2 if name=='run' else 1))%1;p=math.tau*u;s.frame_set(int(frame),subframe=frame%1)
            fall=smooth((t-.12)/.75) if name=='death' else 0;raise_paw=curve(t,[(0,0),(.22,1),(.68,1),(1,0)]) if name=='attack' else 0;sweep=curve(t,[(0,0),(.34,0),(.58,1),(.68,1),(1,0)]) if name=='attack' else 0
            flight=0.
            if name=='run':
                for a,b in [(.30,.44),(.82,.90)]:
                    if a<u<b:flight=.035*math.sin(math.pi*(u-a)/(b-a))
            root.location=(.73*math.sin(math.pi/2*fall)-.12*fall,-.07*sweep,flight);root.rotation_euler=(0,-math.pi/2*fall,0)
            torso.location=(-.035*raise_paw,0,(-.015+.015*math.cos(p) if name=='run' else -.006+.005*math.cos(2*p) if name=='walk' else 0)-.035*raise_paw)
            torso.rotation_euler=(.05*sweep if name=='attack' else .035*math.sin(p) if name=='run' else 0,-.06*raise_paw,.020*math.sin(p) if name=='walk' else 0);torso.scale=(1,1,1+.004*math.sin(p) if name=='idle' else 1)
            neck.rotation_euler=(-.10*raise_paw,0,-.45*fall+.025*math.sin(p)*(1-fall) if name=='idle' or name=='death' else 0);head.rotation_euler=(0,.50*fall,0);jaw.rotation_euler=(.42*raise_paw*(1-.7*sweep),0,0)
            for tooth in dentition:
                hidden=not(name=='attack' and jaw.rotation_euler.x>.12);tooth.hide_render=hidden;tooth.hide_viewport=hidden;tooth.keyframe_insert('hide_render',frame=frame);tooth.keyframe_insert('hide_viewport',frame=frame)
            for side,ear in ears:ear.rotation_euler=(-.50*fall,0,side*.045*math.sin(p+side) if name=='idle' else 0)
            key=body.shape_key_add(name='Neck_%.2f'%frame);nq=neck.rotation_euler.to_quaternion();identity=Matrix.Identity(4).to_quaternion()
            for v,point,w in zip(key.data,rest,weights):v.co=neck_base+identity.slerp(nq,w)@(point-neck_base) if w else point
            for f,value in [(frame-.25,0),(frame,1),(frame+.25,0)]:key.value=value;key.keyframe_insert('value',frame=f)
            key.value=0;tm=Matrix.Translation(torso.location)@torso.rotation_euler.to_matrix().to_4x4()@Matrix.Diagonal((*torso.scale,1))
            for limb in limbs:
                side,front=limb['side'],limb['front'];hip=tm@Vector((side*.22,-.45 if front else .48,.88 if front else .78));toe=Vector((side*.23,-.48 if front else .49,0));pitch=lift=0.;swiping=name=='attack' and front and side==1
                if name in ['walk','run']:
                    run=name=='run';offset=((.48 if side==-1 else .56) if front else (0 if side==-1 else .10)) if run else ((.25 if side==-1 else .75) if front else (0 if side==-1 else .50));phase=(u+offset)%1;stance=.30 if run else .68;stride=.20 if run else .13
                    if phase<stance:toe.y+=-stride+2*stride*phase/stance;pitch=.30*smooth((phase/stance-.65)/.35) if not front else 0
                    else:
                        q=(phase-stance)/(1-stance);toe.y+=stride-2*stride*smooth(q);lift=(.16 if run else .075)*math.sin(math.pi*q);pitch=-.35*math.sin(math.pi*q) if front else .30*(1-smooth(q/.25))-.25*math.sin(math.pi*q)
                elif name=='attack' and not swiping:toe.y-=root.location.y
                elif name=='death':toe.y+=(-.06 if front else .06)*fall;lift=.24*fall
                rotation=Matrix.Rotation(pitch,3,'X');toe.z=.002-min((rotation@v).z for v in limb['points'])+lift
                if swiping:
                    toe=vector_curve(t,[(0,(.23,-.48,toe.z)),(.22,(.48,-.25,.88)),(.34,(.48,-.25,.88)),(.44,(.40,-.85,.45)),(.58,(-.15,-1.05,.40)),(.68,(-.25,-.90,.35)),(1,(.23,-.48,toe.z))]);pitch=-.90*raise_paw
                points=leg_path(hip,toe,front,side,raise_paw if swiping else 0)
                for o,point in zip(limb['joints'],points):o.location=point
                limb['paw'].location=points[-1];limb['paw'].rotation_euler=(pitch,0,-.40*sweep*raise_paw if swiping else 0);key=limb['mesh'].shape_key_add(name='Pose_%.2f'%frame)
                for v,point in zip(key.data,leg_skin(points,front)):v.co=point
                for f,value in [(frame-.25,0),(frame,1),(frame+.25,0)]:key.value=value;key.keyframe_insert('value',frame=f)
                key.value=0
            for o in controlled:
                for prop in ['location','rotation_euler','scale']:o.keyframe_insert(prop,frame=frame)
            root.keyframe_insert('location',frame=frame);root.keyframe_insert('rotation_euler',frame=frame)
            if name=='death':
                s.frame_set(int(frame),subframe=frame%1);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();low=100.
                for o in c.objects:
                    if o.type=='MESH' and not o.hide_render:
                        ev=o.evaluated_get(dg);m=ev.to_mesh();low=min(low,min((ev.matrix_world@v.co).z for v in m.vertices));ev.to_mesh_clear()
                root.location.z+=max(0,.002-low);root.keyframe_insert('location',frame=frame)
    finish(ns,'bear',clips,source_files=['validate_bear.py'],target=.72)

if __name__ in ['__main__','character_build']:build()
