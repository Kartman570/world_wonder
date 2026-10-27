"""Player catalogue animations, editable object controls + blended cloth keys."""
import bpy,math,json
from pathlib import Path
from mathutils import Vector,Matrix
BASE=Path(__file__).resolve().parents[2]
s=bpy.data.scenes['SPRITE_TEMPLATE'];c=bpy.data.collections['ASSET • replace with your character']
# Rebuild the approved static design if re-running on an already rigged player.
if bpy.data.objects.get('P_body'):
    p=BASE/'3d/player/build_player.py';exec(compile(p.read_text(),str(p),'exec'),{'__file__':str(p),'__name__':'player_static'})
s=bpy.data.scenes['SPRITE_TEMPLATE'];c=bpy.data.collections['ASSET • replace with your character'];root=bpy.data.objects['CHARACTER_ROOT'];s.frame_set(1)
def empty(name,loc,parent=root):
    o=bpy.data.objects.new(name,None);c.objects.link(o);o.parent=parent;o.location=loc;o.empty_display_size=.07;return o
def keep(o,parent):
    bpy.context.view_layer.update();m=o.matrix_world.copy();o.parent=parent;o.matrix_world=m
body=empty('P_body',(0,0,0));existing=[o for o in c.objects if o.type in {'MESH','CURVE'}]
for o in existing:keep(o,body)
chains={};garments=[]
def prefix(o,names):return any(o.name==n or o.name.startswith(n+'.') for n in names)
for side in [-1,1]:
    hip=empty('P_hip'+str(side),(side*.145,0,1.16));knee=empty('P_knee'+str(side),(0,0,-.48),hip);ankle=empty('P_ankle'+str(side),(0,0,-.49),knee)
    shoulder=empty('P_shoulder'+str(side),(side*.335,0,1.745),body);elbow=empty('P_elbow'+str(side),(side*.072,-.005,-.34),shoulder);hand=empty('P_hand'+str(side),(side*.048,-.095,-.29),elbow)
    chains[side]=(hip,knee,ankle,shoulder,elbow,hand)
    for o in existing:
        if o.type!='MESH':continue
        verts=[o.matrix_world@v.co for v in o.data.vertices];center=sum((v.x for v in verts))/len(verts)
        if (center<0)!=(side<0):continue
        if prefix(o,['Tailored trouser thigh','Trouser knee']):
            # Garment geometry stays under root, then blends hip/knee matrices.
            keep(o,root)
            for v,p in zip(o.data.vertices,verts):v.co=p
            o.matrix_world=Matrix.Identity(4);o.shape_key_add(name='Basis')
            garments.append((o,verts,[max(0,min(1,(.765-p.z)/.17)) for p in verts],hip,knee,Matrix.Translation((-side*.145,0,-1.16)),Matrix.Translation((-side*.145,0,-.68))))
        elif prefix(o,['Shaped boot calf','Boot wrap']):keep(o,knee)
        elif prefix(o,['Boot upper','Boot sole']):keep(o,ankle)
        elif prefix(o,['Continuous wool sleeve']):
            keep(o,root)
            for v,p in zip(o.data.vertices,verts):v.co=p
            o.matrix_world=Matrix.Identity(4);o.shape_key_add(name='Basis')
            garments.append((o,verts,[max(0,min(1,(1.495-p.z)/.18)) for p in verts],shoulder,elbow,Matrix.Translation((-side*.335,0,-1.745)),Matrix.Translation((-side*.407,.005,-1.405))))
        elif prefix(o,['Leather bracer']):keep(o,elbow)
        elif prefix(o,['Wrist','Hand','Knuckle','Curled finger','Thumb']):keep(o,hand)
