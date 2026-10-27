"""Medieval joinery, solid wood furniture and coopered containers."""
import bpy,math,random
from pathlib import Path
from mathutils import Vector
from environment_studio import begin,finish

def build(asset):
 ns,task=begin(asset);r=random.Random(127);c=ns['c'];root=ns['root'];M=ns['material'];box=ns['box'];rod=ns['rod'];ell=ns['ell']
 woods=[M('Oak grain shade %d'%i,(.14+i*.017,.082+i*.012,.036+i*.007),texture=75) for i in range(5)];iron=M('Blackened forged iron',(.037,.041,.043),metal=.65,rough=.64,texture=100);linen=M('Unbleached linen',(.37,.33,.24),texture=180);blanket=M('Worn madder wool',(.16,.055,.035),texture=145)
 for mat in woods:
  n=mat.node_tree.nodes;l=mat.node_tree.links;tex=next(x for x in n if x.type=='TEX_NOISE');coord=n.new('ShaderNodeTexCoord');mapping=n.new('ShaderNodeVectorMath');mapping.operation='MULTIPLY';mapping.inputs[1].default_value=(.10,2,3);l.new(coord.outputs['Generated'],mapping.inputs[0]);l.new(mapping.outputs[0],tex.inputs['Vector']);tex.inputs['Scale'].default_value=6
 def B(name,loc,dims,mat=None,bevel=.006):return box(name,loc,dims,mat or r.choice(woods),bevel=bevel)
 def R(name,a,b,rad,mat=None):return rod(name,a,b,rad,mat or r.choice(woods))
 def torus(name,loc,major,minor,mat,rot=(0,0,0)):
  bpy.ops.mesh.primitive_torus_add(major_segments=64,minor_segments=10,location=loc,rotation=rot,major_radius=major,minor_radius=minor);o=bpy.context.object;o.name=name
  for col in list(o.users_collection):col.objects.unlink(o)
  c.objects.link(o);o.parent=root;o.data.materials.append(mat);return o
 def barrel(cx,cy,z,radius=.28,h=.76):
  N=24
  for j in range(N):
   points=[];faces=[];sections=[(0,.85),(.10,.94),(.3,1.02),(.5,1.06),(.7,1.02),(.90,.94),(1,.85)]
   for zz,rr in sections:
    for t in [j*math.tau/N+.004,(j+1)*math.tau/N-.004]:points.append((cx+radius*rr*math.cos(t),cy+radius*rr*math.sin(t),z+zz*h))
   for k in range(len(sections)-1):faces.append((k*2,k*2+1,k*2+3,k*2+2))
   m=bpy.data.meshes.new('Separate curved oak stave');m.from_pydata(points,[],faces);o=bpy.data.objects.new('Coopered barrel stave',m);c.objects.link(o);o.parent=root;m.materials.append(woods[j%5]);mod=o.modifiers.new('Solid stave','SOLIDIFY');mod.thickness=.018
  for q,rr in [(.10,.94),(.28,1.015),(.72,1.015),(.90,.94)]:
   for d in [-.012,.012]:torus('Forged barrel hoop',(cx,cy,z+q*h+d),radius*rr+.005,.012,iron)
  R('Barrel lid',(cx,cy,z+h-.016),(cx,cy,z+h-.006),radius*.84,woods[2])
  for j in range(-3,4):
   y=j*radius*.2;length=2*math.sqrt(max(0,(radius*.83)**2-y*y));R('Lid plank joint',(cx-length/2,cy+y,z+h-.004),(cx+length/2,cy+y,z+h-.004),.0016,iron)
  R('Wooden bung',(cx,cy-radius*1.06,z+h*.5),(cx,cy-radius*1.06-.012,z+h*.5),.024,woods[1])
 def crate(cx,cy,z,w=.68,d=.58,h=.62):
  for y in [-d/2,d/2]:
   for j in range(5):B('Crate side plank',(cx,cy+y,z+(j+.5)*h/5),(w,.025,h/5-.004))
  for x in [-w/2,w/2]:
   for j in range(5):B('Crate end plank',(cx+x,cy,z+(j+.5)*h/5),(.025,d,h/5-.004))
  for j in range(5):B('Crate lid board',(cx-w/2+(j+.5)*w/5,cy,z+h),(w/5-.004,d,.028))
  for x in [-w*.4,w*.4]:
   for y in [-d*.51,d*.51]:
    B('Crate reinforcing cleat',(cx+x,cy+y,z+h*.5),(.054,.032,h+.02),woods[0])
    for zz in [z+.06,z+h-.06]:ell('Square iron nail',(cx+x,cy+y-.019,zz),(.008,.004,.008),iron)
 if asset=='bed':
  for x in [-.48,.48]:
   for y in [-.94,.94]:B('Bed post',(x,y,.42),(.09,.09,.84 if y>0 else .55))
  for x in [-.46,.46]:B('Long bed rail',(x,0,.34),(.07,1.92,.17))
  for y in [-.93,.93]:B('Bed end rail',(0,y,.34),(.93,.07,.17))
  for j in range(11):B('Mattress support slat',(0,-.85+j*.17,.36),(.91,.13,.027))
  for j in range(4):B('Raised headboard',(0,.94,.47+j*.09),(.92,.04,.085))
  for j in range(2):B('Low footboard',(0,-.94,.40+j*.07),(.92,.04,.065))
  ell('Straw filled mattress',(0,0,.47),(.46,.94,.13),linen);ell('Long linen bolster',(0,.66,.60),(.38,.16,.095),linen)
  V=[];F=[];NX=24;NY=36
  for j in range(NY+1):
   y=-.96+j*1.37/NY
   for i in range(NX+1):
    x=-.52+i*1.04/NX;z=.63-.13*(abs(x)/.52)**7+.012*math.sin(x*28+y*8)+.007*math.sin(y*42);V.append((x,y,z))
  for j in range(NY):
   for i in range(NX):k=j*(NX+1)+i;F.append((k,k+1,k+NX+2,k+NX+1))
  m=bpy.data.meshes.new('Draped woven blanket');m.from_pydata(V,[],F);o=bpy.data.objects.new('Wool blanket',m);c.objects.link(o);o.parent=root;m.materials.append(blanket)
  for p in m.polygons:p.use_smooth=True
 elif asset in ['table','bench']:
  bench=asset=='bench';length=1.75;width=.36 if bench else .84;height=.46 if bench else .78;count=3 if bench else 6
  for j in range(count):B('Separate top plank',(0,-width/2+(j+.5)*width/count,height),(length,width/count-.004,.045))
  for x in [-.56,.56]:
   for side in [-1,1]:R('Splayed trestle leg',(x,side*width*.45,.035),(x,side*width*.24,height-.04),.037)
   B('Trestle cross foot',(x,0,.065),(.10,width+.08,.075));B('Trestle top bearer',(x,0,height-.06),(.09,width,.075))
  B('Long mortised stretcher',(0,0,.25 if bench else .36),(1.25,.06,.08))
  for x in [-.65,.65]:B('Wedge through tenon',(x,0,.25 if bench else .36),(.018,.12,.10),woods[0])
 elif asset=='shelf':
  for x in [-.62,.62]:B('Shelf upright',(x,0,.94),(.07,.35,1.88))
  for j in range(9):B('Shelf backing board',(-.58+j*.145,.16,.96),(.14,.025,1.84))
  for z in [.13,.55,.97,1.39,1.83]:B('Shelf board',(0,0,z),(1.30,.37,.045))
  covers=[M('Manuscript binding %d'%i,col,texture=110) for i,col in enumerate([(.12,.065,.035),(.07,.09,.07),(.14,.04,.027),(.17,.13,.07)])]
  for level in range(4):
   x=-.53
   for j in range(11):
    w=r.uniform(.045,.072);h=r.uniform(.22,.33);z=.16+level*.42;book=B('Bound parchment manuscript',(x+w/2,-.02,z+h/2),(w,.24,h),r.choice(covers),.002)
    for band in [.06,h-.055]:B('Raised spine binding',(x+w/2,-.143,z+band),(w+.003,.008,.008),woods[2],.001)
    x+=w+.017
 elif asset=='counter':
  for x in [-.76,.76]:
   for y in [-.25,.25]:B('Counter corner post',(x,y,.47),(.075,.075,.94))
  for j in range(12):B('Counter front panel',(-.70+j*.127,-.25,.47),(.12,.035,.78))
  for x in [-.76,.76]:B('Counter end panel',(x,0,.47),(.035,.50,.78))
  for z in [.14,.80]:B('Front frame rail',(0,-.277,z),(1.57,.045,.065),woods[0])
  for j in range(4):B('Countertop plank',(0,-.31+(j+.5)*.62/4,.96),(1.68,.15,.06))
  B('Inner work shelf',(0,.015,.40),(1.45,.45,.035))
 elif asset=='barrels':barrel(-.25,-.14,.015);barrel(.30,.27,.015,.23,.63);barrel(-.29,.42,.015,.22,.58)
 elif asset=='crates':crate(-.27,-.14,.025);crate(.39,.29,.025,.58,.53,.54);crate(-.24,-.10,.68,.48,.43,.43)
 root.rotation_euler[2]=-.45
 # Fit camera in increments without changing metres per pixel; include ground anchor.
 import numpy as np
 bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();points=[(0,0,0)]
 for o in c.objects:
  if o.type not in ['MESH','CURVE']:continue
  ev=o.evaluated_get(dg);m=ev.to_mesh();points.extend([tuple(ev.matrix_world@v.co) for v in m.vertices]);ev.to_mesh_clear()
 p=np.array(points);v=p[:,2]*math.cos(math.pi/6)+p[:,1]*.5;lo,hi=v.min(),v.max();target=float((lo+hi)/(2*math.cos(math.pi/6)));extent=max(2*abs(p[:,0]).max(),hi-lo)+.35;size=math.ceil(extent*(128/4.2)/16)*16
 finish(ns,asset,size=size,target=target,sources=[str(Path(__file__))])
