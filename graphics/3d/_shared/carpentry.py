"""Workshop joinery, iron-bound chests and timber props."""
import bpy,math,random
from pathlib import Path
from environment_studio import begin,fit_finish

def build(asset):
 ns,task=begin(asset);c=ns['c'];root=ns['root'];M=ns['material'];B=ns['box'];R=ns['rod'];E=ns['ell'];r=random.Random(223);wood=[M('Weathered oak %d'%j,(.13+j*.02,.075+j*.014,.03+j*.008),texture=95) for j in range(4)];iron=M('Black iron straps',(.033,.038,.04),metal=.65,rough=.57,texture=120);steel=M('Saw tooth steel',(.17,.185,.19),metal=.75,rough=.43);linen=M('Dirty straw stuffed canvas',(.28,.24,.16),texture=175);leather=M('Worn chest leather',(.09,.044,.023),texture=130)
 def box(n,p,d,m=None,b=.006):return B(n,p,d,m or r.choice(wood),bevel=b)
 def rod(n,a,b,rad,m=None,r2=None):return R(n,a,b,rad,m or r.choice(wood),r2=r2)
 def curve(n,points,rad,mat):
  cu=bpy.data.curves.new(n,'CURVE');cu.dimensions='3D';cu.bevel_depth=rad;cu.bevel_resolution=2;sp=cu.splines.new('POLY');sp.points.add(len(points)-1)
  for pp,p in zip(sp.points,points):pp.co=(*p,1)
  o=bpy.data.objects.new(n,cu);c.objects.link(o);o.parent=root;cu.materials.append(mat);return o
 if asset in ['chest','prison_chest','camp_chest']:
  prison=asset=='prison_chest';camp=asset=='camp_chest';w,d,h=(1.0,.60,.53) if prison else (.70,.43,.38) if camp else (.85,.52,.49);domed=not(prison or camp)
  for side in [-1,1]:
   for j in range(6):box('Chest face plank',(-w/2+(j+.5)*w/6,side*d/2,h/2+.04),(w/6-.003,.035,h))
   box('Chest end board',(side*w/2,0,h/2+.04),(.035,d,h))
  box('Chest floor',(0,0,.045),(w,d,.045))
  if domed:
   V=[];F=[];N=32
   for x in [-w/2,w/2]:
    for j in range(N+1):t=j*math.pi/N;V.append((x,d/2*math.cos(t),h+.04+.15*math.sin(t)))
   for j in range(N):F.append((j,j+1,N+2+j,N+1+j))
   F.extend([tuple(reversed(range(N+1))),tuple(range(N+1,2*(N+1)))]);m=bpy.data.meshes.new('Domed chest lid');m.from_pydata(V,[],F);o=bpy.data.objects.new('Wooden domed lid',m);c.objects.link(o);o.parent=root;m.materials.append(wood[2])
  else:box('Flat reinforced chest lid',(0,0,h+.065),(w+.025,d+.025,.055),leather if camp else wood[0])
  for x in [-w*.35,w*.35]:
   for side in [-1,1]:
    box('Iron or leather chest strap',(x,side*(d/2+.022),h/2+.04),(.042,.013,h+.02),leather if camp else iron,b=.002)
    for z in [.09,h-.025]:E('Strap rivet',(x,side*(d/2+.031),z),(.006,.004,.006),steel)
   points=[(x,(d/2+.012)*math.cos(j*math.pi/32),h+(.049 if domed else .10)+(.15*math.sin(j*math.pi/32) if domed else 0)) for j in range(33)];curve('Chest lid binding',points,.013,leather if camp else iron)
  box('Chest front lock plate',(0,-d/2-.033,h+.012),(.13 if prison else .08,.022,.14 if prison else .10),iron,b=.005)
  if prison:box('Heavy padlock',(0,-d/2-.06,h*.65),(.09,.035,.10),iron,b=.011);curve('Padlock shackle',[(-.027,-d/2-.05,h*.74),(-.027,-d/2-.05,h*.95),(.027,-d/2-.05,h*.95),(.027,-d/2-.05,h*.74)],.006,steel)
  for side in [-1,1]:curve('Chest carrying ring',[(side*(w/2+.03),.06*math.cos(j*math.tau/32),h*.55+.05*math.sin(j*math.tau/32)) for j in range(33)],.006,iron)
 elif asset=='timber_pile':
  for layer in range(4):
   for j in range(4-layer%2):box('Squared timber beam',(0,-.31+j*.205+layer%2*.10,.14+layer*.18),(1.85-r.random()*.10,.18,.18))
  for y in [-.32,.32]:box('Timber support sleeper',(0,y,.025),(.65,.12,.05),wood[0])
 elif asset=='axe_block':
  rod('Splitting block',(0,0,.01),(0,0,.51),.27,wood[0],r2=.25)
  for j in range(12):
   rr=.02+j*.018;curve('Cut end growth ring',[(rr*math.cos(t*math.tau/64),rr*math.sin(t*math.tau/64),.512) for t in range(65)],.0015,wood[1])
  for j in range(5):
   t=j*2.4;curve('Deep split in chopping block',[(.05*math.cos(t),.05*math.sin(t),.515),(.23*math.cos(t+.04),.23*math.sin(t+.04),.515)],.003,iron)
  # Axe remains separate, set into the block; no animated hand or character.
  rod('Ash axe haft',(.05,0,.50),(.13,0,1.12),.018,wood[2]);V=[(-.02,-.02,.54),(.20,-.02,.55),(.24,-.02,.69),(.02,-.02,.68),(-.02,.02,.54),(.20,.02,.55),(.24,.02,.69),(.02,.02,.68)];F=[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)];m=bpy.data.meshes.new('Forged wedge axe head');m.from_pydata(V,[],F);o=bpy.data.objects.new('Axe embedded at chopping block',m);c.objects.link(o);o.parent=root;m.materials.append(steel)
 elif asset=='sawmill_bench':
  for x in [-.70,.70]:
   for side in [-1,1]:rod('Sawbuck splayed leg',(x,side*.35,.025),(x,-side*.12,.87),.045)
   box('Sawbuck cross bearer',(x,0,.65),(.12,.70,.08))
  rod('Log on sawbuck',(-1.05,0,.85),(1.05,0,.85),.22,wood[0]);rod('Fresh sawn log end',(1.051,0,.85),(1.056,0,.85),.21,wood[3])
  for j in range(17):
   t=j*math.tau/17;curve('Log bark fissure',[(-1.04,.221*math.cos(t),.85+.221*math.sin(t)),(1.04,.221*math.cos(t+.015),.85+.221*math.sin(t+.015))],.004,wood[1])
  # A large frame saw leans against the trestle, with individually modelled teeth.
  for x in [-.49,.49]:box('Frame saw handle',(x,-.34,.54),(.04,.035,.72),wood[2])
  box('Frame saw stretcher',(0,-.34,.61),(1.03,.04,.045),wood[2]);box('Thin frame saw blade',(0,-.34,.25),(1.0,.006,.065),steel,b=.001)
  V=[];F=[]
  for j in range(65):
   x=-.49+j*.015;idx=len(V);V.extend([(x,-.343,.218),(x+.014,-.343,.218),(x+.004,-.343,.207)]);F.append((idx,idx+1,idx+2))
  m=bpy.data.meshes.new('Individual saw teeth');m.from_pydata(V,[],F);o=bpy.data.objects.new('Saw teeth',m);c.objects.link(o);o.parent=root;m.materials.append(steel)
  curve('Twisted saw tension cord',[(-.49,-.34,.87),(0,-.34,.89),(.49,-.34,.87)],.003,linen)
 elif asset=='dummy_static':
  box('Dummy cross base',(0,0,.05),(.85,.14,.10),wood[0]);box('Dummy cross base perpendicular',(0,0,.06),(.14,.78,.10),wood[0]);rod('Training dummy upright',(0,0,.04),(0,0,1.68),.048,wood[0]);rod('Dummy crossbar',(-.54,0,1.26),(.54,0,1.26),.036,wood[0])
  E('Stuffed canvas torso',(0,-.01,1.17),(.22,.16,.30),linen);E('Stuffed burlap head',(0,0,1.62),(.13,.12,.15),linen)
  for side in [-1,1]:rod('Straw padded arm',(side*.20,0,1.25),(side*.47,0,1.25),.075,linen,r2=.064)
  for z in [.99,1.18,1.34]:curve('Dummy binding rope',[(.225*math.cos(j*math.tau/64),-.01+.162*math.sin(j*math.tau/64),z) for j in range(65)],.006,leather)
  box('Sewn canvas repair patch',(-.07,-.164,1.25),(.09,.005,.11),wood[2],b=.003)
 elif asset=='flagpole':
  rod('Straight ash flagstaff',(0,0,0),(0,0,2.55),.026,wood[1],r2=.017);E('Flagstaff finial',(0,0,2.60),(.042,.042,.065),iron)
  for z in [.04,.11]:rod('Iron pole socket',(0,0,z),(0,0,z+.035),.043,iron)
  curve('Flag halyard',[(.03,0,.18),(.03,0,2.40),(-.03,0,2.40),(-.03,0,.18)],.0025,linen)
  ns['s']['environment_design']='flag upper hoist attaches at world (0,0,2.40); cloth separate'
 fit_finish(ns,asset,rotation=0 if asset=='flagpole' else -.45,sources=[str(Path(__file__))])