for i,(o,v,w,a,b,ia,ib) in enumerate(garments):garments[i]=(o,v,[x*x*(3-2*x) for x in w],a,b,ia,ib)
# Separate equipment; original sheathed hilt remains visible when hands are empty.
sheathed=[o for o in existing if prefix(o,['Sheathed sword grip','Sword grip wrapping','Sword guard','Sword pommel'])]
def material(name,rgb,metal=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb,1);p.inputs['Roughness'].default_value=.55;p.inputs['Metallic'].default_value=metal;return m
metal=material('Player equipment • steel',(.30,.33,.35),.75);wood=material('Player equipment • ash wood',(.16,.085,.035));grip=material('Player equipment • dark leather',(.025,.018,.012));gold=material('Player equipment • dull brass',(.25,.17,.055),.6);stringmat=material('Player equipment • bowstring',(.22,.20,.15));black=material('Player equipment • artifact body',(.025,.037,.037),.4)
weapons={k:[] for k in ['sword','axe','hammer','bow','cutter','knife']}
controllers={k:empty('EQUIP_'+k,(0,0,0),chains[-1 if k=='bow' else 1][5]) for k in weapons}
def finish(o,name,mat,weapon):
    o.name=name
    for col in list(o.users_collection):col.objects.unlink(o)
    c.objects.link(o);o.parent=controllers[weapon];o.data.materials.append(mat);weapons[weapon].append(o);return o
def rod(name,a,b,r,mat,k,r2=None):
    a,b=Vector(a),Vector(b);bpy.ops.mesh.primitive_cone_add(vertices=16,radius1=r,radius2=r if r2 is None else r2,depth=(b-a).length,location=(a+b)/2);o=finish(bpy.context.object,name,mat,k);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o
def box(name,loc,scale,mat,k):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=finish(bpy.context.object,name,mat,k);o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);m=o.modifiers.new('Edge bevel','BEVEL');m.width=.008;m.segments=2;return o
def meshobj(name,verts,faces,mat,k):
    m=bpy.data.meshes.new(name);m.from_pydata(verts,[],faces);m.update();o=bpy.data.objects.new(name,m);c.objects.link(o);o.parent=controllers[k];m.materials.append(mat);weapons[k].append(o);return o
def sword(k,length,width):
    rod(k+' grip',(0,0,.10),(0,0,-.04),.021,grip,k);rod(k+' guard',(-.10,0,-.05),(.10,0,-.05),.012,metal,k)
    rod(k+' pommel',(0,0,.10),(0,0,.13),.030,metal,k,r2=.015)
    verts=[]
    for z,w in [(-.07,width),(-length+.12,width*.65),(-length,0)]:verts.extend([(-w,0,z),(0,-.009,z),(w,0,z),(0,.009,z)])
    faces=[(j*4+i,j*4+(i+1)%4,(j+1)*4+(i+1)%4,(j+1)*4+i) for j in range(2) for i in range(4)];meshobj(k+' blade',verts,faces,metal,k)
sword('sword',.82,.033);sword('knife',.29,.023)
for k in ['axe','hammer']:
    rod(k+' haft',(0,0,.13),(0,0,-.70),.022,wood,k);rod(k+' grip',(0,0,.09),(0,0,-.09),.027,grip,k)
box('Hammer head',(0,0,-.66),(.30,.13,.16),metal,'hammer');rod('Hammer rear spike',(-.23,0,-.66),(-.12,0,-.66),.02,metal,'hammer',r2=.045)
meshobj('Axe broad blade',[(-.02,-.025,-.51),(.22,-.02,-.47),(.28,-.015,-.72),(-.02,-.025,-.68),(-.02,.025,-.51),(.22,.02,-.47),(.28,.015,-.72),(-.02,.025,-.68)],[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],metal,'axe')
# A recurved bow in the forearm's YZ plane; drawn string is a separate morph.
points=[]
for i in range(17):
    y=-.42+i*.84/16;z=-.13*math.sin(math.pi*i/16)+.025*math.sin(3*math.pi*i/16);points.append((0,y,z))
for a,b in zip(points,points[1:]):rod('Bow limb',a,b,.013,wood,'bow')
rod('Bow handgrip',(0,-.05,-.13),(0,.05,-.13),.022,grip,'bow')
# Bowstring as thin mesh with a centre vertex group, driven by a shape key.
verts=[]
for y,z in [(-.42,0),(0,.025),(.42,0)]:verts.extend([(-.002,y,z),(.002,y,z)])
bowstring=meshobj('Bow string',verts,[(0,1,3,2),(2,3,5,4)],stringmat,'bow');bowstring.shape_key_add(name='Basis');drawkey=bowstring.shape_key_add(name='Draw');drawkey.data[2].co.z=.23;drawkey.data[3].co.z=.23
box('Cutter grip',(0,0,.02),(.045,.055,.16),grip,'cutter');box('Ribbed cutter body',(0,-.025,-.16),(.105,.11,.19),black,'cutter')
for z in [-.23,-.19,-.15,-.11]:box('Cutter cooling rib',(0,-.025,z),(.13,.13,.012),gold,'cutter')
rod('Cutter emitter',(0,-.025,-.25),(0,-.025,-.29),.035,metal,'cutter')
# Use catalogue frame recommendations exactly. Extra sheath/knife-work fulfil descriptions.
catalog=json.loads((BASE/'sprites/manifest.json').read_text());task=next(e for e in catalog['catalog'] if e['id']=='player');clips={};cursor=10
for name,entry in task['animations'].items():
    if name in ['sheath','work_knife']:continue
    clips[name]=dict(start=cursor,frames=entry['suggestedFrames'],fps=entry['fps'],loop=entry['loop']);cursor+=entry['suggestedFrames']+5
