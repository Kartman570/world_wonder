"""Medieval textile and leather work, visible structural details in the 3D sources."""
import bpy,math,random
from pathlib import Path
from mathutils import Vector
from environment_studio import begin,fit_finish

def build(asset):
 ns,task=begin(asset);c=ns['c'];root=ns['root'];M=ns['material'];B=ns['box'];R=ns['rod'];E=ns['ell'];wood=M('Worn ash timber',(.16,.10,.045),texture=90);linen=M('Unbleached flax thread',(.34,.28,.18),texture=160);dark=M('Dark spun thread',(.075,.06,.04));clay=M('Fired clay loom weights',(.23,.13,.065),texture=90);iron=M('Forged shears steel',(.13,.15,.16),metal=.7,rough=.45);hide=M('Scraped ochre hide',(.25,.15,.065),texture=130);r=random.Random(181)
 def box(n,p,d,m=wood):return B(n,p,d,m,bevel=.005)
 def rod(n,a,b,rad,m=wood,r2=None):return R(n,a,b,rad,m,r2=r2)
 def curve(n,points,rad,mat):
  cu=bpy.data.curves.new(n,'CURVE');cu.dimensions='3D';cu.bevel_depth=rad;cu.bevel_resolution=2;sp=cu.splines.new('POLY');sp.points.add(len(points)-1)
  for p,v in zip(sp.points,points):p.co=(*v,1)
  o=bpy.data.objects.new(n,cu);c.objects.link(o);o.parent=root;cu.materials.append(mat);return o
 def cloth(n,V,F,mat):
  m=bpy.data.meshes.new(n);m.from_pydata(V,[],F);o=bpy.data.objects.new(n,m);c.objects.link(o);o.parent=root;m.materials.append(mat)
  for p in m.polygons:p.use_smooth=True
  sol=o.modifiers.new('Thin hide or woven cloth','SOLIDIFY');sol.thickness=.002;return o
 def pelt(cx,cy,cz,scale=1,vertical=True):
  # Animal hide has neck, four limb lobes and an uneven trimmed edge.
  outline=[(.10,.59),(.12,.40),(.22,.34),(.41,.39),(.46,.28),(.28,.16),(.26,-.16),(.44,-.33),(.41,-.45),(.21,-.36),(.12,-.40),(.045,-.56),(-.04,-.58),(-.11,-.42),(-.24,-.37),(-.43,-.46),(-.47,-.32),(-.29,-.16),(-.27,.14),(-.43,.26),(-.41,.38),(-.22,.33),(-.12,.40),(-.10,.59)]
  N=96;V=[(cx,cy-.008,cz)];border=[]
  for j in range(N):
   k=j//4;q=(j%4)/4;a,b=outline[k],outline[(k+1)%24];x=(a[0]*(1-q)+b[0]*q)*scale;y=(a[1]*(1-q)+b[1]*q)*scale;t=j*math.tau/N
   p=(cx+x,cy+.008*math.sin(t*3),cz+y) if vertical else (cx+x,cy+y,cz+.012*math.sin(t*3));border.append(p);V.append(p)
  F=[(0,j+1,(j+1)%N+1) for j in range(N)];cloth('Trimmed animal hide',V,F,hide);return border
 if asset=='loom':
  for x in [-.61,.61]:
   box('Loom upright',(x,.12,1.0),(.09,.10,2.0));box('Loom stabilizing foot',(x,0,.055),(.16,.75,.11));rod('Loom rear brace',(x,.39,.08),(x,.12,1.35),.027)
  for z in [.56,1.91]:rod('Loom crossbeam',(-.70,.12,z),(.70,.12,z),.057)
  rod('Heddle rod',(-.64,-.10,1.10),(.64,-.10,1.10),.025)
  V=[];F=[]
  for j in range(29):
   z=1.02+j*.028
   for k in range(41):x=-.52+k*.026;V.append((x,.06+.009*math.sin(x*15+z*8),z))
  for j in range(28):
   for k in range(40):i=j*41+k;F.append((i,i+1,i+42,i+41))
  cloth('Partly woven linen cloth',V,F,linen)
  for j in range(61):
   x=-.52+j*1.04/60;curve('Tensioned warp',[(x,.10,1.90),(x,.065,1.02),(x,-.03,.64)],.0012,linen)
  for j in range(20):
   x=-.50+j*1/19;E('Perforated clay warp weight',(x,-.03,.56),(.028,.018,.05),clay)
  box('Weaving sword leaning on frame',(.55,-.19,.86),(.04,.014,.52),wood)
 elif asset=='sewing_table':
  for x in [-.57,.57]:
   for y in [-.29,.29]:box('Work table leg',(x,y,.39),(.06,.06,.78))
  for j in range(5):box('Tabletop plank',(0,-.35+(j+.5)*.70/5,.80),(1.30,.135,.045))
  cloth('Cut linen on worktop',[(-.45,-.30,.827),(.18,-.27,.829),(.37,.01,.83),(.11,.21,.832),(-.49,.18,.829)],[(0,1,2,3,4)],linen)
  for j in range(3):
   x=.40+j*.045;rod('Thread spool',(x,.19,.83),(x,.19,.94),.022,linen);rod('Spool rim',(x,.19,.83),(x,.19,.84),.029,wood);rod('Spool rim',(x,.19,.94),(x,.19,.95),.029,wood)
  # Spring shears, used before modern pivoted scissors became ubiquitous.
  curve('Spring shears handle',[(.32,-.17,.839),(.43,-.22,.839),(.47,-.18,.839),(.43,-.13,.839),(.32,-.11,.839)],.004,iron)
  for y in [-.17,-.11]:box('Shear blade',(.24,y,.841),(.18,.014,.008),iron)
  rod('Bone sewing needle',(-.12,-.06,.842),(.03,.02,.842),.0017,iron)
 elif asset=='fiber_bundle':
  for group in range(3):
   cx=-.28+group*.28;cy=group*.08
   for j in range(58):
    x=cx+r.uniform(-.08,.08);y=cy+r.uniform(-.25,.25);z=r.uniform(.015,.08);length=r.uniform(.55,.78);curve('Long flax fibre',[(x+r.uniform(-.04,.04),y-length/2,z),(x,y,z+.025),(x+r.uniform(-.04,.04),y+length/2,z)],.0019,linen)
   curve('Bundle tie',[(cx+.09*math.cos(t*math.tau/40),cy,.045+.045*math.sin(t*math.tau/40)) for t in range(41)],.004,dark)
 elif asset=='cloth_rolls':
  mats=[linen,M('Muted woad wool',(.065,.095,.13),texture=150),M('Madder brown wool',(.19,.065,.038),texture=150)]
  for j,(y,z,rr) in enumerate([(-.19,.14,.13),(.15,.14,.13),(-.02,.32,.12)]):
   rod('Rolled woven cloth',(-.41,y,z),(.41,y,z),rr,mats[j]);rod('Hollow roll core',(.415,y,z),(.417,y,z),.025,dark)
   points=[]
   for k in range(161):
    q=k/160;angle=q*math.tau*5;radius=.028+q*(rr-.029);points.append((.419,y+radius*math.cos(angle),z+radius*math.sin(angle)))
   curve('Visible wound cloth layers',points,.0018,dark)
 elif asset in ['hide_rack','tanning_frame']:
  if asset=='hide_rack':
   for x in [-.72,.72]:
    rod('Rack post',(x,0,.02),(x,0,1.72),.045);box('Rack foot',(x,0,.06),(.14,.65,.12))
   rod('Hide hanging beam',(-.80,0,1.65),(.80,0,1.65),.045)
   for j in range(3):
    cx=-.44+j*.44;pelt(cx,-.025,1.12,.50);curve('Hide suspension',[(cx,-.025,1.45),(cx,-.04,1.69),(cx+.04,.04,1.69)],.006,linen)
  else:
   for x in [-.67,.67]:
    rod('Stretching frame upright',(x,0,.04),(x,0,1.65),.037);box('Frame foot',(x,0,.04),(.14,.58,.08))
   for z in [.22,1.56]:rod('Stretching frame rail',(-.70,0,z),(.70,0,z),.035)
   border=pelt(0,-.01,.89,1.0)
   for j in range(0,96,6):
    x,y,z=border[j];dx,dz=x,z-.89;q=min(.63/(abs(dx)+1e-6),.62/(abs(dz)+1e-6));curve('Hide lacing',[(x,y,z),(dx*q,0,.89+dz*q)],.0035,linen)
 fit_finish(ns,asset,sources=[str(Path(__file__))])
