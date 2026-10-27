"""Solid workshop furniture, forged tools and a carved oak chair."""
import bpy,math,random
from pathlib import Path
from mathutils import Vector
from environment_studio import begin,fit_finish

def build(asset):
 ns,task=begin(asset);c=ns['c'];root=ns['root'];M=ns['material'];B=ns['box'];R=ns['rod'];E=ns['ell'];wood=M('Aged oiled oak',(.13,.073,.029),texture=95);edge=M('Polished worn oak edges',(.20,.12,.05),texture=100);iron=M('Forged iron',(.055,.06,.063),metal=.72,rough=.5,texture=90);steel=M('Dressed steel working face',(.22,.24,.25),metal=.8,rough=.32,texture=110);linen=M('Flax cord',(.29,.23,.15),texture=160);dark=M('Dark hollow',(.015,.012,.009));leather=M('Worn brown leather',(.095,.045,.022),texture=130)
 def box(name,loc,dims,mat=wood,bevel=.006):return B(name,loc,dims,mat,bevel=bevel)
 def rod(name,a,b,r,mat=wood,r2=None):return R(name,a,b,r,mat,r2=r2)
 def curve(name,points,r,mat):
  data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.bevel_depth=r;data.bevel_resolution=3;sp=data.splines.new('POLY');sp.points.add(len(points)-1)
  for p,v in zip(sp.points,points):p.co=(*v,1)
  o=bpy.data.objects.new(name,data);c.objects.link(o);o.parent=root;data.materials.append(mat);return o
 if asset=='throne':
  for x in [-.35,.35]:
   for y in [-.30,.30]:
    box('Chair upright',(x,y,.48 if y<0 else .94),(.09,.09,.96 if y<0 else 1.88));E('Carved post finial',(x,y,.99 if y<0 else 1.91),(.065,.065,.075),edge)
  box('Solid oak seat',(0,0,.52),(.77,.69,.11));E('Leather seat cushion',(0,-.015,.59),(.32,.29,.045),leather)
  for x in [-.35,.35]:box('Carved arm rail',(x,0,.91),(.11,.69,.075),edge)
  for y in [-.31,.31]:box('Seat apron',(0,y,.43),(.66,.06,.13))
  box('High back panel',(0,.31,1.22),(.64,.045,1.26));box('Back top rail',(0,.30,1.86),(.74,.09,.08),edge)
  for side in [-1,1]:
   x=side*.16;box('Back inset panel',(x,.277,1.18),(.25,.018,.86),edge,.002)
   points=[(x-.105,.26,.75),(x-.105,.26,1.42),(x,.26,1.65),(x+.105,.26,1.42),(x+.105,.26,.75)];curve('Gothic carved panel moulding',points,.014,wood)
   for z in [.36,.64,.84,1.70]:box('Inset peg',(side*.351,-.348,z),(.018,.005,.018),edge,.002)
 elif asset=='rack':
  for x in [-.58,.58]:
   box('Rack post',(x,.08,.88),(.075,.075,1.76));box('Rack foot',(x,0,.045),(.17,.60,.09));rod('Rack brace',(x,-.24,.09),(x,.08,.61),.025)
  for z in [.22,1.27,1.62]:box('Weapon rack horizontal rail',(0,.08,z),(1.25,.07,.10))
  for j in range(5):
   x=-.44+j*.22;box('Lower weapon slot',(x,-.01,.24),(.10,.19,.06));rod('Weapon shaft',(x,-.065,.27),(x,-.065,1.64 if j%2 else 1.42),.012,wood)
   if j%2:
    # Leaf-shaped forged spearhead.
    z=1.64;v=[(x-.035,-.065,z),(x+.035,-.065,z),(x,-.065,z+.21),(x,-.081,z+.055),(x,-.049,z+.055)];f=[(0,2,3),(1,3,2),(0,4,2),(1,2,4),(0,3,1,4)];m=bpy.data.meshes.new('Forged spearhead');m.from_pydata(v,[],f);o=bpy.data.objects.new('Spearhead',m);c.objects.link(o);o.parent=root;m.materials.append(steel)
   else:
    box('Sword blade',(x,-.073,.84),(.043,.012,.91),steel,.002);box('Sword crossguard',(x,-.073,1.31),(.19,.024,.022),iron,.003);rod('Bound sword grip',(x,-.073,1.33),(x,-.073,1.46),.017,leather);E('Sword pommel',(x,-.073,1.48),(.025,.021,.025),iron)
 elif asset=='anvil':
  rod('Solid oak anvil stump',(0,0,.02),(0,0,.44),.26,wood,r2=.23)
  for j in range(12):
   t=j*math.tau/12;curve('Deep stump bark fissure',[(.255*math.cos(t),.255*math.sin(t),.03),(.24*math.cos(t+.03),.24*math.sin(t+.03),.40)],.006,dark)
  box('Anvil spread foot',(0,0,.48),(.48,.34,.07),iron,.018);box('Anvil waist',(0,0,.59),(.28,.19,.19),iron,.02);body=box('Anvil steel block',(0,0,.73),(.57,.24,.16),iron,.012);face=box('Hardened working face',(0,0,.824),(.57,.245,.035),steel,.004)
  sections=[(.27,.11,.775),(.38,.085,.777),(.51,.055,.785),(.65,.022,.79),(.70,.003,.79)];v=[];f=[];N=24
  for x,rr,z in sections:
   for j in range(N):t=j*math.tau/N;v.append((x,rr*math.cos(t),z+rr*.46*math.sin(t)))
  for k in range(len(sections)-1):
   for j in range(N):f.append((k*N+j,k*N+(j+1)%N,(k+1)*N+(j+1)%N,(k+1)*N+j))
  m=bpy.data.meshes.new('Tapering forged horn');m.from_pydata(v,[],f);o=bpy.data.objects.new('Anvil horn',m);c.objects.link(o);o.parent=root;m.materials.append(steel)
  cutter=box('Hardy hole cutter',(-.17,.035,.82),(.034,.034,.10),dark,.001)
  for obj in [face,body]:
   bpy.context.view_layer.objects.active=obj;mod=obj.modifiers.new('Square hardy hole','BOOLEAN');mod.object=cutter;mod.operation='DIFFERENCE';bpy.ops.object.modifier_apply(modifier=mod.name)
  bpy.data.objects.remove(cutter,do_unlink=True)
 elif asset=='forge_base':
  brick=[M('Soot stained brick %d'%j,(.16+j*.025,.085+j*.013,.048+j*.008),texture=65) for j in range(4)];r=random.Random(55)
  for row in range(6):
   z=.06+row*.095
   for side in [-1,1]:
    for j in range(5):box('Hearth brick',(side*.43,-.32+j*.16+(row%2)*.025,z),(.18,.15,.087),r.choice(brick),.006)
   for j in range(5):box('Back hearth brick',(-.32+j*.16,.39,z),(.15,.18,.087),r.choice(brick),.006)
   if row<4:
    for j in range(5):box('Front hearth brick',(-.32+j*.16,-.38,z),(.15,.17,.087),r.choice(brick),.006)
  box('Cold hearth bed',(0,0,.43),(.69,.64,.055),iron)
  for j in range(28):E('Cold charcoal', (r.uniform(-.30,.30),r.uniform(-.23,.28),.48),(.045,.035,.026),dark)
  # Hand bellows at side, with folded leather between two wooden boards.
  for z in [.33,.46]:
   o=box('Bellows wooden board',(.80,.08,z),(.52,.37,.025),wood);o.rotation_euler[1]=-.12 if z>.4 else .10
  for j in range(5):E('Bellows leather fold',(.80,.08,.35+j*.022),(.25,.18,.025),leather)
  rod('Bellows nozzle',(.55,.08,.39),(.40,.08,.43),.025,iron,r2=.012);rod('Bellows handle',(1.01,.08,.48),(1.18,.08,.50),.025,wood)
 fit_finish(ns,asset,sources=[str(Path(__file__))])
