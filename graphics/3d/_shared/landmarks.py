"""Lore landmarks: self-contained scenery; characters and active effects stay separate."""
import bpy,math,random,json
from pathlib import Path
from mathutils import Vector,noise
from environment_studio import begin,fit_finish
from scene_assembly import import_asset

def build(asset):
 ns,task=begin(asset);s=ns['s'];c=ns['c'];root=ns['root'];M=ns['material'];B=ns['box'];R=ns['rod'];E=ns['ell'];r=random.Random(487);stone=M('Weathered landmark stone',(.20,.20,.175),rough=.92,texture=65);pale=M('Pale unweathered mineral',(.31,.30,.26),rough=.86,texture=100);wood=M('Old dry landmark timber',(.12,.075,.032),texture=95);dark=M('Dark old iron or recess',(.027,.033,.032),rough=.67,metal=.25);rope=M('Dry natural fibre',(.23,.19,.12),texture=160);shell=M('Arctarian grey green shell',(.19,.245,.225),texture=110);leather=M('Worn harness leather',(.09,.043,.020),texture=130)
 def curve(name,points,rad,mat=rope):
  data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.bevel_depth=rad;data.bevel_resolution=3;data.use_fill_caps=True;sp=data.splines.new('POLY');sp.points.add(len(points)-1)
  for p,v in zip(sp.points,points):p.co=(*v,1)
  o=bpy.data.objects.new(name,data);c.objects.link(o);o.parent=root;data.materials.append(mat);return o
 def mesh(name,V,F,mat):
  data=bpy.data.meshes.new(name);data.from_pydata(V,[],F);o=bpy.data.objects.new(name,data);c.objects.link(o);o.parent=root;data.materials.append(mat);return o
 def rock(pos,scale):
  bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3,radius=1,location=pos);o=ns['done'](bpy.context.object,'Weathered bare landmark rock',stone)
  for v in o.data.vertices:
   p=v.co.copy();p*=1+.10*noise.noise(p*5);v.co=(p.x*scale[0],p.y*scale[1],max(-scale[2]*.48,p.z*scale[2]*.5))
  return o
 if asset=='landmark_evening_hare':
  for x in [-1.35,1.35]:import_asset(ns,'water_panels',(x,.18,0))
  for side in [-1,1]:
   import_asset(ns,'reed',(side*2.72,-.50,0),.48);rock((side*2.47,-.90,.11),(.35,.24,.22))
 elif asset=='landmark_cold_roots':
  for y in [-1.08,1.08]:import_asset(ns,'sunken_ribs',(0,y,0),1.2)
  for side in [-1,1]:
   for j in range(5):rock((side*1.12,-1.9+j*.95,.075),(.24,.36,.15))
 elif asset=='landmark_old_pine':
  import_asset(ns,'boulder',(0,0,0),1.25)
  import_asset(ns,'pine',(-.10,.02,1.32),.72,warp=lambda p:(p.x+.030*p.z*p.z,p.y+.07*math.sin(p.z),p.z*.93-.20*(p.x*p.x+p.y*p.y)*math.exp(-5*p.z)))
  # Short protective fence, with cut marks instead of baked readable interface text.
  for x in [-1.12,1.12]:R('Old pine protective fence post',(x,-.86,.0),(x,-.86,.74),.035,wood)
  for z in [.31,.62]:B('Old pine fence rail',(0,-.86,z),(2.30,.06,.065),wood,bevel=.006)
  data=bpy.data.curves.new('Old pine carved inscription','FONT');data.body='Be like the Uarelon Tree';data.align_x='CENTER';data.align_y='CENTER';data.size=.055;data.extrude=.004;data.resolution_u=8;data.font=bpy.data.fonts.load('/System/Library/Fonts/Supplemental/Georgia.ttf')
  text=bpy.data.objects.new('Inscription cutter',data);c.objects.link(text);text.parent=root;text.location=(0,-.888,.62);text.rotation_euler=(math.pi/2,0,0);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();engraving=bpy.data.meshes.new_from_object(text.evaluated_get(dg));cut=bpy.data.objects.new('Solid inscription cutter',engraving);c.objects.link(cut);cut.matrix_world=text.matrix_world.copy();cut.parent=root;bpy.data.objects.remove(text,do_unlink=True)
  rail=next(o for o in c.objects if o.name.startswith('Old pine fence rail') and o.location.z>.5);bpy.context.view_layer.objects.active=rail;mod=rail.modifiers.new('Actual recessed English inscription','BOOLEAN');mod.operation='DIFFERENCE';mod.use_self=True;mod.object=cut;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cut,do_unlink=True)
 elif asset=='landmark_cut_stone':
  import_asset(ns,'boulder',(-.20,.30,0),1.35);import_asset(ns,'boulder',(.35,1.20,.12),.95)
  import_asset(ns,'old_road_fragment',(0,-.35,.98),1.2)
  # Exposed roots physically cross the far pale dashes.
  for side in [-1,1]:
   curve('Roots over ancient straight markings',[(side*.58,1.18,1.18),(side*.24,.93,1.12),(side*.08,.64,1.105),(side*.40,.37,1.10)],.026,wood)
  import_asset(ns,'dead_tree',(.27,1.38,1.14),.28)
 elif asset=='landmark_silk_road':
  for side in [-1,1]:
   rock((side*1.90,0,1.10),(.55,1.10,2.20));import_asset(ns,'dead_tree',(side*2.50,.45,0),.42)
  silk=M('Dust grey canopy silk',(.41,.43,.39),rough=.97);nodes=silk.node_tree.nodes;links=silk.node_tree.links;out=nodes.get('Material Output');surface=nodes.get('Principled BSDF');tr=nodes.new('ShaderNodeBsdfTransparent');mix=nodes.new('ShaderNodeMixShader');mix.inputs[0].default_value=.29;links.new(tr.outputs[0],mix.inputs[1]);links.new(surface.outputs[0],mix.inputs[2]);links.new(mix.outputs[0],out.inputs['Surface']);tex=nodes.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=12;tex.inputs['Detail'].default_value=3;gain=nodes.new('ShaderNodeMath');gain.operation='MULTIPLY';gain.inputs[1].default_value=.55;links.new(tex.outputs['Fac'],gain.inputs[0]);links.new(gain.outputs[0],mix.inputs[0])
  V=[];F=[];NX=80;NY=48
  def webz(x,y):return 1.65+.47*(abs(x)/1.72)**1.5+.09*math.cos(y*2.2)
  for j in range(NY+1):
   y=-.95+j*1.90/NY
   for k in range(NX+1):
    x=-1.72+k*3.44/NX;yy=(j/NY*2-1)*(.87+.08*math.sin(x*5)+.05*math.sin(x*11));V.append((x,yy,webz(x,yy)+.014*math.sin(x*14+yy*11)))
  for j in range(NY):
   for k in range(NX):
    if r.random()<.035 or (j in [0,NY-1] and math.sin(k*1.7)>.35):continue
    i=j*(NX+1)+k;F.append((i,i+1,i+NX+2,i+NX+1))
  o=mesh('Dense white draped web vault',V,F,silk)
  for p in o.data.polygons:p.use_smooth=True
  for j in range(65):
   ya,yb=r.uniform(-.83,.83),r.uniform(-.83,.83);points=[]
   for k in range(49):
    q=k/48;x=-1.72+3.44*q;y=ya*(1-q)+yb*q+.035*math.sin(math.pi*q)*math.sin(j+q*17);points.append((x,y,webz(x,y)+.009))
   curve('Irregular web tension strand',points,.0018,pale)
  for j in range(27):
   xa,xb=r.uniform(-1.65,1.65),r.uniform(-1.65,1.65);points=[]
   for k in range(33):
    q=k/32;y=-.87+q*1.74;x=xa*(1-q)+xb*q;points.append((x,y,webz(x,y)+.010))
   curve('Oblique web crossing strand',points,.0014,pale)
  for side in [-1,1]:
   for y in [-.8,0,.8]:curve('Long web anchor to distant branches',[(side*1.45,y,webz(side*1.45,y)),(side*2.1,y+.1,2.25),(side*2.60,.45,2.48)],.003,pale)
 elif asset=='landmark_garden':
  import_asset(ns,'stone_honeycomb',(0,0,0),1.45);leafmat=M('Toothed garden leaves',(.085,.135,.095),texture=140);bone=M('Pale old garden bones',(.34,.32,.24),texture=110)
  for cx,cy in [(0,0),(1.04,0),(-.52,.90)]:
   for j in range(7):
    t=j*2.399;V=[];F=[];length=.50+r.random()*.15
    for k in range(25):
     q=k/24;width=.075*math.sin(math.pi*q)*(.60 if k%2 else 1);center=Vector((cx+length*q*math.cos(t),cy+length*q*math.sin(t),.17+.34*math.sin(math.pi*q*.7)));side=Vector((-math.sin(t),math.cos(t),0));V.extend([tuple(center-side*width),tuple(center+side*width)])
    for k in range(24):i=k*2;F.append((i,i+1,i+3,i+2))
    mesh('Serrated membrane garden leaf',V,F,leafmat)
  for cx,cy in [(-1.04,0),(.52,-.90)]:
   for j in range(3):curve('Bones matching the growth bends',[(cx-.15,cy-.05+j*.05,.18),(cx,cy+j*.05,.24),(cx+.17,cy-.04+j*.05,.21)],.014,bone)
 elif asset=='landmark_eye':
  import_asset(ns,'closed_eye_sign',(0,.20,0));import_asset(ns,'flower_patch',(0,-.42,0),.72);B('Small worn offering ledge',(0,-.18,.04),(.88,.37,.08),stone,bevel=.012)
 elif asset=='landmark_ark_gate':
  B('Upper ledge at atmosphere boundary',(0,0,-.15),(4.20,2.10,.30),stone,bevel=.025)
  for side in [-1,1]:
   R('Upper ledge boundary post',(side*1.75,-.88,0),(side*1.75,-.88,1.12),.043,shell);R('Upper ledge handrail',(side*1.75,-.88,.92),(side*.73,-.88,.92),.028,shell)
  # An empty breathing shell and folded protective garment, never a baked NPC.
  B('Protective shell presentation stand',(-1.16,.38,.43),(.64,.55,.86),shell,bevel=.075)
  cloth=M('Closed breathing suit fabric',(.16,.19,.18),texture=150);E('Folded sealed breathing garment',(-1.16,.38,.91),(.27,.22,.07),cloth)
  glass=M('Empty breathing shell clear face',(.25,.32,.32),rough=.16);glass.node_tree.nodes.get('Principled BSDF').inputs['Transmission Weight'].default_value=.55;E('Empty protective breathing hood',(-1.12,.35,1.14),(.18,.16,.19),glass)
  for j in range(4):B('Breathing garment closure',(-1.34+j*.10,.16,.94),(.025,.012,.045),dark,bevel=.004)
 elif asset=='landmark_ark_work':
  for x,z in [(-1.0,1.25),(1.0,1.05)]:
   B('Rounded grown workshop table',(x,.08,z),(1.65,1.02,.16),shell,bevel=.12)
   for dx in [-.58,.58]:E('Grown table supporting lobe',(x+dx,.08,z/2),(.13,.24,z/2),shell)
   E('Workshop input or output dish',(x,-.13,z+.12),(.34,.25,.07),stone)
  for j in range(3):
   x=-1.42+j*.40;R('Interchangeable tool socket',(x,.36,1.31),(x,.36,1.62),.043,dark);E('Universal pale coupling',(x,.36,1.63),(.066,.066,.045),shell)
   if j==0:curve('Open ring quarry cutter',[(x+.17*math.cos(k*math.tau/64),.36,1.88+.17*math.sin(k*math.tau/64)) for k in range(65)],.024,shell)
   elif j==1:B('Blunt heavy interchangeable head',(x,.36,1.84),(.25,.15,.23),stone,bevel=.045)
   else:
    for side in [-1,1]:curve('Fine interchangeable pincer',[(x,.36,1.68),(x+side*.06,.36,1.88),(x+side*.018,.36,2.02)],.009,shell)
  for j in range(24):
   x=-1.18+r.random()*.36;y=-.22+r.random()*.18;E('Reusable workshop mineral chips',(x,y,1.45),(.025,.020,.018),pale)
  curve('Closed recycling transfer trough',[(-.42,.05,1.31),(0,.05,1.22),(.42,.05,1.12)],.055,shell)
 elif asset=='landmark_ark_hull':
  import_asset(ns,'ark_hull',(0,0,0),1.6)
  import_asset(ns,'ark_hull',(6.3,.55,.90),1.45,predicate=lambda o:'Bowl below' not in o.name and 'Downward' not in o.name)
  for dx,dy in [(-1.7,-1.4),(1.7,-1.4),(-1.7,1.4),(1.7,1.4)]:R('Other hemisphere used as shelter support',(6.3+dx,.55+dy,0),(6.3+dx,.55+dy,3.31),.13,shell)
 elif asset=='landmark_blue_fire':
  import_asset(ns,'firepit',(0,0,0),1.18);import_asset(ns,'camp_chest',(-1.12,.48,0),1.0);import_asset(ns,'bench',(1.05,.30,0),.66,angle=math.pi/2)
  for x in [-.67,.67]:R('Harness repair trestle upright',(x,1.13,0),(x,1.13,1.33),.034,wood)
  R('Harness repair trestle beam',(-.80,1.13,1.30),(.80,1.13,1.30),.038,wood)
  for j in range(3):
   x=-.45+j*.45;curve('Rider bridle leather loop',[(x+.14*math.cos(k*math.tau/64),1.12,.98+.32*math.sin(k*math.tau/64)) for k in range(65)],.009,leather)
  blue=M('Faded cool face wrap cloth',(.085,.12,.16),texture=160);E('Folded rider face wrap on chest',(-1.10,.46,.50),(.20,.13,.025),blue)
  s['environment_design']=json.dumps(dict(effect='campfire',effect_attachment=[0,0,.0944],effect_palette='oxygen blue',characters='separate emralaan and fairy actors; no people or flame baked into static scenery'))
 elif asset=='landmark_barrier':
  import_asset(ns,'ancient_barrier',(-1.575,0,0));import_asset(ns,'ancient_barrier',(1.575,0,0));B('Narrow winged passage landing',(0,.18,1.45),(1.18,.49,.065),stone,bevel=.018)
  for j in range(7):rock((-2.5+j*.82,.18,.055),(.20,.28,.11))
 elif asset=='landmark_frame':
  import_asset(ns,'portal_frame')
  for side in [-1,1]:
   for j in range(4):rock((side*(1.18+j*.22),.18-j*.16,.045),(.12,.16,.09))
  s['environment_design']=json.dumps(dict(effect='portal_surface',same_ground_origin=True,no_baked_distortion=True))
 elif asset=='landmark_vampire_water':
  # Abandoned drinking bowls, a low-marked ruined wall and the inside of a fallen door.
  for j in range(6):
   x=-1.50+j*.60;profile=[(.01,.015),(.01,.15),(.10,.22),(.23,.23),(.25,.21),(.25,.17),(.10,.14),(.06,.015)];V=[];F=[];N=64
   for z,rr in profile:
    for k in range(N):t=k*math.tau/N;V.append((x+rr*math.cos(t),-.62+rr*.87*math.sin(t),z))
   for row in range(len(profile)):
    for k in range(N):F.append((row*N+k,row*N+(k+1)%N,((row+1)%len(profile))*N+(k+1)%N,((row+1)%len(profile))*N+k))
   o=mesh('Hollow abandoned drinking bowl',V,F,pale);o.data.materials.append(dark)
   for face in o.data.polygons:face.use_smooth=True;face.material_index=1 if face.index//N>=4 else 0
   E('Sealed bottom of abandoned bowl',(x,-.62,.06),(.025,.025,.005),dark)
  wall=B('Low surviving plaster wall',(0,.62,1.05),(2.30,.22,2.10),stone,bevel=.025)
  for j,z in enumerate([.39,.48,.57,.66,.74,.82]):
   cutter=R('Old child height tally cutter',(-.84,.509,z),(-.59+.012*j,.509,z),.005,dark);bpy.context.view_layer.objects.active=wall;mod=wall.modifiers.new('Old low height notch','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
  # A detached door leans with its inner bolt facing the viewer; no claw marks.
  group=bpy.data.objects.new('Leaning door showing inner bolt',None);c.objects.link(group);group.parent=root;group.location=(1.22,.35,.006);group.rotation_euler=(math.radians(-5),0,math.radians(-10))
  before=set(c.objects)
  for j in range(6):B('Fallen door inner plank',(-.39+j*.156,0,.86),(.15,.045,1.72),wood,bevel=.005)
  for z in [.46,1.28]:B('Door inner reinforcement',(0,-.041,z),(.92,.06,.08),wood,bevel=.008)
  for x in [-.25,.25]:B('Door inner bolt guide',(x,-.047,.87),(.055,.09,.13),dark,bevel=.006)
  B('Inner door bolt',(0,-.086,.87),(.66,.045,.085),dark,bevel=.006)
  for o in set(c.objects)-before:o.parent=group
 fit_finish(ns,asset,rotation=0,sources=[str(Path(__file__)),str(Path(__file__).with_name('scene_assembly.py'))],alpha_levels=32 if asset=='landmark_silk_road' else 8)