clips['sheath']=dict(start=cursor,frames=4,fps=12,loop=False);cursor+=9
clips['work_knife']=dict(start=cursor,frames=8,fps=10,loop=True)
def ik(side,y,z,hip_z):
    hip,knee,ankle,*_=chains[side];hip.location=(side*.145,0,hip_z)
    down=hip_z-z;dist=math.hypot(y,down);l1,l2=.48,.49
    if not .011<dist<.97:raise ValueError(('unreachable foot',side,y,z,hip_z,dist))
    k=math.pi-math.acos(max(-1,min(1,(l1*l1+l2*l2-dist*dist)/(2*l1*l2))));a=math.acos(max(-1,min(1,(l1*l1+dist*dist-l2*l2)/(2*l1*dist))));h=math.atan2(y,down)-a
    hip.rotation_euler=(h,0,0);knee.rotation_euler=(k,0,0);ankle.rotation_euler=(-h-k,0,0)
def reach(side,target,orientation=None):
    """Analytic arm reach in world space; elbow pole stays in front/outside torso."""
    hip,knee,ankle,shoulder,elbow,hand=chains[side]
    bpy.context.view_layer.update()
    origin=shoulder.matrix_world.translation.copy();target=Vector(target);delta=target-origin
    upper=Vector((side*.072,-.005,-.34));lower=Vector((side*.048,-.095,-.29));l1,l2=upper.length,lower.length
    distance=min(delta.length,l1+l2-.006);direction=delta.normalized();target=origin+direction*distance
    pole=Vector((side*.28,-.30,.03));pole=(pole-direction*pole.dot(direction)).normalized()
    along=(l1*l1-l2*l2+distance*distance)/(2*distance);height=math.sqrt(max(0,l1*l1-along*along));joint=origin+direction*along+pole*height
    parent_q=shoulder.parent.matrix_world.to_quaternion();desired_upper=parent_q.inverted()@(joint-origin)
    shoulder.rotation_euler=upper.rotation_difference(desired_upper).to_euler();bpy.context.view_layer.update()
    desired_lower=shoulder.matrix_world.to_quaternion().inverted()@(target-joint)
    elbow.rotation_euler=lower.rotation_difference(desired_lower).to_euler();bpy.context.view_layer.update()
    if orientation is not None:hand.rotation_euler=(elbow.matrix_world.to_quaternion().inverted()@orientation).to_euler()
def smooth(x):x=max(0,min(1,x));return x*x*(3-2*x)
def curve(t,keys):
    for (a,va),(b,vb) in zip(keys,keys[1:]):
        if t<=b:return va+(vb-va)*smooth((t-a)/(b-a))
    return keys[-1][1]
