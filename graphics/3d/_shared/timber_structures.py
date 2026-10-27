"""Independent timber structures, canvas and rope; buildings remain deferred."""
import bpy,math,random
from pathlib import Path
from mathutils import Vector
from environment_studio import begin,fit_finish

def build(asset):
 ns,task=begin(asset);c=ns['c'];root=ns['root'];M=ns['material'];B=ns['box'];R=ns['rod'];E=ns['ell'];r=random.Random(293);wood=M('Old structural oak',(.14,.085,.038),texture=85);worn=M('Worn wooden walking boards',(.20,.13,.063),texture=100);bark=M('Rough palisade bark',(.105,.071,.038),texture=50);rope=M('Weathered hemp rope',(.22,.17,.10),texture=150);canvas=M('Oiled canvas',(.30,.255,.17),texture=165);red=M('Weathered red canvas stripe',(.16,.055,.035),texture=160);dark=M('Unlit tent interior',(.018,.015,.01))
 def box(n,p,d,m=wood):return B(n,p,d,m,bevel=.007)
 def rod(n,a,b,rad,m=wood,r2=None):return R(n,a,b,rad,m,r2=r2)
 def curve(n,points,rad,mat=rope):
  cu=bpy.data.curves.new(n,'CURVE');cu.dimensions='3D';cu.bevel_depth=rad;cu.bevel_resolution=2;sp=cu.splines.new('POLY');sp.points.add(len(points)-1)
  for p,v in zip(sp.points,points):p.co=(*v,1)
  o=bpy.data.objects.new(n,cu);c.objects.link(o);o.parent=root;cu.materials.append(mat);return o
 def mesh(n,V,F,m):
  data=bpy.data.meshes.new(n);data.from_pydata(V,[],F);o=bpy.data.objects.new(n,data);c.objects.link(o);o.parent=root;data.materials.append(m);return o
 def ladder(x,y,h):
  for dx in [-.20,.20]:rod('Ladder stile',(x+dx,y-.28,.03),(x+dx,y,h),.025)
  for j in range(1,int(h/.24)):
   z=j*.24;yy=y-.28*(1-z/h);rod('Ladder rung',(x-.20,yy,z),(x+.20,yy,z),.018,worn)
 if asset=='palisade':
  for j in range(14):
   x=-1.30+j*.20;h=2.05+r.uniform(-.12,.16);rr=.105+r.uniform(-.007,.007);rod('Closely set sharpened stake',(x,0,.01),(x,0,h-.22),rr,bark,r2=rr*.91);rod('Hewn palisade point',(x,0,h-.22),(x+.015,0,h),rr*.91,worn,r2=.003)
   for z in [.54,1.30]:
    curve('Hemp palisade lashing',[(x+.113*math.cos(k*math.tau/32),.113*math.sin(k*math.tau/32),z+.009*math.sin(k*math.tau/32)) for k in range(33)],.005)
  for z in [.54,1.30]:rod('Rear horizontal binder',(-1.42,.11,z),(1.42,.11,z),.048)
 elif asset=='construction_scaffold':
  for x in [-1.10,1.10]:
   for y in [-.45,.45]:rod('Scaffold upright',(x,y,.01),(x,y,3.35),.052);box('Post ground sleeper',(x,y,.035),(.32,.26,.07))
  for z in [1.42,2.85]:
   for x in [-1.10,1.10]:rod('Scaffold cross bearer',(x,-.57,z-.07),(x,.57,z-.07),.045)
   for j in range(6):box('Scaffold walking board',(0,-.48+j*.19,z),(2.48,.18,.04),worn)
   for y in [-.45,.45]:rod('Long diagonal scaffold brace',(-1.10,y,z-1.30),(1.10,y,z-.10),.029)
  for y in [-.45,.45]:rod('Top guard rail',(-1.10,y,3.30),(1.10,y,3.30),.028)
  ladder(.58,-.46,2.85)
 elif asset=='watchtower':
  for x in [-.66,.66]:
   for y in [-.66,.66]:rod('Watchtower main post',(x,y,0),(x,y,4.05),.085)
  for side in [-1,1]:
   for a,b in [((-.66,side*.66,.25),(.66,side*.66,2.95)),((.66,side*.66,.25),(-.66,side*.66,2.95)),((side*.66,-.66,.25),(side*.66,.66,2.95))]:rod('Tower diagonal bracing',a,b,.038)
  for j in range(9):box('Tower platform board',(-.80+(j+.5)*1.60/9,0,3.02),(1.60/9-.006,1.64,.065),worn)
  for side in [-1,1]:
   for z in [3.22,3.65]:
    box('Tower railing',(0,side*.78,z),(1.70,.07,.08));box('Tower railing',(side*.78,0,z),(.07,1.70,.08))
  for j in range(7):
   x=-.63+j*.21
   for y in [-.78,.78]:rod('Railing spindle',(x,y,3.05),(x,y,3.66),.018)
  ladder(0,-.68,3.02)
  # Four sided shingled roof is part of this independent tower, no flag layer.
  V=[(-.98,-.98,4.02),(.98,-.98,4.02),(.98,.98,4.02),(-.98,.98,4.02),(0,0,4.78)];mesh('Weathered boarded tower roof',V,[(0,1,4),(1,2,4),(2,3,4),(3,0,4)],wood)
  for side in range(4):
   a=Vector(V[side]);b=Vector(V[(side+1)%4]);peak=Vector(V[4])
   for row in range(7):
    q0=row/7;q1=(row+1)/7;aa=a.lerp(peak,q0);bb=b.lerp(peak,q0);cc=a.lerp(peak,q1);dd=b.lerp(peak,q1);count=max(2,10-row)
    for j in range(count):
     t0=j/count+.003;t1=(j+1)/count-.003;points=[aa.lerp(bb,t0),aa.lerp(bb,t1),cc.lerp(dd,t1),cc.lerp(dd,t0)];mesh('Individual oak roof shingle',[tuple(p+Vector((0,0,.012))) for p in points],[(0,1,2,3)],worn if (row+j)%4==0 else wood)
 elif asset=='market_stall':
  for x in [-.84,.84]:
   for y in [-.47,.47]:rod('Market stall post',(x,y,0),(x,y,2.16 if y>0 else 1.92),.034)
  for y,z in [(-.47,1.92),(.47,2.16)]:rod('Awning support rail',(-.94,y,z),(.94,y,z),.028)
  for x in [-.84,.84]:rod('Awning side rail',(x,-.48,1.92),(x,.48,2.16),.025)
  for j in range(10):box('Empty counter front board',(-.74+j*.165,-.42,.45),(.16,.035,.82))
  for j in range(4):box('Market worktop',(0,-.395+j*.15,.90),(1.80,.145,.05),worn)
  V=[];F=[];NX=48;NY=18
  for j in range(NY+1):
   y=-.62+j*1.20/NY
   for i in range(NX+1):x=-.97+i*1.94/NX;z=1.92+(y+.47)*.25+.018*math.cos(i*math.pi/3)-.022*math.sin(j*math.pi/NY);V.append((x,y,z))
  for j in range(NY):
   for i in range(NX):k=j*(NX+1)+i;F.append((k,k+1,k+NX+2,k+NX+1))
  o=mesh('Striped folded canvas awning',V,F,canvas);o.data.materials.append(red)
  for p in o.data.polygons:p.material_index=(p.index%NX//6)%2;p.use_smooth=True
  o.modifiers.new('Canvas thickness','SOLIDIFY').thickness=.002
 elif asset=='camp_tent':
  for y in [-1.12,1.12]:rod('Tent ridge post',(0,y,0),(0,y,1.43),.025)
  rod('Tent ridge pole',(0,-1.20,1.43),(0,1.20,1.43),.028)
  for side in [-1,1]:
   V=[];F=[];NX=24;NY=40
   for j in range(NY+1):
    y=-1.14+j*2.28/NY
    for k in range(NX+1):q=k/NX;x=side*.95*q;z=1.43*(1-q)+.03+.014*math.sin(y*17+q*7)*math.sin(math.pi*q);V.append((x,y,z))
   for j in range(NY):
    for k in range(NX):i=j*(NX+1)+k;F.append((i,i+1,i+NX+2,i+NX+1))
   o=mesh('Tensioned tent canvas',V,F,canvas)
   for p in o.data.polygons:p.use_smooth=True
   o.modifiers.new('Canvas thickness','SOLIDIFY').thickness=.003
   for y in [-.95,.95]:
    rod('Tent peg',(side*1.32,y,.015),(side*1.32,y,.15),.012,worn);curve('Tent guy rope',[(side*.88,y,.16),(side*1.13,y,.09),(side*1.32,y,.04)],.0025)
  mesh('Closed rear canvas',[(-.95,1.14,.03),(.95,1.14,.03),(0,1.14,1.46)],[(0,1,2)],canvas)
  for side in [-1,1]:mesh('Folded entrance flap',[(side*.95,-1.15,.03),(side*.23,-1.16,.03),(side*.09,-1.16,1.23),(0,-1.15,1.46)],[(0,1,2,3)],canvas)
  mesh('Dark tent opening',[(-.24,-.99,.025),(.24,-.99,.025),(0,-.99,1.24)],[(0,1,2)],dark)
 fit_finish(ns,asset,sources=[str(Path(__file__))])
