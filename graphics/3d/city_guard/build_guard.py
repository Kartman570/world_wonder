"""Detailed city guard, articulated rigid-piece character; run in Blender."""
import bpy, math
from mathutils import Vector, Matrix
from pathlib import Path
BASE=Path(__file__).resolve().parents[2]
s=bpy.data.scenes['SPRITE_TEMPLATE']; bpy.context.window.scene=s; s.frame_set(1)
c=bpy.data.collections['ASSET • replace with your character']
for o in list(c.objects): bpy.data.objects.remove(o,do_unlink=True)
root=bpy.data.objects.new('CHARACTER_ROOT',None); c.objects.link(root)
def material(name,color,rough=.65,metal=0,texture=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True; n=m.node_tree.nodes; p=n.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1); p.inputs['Metallic'].default_value=metal; p.inputs['Roughness'].default_value=rough
    if texture:
        tex=n.new('ShaderNodeTexNoise'); tex.inputs['Scale'].default_value=texture; tex.inputs['Detail'].default_value=2
        ramp=n.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].position=.15; ramp.color_ramp.elements[0].color=tuple(v*.65 for v in color)+(1,); ramp.color_ramp.elements[1].position=.85; ramp.color_ramp.elements[1].color=tuple(min(1,v*1.17) for v in color)+(1,)
        m.node_tree.links.new(tex.outputs['Fac'],ramp.inputs[0]); m.node_tree.links.new(ramp.outputs[0],p.inputs['Base Color'])
        bump=n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=.16; bump.inputs['Distance'].default_value=.012; m.node_tree.links.new(tex.outputs['Fac'],bump.inputs['Height']); m.node_tree.links.new(bump.outputs[0],p.inputs['Normal'])
    return m
cloth=material('Weathered slate wool',(.065,.092,.12),texture=130)
leather=material('Oiled brown leather',(.115,.063,.032),texture=85)
trim=material('Worn leather edges',(.21,.13,.063),texture=100)
boots=material('Dark boot leather',(.032,.024,.018),texture=90)
linen=material('Undyed linen',(.23,.20,.15),texture=160)
skin=material('Skin',(.46,.275,.17),rough=.7,texture=65)
steel=material('Forged steel',(.21,.235,.25),rough=.44,metal=.8,texture=110)
blade=material('Polished blade',(.43,.46,.48),rough=.29,metal=.85)
brass=material('Aged brass',(.34,.23,.08),rough=.48,metal=.7)
dark=material('Eye and seam dark',(.014,.01,.008)); hair=material('Beard stubble',(.06,.035,.022),texture=90)
parts={}
def empty(name,loc,parent=root):
    o=bpy.data.objects.new(name,None); c.objects.link(o); o.parent=parent; o.location=loc; o.empty_display_size=.08; return o
def done(o,name,m,group='body',smooth=True):
    o.name=name
    for col in list(o.users_collection): col.objects.unlink(o)
    c.objects.link(o); o.parent=root; o.data.materials.append(m)
    if smooth:
        for p in o.data.polygons: p.use_smooth=True
    parts.setdefault(group,[]).append(o); return o
def ell(name,loc,scale,m,group='body'):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=20,location=loc); o=done(bpy.context.object,name,m,group); o.scale=scale; return o
def box(name,loc,scale,m,group='body',bevel=.008):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc); o=done(bpy.context.object,name,m,group,False); o.scale=scale; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    mod=o.modifiers.new('Rounded edges','BEVEL'); mod.width=bevel; mod.segments=3; o.modifiers.new('Surface normals','WEIGHTED_NORMAL'); return o
def rod(name,a,b,r,m,group='body',r2=None):
    a,b=Vector(a),Vector(b); bpy.ops.mesh.primitive_cone_add(vertices=32,radius1=r,radius2=r if r2 is None else r2,depth=(b-a).length,location=(a+b)/2); o=done(bpy.context.object,name,m,group); o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler(); return o
