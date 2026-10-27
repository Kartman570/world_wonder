"""Extend the existing guard source with catalogue clips. No renderer is invoked."""
import bpy, math, json
from pathlib import Path
from mathutils import Matrix, Vector
BASE=Path(__file__).resolve().parents[2]
s=bpy.data.scenes['SPRITE_TEMPLATE']; c=bpy.data.collections['ASSET • replace with your character']
root=bpy.data.objects['CHARACTER_ROOT'];body=bpy.data.objects['RIG_body']
chains={side:tuple(bpy.data.objects[n+str(side)] for n in ['RIG_hip','RIG_knee','RIG_ankle','RIG_shoulder','RIG_elbow']) for side in [-1,1]}
# Existing walk (2–14) stays intact. Other clips occupy disjoint timeline ranges.
clips={'idle':dict(start=20,frames=4,fps=4,loop=True),'walk':dict(start=2,frames=12,fps=12,loop=True),'run':dict(start=40,frames=8,fps=10,loop=True),'attack':dict(start=60,frames=8,fps=12,loop=False),'death':dict(start=80,frames=10,fps=12,loop=False)}
# Recover garment bind positions from Basis, with original construction transforms.
bindings=[]
for obj in c.objects:
    if obj.type!='MESH' or not obj.data.shape_keys:continue
    if obj.name.startswith('Continuous wool sleeve'):
        side=-1 if not obj.name.endswith('.001') else 1
        proximal,distal=chains[side][3:5];center,width=1.405,.18
        ra=Vector((side*.335,0,1.745));rb=Vector((side*.407,-.005,1.405))
    elif obj.name.startswith(('Tailored trouser thigh','Trouser knee')):
        # Identify the leg by the Basis centroid; names are not a left/right contract.
        side=-1 if sum(v.co.x for v in obj.data.shape_keys.key_blocks[0].data)<0 else 1
        proximal,distal=chains[side][:2];center,width=.68,.17
        ra=Vector((side*.145,0,1.16));rb=Vector((side*.145,0,.68))
    else:continue
    world=[v.co.copy() for v in obj.data.shape_keys.key_blocks[0].data]
    weights=[max(0,min(1,(center+width*.5-p.z)/width)) for p in world];weights=[w*w*(3-2*w) for w in weights]
    bindings.append((obj,world,weights,proximal,distal,Matrix.Translation(-ra),Matrix.Translation(-rb)))
def ik(side,y,z,hip_z):
    hip,knee,ankle,_,_=chains[side];hip.location=(side*.145,0,hip_z)
    down=hip_z-z;dist=math.hypot(y,down);l1,l2=.48,.49
    if not .011<dist<.97:raise ValueError(('unreachable target',side,y,z,hip_z,dist))
    k=math.pi-math.acos(max(-1,min(1,(l1*l1+l2*l2-dist*dist)/(2*l1*l2))))
    a=math.acos(max(-1,min(1,(l1*l1+dist*dist-l2*l2)/(2*l1*dist))))
    h=math.atan2(y,down)-a
    hip.rotation_euler=(h,0,0);knee.rotation_euler=(k,0,0);ankle.rotation_euler=(-h-k,0,0)
def smooth(x):x=max(0,min(1,x));return x*x*(3-2*x)
def attack_phase(t):
    # wind-up, committed forward cut, deceleration and recovery
    keys=[(0,0),(.27,1),(.45,1),(.64,-.25),(.78,-.25),(1,0)]
    for (a,va),(b,vb) in zip(keys,keys[1:]):
        if t<=b:return va+(vb-va)*smooth((t-a)/(b-a))
    return 0