animated=[root,body]+[o for chain in chains.values() for o in chain]+list(controllers.values())
cloak=bpy.data.objects['Player • asymmetric road mantle'];cloak.shape_key_add(name='Basis');flutter=cloak.shape_key_add(name='Cloth flutter')
for v,b in zip(flutter.data,cloak.data.shape_keys.key_blocks[0].data):v.co.y+=max(0,1.75-b.co.z)*.07;v.co.x+=max(0,1.75-b.co.z)*.015
all_prop=[o for objs in weapons.values() for o in objs]
for clip,cfg in clips.items():
    start=cfg['start'];span=cfg['frames'] if cfg['loop'] else cfg['frames']-1
    for j in range(span*4+1):
        frame=start+j*.25;t=j/(span*4);phase=t*math.tau
        root.location=(0,0,0);root.rotation_euler=(0,0,0);root.scale=(1,1,1);body.location=(0,0,-.02);body.rotation_euler=(0,0,0);body.scale=(1,1,1)
        for side,ch in chains.items():
            for o in ch:o.rotation_euler=(0,0,0)
            ik(side,0,.174,1.135);ch[3].rotation_euler.x=side*.012;ch[4].rotation_euler.x=.06
        for k,ctrl in controllers.items():
            ctrl.location=(0,-.012,.07 if k=='bow' else (-.09 if k in ['sword','knife'] else -.06));ctrl.rotation_euler=(0,0,0)
        equip=None;draw=0
        if clip=='idle':
            body.scale.z=1+.003*math.sin(phase);body.rotation_euler.z=.008*math.sin(phase)
        elif clip in ['walk','run']:
            run=clip=='run';bob=(-.03+.02*math.cos(phase*2)) if run else (-.014+.010*math.cos(phase*2));flight=.055*max(0,math.cos(phase*2)) if run else 0
            body.location.z=bob;body.rotation_euler.x=.12 if run else .018;body.rotation_euler.z=(.045 if run else .02)*math.sin(phase)
            for side,ch in chains.items():
                p=(t+(0 if side==-1 else .5))%1
                if run:
                    if p<.36:y=-.27+.54*p/.36;lift=0
                    else:u=(p-.36)/.64;y=.27-.54*u;lift=.24*math.sin(math.pi*u)**1.25
                else:y=-.205*math.sin(p*math.tau);lift=.105*max(0,math.cos(p*math.tau))**1.5
                ik(side,y,.174+lift+flight,(1.08 if run else 1.135)+bob+flight);ch[3].rotation_euler.x=side*(.43 if run else .23)*math.sin(phase);ch[4].rotation_euler.x=-.45 if run else -.07
        elif clip in ['attack','attack_sword','attack_axe','attack_hammer']:
            equip={'attack':'sword','attack_sword':'sword','attack_axe':'axe','attack_hammer':'hammer'}[clip]
            a=curve(t,[(0,0),(.30,1),(.42,1),(.63,-.28),(.78,-.22),(1,0)])
            body.rotation_euler=(.05*a,0,(.55 if equip=='axe' else .18)*a);body.location.z=-.02-.055*max(a,0)
            for side,ch in chains.items():
                ik(side,-.10 if side==-1 else .07,.174,1.11-.025*max(a,0))
                ch[3].rotation_euler.x=-.25 if side==-1 else -.22-2.1*max(a,0)-.9*max(-a,0);ch[4].rotation_euler.x=-.15 if side==-1 else -.18-.45*max(a,0)-.9*max(-a,0)
            if equip=='axe':chains[1][3].rotation_euler.y=.65*a;chains[1][5].rotation_euler.z=-.3*a
            if equip=='hammer':
                chains[-1][3].rotation_euler.x=-1.0-1.1*max(a,0);chains[-1][3].rotation_euler.y=-.55;chains[-1][4].rotation_euler.x=-.7
        elif clip=='attack_bow':
            equip='bow';draw=curve(t,[(0,0),(.55,1),(.68,1),(.76,0),(1,0)])
            body.rotation_euler.z=-.10
            chains[-1][3].rotation_euler.x=-1.50;chains[-1][3].rotation_euler.y=.15;chains[-1][4].rotation_euler.x=-.10
            chains[1][3].rotation_euler.x=-1.32;chains[1][3].rotation_euler.y=-.40;chains[1][4].rotation_euler.x=-.20-1.25*draw;chains[1][5].rotation_euler.y=-.25
        elif clip=='attack_cutter':
            equip='cutter';a=math.sin(math.pi*t)**.65;chains[1][3].rotation_euler.x=-1.35*a;chains[1][4].rotation_euler.x=-.30*a;chains[-1][3].rotation_euler.x=-.55*a
        elif clip in ['work','work_knife']:
            equip='knife' if clip=='work_knife' else None;body.rotation_euler.x=.14+.05*math.sin(phase);body.location.z=-.055
            chains[-1][3].rotation_euler.x=-.80;chains[-1][4].rotation_euler.x=-.5
            chains[1][3].rotation_euler.x=-.72-.16*math.sin(phase);chains[1][4].rotation_euler.x=-.7-.22*math.cos(phase)
        elif clip=='stunned':
            body.rotation_euler=(.06*math.sin(phase),.08*math.sin(phase),.10*math.cos(phase));body.location.z=-.06
            for side,ch in chains.items():ik(side,side*.055*math.sin(phase),.174,1.10);ch[3].rotation_euler.y=-side*.25
        elif clip in ['draw_weapon','sheath']:
            tt=1-t if clip=='sheath' else t;a=smooth(tt)
            chains[1][3].rotation_euler.x=-.6-.45*math.sin(math.pi*tt);chains[1][3].rotation_euler.y=.9*(1-a);chains[1][4].rotation_euler.x=-1.2*(1-a)-.15*a
            chains[1][5].rotation_euler.z=.4*(1-a)
            if tt>.25:equip='sword'
            controllers['sword'].location.z=-.09-.10*math.sin(math.pi*tt);controllers['sword'].rotation_euler.y=.4*(1-a)
        elif clip=='ride':
            root.location.z=.24+.018*math.sin(phase*2);body.rotation_euler.x=.04*math.sin(phase);body.location.z=-.035
            for side,ch in chains.items():
                ch[0].location=(side*.145,0,1.135);ch[0].rotation_euler=(-1.03,-side*.32,0);ch[1].rotation_euler.x=1.42;ch[2].rotation_euler.x=-.39
                ch[3].rotation_euler.x=-.72+.025*math.sin(phase);ch[4].rotation_euler.x=-.60;ch[3].rotation_euler.y=side*.12
        elif clip=='swim':
            root.rotation_euler.x=math.pi/2;root.location=(0,.65,.46+.018*math.sin(phase*2));body.rotation_euler.z=.055*math.sin(phase)
            for side,ch in chains.items():
                p=phase+(math.pi if side==1 else 0);ch[0].location=(side*.145,0,1.135);ch[0].rotation_euler.x=.15*math.sin(p);ch[1].rotation_euler.x=.20+.15*max(0,math.cos(p));ch[2].rotation_euler.x=-.1
                ch[3].rotation_euler.x=-math.pi*(.5+.5*math.sin(p));ch[3].rotation_euler.y=-side*.35;ch[4].rotation_euler.x=-.2-.45*max(0,math.cos(p))
        elif clip=='death':
            collapse=smooth(t/.55);fall=smooth((t-.22)/.65);root.rotation_euler.x=-math.pi/2*fall;root.location.y=-.65*fall;body.location.z=-.02-.10*collapse
            for side,ch in chains.items():
                ik(side,(.03 if side==-1 else -.035)*collapse,.174,1.135-.18*collapse*(1-fall));ch[3].rotation_euler.x=-.24*collapse*(1-fall);ch[3].rotation_euler.y=-side*.32*fall;ch[4].rotation_euler.x=-.25*collapse*(1-fall)
        # Hand contact poses are solved after torso placement, before keys are baked.
        if clip=='attack_bow':
            q=Matrix.Rotation(-math.pi/2,4,'X').to_quaternion()
            reach(-1,(-.12,-.54,1.63),q)
            reach(1,(-.075,-.44+.25*draw,1.63),q)
        elif clip=='attack_hammer':
            a=curve(t,[(0,0),(.30,1),(.42,1),(.63,-.28),(.78,-.22),(1,0)])
            wind=max(0,a);cut=max(0,-a)/.28
            center=Vector((0,-.23-.31*cut,1.28+wind*.94+cut*.10))
            q=Matrix.Rotation(-math.pi*wind-math.pi/2*cut,4,'X').to_quaternion()
            reach(1,center+Vector((.035,0,0)),q)
            reach(-1,center+Vector((-.035,0,.065)),q)
        elif clip in ['draw_weapon','sheath']:
            tt=1-t if clip=='sheath' else t
            body.location.x=-.09*(1-smooth(tt));body.rotation_euler.x=.04*(1-smooth(tt));bpy.context.view_layer.update()
            startpoint=Vector((-.265,-.025,1.345));lifted=Vector((-.24,-.10,1.84));ready=Vector((.455,-.16,1.18))
            target=startpoint.lerp(lifted,smooth(tt/.6)) if tt<.6 else lifted.lerp(ready,smooth((tt-.6)/.4))
            q=Matrix.Rotation(.20*(1-tt),4,'Y').to_quaternion();reach(1,target,q)
            controllers['sword'].rotation_euler=(0,0,0);controllers['sword'].location=(0,-.012,-.09)
        # Per-frame equipment visibility is keyed, never switched by exporter callbacks.
        for k,objects in weapons.items():
            for obj in objects:
                obj.hide_render=k!=equip;obj.hide_viewport=k!=equip;obj.keyframe_insert('hide_render',frame=frame);obj.keyframe_insert('hide_viewport',frame=frame)
        for obj in sheathed:
            obj.hide_render=equip=='sword';obj.hide_viewport=equip=='sword';obj.keyframe_insert('hide_render',frame=frame);obj.keyframe_insert('hide_viewport',frame=frame)
        drawkey.value=draw;drawkey.keyframe_insert('value',frame=frame)
        flutter.value=.4+.25*math.sin(phase) if cfg['loop'] else .4*math.sin(math.pi*t);flutter.keyframe_insert('value',frame=frame)
        for obj in animated:
            for prop in ['location','rotation_euler','scale']:obj.keyframe_insert(prop,frame=frame)
        s.frame_set(math.floor(frame),subframe=frame%1);bpy.context.view_layer.update();invroot=root.matrix_world.inverted()
        for obj,world,weights,a,b,ia,ib in garments:
            key=obj.shape_key_add(name=f'Pose_{frame:.2f}');ma=invroot@a.matrix_world@ia;mb=invroot@b.matrix_world@ib
            for v,p,w in zip(key.data,world,weights):v.co=(ma@p)*(1-w)+(mb@p)*w
            for f,value in [(frame-.25,0),(frame,1),(frame+.25,0)]:key.value=value;key.keyframe_insert('value',frame=f)
            key.value=0
        s.frame_set(math.floor(frame),subframe=frame%1);bpy.context.view_layer.update()
        if clip=='death':
            dg=bpy.context.evaluated_depsgraph_get();low=10
            for obj in c.objects:
                if obj.type in {'MESH','CURVE'} and not obj.hide_render:
                    ev=obj.evaluated_get(dg);m=ev.to_mesh();low=min(low,min((ev.matrix_world@v.co).z for v in m.vertices));ev.to_mesh_clear()
            root.location.z+=.002-low;root.keyframe_insert('location',frame=frame)