def rings(name,sections,m,group='body',n=48,fold=0):
    verts=[]
    for z,w,d in sections:
        for i in range(n):
            t=i*math.tau/n; f=1+fold*math.cos(t*12); verts.append((w*math.cos(t)*f,d*math.sin(t)*f,z))
    faces=[tuple(reversed(range(n)))]
    for j in range(len(sections)-1):
        for i in range(n): faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
    faces.append(tuple(range((len(sections)-1)*n,len(sections)*n)))
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces); mesh.update(); o=bpy.data.objects.new(name,mesh); c.objects.link(o); o.parent=root; mesh.materials.append(m)
    for p in mesh.polygons: p.use_smooth=True
    parts.setdefault(group,[]).append(o); return o
def limb(name,a,b,profiles,m,group,fold=0):
    """Elliptical tailored cross sections instead of intersecting capsule primitives."""
    a,b=Vector(a),Vector(b); axis=(b-a).normalized(); right=Vector((1,0,0)); right=(right-axis*right.dot(axis)).normalized(); depth=axis.cross(right).normalized()
    verts=[]; n=32
    for t,w,d in profiles:
        center=a.lerp(b,t)
        for i in range(n):
            angle=i*math.tau/n; wrinkle=1+fold*math.cos(angle*7+t*9)
            verts.append(tuple(center+(right*w*math.cos(angle)+depth*d*math.sin(angle))*wrinkle))
    faces=[tuple(reversed(range(n)))]
    for j in range(len(profiles)-1):
        for i in range(n): faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
    faces.append(tuple(range((len(profiles)-1)*n,len(profiles)*n)))
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces); mesh.update(); o=bpy.data.objects.new(name,mesh); c.objects.link(o); o.parent=root; mesh.materials.append(m)
    for poly in mesh.polygons: poly.use_smooth=True
    parts.setdefault(group,[]).append(o); return o
# Natural adult silhouette, sloping shoulders and restrained volumes.
rings('Wool tunic skirt',[(1.075,.287,.218),(1.11,.283,.204),(1.19,.248,.178),(1.27,.224,.14),(1.30,.223,.135)],cloth,fold=.018)
rings('Fitted leather jack',[(1.25,.23,.142),(1.33,.224,.15),(1.44,.245,.156),(1.60,.279,.158),(1.70,.284,.146),(1.76,.262,.123),(1.80,.187,.106),(1.835,.095,.083)],leather)
rings('Waist belt',[(1.245,.239,.151),(1.30,.239,.151)],boots)
box('Belt buckle',(0,-.158,1.272),(.058,.014,.045),brass)
box('Jack front placket',(0,-.161,1.55),(.018,.010,.40),trim)
# Rows of small rivets and stitched seams for close-up rendering.
for x in [-.20,-.11,.11,.20]:
    for z in [1.38,1.49,1.60,1.70]: ell('Jack rivet',(x,-.176*(1-(x/.45)**2),z),(.006,.006,.006),brass)
for side in [-1,1]:
    for z in [1.35+i*.025 for i in range(16)]: box('Leather stitch',(side*.235,-.117,z),(.009,.004,.003),linen,bevel=.001)
rod('Linen collar',(0,0,1.79),(0,0,1.85),.094,linen)
rod('Neck',(0,.009,1.81),(0,.009,1.98),.073,skin)
# Sculpted continuous head surface with jaw planes; details are small and recessed.
def make_head():
    sections=[(1.938,.043,.041,-.044),(1.955,.063,.062,-.025),(1.98,.085,.082,-.009),(2.02,.104,.096,.004),(2.06,.116,.104,.009),(2.105,.119,.108,.012),(2.15,.12,.107,.016),(2.19,.105,.098,.019),(2.218,.07,.068,.02),(2.23,.01,.012,.02)]
    n=64; verts=[]
    for z,w,d,cy in sections:
        for i in range(n):
            t=i*math.tau/n; x=w*math.cos(t); yy=math.sin(t)
            # A flatter anterior face, narrower temples, and distinct cheekbone plane.
            y=cy+d*yy
            if yy<-.55: y=cy-d*(.89+.11*(-yy))
            verts.append((x,y,z))
    faces=[tuple(reversed(range(n)))]
    for j in range(len(sections)-1):
        for i in range(n): faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
    faces.append(tuple(range((len(sections)-1)*n,len(sections)*n)))
    mesh=bpy.data.meshes.new('Head anatomy'); mesh.from_pydata(verts,[],faces); mesh.update(); o=bpy.data.objects.new('Anatomical head',mesh); c.objects.link(o); o.parent=root; mesh.materials.append(skin); parts.setdefault('body',[]).append(o)
    for poly in mesh.polygons: poly.use_smooth=True
    sub=o.modifiers.new('Facial surface','SUBSURF'); sub.levels=2
