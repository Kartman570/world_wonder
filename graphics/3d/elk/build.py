"""Bull moose: raised withers, long muzzle, dewlap and broad palmate antlers."""
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
    delta=toe.y-hip.y;length=.32 if front else .36
    angle=.25+.8*delta if front else -.42+1.2*delta
    first=hip+Vector((0,length*math.sin(angle),-length*math.cos(angle)))
    a,b=(.38,.33) if front else (.40,.34)
    d=toe-first;distance=min(a+b-.00001,max(abs(a-b)+.00001,d.length));axis=d.normalized();end=first+axis*distance
    pole=Vector((0,-1 if front else 1,0));pole=(pole-axis*pole.dot(axis)).normalized();along=(a*a-b*b+distance*distance)/(2*distance)
    second=first+axis*along+pole*math.sqrt(max(0,a*a-along*along))
    return [hip,first,second,end]

def skin_points(points,front):
    radii=[[.018,.060,.060,.045,.038],[.038,.033,.027,.025,.024],[.024,.020,.017,.016,.018]] if front else [[.030,.080,.083,.060,.050],[.050,.048,.038,.030,.028],[.028,.023,.018,.017,.019]]
    out=[];n=24
    for k in range(3):
        for j in range(5):
            if k and j==0:continue
            u=j/4;center=points[k].lerp(points[k+1],u);tangent=(points[k+1]-points[k]).normalized()
            if j==4 and k<2:tangent=(tangent+(points[k+2]-points[k+1]).normalized()).normalized()
            right=Vector((1,0,0));depth=tangent.cross(right).normalized();r=radii[k][j]
            for i in range(n):a=math.tau*i/n;out.append(center+right*(r*math.cos(a))+depth*(r*.90*math.sin(a)))
    return out