animated=[root,body]+[o for chain in chains.values() for o in chain]
new_frames=[]
for clip in ['idle','run','attack','death']:
    cfg=clips[clip];start=cfg['start']; span=cfg['frames'] if cfg['loop'] else cfg['frames']-1
    for j in range(span*4+1):
        frame=start+j*.25;t=j/(span*4);phase=t*math.tau
        root.location=(0,0,0);root.rotation_euler=(0,0,0)
        body.location=(0,0,-.02);body.rotation_euler=(0,0,0);body.scale=(1,1,1)
        for side,chain in chains.items():
            for obj in chain:obj.rotation_euler=(0,0,0)
            chain[3].location=(side*.335,0,1.745);chain[4].location=(side*.072,-.005,-.34)
        if clip=='idle':
            body.scale.z=1+.0025*math.sin(phase);body.rotation_euler.z=.005*math.sin(phase)
            for side,chain in chains.items():
                ik(side,0,.174,1.135);chain[3].rotation_euler.x=.012*side*math.sin(phase);chain[4].rotation_euler.x=.06
        elif clip=='run':
            # Stance occupies 36% of each leg's cycle; both feet lift during flight.
            flight=.065*max(0,math.cos(phase*2))
            bob=-.035+.026*math.cos(phase*2)
            body.location.z=bob;body.rotation_euler.x=.12;body.rotation_euler.z=.055*math.sin(phase)
            for side,chain in chains.items():
                p=(t+(0 if side==-1 else .5))%1
                if p<.36:y=-.28+.56*p/.36; lift=0
                else:
                    u=(p-.36)/.64;y=.28-.56*u;lift=.24*math.sin(math.pi*u)**1.25
                ik(side,y,.174+lift+flight,1.08+bob+flight)
                chain[3].rotation_euler.x=side*.48*math.sin(phase);chain[4].rotation_euler.x=-.55-.12*side*math.sin(phase)
        elif clip=='attack':
            a=attack_phase(t);strike=smooth((t-.45)/.19)
            body.rotation_euler=(.035*a,0,.18*a);body.location.z=-.02-.035*max(0,a)
            for side,chain in chains.items():
                ik(side,-.09 if side==-1 else .08,.174,1.11-.025*max(0,a))
                chain[3].rotation_euler.x=-.3 if side==-1 else -.15-2.15*max(0,a)-.9*max(0,-a)
                chain[3].rotation_euler.y=0 if side==-1 else -.12*a
                chain[4].rotation_euler.x=-.25 if side==-1 else -.2-.45*max(0,a)-1.0*max(0,-a)
        else:
            collapse=smooth(t/.55);fall=smooth((t-.22)/.65)
            body.location.z=-.02-.10*collapse;body.rotation_euler.x=-.07*math.sin(math.pi*t)
            for side,chain in chains.items():
                ik(side,(.03 if side==-1 else -.035)*collapse,.174,1.135-.18*collapse*(1-fall))
                chain[3].rotation_euler.x=(-.30 if side==-1 else -.18)*collapse*(1-fall)
                chain[3].rotation_euler.y=-side*.32*fall;chain[4].rotation_euler.x=-.25*collapse*(1-fall)
            root.rotation_euler.x=-math.pi/2*fall
            root.location.y=-.65*fall
        # Key controls first; cloth evaluates the pose at the same subframe.
        for obj in animated:
            for prop in ['location','rotation_euler','scale']:obj.keyframe_insert(prop,frame=frame)
        s.frame_set(math.floor(frame),subframe=frame%1);bpy.context.view_layer.update()
        # Bake blended clothes relative to root so falling moves the whole character.
        invroot=root.matrix_world.inverted()
        for obj,world,weights,proximal,distal,inv_a,inv_b in bindings:
            key=obj.data.shape_keys.key_blocks.get(f'Clip_{frame:.2f}') or obj.shape_key_add(name=f'Clip_{frame:.2f}')
            a=invroot@proximal.matrix_world@inv_a;b=invroot@distal.matrix_world@inv_b
            for v,point,w in zip(key.data,world,weights):v.co=(a@point)*(1-w)+(b@point)*w
            for f,val in [(frame-.25,0),(frame,1),(frame+.25,0)]:key.value=val;key.keyframe_insert('value',frame=f)
            key.value=0
        s.frame_set(math.floor(frame),subframe=frame%1);bpy.context.view_layer.update()
        if clip=='death':
            # Ground contact uses evaluated vertices, including deformed cloth and weapon.
            low=10.;dg=bpy.context.evaluated_depsgraph_get()
            for obj in c.objects:
                if obj.type=='MESH':
                    ev=obj.evaluated_get(dg);mesh=ev.to_mesh();low=min(low,min((ev.matrix_world@v.co).z for v in mesh.vertices));ev.to_mesh_clear()
            root.location.z+=.002-low;root.keyframe_insert('location',frame=frame)
        new_frames.append(frame)
# Prevent overshoot at every key, including between exported samples.
for datablock in animated+[o.data.shape_keys for o,*_ in bindings]:
    action=datablock.animation_data.action if datablock.animation_data else None
    if not action:continue
    for layer in action.layers:
        for strip in layer.strips:
            for slot in action.slots:
                bag=strip.channelbag(slot)
                if bag:
                    for curve in bag.fcurves:
                        for key in curve.keyframe_points:key.interpolation='LINEAR'
# Root has no animation in the pre-existing walk interval.
for f in [1,2,14,15,19,25,39,48,49,59,67,68,79]:
    root.location=(0,0,0);root.rotation_euler=(0,0,0);root.scale=(1,1,1)
    for prop in ['location','rotation_euler','scale']:root.keyframe_insert(prop,frame=f)
# The shared framing must also contain the prone corpse and overhead sword.
s.camera.data.ortho_scale=4.2
# Camera height is absolute, so re-running does not accumulate shifts.
s.camera.location.z=10*math.tan(math.radians(30))+1.22
# Recenter vertically to give the sword's wind-up enough overhead room.
s['sprite_export_json']=json.dumps(dict(asset='city_guard',id='city_guard',outputSize=128,fps=12,scale=4.2/3.25,crop=True,publish=False,maxDecodedBytes=16777216,clips=clips),indent=2)
for name,cfg in clips.items():
    marker=s.timeline_markers.get('CLIP_'+name) or s.timeline_markers.new('CLIP_'+name);marker.frame=cfg['start']
s.frame_start=1;s.frame_end=89;s.frame_set(20)
# Embed current exporter, not the previous manifest-v2 copy.
for filename in ['render_8_directions.py','sprite_pipeline.py','animate_guard_clips.py']:
    text=bpy.data.texts.get(filename) or bpy.data.texts.new(filename);text.clear();text.write(((Path(__file__).parent if filename=='animate_guard_clips.py' else BASE/'3d/_shared')/filename).read_text())
bpy.ops.wm.save_as_mainfile(filepath=str(BASE/'3d/city_guard/city_guard.blend'),compress=True)
