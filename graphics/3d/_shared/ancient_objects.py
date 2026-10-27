"""Arctarian domestic objects and worn ancient structures, without labels or modern displays."""
import bpy,bmesh,math,random,json
from pathlib import Path
from mathutils import Vector
from environment_studio import begin,fit_finish

def build(asset):
 ns,task=begin(asset);s=ns['s'];c=ns['c'];root=ns['root'];M=ns['material'];B=ns['box'];R=ns['rod'];E=ns['ell'];r=random.Random(457);shell=M('Worn grey green grown shell',(.19,.245,.225),rough=.83,texture=110);soft=M('Soft nest lining',(.22,.23,.26),rough=.94,texture=150);mauve=M('Muted violet inner membrane',(.20,.15,.25),rough=.77,texture=140);dark=M('Dark ancient composite',(.055,.065,.075),rough=.75,texture=85);stone=M('Old grey mineral ceramic',(.18,.19,.18),rough=.88,texture=70);pale=M('Pale weathered mineral seam',(.32,.33,.30),rough=.86,texture=135)
 def mesh(name,V,F,mats):
  data=bpy.data.meshes.new(name);data.from_pydata(V,[],F);data.update();bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free();o=bpy.data.objects.new(name,data);c.objects.link(o);o.parent=root
  for mat in mats:data.materials.append(mat)
  return o
 def curve(name,points,rad,mat=stone):
  data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.bevel_depth=rad;data.bevel_resolution=3;sp=data.splines.new('POLY');sp.points.add(len(points)-1)
  for p,v in zip(sp.points,points):p.co=(*v,1)
  o=bpy.data.objects.new(name,data);c.objects.link(o);o.parent=root;data.materials.append(mat);return o
 def loft(name,profile,rx=1,ry=1,mat=shell,fold=0,N=96):
  V=[];F=[]
  for z,rr in profile:
   for j in range(N):
    t=j*math.tau/N;rad=rr*(1+fold*math.cos(11*t));V.append((rx*rad*math.cos(t),ry*rad*math.sin(t),z))
  for k in range(len(profile)):
   for j in range(N):F.append((k*N+j,k*N+(j+1)%N,((k+1)%len(profile))*N+(j+1)%N,((k+1)%len(profile))*N+j))
  o=mesh(name,V,F,[mat])
  for p in o.data.polygons:p.use_smooth=True
  return o
 if asset=='ark_nest':
  loft('Oval hollow sleeping nest',[(.015,.015),(.015,1),(.12,1.02),(.38,1),(.48,.94),(.47,.86),(.30,.76),(.20,.50),(.16,.015)],1.60,.93,shell,.025)
  for j in range(5):E('Soft longitudinal nest fold',(-.72+j*.36,0,.25),(.11,.52,.06),soft)
 elif asset=='ark_vessel':
  loft('Asymmetric ribbed arctarian vessel',[(.015,.02),(.015,.23),(.12,.33),(.45,.39),(.75,.30),(.94,.17),(1.06,.15),(1.08,.16),(1.08,.115),(.97,.11),(.81,.17),(.73,.10),(.71,.02)],mat=shell,fold=.035)
  E('Recessed violet vessel contents',(0,0,1.01),(.105,.10,.025),mauve)
  for j in range(7):
   t=j*math.tau/7;curve('Vessel outer reinforcing fold',[(rr*math.cos(t),rr*math.sin(t),z) for z,rr in [(.12,.335),(.45,.395),(.74,.30),(.94,.17)]],.007,shell)
 elif asset=='ark_hull':
  # A real hemispherical hull, with a sealed equatorial cut and downward cushions.
  radius=1.65;bottom=1.65;V=[];F=[];N=128;L=48
  for k in range(L+1):
   angle=.008+k*(math.pi/2-.008)/L
   for j in range(N):
    a=j*math.tau/N;rr=radius*math.sin(angle);V.append((rr*math.cos(a),rr*math.sin(a),bottom+radius*math.cos(angle)))
  for k in range(L):
   for j in range(N):F.append((k*N+j,k*N+(j+1)%N,(k+1)*N+(j+1)%N,(k+1)*N+j))
  F.append(tuple(reversed(range(N))));F.append(tuple(range(L*N,(L+1)*N)));o=mesh('Sealed hemispherical hovering hull',V,F,[dark,shell]);o['part']='hovering hull'
  for p in o.data.polygons:p.use_smooth=p.loop_total==4
  for k in range(1,7):
   angle=k*math.pi/14;rr=radius*math.sin(angle)+.009;z=bottom+radius*math.cos(angle);curve('Hull circumferential seam',[(rr*math.cos(j*math.tau/128),rr*math.sin(j*math.tau/128),z) for j in range(129)],.006,shell)
  for j in range(16):
   a=j*math.tau/16;curve('Hull segment joining rib',[(radius*math.sin(t)*math.cos(a),radius*math.sin(t)*math.sin(a),bottom+radius*math.cos(t)) for t in [k*math.pi/96 for k in range(1,49)]],.005,shell)
  for j in range(5):
   a=j*math.tau/5;E('Downward displacement cushion',(.95*math.cos(a),.95*math.sin(a),bottom-.045),(.19,.19,.07),shell)
  loft('Bowl below hovering hull',[(.01,.02),(.01,1.74),(.08,1.93),(.22,2.02),(.39,1.92),(.41,1.80),(.31,1.56),(.13,.30),(.12,.02)],mat=stone,N=128)
  s['environment_design']=json.dumps(dict(hull_cut_height=bottom,bowl_rim=.41,hover_gap=1.10,no_chains=True,no_baked_exhaust=True,reference='Arctarian spherical ships adapted as two hemispheres'))
 elif asset=='portal_frame':
  for side in [-1,1]:
   V=[];F=[];N=128;cross=[(-.08,-.12),(.08,-.12),(.105,-.09),(.105,.09),(.08,.12),(-.08,.12),(-.105,.09),(-.105,-.09)]
   a0,a1=(-math.pi/2+.08,math.pi/2-.08) if side>0 else (math.pi/2+.08,3*math.pi/2-.08)
   for j in range(N+1):
    a=a0+(a1-a0)*j/N;center=Vector((.79*math.cos(a),0,1.25+1.18*math.sin(a)));normal=Vector((math.cos(a)/.79,0,math.sin(a)/1.18)).normalized()
    for rr,yy in cross:V.append(tuple(center+normal*rr+Vector((0,yy,0))))
   for j in range(N):
    for k in range(8):F.append((j*8+k,j*8+(k+1)%8,(j+1)*8+(k+1)%8,(j+1)*8+k))
   F.extend([tuple(reversed(range(8))),tuple(range(N*8,(N+1)*8))]);o=mesh('Ancient separated frame arc',V,F,[stone,dark,pale])
   for p in o.data.polygons:
    p.use_smooth=p.loop_total==4
    if p.index%8==0:p.material_index=2 if side>0 else 1
   E('Frame embedded foot',(side*.51,0,.09),(.31,.26,.09),stone)
  s['environment_design']=json.dumps(dict(effect='portal_surface',same_ground_origin=True,inner_clearance_x=.685,field_half_width=.59,frame_centre_z=1.25))
 elif asset=='ancient_barrier':
  for side in [-1,1]:
   curve('Worn ancient barrier upright',[(side*1.55,0,.01),(side*1.55,0,.6),(side*1.48,.04,1.75),(side*1.55,0,2.94)],.075,stone)
  for z in [.55,2.55]:curve('Unequal height ancient handrail',[(-1.55,0,z),(-.8,0,z-.035),(0,0,z-.055),(.8,0,z-.035),(1.55,0,z)],.043,dark)
  for side in [-1,1]:B('Thin cantilever for winged users',(side*1.12,.10,1.45),(.86,.46,.065),stone,bevel=.015)
 elif asset=='old_road_fragment':
  outline=[(-.62,-1.35),(.48,-1.32),(.60,-.91),(.54,.68),(.38,1.32),(-.43,1.25),(-.57,.83)];V=[(x,y,z) for z in [.015,.095] for x,y in outline];N=len(outline);F=[tuple(reversed(range(N))),tuple(range(N,2*N))]
  for j in range(N):F.append((j,(j+1)%N,(j+1)%N+N,j+N))
  asphalt=M('Smooth black ancient road stone',(.025,.028,.027),rough=.79,texture=130);o=mesh('Chipped ancient strip',V,F,[asphalt]);be=o.modifiers.new('Small worn break edges','BEVEL');be.width=.006;be.segments=2
  for y in [-.95,-.37,.21,.79]:B('Equal pale mineral dash',(0,y,.098),(.075,.25,.004),pale,bevel=.002)
 elif asset=='stone_honeycomb':
  centres=[(0,0)]+[(.72*math.cos(j*math.tau/6),.72*math.sin(j*math.tau/6)) for j in range(6)]
  for x,y in centres:
   profile=[(.01,.02),(.01,.40),(.23,.40),(.27,.37),(.27,.31),(.09,.29),(.07,.02)];o=loft('Hollow six sided stone bed',profile,mat=stone,N=6);o.location=(x,y,0)
   film=M('Uniform thin garden membrane',(.09,.14,.115),rough=.38);E('Taut film in stone bed',(x,y,.10),(.275,.275,.008),film)
 elif asset=='closed_eye_sign':
  outline=[(-.61,0),(.58,0),(.65,.83),(.54,1.49),(.30,1.57),(.13,1.51),(-.30,1.63),(-.57,1.44)];N=len(outline);V=[(x,y,z) for y in [-.09,.09] for x,z in outline];F=[tuple(reversed(range(N))),tuple(range(N,2*N))]+[(j,(j+1)%N,(j+1)%N+N,j+N) for j in range(N)];o=mesh('Chipped sign stele',V,F,[stone]);be=o.modifiers.new('Weathered stele edges','BEVEL');be.width=.012;be.segments=2
  paths=[]
  for sign in [-1,1]:paths.append([(-.36+.72*j/48,-.091,.90+sign*.10*math.sin(math.pi*j/48)) for j in range(49)])
  paths.append([(-.35,-.091,.90),(.35,-.091,.90)])
  for a in [-.85,-.425,0,.425,.85]:paths.append([(0,-.091,.61),(.66*math.sin(a),-.091,.61+.66*math.cos(a))])
  cu=bpy.data.curves.new('Carved eye and five rays','CURVE');cu.dimensions='3D';cu.bevel_depth=.013;cu.bevel_resolution=3;cu.use_fill_caps=True
  for path in paths:
   sp=cu.splines.new('POLY');sp.points.add(len(path)-1)
   for p,v in zip(sp.points,path):p.co=(*v,1)
  cut=bpy.data.objects.new('Sign engraving cutter',cu);c.objects.link(cut);cut.parent=root;bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();data=bpy.data.meshes.new_from_object(cut.evaluated_get(dg));cutmesh=bpy.data.objects.new('Sign engraving mesh',data);c.objects.link(cutmesh);cutmesh.parent=root;bpy.data.objects.remove(cut,do_unlink=True);bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Recessed ancient glyph','BOOLEAN');mod.operation='DIFFERENCE';mod.use_self=True;mod.object=cutmesh;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutmesh,do_unlink=True)
 elif asset=='sunken_ribs':
  for j in range(6):
   y=-.75+j*.30;curve('Equally spaced ancient structural rib',[(.72*math.cos(k*math.pi/64),y,.025+.72*math.sin(k*math.pi/64)) for k in range(65)],.047,stone)
  for side in [-1,1]:R('Rib buried longitudinal sill',(side*.72,-.82,.025),(side*.72,.82,.025),.036,stone)
 elif asset=='water_panels':
  black=M('Black reflective water worn plate',(.012,.017,.02),rough=.17,metal=.30,texture=165);black.node_tree.nodes.get('Principled BSDF').inputs['Coat Weight'].default_value=.5
  for row in range(2):
   for j in range(3):
    o=B('Identically inclined black plate',(-.90+j*.90,-.525+row*1.05,.12),(.76,.58,.035),black,bevel=.009);o.rotation_euler=(math.radians(26),math.radians(-5),0)
 fit_finish(ns,asset,rotation=0,sources=[str(Path(__file__))])
