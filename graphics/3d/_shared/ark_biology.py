"""Folded, porous arctarian flora and supports matched to the existing living props."""
import bpy,bmesh,math,random,json
from pathlib import Path
from mathutils import Vector
from environment_studio import begin,fit_finish

def build(asset):
 ns,task=begin(asset);c=ns['c'];root=ns['root'];M=ns['material'];R=ns['rod'];E=ns['ell'];r=random.Random(431);stem=M('Arctarian fibrous grey green',(.13,.19,.20),rough=.86,texture=95);mauve=M('Mauve folded living tissue',(.24,.20,.29),rough=.88,texture=135);inner=M('Dark mauve cup lining',(.10,.065,.125),rough=.78,texture=140);pale=M('Pale green warm nodules',(.32,.37,.29),rough=.65,texture=135);ceramic=M('Worn pale green ceramic',(.25,.30,.27),rough=.83,texture=130)
 def mesh(n,V,F,mats,ids=None):
  data=bpy.data.meshes.new(n);data.from_pydata(V,[],F);data.update();bm=bmesh.new();bm.from_mesh(data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-6);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free();o=bpy.data.objects.new(n,data);c.objects.link(o);o.parent=root
  for mat in mats:data.materials.append(mat)
  for i,p in enumerate(data.polygons):p.use_smooth=True;p.material_index=ids[i] if ids and i<len(ids) else 0
  return o
 def curve(n,points,rad,mat=stem):
  data=bpy.data.curves.new(n,'CURVE');data.dimensions='3D';data.bevel_depth=rad;data.bevel_resolution=3;sp=data.splines.new('POLY');sp.points.add(len(points)-1)
  for p,v in zip(sp.points,points):p.co=(*v,1)
  o=bpy.data.objects.new(n,data);c.objects.link(o);o.parent=root;data.materials.append(mat);return o
 def loft(n,profile,center=(0,0,0),mat=stem,fold=0,inside_from=999,N=96):
  V=[];F=[];ids=[]
  for j,(z,rr) in enumerate(profile):
   for k in range(N):
    a=k*math.tau/N;radius=rr*(1+fold*math.cos(9*a+j*.09));V.append((center[0]+radius*math.cos(a),center[1]+radius*math.sin(a),center[2]+z+.012*fold*math.sin(9*a)))
  for j in range(len(profile)):
   for k in range(N):F.append((j*N+k,j*N+(k+1)%N,((j+1)%len(profile))*N+(k+1)%N,((j+1)%len(profile))*N+k));ids.append(1 if j>=inside_from else 0)
  return mesh(n,V,F,[mat,inner],ids)
 def cup(center,rad,height,name='Folded living cup'):
  profile=[(0,.06),(.08,.12),(.25,.28),(.62,.72),(.94,.98),(1,1),(.99,.91),(.89,.86),(.58,.60),(.28,.16),(.23,.015)]
  return loft(name,[(z*height,rr*rad) for z,rr in profile],center,mauve,.09,inside_from=5)
 if asset=='alien_tree_0':
  # Broad veined fans, distinct from every terrestrial leafy crown.
  curve('S curved fibrous stem',[(0,0,0),(-.12,0,.60),(.18,0,1.40),(-.08,0,2.45)],.085,stem)
  for i,(cx,cy,z,rr) in enumerate([(-.12,.04,.92,.82),(.16,.10,1.62,.94),(-.08,-.02,2.42,1.10)]):
   V=[];F=[];NR=28;NA=80
   for row in range(NR+1):
    q=row/NR
    for j in range(NA+1):
     a=(j/NA-.5)*math.pi*.90;length=rr*(1+.025*math.cos(a*17));V.append((cx+length*q*math.sin(a),cy+.11*q*q+.035*q*math.cos(a*14),z+length*q*math.cos(a)))
   for row in range(NR):
    for j in range(NA):k=row*(NA+1)+j;F.append((k,k+1,k+NA+2,k+NA+1))
   o=mesh('Radially pleated alien fan',V,F,[mauve if i!=1 else stem]);o.modifiers.new('Thick living fan membrane','SOLIDIFY').thickness=.007
   for j in range(13):
    a=(j/12-.5)*math.pi*.90;curve('Branching fan vein',[(cx+rr*q*math.sin(a),cy+.11*q*q+.035*q*math.cos(a*14)-.006,z+rr*q*math.cos(a)) for q in [k/18 for k in range(19)]],.0035,stem)
  for j in range(7):
   a=j*math.tau/7;curve('Fibrous fan root',[(.45*math.cos(a),.45*math.sin(a),.012),(.10*math.cos(a),.10*math.sin(a),.28),(0,0,.45)],.028,stem)
 elif asset=='alien_tree_1':
  profile=[(.025,.27),(.35,.31),(1.0,.25),(1.8,.29),(2.5,.35),(2.82,.28),(2.82,.20),(2.50,.27),(1.80,.21),(1.0,.17),(.35,.23),(.08,.19)];o=loft('Hollow porous sponge trunk',profile,mat=stem,fold=.045)
  for j in range(24):
   z=.38+j*.095;angle=j*2.399;rr=.25 if z<1.1 else .29 if z<2.0 else .34;loc=(rr*math.cos(angle),rr*math.sin(angle),z)
   bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=10,location=loc);cut=bpy.context.object;cut.scale=(.045+r.random()*.018,.16,.035+r.random()*.02);cut.rotation_euler[2]=angle-math.pi/2;bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Real sponge wall pore','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cut;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cut,do_unlink=True)
  for i,angle in enumerate([0,2.1,4.2]):
   a=Vector((0,0,2.35));b=Vector((.32*math.cos(angle),.32*math.sin(angle),2.72+i*.16));curve('Porous upper branch',[a,a.lerp(b,.5)+Vector((0,0,.08)),b],.10,stem);cup(b,.21,.27,'Spongy flared terminal cup')
  for j in range(5):
   a=j*math.tau/5;curve('Sponge plant buttress root',[(.55*math.cos(a),.55*math.sin(a),.015),(.20*math.cos(a),.20*math.sin(a),.35),(0,0,.55)],.047,stem)
 elif asset=='alien_tree_2':
  curve('Cup plant fibrous trunk',[(0,0,0),(.08,0,.8),(-.04,0,1.8)],.073,stem)
  for i,(x,y,z,rr,h) in enumerate([(0,0,.47,.61,.57),(.06,.04,1.02,.50,.53),(-.04,0,1.57,.42,.54)]):cup((x,y,z),rr,h)
  for j in range(5):
   a=j*math.tau/5;curve('Cup plant root',[(.35*math.cos(a),.35*math.sin(a),.01),(0,0,.33)],.025)
 elif asset=='ark_garden':
  for i in range(7):
   a=i*2.399;rad=.48*math.sqrt(i/6) if i else 0;x,y=rad*math.cos(a),rad*math.sin(a);h=.62+(i%3)*.11;R('Garden fleshy petiole',(x,y,.02),(x,y,h-.37),.04,stem);cup((x,y,h-.37),.20+(i%2)*.025,.40)
   E('Harvestable warm light nodule',(x,y,h-.10),(.065,.057,.085),pale)
 elif asset in ['ark_filter_base','ark_resonator_base']:
  if asset=='ark_filter_base':
   E('Filter rooted folded base',(0,0,.12),(.95,.55,.12),stem)
   for index,x in enumerate([-.58,0,.58]):
    yy=-.055 if index==1 else .055;inner_rr=.191 if index==1 else .177;profile=[(.205,.245),(.225,.246),(.250,.229),(.250,inner_rr),(.22,inner_rr),(.205,.22)];loft('Filter lobe socket',profile,(x,yy,0),stem,.045)
   ns['s']['environment_design']=json.dumps(dict(effect='ark_filter',same_ground_origin=True,lobe_feet_z=.25,lobe_centres=[[-.58,.055],[0,-.055],[.58,.055]]))
  else:
   profile=[(.005,.02),(.005,.65),(.05,.65),(.13,.57),(.22,.53),(.25,.48),(.25,.40),(.20,.33),(.19,.02)];loft('Resonator grooved support',profile,mat=ceramic,fold=.025)
   for j in range(12):
    a=j*math.tau/12;curve('Radial resonator groove',[(rr*math.cos(a),rr*math.sin(a),.251) for rr in [.41,.44,.47]],.0025,stem)
   ns['s']['environment_design']=json.dumps(dict(effect='ark_resonator',same_ground_origin=True,base_top=.25,lowest_ring_centre=.72))
 elif asset=='ark_rock':
  rock=M('Grey violet singing quarry stone',(.22,.215,.27),rough=.91,texture=60);cut=M('Smooth quarry separation plane',(.31,.30,.34),rough=.52,texture=150)
  for j in range(4):
   x=-.78+j*.49;h=[1.40,2.05,1.68,1.25][j];w=.43;V=[(x-w/2,-.36,.02),(x+w/2,-.36,.02),(x+w/2,.30,.02),(x-w/2,.30,.02),(x-w*.35,-.36,h),(x+w*.30,-.36,h-.18),(x+w*.33,.30,h-.12),(x-w*.39,.30,h+.06)];F=[(0,3,2,1),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)];o=mesh('Naturally cleaved quarry rib',V,F,[rock,cut]);o.data.polygons[1].material_index=1;be=o.modifiers.new('Fine mineral edge chips','BEVEL');be.width=.009;be.segments=2
 fit_finish(ns,asset,rotation=0,sources=[str(Path(__file__))])