make_head()
# Nose is a single planar wedge, not a round knob.
verts=[(-.012,-.098,2.108),(.012,-.098,2.108),(-.014,-.128,2.045),(.014,-.128,2.045),(-.023,-.117,2.033),(.023,-.117,2.033),(0,-.143,2.038),(0,-.111,2.027)]
faces=[(0,1,3,2),(0,2,4),(1,5,3),(2,3,6),(2,6,4),(3,5,6),(4,6,7),(6,5,7),(0,4,7,5,1)]
mesh=bpy.data.meshes.new('Nose planes'); mesh.from_pydata(verts,[],faces); mesh.update(); o=bpy.data.objects.new('Nose',mesh); c.objects.link(o); o.parent=root; mesh.materials.append(skin); parts['body'].append(o)
be=o.modifiers.new('Nose soft edges','BEVEL'); be.width=.003; be.segments=2
for side in [-1,1]:
    ell('Ear',(side*.118,.005,2.061),(.014,.024,.040),skin)
    # Narrow eyelids, subdued sclera; brows stay close to the facial plane.
    ell('Eye',(side*.046,-.096,2.081),(.020,.006,.006),linen)
    ell('Iris',(side*.046,-.102,2.081),(.006,.002,.005),dark)
    rod('Upper eyelid',(side*.046-.019,-.101,2.086),(side*.046+.019,-.101,2.086),.003,skin)
    rod('Brow',(side*.046-.022,-.098,2.102),(side*.046+.022,-.098,2.106),.0035,hair)
    ell('Nostril',(side*.012,-.129,2.032),(.004,.003,.0025),dark)
rod('Mouth line',(-.025,-.093,1.988),(.025,-.093,1.988),.0018,hair)
rod('Lower lip',(-.021,-.094,1.984),(.021,-.094,1.984),.003,skin)
# Kettle helmet with rolled rim, metal seams and rivets.
rings('Steel helmet crown',[(2.13,.148,.139),(2.19,.145,.132),(2.28,.108,.10),(2.32,.045,.043),(2.325,.005,.005)],steel)
rings('Kettle brim',[(2.125,.207,.193),(2.14,.207,.193),(2.16,.145,.14)],steel)
rings('Helmet band',[(2.15,.15,.142),(2.175,.15,.142)],trim)
for i in range(12):
    t=i*math.tau/12; ell('Helmet rivet',(.151*math.cos(t),.143*math.sin(t),2.165),(.005,.005,.005),brass)
