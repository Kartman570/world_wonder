"""Wooden caravan wagon and a visibly damaged, looted cart."""
import bpy,math,random
from pathlib import Path
from environment_studio import begin,fit_finish

def build(asset):
 ns,task=begin(asset);c=ns['c'];root=ns['root'];M=ns['material'];B=ns['box'];R=ns['rod'];E=ns['ell'];r=random.Random(307);wood=M('Old wagon oak',(.15,.09,.037),texture=100);cut=M('Worn exposed wood',(.23,.15,.068),texture=110);iron=M('Forged wagon tyre iron',(.045,.052,.055),metal=.75,rough=.61,texture=120);canvas=M('Weathered wagon canvas',(.28,.235,.16),texture=175);sack=M('Rough cargo sacking',(.24,.19,.12),texture=170);wreck=asset=='cart_wreck'
 def curve(n,points,rad,mat):
  cu=bpy.data.curves.new(n,'CURVE');cu.dimensions='3D';cu.bevel_depth=rad;cu.bevel_resolution=3;sp=cu.splines.new('POLY');sp.points.add(len(points)-1)
  for p,v in zip(sp.points,points):p.co=(*v,1)
  o=bpy.data.objects.new(n,cu);c.objects.link(o);o.parent=root;cu.materials.append(mat);return o
 def wheel(x,y,z,broken=False,fallen=False):
  before=set(c.objects);hub=bpy.data.objects.new('Detached damaged wheel' if broken else 'Complete spoked oak wheel',None);c.objects.link(hub);hub.parent=root;hub.location=(x,y,z)
  end=math.tau*.77 if broken else math.tau
  for xx in [-.025,.025]:curve('Segmented wooden wheel felloe',[(xx,.414*math.cos(t*end/96),.414*math.sin(t*end/96)) for t in range(97)],.024,wood)
  for xx in [-.043,.043]:curve('Forged iron wheel tyre',[(xx,.441*math.cos(t*end/96),.441*math.sin(t*end/96)) for t in range(97)],.009,iron)
  R('Turned wooden wheel hub',(-.10,0,0),(.10,0,0),.070,wood)
  R('Iron axle cap',(-.106,0,0),(-.110,0,0),.037,iron)
  for j in range(12):
   if broken and j in [8,9,10]:continue
   t=j*math.tau/12;R('Tapered oak wheel spoke',(0,.05*math.cos(t),.05*math.sin(t)),(0,.405*math.cos(t),.405*math.sin(t)),.020,wood,r2=.014)
  for o in set(c.objects)-before:
   if o!=hub:o.parent=hub
  if fallen:hub.rotation_euler[1]=math.pi/2
  return hub
 bed=.38 if wreck else .79
 if wreck:wheel(.73,.80,.452);wheel(-.95,-.68,.052,broken=True,fallen=True)
 else:
  for x in [-.73,.73]:
   for y in [-.76,.76]:wheel(x,y,.452)
 for y in ([.80] if wreck else [-.76,.76]):R('Iron reinforced axle',(-.79,y,.452),(.79,y,.452),.035,iron)
 if not wreck:
  for y in [-.76,.76]:B('Wagon axle bolster',(0,y,.56),(1.05,.15,.23),wood,bevel=.009)
 for x in [-.42,.42]:B('Wagon underframe beam',(x,0,bed-.085),(.12,2.20,.13),wood,bevel=.009)
 for j in range(9):
  if wreck and j in [1,6]:continue
  x=-.54+j*.135;B('Wagon floor plank',(x,0,bed),(.128,2.13,.055),wood,bevel=.005)
 for side in [-1,1]:
  for j in range(4):
   if wreck and ((side<0 and j>0) or j==3):continue
   B('Wagon sideboard',(side*.61,0,bed+.10+j*.12),(.035,2.10,.112),wood,bevel=.005)
  for y in [-.98,.0,.98]:
   if not(wreck and side<0 and y==0):B('Wagon sideboard stanchion',(side*.63,y,bed+.26),(.055,.055,.57),cut,bevel=.006)
 for j in range(3):
  if wreck and j>0:continue
  B('Rear wagon board',(0,1.04,bed+.10+j*.12),(1.22,.035,.112),wood,bevel=.005)
 if not wreck:
  for x in [-.43,.43]:R('Wagon draught shaft',(x,-.85,bed-.06),(x,-2.40,.43),.033,wood,r2=.025)
  B('Driver bench',(0,-.90,bed+.32),(1.15,.26,.055),cut,bevel=.007)
  for y in [-.70,-.28,.20,.70]:
   curve('Steam bent canvas support hoop',[(.625*math.cos(j*math.pi/40),y,bed+.42+.68*math.sin(j*math.pi/40)) for j in range(41)],.016,cut)
  V=[];F=[];N=64;L=48
  for k in range(L+1):
   y=-.74+k*1.75/L
   for j in range(N+1):
    t=j*math.pi/N;rr=1+.009*math.sin(y*15+t*4);V.append((.645*math.cos(t)*rr,y,bed+.42+.70*math.sin(t)*rr))
  for k in range(L):
   for j in range(N):i=k*(N+1)+j;F.append((i,i+1,i+N+2,i+N+1))
  mesh=bpy.data.meshes.new('Woven arched wagon cover');mesh.from_pydata(V,[],F);o=bpy.data.objects.new('Canvas wagon tilt',mesh);c.objects.link(o);o.parent=root;mesh.materials.append(canvas)
  for p in mesh.polygons:p.use_smooth=True
  o.modifiers.new('Heavy canvas thickness','SOLIDIFY').thickness=.003
  for x,y in [(-.20,.55),(.23,.65),(.18,.20)]:E('Tied cargo sack',(x,y,bed+.20),(.20,.25,.20),sack)
  B('Cargo wooden crate',(-.19,-.10,bed+.19),(.43,.48,.34),wood,bevel=.008)
 else:
  for j in range(11):
   x,y=r.uniform(-.9,.9),r.uniform(-1.30,1.20);o=B('Scattered splintered wagon board',(x,y,.035),(.075,r.uniform(.40,.80),.035),cut,bevel=.003);o.rotation_euler[2]=r.uniform(-1,1)
  for x in [-.43,.43]:R('Snapped draught shaft',(x,-.80,bed-.06),(x+.06,-1.20,.36),.032,wood,r2=.018)
  V=[(-.58,.28,bed+.36),(.47,.32,bed+.35),(.45,.95,bed+.23),(.24,1.02,bed+.35),(.14,.78,bed+.25),(-.23,.94,bed+.37),(-.57,1.0,bed+.29)];mesh=bpy.data.meshes.new('Torn abandoned canvas');mesh.from_pydata(V,[],[(0,1,4),(1,2,3,4),(0,4,5,6)]);o=bpy.data.objects.new('Torn canvas remnant',mesh);c.objects.link(o);o.parent=root;mesh.materials.append(canvas)
 if wreck:
  body=bpy.data.objects.new('Collapsed wagon body',None);c.objects.link(body);body.parent=root
  for o in list(c.objects):
   if o!=body and o.parent==root and o.type!='EMPTY' and not o.name.startswith(('Scattered','Iron reinforced axle')):o.parent=body
  body.rotation_euler[0]=.28
 fit_finish(ns,asset,sources=[str(Path(__file__))])
