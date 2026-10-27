"""Small temperate plants, built from stems and curved leaf/petal surfaces."""
import bpy,math,random
from pathlib import Path
from mathutils import Vector
from environment_studio import begin,finish

def build(asset):
 ns,task=begin(asset);r=random.Random(47);c=ns['c'];root=ns['root'];material=ns['material'];rod=ns['rod'];ell=ns['ell'];green=material('Stem muted green',(.075,.12,.028),texture=80);leafm=[material('Leaf shade %d'%i,(.055+i*.015,.095+i*.023,.022+i*.006),texture=100) for i in range(4)];straw=material('Dry wheat straw',(.35,.25,.09),texture=100);grain=material('Ripe wheat grain',(.43,.31,.12),texture=110);white=material('Ivory flower petal',(.63,.61,.47));yellow=material('Ochre pollen',(.46,.29,.035),texture=120);blue=material('Flax pale blue petal',(.19,.29,.47));brown=material('Cattail seed head',(.09,.045,.021),texture=150)
 V=[];F=[];MI=[];mats=leafm+[white,blue]
 def leaf(a,b,width,idx=0,serrated=False):
  a,b=Vector(a),Vector(b);d=b-a;side=d.cross(Vector((0,0,1)))
  if side.length<.01:side=Vector((1,0,0))
  side.normalize();base=len(V);N=12
  for j in range(N+1):
   q=j/N;w=width*math.sin(math.pi*q)**.75*(.85 if serrated and j%2 else 1);center=a+d*q+Vector((0,0,.045*math.sin(math.pi*q)))
   V.extend([tuple(center-side*w),tuple(center+Vector((0,0,.012*math.sin(math.pi*q)))),tuple(center+side*w)])
  for j in range(N):
   for k in range(2):F.append((base+j*3+k,base+j*3+k+1,base+(j+1)*3+k+1,base+(j+1)*3+k));MI.append(idx)
 def stem(a,b,radius=.006,mat=None):return rod('Plant stem',a,b,radius,mat or green,r2=radius*.6)
 def flower(pos,flax=False):
  x,y,z=pos;count=5 if flax else 12
  for j in range(count):
   t=j*math.tau/count;rr=.09 if flax else .085;leaf((x+.006*math.cos(t),y+.006*math.sin(t),z),(x+rr*math.cos(t),y+rr*math.sin(t),z-.012),.032 if flax else .015,5 if flax else 4)
  ell('Flower pollen centre',(x,y,z+.007),(.014,.014,.008) if flax else (.025,.025,.014),yellow)
 if asset=='herb':
  for cl in range(3):
   x,y=r.uniform(-.22,.22),r.uniform(-.18,.18)
   for j in range(10):
    t=j*2.399;leaf((x,y,.025),(x+.27*math.cos(t),y+.27*math.sin(t),r.uniform(.06,.15)),.052,j%4)
   for j in range(2):
    end=(x+r.uniform(-.05,.05),y+r.uniform(-.05,.05),r.uniform(.27,.39));stem((x,y,.01),end,.003);rod('Plantain seed spike',end,(end[0],end[1],end[2]+.055),.009,brown,r2=.005)
 elif asset in ['flower_patch','flax']:
  for j in range(22 if asset=='flower_patch' else 25):
   x,y=r.uniform(-.48,.48),r.uniform(-.34,.34);h=r.uniform(.18,.40) if asset=='flower_patch' else r.uniform(.47,.75);end=Vector((x+.025,y+.015,h));stem((x,y,.015),end,.003)
   for k in range(4):
    q=.15+k*.15;t=j+k*2.4;a=Vector((x,y,.01)).lerp(end,q);leaf(a,a+Vector((.12*math.cos(t),.12*math.sin(t),.025)),.010 if asset=='flax' else .026,k%4,asset!='flax')
   flower(end,asset=='flax')
 elif asset=='reed':
  for j in range(17):
   x,y=r.uniform(-.38,.38),r.uniform(-.27,.27);h=r.uniform(1,1.65);stem((x,y,.01),(x+.035,y,h),.007)
   if j%3!=0:rod('Velvety cattail spike',(x+.035,y,h-.20),(x+.035,y,h),.031,brown,r2=.026);stem((x+.035,y,h),(x+.035,y,h+.12),.002,brown)
   for k in range(4):
    t=j*2.4+k*1.5;leaf((x,y,.02),(x+.35*math.cos(t),y+.35*math.sin(t),h*r.uniform(.55,.85)),.023,k%4)
 elif asset=='grain':
  for j in range(48):
   x,y=r.uniform(-.45,.45),r.uniform(-.32,.32);h=r.uniform(.75,1.05);stem((x,y,.02),(x+.03,y,h),.004,straw)
   for k in range(3):
    t=j+k*2;leaf((x,y,.15+k*.16),(x+.22*math.cos(t),y+.22*math.sin(t),.26+k*.16),.013,2)
   for k in range(9):
    z=h+k*.014;side=(-1)**k;ell('Wheat kernel',(x+.03+side*.013,y,z),(.016,.012,.023),grain);stem((x+.03+side*.015,y,z),(x+.03+side*.045,y,z+.09),.0008,straw)
 elif asset=='hops':
  wood=material('Weathered hop support',(.18,.12,.065),texture=60)
  for x in [-.35,.35]:stem((x,0,0),(x,0,1.8),.025,wood)
  stem((-.42,0,1.75),(.42,0,1.75),.022,wood)
  for side in [-1,1]:
   old=(side*.35,0,.02)
   for j in range(32):
    z=.025+j*.054;t=j*.8;pos=(side*.35+.055*math.cos(t),.055*math.sin(t),z);stem(old,pos,.004);old=pos
    a=Vector(pos);end=a+Vector((.22*math.cos(t),.20*math.sin(t),-.04));leaf(a,end,.075,j%4,True)
    if j%3==0:
     cen=end+Vector((0,0,-.065));ell('Hop cone',cen,(.028,.028,.055),leafm[2])
     for k in range(4):
      for b in range(5):
       aa=b*math.tau/5+k*.7;leaf(cen+Vector((0,0,.028-k*.017)),cen+Vector((.037*math.cos(aa),.037*math.sin(aa),.005-k*.017)),.012,3)
 elif asset=='bush':
  wood=material('Hazel woody stems',(.14,.095,.055),texture=55)
  for j in range(22):
   t=j*2.399;a=Vector((r.uniform(-.10,.10),r.uniform(-.10,.10),.02));b=Vector((r.uniform(.35,.65)*math.cos(t),r.uniform(.35,.65)*math.sin(t),r.uniform(.6,1.3)));stem(a,b,.012,wood)
   for k in range(7):
    q=.25+k*.1;aa=t+k*2.399;start=a.lerp(b,q);tip=start+Vector((.25*math.cos(aa),.25*math.sin(aa),.14));stem(start,tip,.004,wood)
    for l in range(12):
     tt=aa+l*2.4;pos=start.lerp(tip,l/12);leaf(pos,pos+Vector((.17*math.cos(tt),.17*math.sin(tt),r.uniform(-.04,.07))),.055,l%4,True)
 if V:
  m=bpy.data.meshes.new('Curved botanical leaf surfaces');m.from_pydata(V,[],F);m.update();o=bpy.data.objects.new('Leaves and petals',m);c.objects.link(o);o.parent=root
  for mat in mats:m.materials.append(mat)
  for p,i in zip(m.polygons,MI):p.material_index=i;p.use_smooth=True
 height={'herb':.5,'flower_patch':.5,'reed':1.8,'bush':1.5,'grain':1.3,'hops':1.9,'flax':.85}[asset]
 finish(ns,asset,size=96 if asset in ['reed','hops'] else 80 if asset=='bush' else 64,target=height*.40,sources=[str(Path(__file__))])