for side in [-1,1]: rod('Chin strap',(side*.127,.005,2.15),(side*.074,-.03,1.946),.011,leather)
# Chest city emblem: subdued brass shield, not a bright cartoon badge.
box('City insignia',(-.115,-.177,1.68),(.058,.012,.075),brass,bevel=.012)
rod('Badge vertical',(-.115,-.187,1.654),(-.115,-.187,1.70),.004,steel)
rod('Badge horizontal',(-.135,-.187,1.681),(-.095,-.187,1.681),.004,steel)
# Legs and arms are grouped per articulated segment.
for side in [-1,1]:
    x=side*.145; leg='thigh'+str(side); shin='shin'+str(side); foot='foot'+str(side); upper='upper'+str(side); fore='fore'+str(side); hand='hand'+str(side)
    limb('Tailored trouser thigh',(x,0,1.17),(x,0,.60),[(0,.108,.114),(.17,.116,.119),(.43,.106,.109),(.75,.087,.092),(1,.077,.080)],cloth,leg,.02)
    ell('Trouser knee',(x,0,.66),(.080,.086,.076),cloth,leg)
    limb('Shaped boot calf',(x,0,.63),(x,0,.15),[(0,.087,.088),(.12,.089,.092),(.38,.087,.089),(.67,.065,.069),(1,.058,.062)],boots,shin)
    rod('Boot cuff',(x,0,.60),(x,0,.625),.091,trim,shin)
    # Human foot: ankle, low instep, and a flatter toe rather than an egg.
    limb('Boot upper',(x,.045,.105),(x,-.22,.072),[(0,.058,.06),(.22,.069,.082),(.46,.079,.071),(.78,.074,.040),(1,.058,.029)],boots,foot)
    box('Boot sole',(x,-.078,.029),(.157,.31,.024),boots,foot,.012)
    for z in [.28,.39,.50]: box('Boot side seam',(x+side*.076,-.005,z),(.004,.008,.07),trim,shin,.001)
    shoulder=(side*.335,0,1.745); elbow=(side*.407,-.005,1.405); wrist=(side*.455,-.10,1.115)
    limb('Continuous wool sleeve',Vector(shoulder)+Vector((-side*.025,0,.055)),wrist,[(0,.025,.036),(.06,.076,.087),(.15,.093,.099),(.32,.087,.091),(.50,.072,.079),(.58,.069,.075),(.68,.072,.074),(.85,.058,.060),(1,.048,.051)],cloth,upper,.014)
    rod('Leather bracer',Vector(elbow)*.68+Vector(wrist)*.32,Vector(elbow)*.1+Vector(wrist)*.9,.079,leather,fore,r2=.063)
    for fac in [.40,.78]:
        center=Vector(elbow).lerp(Vector(wrist),fac); rod('Bracer strap',center-Vector((0,0,.014)),center+Vector((0,0,.014)),.081,trim,fore)
    ell('Wrist',wrist,(.043,.042,.052),skin,hand)
    # Closed grip: fingers curl across the palm instead of hanging like mittens.
    ell('Hand',(side*.455,-.112,1.061),(.044,.035,.059),skin,hand)
    for j in range(4):
        xx=side*.455+(j-1.5)*.018
        ell('Knuckle',(xx,-.137,1.061),(.011,.012,.014),skin,hand)
        ell('Curled finger',(xx,-.134,1.041),(.010,.014,.020),skin,hand)
    ell('Thumb',(side*.42,-.147,1.071),(.016,.021,.027),skin,hand)
box('Belt pouch',(-.255,.10,1.20),(.12,.12,.17),leather,bevel=.02)
box('Pouch flap',(-.255,.034,1.24),(.122,.016,.08),trim,bevel=.012)
# Narrow functional arming sword, held safely low.
group='hand1'; hilt=Vector((.46,-.15,1.045)); tip=Vector((.77,-.18,.30)); axis=(tip-hilt).normalized(); across=Vector((axis.z,0,-axis.x)).normalized()
rod('Sword grip',hilt-axis*.125,hilt,.022,boots,group)
for j in range(7):
    center=hilt-axis*(j*.015+.015); rod('Grip winding',center-axis*.002,center+axis*.002,.024,trim,group)
ell('Sword pommel',hilt-axis*.147,(.033,.023,.035),steel,group)
rod('Crossguard',hilt-across*.115,hilt+across*.115,.018,steel,group)
verts=[]
for center,width in [(hilt+axis*.02,.036),(tip-axis*.14,.025),(tip,0)]: verts.extend([tuple(center+across*width),tuple(center+Vector((0,-.009,0))),tuple(center-across*width),tuple(center+Vector((0,.009,0)))])
faces=[]
for j in range(2):
    for i in range(4): faces.append((j*4+i,j*4+(i+1)%4,(j+1)*4+(i+1)%4,(j+1)*4+i))
