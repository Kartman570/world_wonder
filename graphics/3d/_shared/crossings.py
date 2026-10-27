"""Independent modular crossings. The walking surface is the shared Z=0 plane."""
import bpy,math,random,json
from pathlib import Path
from environment_studio import begin,fit_finish

def build(asset):
 ns,task=begin(asset);c=ns['c'];root=ns['root'];M=ns['material'];B=ns['box'];R=ns['rod'];E=ns['ell'];r=random.Random(353);wood=[M('Weathered bridge oak %d'%j,(.13+j*.02,.09+j*.014,.043+j*.008),texture=95) for j in range(4)];stone=[M('Old bridge limestone %d'%j,(.22+j*.014,.22+j*.012,.19+j*.011),texture=60) for j in range(4)];rope=M('Worn hemp railing',(.19,.15,.09),texture=160);iron=M('Dark iron fastener',(.05,.055,.055),metal=.65,rough=.7)
 def box(n,p,d,m=None,b=.007):return B(n,p,d,m or r.choice(wood),bevel=b)
 def rod(n,a,b,rad,m=None,r2=None):return R(n,a,b,rad,m or r.choice(wood),r2=r2)
 def curve(n,points,rad,mat):
  cu=bpy.data.curves.new(n,'CURVE');cu.dimensions='3D';cu.bevel_depth=rad;cu.bevel_resolution=2;sp=cu.splines.new('POLY');sp.points.add(len(points)-1)
  for p,v in zip(sp.points,points):p.co=(*v,1)
  o=bpy.data.objects.new(n,cu);c.objects.link(o);o.parent=root;cu.materials.append(mat);return o
 if asset=='dock':
  for x in [-.92,.92]:
   for y in [-2.0,0,2.0]:
    rod('Oak pier piling',(x,y,-1.05),(x,y,.24),.073,wood[0],r2=.061);rod('Pile end grain',(x,y,.24),(x,y,.247),.06,wood[3]);box('Pier cross bearer',(0,y,-.13),(2.18,.14,.16),wood[0])
  for j in range(26):box('Separate weathered pier plank',(0,-2.02+j*.16,-.032),(2.10,.153,.064))
  for x in [-.68,.68]:box('Long pier stringer',(x,0,-.15),(.12,4.2,.17),wood[0])
  for x in [-.92,.92]:
   for j in range(3):curve('Mooring rope coil',[(x+.10*math.cos(k*math.tau/64),2.0+.10*math.sin(k*math.tau/64),.006+j*.012) for k in range(65)],.006,rope)
 elif asset=='bridge':
  V=[];F=[];L=48;length=4.2;width=2.1
  for k in range(L+1):
   y=-length/2+k*length/L;bottom=-.25-.80*(abs(y)/(length/2))**2
   V.extend([(-width/2,y,-.04),(width/2,y,-.04),(-width/2,y,bottom),(width/2,y,bottom)])
  for k in range(L):
   a=k*4;b=(k+1)*4;F.extend([(a,a+1,b+1,b),(a+2,b+2,b+3,a+3),(a,a+2,b+2,b),(a+1,b+1,b+3,a+3)])
  F.extend([(0,2,3,1),(L*4,L*4+1,L*4+3,L*4+2)]);m=bpy.data.meshes.new('Solid segmental stone vault');m.from_pydata(V,[],F);o=bpy.data.objects.new('Arched stone bridge structure',m);c.objects.link(o);o.parent=root;m.materials.append(stone[0])
  for j in range(8):
   for i in range(4):box('Bridge paving slab',(-.7875+i*.525,-1.8375+j*.525,-.02),(.515,.515,.04),r.choice(stone),.005)
  for side in [-1,1]:
   for j in range(8):
    y=-1.8375+j*.525
    for row in range(3):box('Bridge parapet masonry',(side*.98,y,(row+.5)*.21),(.17,.515,.20),r.choice(stone),.009)
    box('Bridge parapet coping',(side*.98,y,.66),(.22,.525,.08),stone[3],.012)
   # Fine radial joints distinguish the voussoirs along the arch soffit.
   for j in range(21):
    y=-2.06+j*4.12/20;z=-.25-.80*(abs(y)/2.1)**2;curve('Arch masonry joint',[(side*1.052,y,z),(side*1.052,y,-.045)],.0018,stone[0])
 elif asset=='footbridge':
  for x in [-.36,.36]:box('Footbridge longitudinal beam',(x,0,-.10),(.12,2.1,.15),wood[0])
  for j in range(14):box('Footbridge plank',(0,-.975+j*.15,-.024),(1.05,.144,.048))
  for side in [-1,1]:
   for y in [-1.05,0,1.05]:rod('Footbridge railing post',(side*.51,y,-.18),(side*.51,y,.66),.027,wood[0])
   for a,b in [(-1.05,0),(0,1.05)]:curve('Rope footbridge handrail',[(side*.51,a+(b-a)*k/20,.60-.055*math.sin(math.pi*k/20)) for k in range(21)],.008,rope)
  for y in [-.90,.90]:box('Footbridge abutment sleeper',(0,y,-.16),(1.19,.18,.13),wood[0])
 elif asset=='fence':
  for x in [-1.05,1.05]:
   box('Square fence post',(x,0,.53),(.11,.11,1.06),wood[0]);E('Rounded post cap',(x,0,1.075),(.058,.058,.027),wood[1])
  for z in [.34,.80]:box('Split oak fence rail',(0,0,z),(2.10,.065,.095),wood[1])
  for x in [-1.05,1.05]:
   for z in [.34,.80]:E('Fence peg',(x,-.06,z),(.008,.004,.008),wood[3])
 ns['s']['environment_design']=json.dumps(dict(grid=.525,walking_surface=0 if asset!='fence' else None,module_span=4.2 if asset in ['dock','bridge'] else 2.1))
 fit_finish(ns,asset,sources=[str(Path(__file__))])