def build():
    ns,task=begin('elk');s=ns['s'];c=ns['c'];root=ns['root'];ell=ns['ell'];rod=ns['rod'];box=ns['box'];material=ns['material']
    coat=material('Red elk russet coat',(.072,.052,.033),rough=.9,texture=165)
    pale=material('Red elk pale fur',(.17,.145,.10),rough=.95,texture=175)
    horn=material('Red elk weathered antler',(.16,.105,.055),rough=.81,texture=100)
    hoofmat=material('Red elk hoof horn',(.030,.025,.020),rough=.65,texture=120)
    nose=material('Red elk moist nose',(.025,.021,.017),rough=.43,texture=100)
    eye=material('Red elk dark eyes',(.004,.003,.002),rough=.19)
    controlled=[]
    def empty(n,loc=(0,0,0),parent=root):
        o=bpy.data.objects.new(n,None);c.objects.link(o);o.parent=parent;o.location=loc;controlled.append(o);return o
    def E(n,loc,scale,mat=coat,parent=None):o=ell(n,loc,scale,mat);o.parent=parent or torso;return o
    def R(n,a,b,r,mat=coat,parent=None,r2=None):o=rod(n,a,b,r,mat,r2=r2);o.parent=parent or torso;return o
    torso=empty('ELK torso')
    sections=[(-.62,1.03,.070,.14),(-.52,1.00,.15,.24),(-.38,1.05,.25,.33),(-.18,1.00,.255,.31),(.08,.95,.215,.265),(.30,.98,.19,.245),(.46,1.02,.205,.25),(.61,1.01,.17,.23),(.70,1.02,.08,.15),(.72,1.03,.01,.02)]
    v=[];f=[];n=48
    for y,z,w,d in sections:
        for k in range(n):a=math.tau*k/n;v.append((w*math.cos(a),y,z+d*math.sin(a)))
    f=[tuple(reversed(range(n)))]
    for j in range(len(sections)-1):
        for k in range(n):a=j*n+k;b=j*n+(k+1)%n;f.append((a,b,b+n,a+n))
    f.append(tuple(range((len(sections)-1)*n,len(sections)*n)))
    m=bpy.data.meshes.new('Continuous elk torso');m.from_pydata(v,[],f);m.update();m.materials.append(coat);m.materials.append(pale)
    body=bpy.data.objects.new('ELK ribcage',m);c.objects.link(body);body.parent=torso
    for poly in m.polygons:
        poly.use_smooth=True;center=poly.center
        if (center.z<.77 and -.4<center.y<.56) or center.y>.65:poly.material_index=1
    sub=body.modifiers.new('Smooth elk contours','SUBSURF');sub.levels=2
    neck=empty('ELK neck hinge',(0,-.44,1.10),torso)
    nv=[];nf=[];axis=Vector((0,-.32,.22));right=Vector((1,0,0));depth=axis.normalized().cross(right)
    for j in range(13):
        u=j/12;center=axis*u;radius=.19*(1-u)+.12*u
        for k in range(32):a=math.tau*k/32;nv.append(center+right*(radius*math.cos(a))+depth*(radius*.92*math.sin(a)))
    for j in range(12):
        for k in range(32):a=j*32+k;b=j*32+(k+1)%32;nf.append((a,b,b+32,a+32))
    nf.extend([tuple(reversed(range(32))),tuple(range(12*32,13*32))])
    nm=bpy.data.meshes.new('Tapering elk neck');nm.from_pydata(nv,[],nf);nm.update();nm.materials.append(coat);o=bpy.data.objects.new('ELK rising neck',nm);c.objects.link(o);o.parent=neck
    for poly in nm.polygons:poly.use_smooth=True
    o.modifiers.new('Smooth neck contours','SUBSURF').levels=1
    head=empty('ELK head',(0,-.32,.22),neck)
    E('ELK skull',(0,-.035,0),(.105,.18,.12),parent=head)
    E('ELK muzzle fur',(0,-.28,-.095),(.088,.165,.085),parent=head)
    E('ELK lower jaw',(0,-.20,-.13),(.087,.17,.044),parent=head)
    E('ELK pale chin',(0,-.23,-.166),(.070,.14,.015),pale,head)
    E('ELK nose',(0,-.433,-.105),(.086,.035,.052),nose,head)
    bell=empty('ELK bell hinge',(0,.065,-.05),head)
    E('ELK pendant throat bell',(0,0,-.14),(.043,.060,.14),parent=bell)
    ears=[]
    for side in [-1,1]:
        E('ELK eye',(side*.105,-.035,.029),(.012,.019,.014),eye,head)
        E('ELK upper eyelid',(side*.105,-.031,.043),(.016,.023,.005),parent=head)
        E('ELK nostril',(side*.061,-.457,-.093),(.010,.004,.006),eye,head)
        R('ELK mouth crease',(side*.080,-.38,-.15),(side*.083,-.20,-.153),.0018,nose,head)
        ear=empty('ELK ear '+str(side),(side*.070,.024,.055),head);ears.append((side,ear))
        outline=[(0,0),(side*.055,-.035),(side*.13,-.035),(side*.185,-.005),(side*.15,.030),(side*.08,.042),(side*.018,.027)]
        verts=[(side*.085,-.015,.060)]+[(x,.005+y,z) for (x,y),z in zip(outline,[0,.025,.070,.115,.105,.060,.010])]
        faces=[(0,i+1,(i+1)%7+1) for i in range(7)]
        m=bpy.data.meshes.new('Moose pinna');m.from_pydata(verts,[],faces);m.update();o=bpy.data.objects.new('ELK leaf ear',m);c.objects.link(o);o.parent=ear;m.materials.append(pale);o.modifiers.new('Ear cartilage thickness','SOLIDIFY').thickness=.004
        for p in m.polygons:p.use_smooth=True
        for a,b in zip(verts[1:],verts[2:]+verts[1:2]):R('ELK ear margin',a,b,.003,coat,ear)
    antlers=[]
    for side in [-1,1]:
        beam=[Vector((side*.075,.025,.095)),Vector((side*.17,.045,.17)),Vector((side*.31,.08,.23))]
        parts=[]
        for a,b in zip(beam,beam[1:]):parts.append(R('ELK antler beam',a,b,.033,horn,head,.025))
        # Closed shallow palm with a thick base and a cupped, irregular perimeter.
        outline=[(.27,-.02,.22),(.40,-.13,.25),(.59,-.13,.28),(.74,-.06,.32),(.81,.09,.35),(.78,.27,.36),(.67,.38,.34),(.48,.40,.30),(.33,.25,.24)]
        top=[(side*.53,.14,.335)]+[(side*x,y,z) for x,y,z in outline];bottom=[(x,y,z-.028) for x,y,z in top];v=top+bottom;n=len(top);f=[]
        for k in range(9):a=k+1;b=(k+1)%9+1;f.extend([(0,a,b),(n,b+n,a+n),(a,a+n,b+n,b)])
        m=bpy.data.meshes.new('Moose closed antler palm');m.from_pydata(v,[],f);m.update();m.materials.append(horn);o=bpy.data.objects.new('ELK antler palm',m);c.objects.link(o);o.parent=head;parts.append(o)
        bases=[(.40,-.10,.25),(.58,-.10,.28),(.75,-.03,.32),(.79,.11,.35),(.75,.26,.35),(.64,.36,.33),(.47,.38,.30)]
        for k,(x,y,z) in enumerate(bases):
            dx=.025 if k<2 else .10;dy=-.15 if k<2 else (-.04 if k<4 else .10);a=Vector((side*x,y,z));b=a+Vector((side*dx,dy,.09));end=b+Vector((side*.025,dy*.3,.065))
            parts.append(R('ELK antler tine',a,b,.017,horn,head,.010));parts.append(R('ELK antler tip',b,end,.010,horn,head,.001))
        bpy.ops.object.select_all(action='DESELECT')
        for o in parts:o.select_set(True)
        bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();o=bpy.context.object;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
        rem=o.modifiers.new('Continuous palmate bone','REMESH');rem.mode='VOXEL';rem.voxel_size=.008;bpy.ops.object.modifier_apply(modifier=rem.name);sm=o.modifiers.new('Weathered antler contours','SMOOTH');sm.factor=.6;sm.iterations=2;bpy.ops.object.modifier_apply(modifier=sm.name)
        for p in o.data.polygons:p.use_smooth=True
        antlers.append(o)
    tail=empty('ELK tail',(0,.66,1.04),torso)
    o=E('ELK tail fur',(0,.08,-.025),(.044,.12,.045),parent=tail);o.rotation_euler.x=-.25
    E('ELK tail underside',(0,.09,-.055),(.031,.10,.012),pale,tail)
    # Join the main coat masses, preserving a continuous shoulder and cheek surface.
    for parent,label,voxel in [(head,'ELK skull',.004)]:
        pieces=[o for o in parent.children if o.type=='MESH' and o.data.materials and o.data.materials[0]==coat and not o.name.startswith('ELK upper eyelid')]
        bpy.ops.object.select_all(action='DESELECT')
        for o in pieces:o.select_set(True)
        bpy.context.view_layer.objects.active=bpy.data.objects[label];bpy.ops.object.join();o=bpy.context.object;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        rem=o.modifiers.new('Continuous coat anatomy','REMESH');rem.mode='VOXEL';rem.voxel_size=voxel;bpy.ops.object.modifier_apply(modifier=rem.name)
        sm=o.modifiers.new('Anatomical smoothing','SMOOTH');sm.factor=.8;sm.iterations=3;bpy.ops.object.modifier_apply(modifier=sm.name)
        for face in o.data.polygons:face.use_smooth=True
    # A single skin bridges the neck and chest; weighted rotation bends the neck
    # while its base remains attached to the shoulders.
    bpy.ops.object.select_all(action='DESELECT');body.select_set(True);bpy.data.objects['ELK rising neck'].select_set(True);bpy.context.view_layer.objects.active=body
    bpy.ops.object.convert(target='MESH');bpy.ops.object.join();body=bpy.context.object
    rem=body.modifiers.new('Continuous chest and neck skin','REMESH');rem.mode='VOXEL';rem.voxel_size=.008;bpy.ops.object.modifier_apply(modifier=rem.name)
    sm=body.modifiers.new('Smooth neck attachment','SMOOTH');sm.factor=.8;sm.iterations=3;bpy.ops.object.modifier_apply(modifier=sm.name)
    for poly in body.data.polygons:poly.use_smooth=True
    neck_base=Vector((0,-.44,1.10));neck_axis=Vector((0,-.32,.22));neck_len=neck_axis.length;neck_axis.normalize()
    body_rest=[v.co.copy() for v in body.data.vertices];neck_weights=[smooth(((p-neck_base).dot(neck_axis)/neck_len-.05)/.70) for p in body_rest];body.shape_key_add(name='Basis')
    rng=random.Random(841);bpy.context.view_layer.update();ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get());surface=ev.to_mesh();surface.calc_loop_triangles()
    triangles=[([surface.vertices[k].co.copy() for k in tri.vertices],tri.normal.copy(),tri.area) for tri in surface.loop_triangles if (sum((surface.vertices[k].co for k in tri.vertices),Vector())/3-neck_base).dot(neck_axis)/neck_len<.04];ev.to_mesh_clear()
    for tri in rng.choices(triangles,weights=[t[2] for t in triangles],k=100):
        points,normal,_=tri;u=math.sqrt(rng.random());w=rng.random();p=points[0]*(1-u)+points[1]*(u*(1-w))+points[2]*(u*w);R('ELK short coat hair',p,p+normal*rng.uniform(.005,.010),.0008,coat,torso,.0002)
    legs=[]
    for side in [-1,1]:
        for front in [True,False]:
            label='%s %s'%(side,'fore' if front else 'hind');hip=Vector((side*.16,-.40 if front else .44,1.08 if front else 1.10));toe=Vector((side*.16,hip.y,.11));points=leg_points(hip,toe,front);verts=skin_points(points,front);faces=[];n=24;rings=len(verts)//n
            faces.append(tuple(reversed(range(n))))
            for j in range(rings-1):
                for i in range(n):a=j*n+i;b=j*n+(i+1)%n;faces.append((a,b,b+n,a+n))
            faces.append(tuple(range((rings-1)*n,rings*n)));m=bpy.data.meshes.new('Moose continuous leg');m.from_pydata(verts,[],faces);m.update();m.materials.append(coat)
            for p in m.polygons:p.use_smooth=True
            leg=bpy.data.objects.new('ELK leg '+label,m);c.objects.link(leg);leg.parent=root;leg.shape_key_add(name='Basis')
            joints=[empty('ELK joint '+label+' '+str(k),point) for k,point in enumerate(points)]
            hoof=empty('ELK hoof '+label,points[-1])
            for toe_side in [-1,1]:
                x=toe_side*.019;hv=[(x-.015,.04,-.108),(x+.015,.04,-.108),(x+.015,-.065,-.108),(x-.015,-.065,-.108),(x-.013,.036,-.018),(x+.013,.036,-.018),(x+.012,-.059,-.050),(x-.012,-.059,-.050)]
                hm=bpy.data.meshes.new('Cloven hoof wedge');hm.from_pydata(hv,[],[tuple(reversed(face)) for face in [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]]);hm.update();hm.materials.append(hoofmat);o=bpy.data.objects.new('ELK split hoof',hm);c.objects.link(o);o.parent=hoof;bevel=o.modifiers.new('Worn hoof edge','BEVEL');bevel.width=.005;bevel.segments=3;o.modifiers.new('Hoof normals','WEIGHTED_NORMAL')
                E('ELK dewclaw',(toe_side*.022,.047,-.012),(.009,.014,.014),hoofmat,hoof)
            E('ELK pastern',(0,.020,-.015),(.021,.030,.030),coat,hoof)
            legs.append(dict(side=side,front=front,mesh=leg,joints=joints,hoof=hoof))
    clips=clips_for(task,frames={'walk':12,'run':16,'death':14,'attack':12},fps={'run':16,'attack':12})
    s['animal_design']=json.dumps(dict(species='Eurasian moose bull',facing='-Y',feet='cloven hooves and dewclaws',skeleton='fore elbow/carpus; hind stifle/hock',gait='four-beat walk, hind-pair then fore-pair gallop',antlers='broad palmate paired antlers with seven marginal tines per palm'))
    for name,cfg in clips.items():
        span=cfg['frames'] if cfg['loop'] else cfg['frames']-1
        for j in range(span*4+1):
            frame=cfg['start']+j*.25;t=j/(span*4);u=(t*(2 if name=='run' else 1))%1;p=math.tau*u;s.frame_set(int(frame),subframe=frame%1)
            fall=smooth((t-.18)/.67) if name=='death' else 0;collapse=smooth(t/.35) if name=='death' else 0
            charge=curve(t,[(0,0),(.28,.25),(.52,1),(.72,1),(1,0)]) if name=='attack' else 0
            flight=0.
            if name=='run':
                for a,b in [(.28,.44),(.80,.92)]:
                    if a<u<b:flight=.05*math.sin(math.pi*(u-a)/(b-a))
            root.location=(.95*math.sin(math.pi/2*fall)-.12*fall,-.18*charge,flight);root.rotation_euler=(0,-math.pi/2*fall,0)
            bob=(-.030+.012*math.cos(2*p)) if name=='run' else (-.010+.006*math.cos(2*p)) if name=='walk' else 0
            torso.location=(0,0,bob-.035*charge-.22*collapse*(1-fall));torso.rotation_euler=(.04*charge,0,0);torso.scale=(1,1,1+.003*math.sin(p) if name=='idle' else 1)
            neck.rotation_euler=(.85*charge+.15*fall+(.10 if name=='run' else 0),-.12*fall,.035*math.sin(p) if name=='idle' else 0)
            bell.rotation_euler=(1.30*fall,0,0)
            head.rotation_euler=(.40*charge,1.22*fall,0);tail.rotation_euler=(.25 if name=='run' else 0,0,.05*math.sin(p)*(1-fall))
            for side,ear in ears:ear.rotation_euler=(0,.08*math.sin(p+side) if name=='idle' else 0,side*(-.22 if name=='run' else .05*math.sin(p+side)))
            key=body.shape_key_add(name='Neck_%.2f'%frame);nq=neck.rotation_euler.to_quaternion();identity=Matrix.Identity(4).to_quaternion()
            for v,point,weight in zip(key.data,body_rest,neck_weights):v.co=neck_base+identity.slerp(nq,weight)@(point-neck_base) if weight else point
            for f,value in [(frame-.25,0),(frame,1),(frame+.25,0)]:key.value=value;key.keyframe_insert('value',frame=f)
            key.value=0
            tm=Matrix.Translation(torso.location)@torso.rotation_euler.to_matrix().to_4x4()@Matrix.Diagonal((*torso.scale,1))
            for limb in legs:
                side,front=limb['side'],limb['front'];hip=tm@Vector((side*.16,-.40 if front else .44,1.08 if front else 1.10));toe=Vector((side*.16,-.40 if front else .44,.11));pitch=0
                if name in ['walk','run']:
                    run=name=='run';offset=((.48 if side==-1 else .56) if front else (0 if side==-1 else .08)) if run else ((.25 if side==-1 else .75) if front else (0 if side==-1 else .50))
                    phase=(u+offset)%1;stance=.28 if run else .65;stride=.24 if run else .13
                    if phase<stance:toe.y+=-stride+2*stride*phase/stance
                    else:
                        q=(phase-stance)/(1-stance);toe.y+=stride-2*stride*smooth(q);toe.z+=(.20 if run else .10)*math.sin(math.pi*q);pitch=-(.55 if front else .30)*math.sin(math.pi*q)
                elif name=='attack':toe.y-=root.location.y
                elif name=='death':toe.y+=(-.08 if front else .08)*fall;toe.z+=.31*fall
                points=leg_points(hip,toe,front)
                for o,point in zip(limb['joints'],points):o.location=point
                limb['hoof'].location=points[-1];limb['hoof'].rotation_euler=(pitch,0,0)
                key=limb['mesh'].shape_key_add(name='Pose_%.2f'%frame)
                for v,point in zip(key.data,skin_points(points,front)):v.co=point
                for f,value in [(frame-.25,0),(frame,1),(frame+.25,0)]:key.value=value;key.keyframe_insert('value',frame=f)
                key.value=0
            for o in controlled:
                for prop in ['location','rotation_euler','scale']:o.keyframe_insert(prop,frame=frame)
            root.keyframe_insert('location',frame=frame);root.keyframe_insert('rotation_euler',frame=frame)
            if name=='death':
                s.frame_set(int(frame),subframe=frame%1);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();low=100.
                for o in c.objects:
                    if o.type=='MESH':
                        ev=o.evaluated_get(dg);mesh=ev.to_mesh();low=min(low,min((ev.matrix_world@v.co).z for v in mesh.vertices));ev.to_mesh_clear()
                root.location.z+=max(0,.002-low);root.keyframe_insert('location',frame=frame)
    root.scale=(1.30,1.30,1.30)
    action=root.animation_data.action
    for layer in action.layers:
        for strip in layer.strips:
            for slot in action.slots:
                bag=strip.channelbag(slot)
                if bag:
                    for fc in bag.fcurves:
                        if fc.data_path=='location':
                            for k in fc.keyframe_points:k.co.y*=1.30;k.handle_left.y*=1.30;k.handle_right.y*=1.30
    finish(ns,'elk',clips,source_files=['validate_elk.py'],size=160,target=1.12)

if __name__ in ['__main__','character_build']:build()