mesh=bpy.data.meshes.new('Sword blade'); mesh.from_pydata(verts,[],faces); mesh.update(); o=bpy.data.objects.new('Sword blade',mesh); c.objects.link(o); o.parent=root; mesh.materials.append(blade); parts[group].append(o)
# Pose controls: rigid mesh parts retain detailed surfaces; IK is baked to controls.
body=empty('RIG_body',(0,0,0))
def reparent(objects,parent):
    bpy.context.view_layer.update()
    for o in objects:
        m=o.matrix_world.copy(); o.parent=parent; o.matrix_world=m
reparent(parts['body'],body)
controls={}
for side in [-1,1]:
    hip=empty('RIG_hip'+str(side),(side*.145,0,1.16)); knee=empty('RIG_knee'+str(side),(0,0,-.48),hip); ankle=empty('RIG_ankle'+str(side),(0,0,-.49),knee)
    shoulder=empty('RIG_shoulder'+str(side),(side*.335,0,1.745),body); elbow=empty('RIG_elbow'+str(side),(side*.072,-.005,-.34),shoulder)
    reparent(parts['thigh'+str(side)],hip); reparent(parts['shin'+str(side)],knee); reparent(parts['foot'+str(side)],ankle)
    reparent(parts['upper'+str(side)],shoulder); reparent(parts['fore'+str(side)]+parts['hand'+str(side)],elbow)
    controls[side]=(hip,knee,ankle,shoulder,elbow)
# Bind cloth in the neutral construction pose, before animating controls.
cloth_bindings=[]
for side,(hip,knee,ankle,shoulder,elbow) in controls.items():
    for group,proximal,distal,center,width in [('thigh'+str(side),hip,knee,.68,.17),('upper'+str(side),shoulder,elbow,1.405,.18)]:
        for obj in parts[group]:
            bpy.context.view_layer.update()
            world=[obj.matrix_world@v.co for v in obj.data.vertices]
            obj.parent=root; obj.matrix_world=Matrix.Identity(4)
            for v,point in zip(obj.data.vertices,world): v.co=point
            inv_a=proximal.matrix_world.inverted(); inv_b=distal.matrix_world.inverted()
            weights=[max(0,min(1,(center+width*.5-point.z)/width)) for point in world]
            weights=[w*w*(3-2*w) for w in weights]
            obj.shape_key_add(name='Basis')
            cloth_bindings.append((obj,world,weights,proximal,distal,inv_a,inv_b))
# Separate idle followed by one walking cycle. Bake half-frame keys as well:
# interpolation is checked between exported samples, not just on twelve poses.
for sample in range(27):
    frame=1+sample*.5; idle=frame<2; t=(frame-2)*math.tau/12 if not idle else 0
    bob=0 if idle else -.014+.010*math.cos(2*t)
    body.location=(0,0,bob-.02); body.rotation_euler=(0 if idle else .012,0,0 if idle else .018*math.sin(t))
    body.keyframe_insert('location',frame=frame); body.keyframe_insert('rotation_euler',frame=frame)
    for side,(hip,knee,ankle,shoulder,elbow) in controls.items():
        p=t+(math.pi if side==1 else 0)
        y=0 if idle else -.205*math.sin(p)
        lift=0 if idle else .105*max(0,math.cos(p))**1.5
        target_z=.174+lift; hip.location=(side*.145,0,1.135+bob)
        dy=y; down=hip.location.z-target_z; dist=math.hypot(dy,down); l1=.48; l2=.49
        assert abs(l1-l2)<dist<l1+l2, ('unreachable foot',frame,side,dist)
        bend=math.acos(max(-1,min(1,(l1*l1+l2*l2-dist*dist)/(2*l1*l2))))
        k=math.pi-bend; a=math.acos(max(-1,min(1,(l1*l1+dist*dist-l2*l2)/(2*l1*dist))))
        # Front is -Y: negative hip offset and POSITIVE knee flexion.
        h=math.atan2(dy,down)-a
        hip.rotation_euler.x=h; knee.rotation_euler.x=k; ankle.rotation_euler.x=-h-k
        shoulder.rotation_euler.x=0 if idle else side*(.10 if side==1 else .22)*math.sin(t)
        elbow.rotation_euler.x=.06 if idle else .06+.06*max(0,-side*math.sin(t))
        for obj in [hip,knee,ankle,shoulder,elbow]:
            obj.keyframe_insert('location',frame=frame); obj.keyframe_insert('rotation_euler',frame=frame)