# Bounded interpolation for joints, constant interpolation for equipment visibility.
animated_data=animated+all_prop+sheathed+[o.data.shape_keys for o,*_ in garments]+[cloak.data.shape_keys,bowstring.data.shape_keys]
for data in animated_data:
    action=data.animation_data.action if data.animation_data else None
    if action:
        for layer in action.layers:
            for strip in layer.strips:
                for slot in action.slots:
                    bag=strip.channelbag(slot)
                    if bag:
                        for fc in bag.fcurves:
                            for key in fc.keyframe_points:key.interpolation='CONSTANT' if fc.data_path in ['hide_render','hide_viewport'] else 'LINEAR'
s['sprite_asset']='player';s['style_stage']='Animated catalogue player';s['sprite_contract_version']=3
s['sprite_output_size']=144;s['sprite_pixels_per_unit']=128/4.2
s['sprite_export_json']=json.dumps(dict(asset='player',outputSize=144,fps=12,scale=4.2/3.25,crop=True,publish=False,maxDecodedBytes=67108864,maxWorkingBytes=134217728,maxAtlasSide=16384,clips=clips),indent=2)
s.render.resolution_x=288;s.render.resolution_y=288;s.render.resolution_percentage=100;s.cycles.samples=48
s.camera.data.ortho_scale=4.725;s.camera.location.z=10*math.tan(math.radians(30))+1.22
s.timeline_markers.clear()
for name,cfg in clips.items():s.timeline_markers.new('CLIP_'+name,frame=cfg['start'])
s.frame_start=1;s.frame_end=max(v['start']+v['frames'] for v in clips.values());s.frame_set(clips['idle']['start'])
for filename in ['animate_player.py','render_8_directions.py','sprite_pipeline.py']:
    text=bpy.data.texts.get(filename) or bpy.data.texts.new(filename);text.clear();text.write(((Path(__file__).parent if filename=='animate_player.py' else BASE/'3d/_shared')/filename).read_text())
bpy.ops.wm.save_as_mainfile(filepath=str(BASE/'3d/player/player.blend'),compress=True)