# Use bounded linear interpolation: no Bezier overshoot through a joint limit.
for obj in [body]+[obj for chain in controls.values() for obj in chain]:
    action=obj.animation_data.action if obj.animation_data else None
    if action:
        for layer in action.layers:
            for strip in layer.strips:
                for slot in action.slots:
                    bag=strip.channelbag(slot)
                    if bag:
                        for curve in bag.fcurves:
                            for key in curve.keyframe_points: key.interpolation='LINEAR'
# Bake blended garment deformation at half-frame spacing; seams do not split at joints.
for sample in range(27):
    frame=1+sample*.5; s.frame_set(int(frame),subframe=frame%1); bpy.context.view_layer.update()
    for obj,world,weights,proximal,distal,inv_a,inv_b in cloth_bindings:
        a=proximal.matrix_world@inv_a; b=distal.matrix_world@inv_b
        key=obj.shape_key_add(name=f'Pose_{frame:04.1f}')
        for v,point,w in zip(key.data,world,weights): v.co=(a@point)*(1-w)+(b@point)*w
        for f,value in [(frame-.5,0),(frame,1),(frame+.5,0)]:
            key.value=value; key.keyframe_insert('value',frame=f)
        key.value=0
    # No renderer is invoked while sampling poses.
for obj,*_ in cloth_bindings:
    action=obj.data.shape_keys.animation_data.action
    for layer in action.layers:
        for strip in layer.strips:
            for slot in action.slots:
                bag=strip.channelbag(slot)
                if bag:
                    for curve in bag.fcurves:
                        for key in curve.keyframe_points: key.interpolation='LINEAR'
s.frame_start=1; s.frame_end=13; s.render.fps=12
s['sprite_asset']='city_guard'; s['tile_size']=128; s['sprite_output_size']=128; s['sprite_postprocess']=True
s['sprite_animation_start']=1; s['sprite_animation_frames']=13; s['sprite_animation_step']=1; s['sprite_animation_fps']=12
s['sprite_animation']='idle:row0; walk:rows1-12'; s['sprite_direction_order']='E SE S SW W NW N NE'
s.render.resolution_x=256; s.render.resolution_y=256; s.render.resolution_percentage=100
s.cycles.samples=48; s.view_settings.view_transform='AgX'
# More directional, neutral studio light; softer ambient fill than the toy prototype.
for name,power,size in [('Key',350,3),('Fill',100,4),('Rim',200,3)]:
    bpy.data.objects[name].data.energy=power; bpy.data.objects[name].data.size=size
s.world.node_tree.nodes['Background'].inputs[1].default_value=.28
s.frame_set(1); bpy.context.view_layer.update()
t=bpy.data.texts['render_8_directions.py']; t.clear(); t.write((BASE/'3d/_shared/render_8_directions.py').read_text())
import sys
sys.path.insert(0,str(Path(__file__).parent));sys.path.insert(0,str(BASE/'3d/_shared'))
from configure_template import configure
configure(s)
from validate_guard import validate
import json
s['pose_validation']=json.dumps(validate(s))
t=bpy.data.texts.get('validate_guard.py') or bpy.data.texts.new('validate_guard.py'); t.clear(); t.write((BASE/'3d/city_guard/validate_guard.py').read_text())
bpy.ops.wm.save_as_mainfile(filepath=str(BASE/'3d/city_guard/city_guard.blend'))

# Build all five catalogue clips after the validated base walk.
_clip_source=BASE/'3d/city_guard/animate_guard_clips.py'
exec(compile(_clip_source.read_text(),str(_clip_source),'exec'),{'__name__':'guard_clips','__file__':str(_clip_source)})
