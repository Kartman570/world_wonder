"""Iron cells, stair flights and carved or deposited dungeon stone."""
import bpy,math,random
from pathlib import Path
from mathutils import Vector,noise
from environment_studio import begin,fit_finish

def build(asset):
 ns,task=begin(asset);c=ns['c'];root=ns['root'];M=ns['material'];B=ns['box'];R=ns['rod'];E=ns['ell'];stone=M('Damp weathered limestone',(.20,.21,.19),texture=75);edge=M('Worn stone edges',(.29,.285,.25),texture=95);iron=M('Rust marked forged iron',(.08,.085,.087),metal=.7,rough=.62,texture=100);dark=M('Deep unlit recess',(.018,.02,.018));r=random.Random(271)
 if asset in ['cell_bars','cell_door']:
  door=asset=='cell_door';width=.98 if door else 1.58;height=2.12
  for x in [-width/2,width/2]:B('Iron cell frame jamb',(x,0,height/2),(.045,.055,height),iron,bevel=.004)
  for z in [.045,height]:B('Iron cell frame crosspiece',(0,0,z),(width+.045,.055,.055),iron,bevel=.004)
  for z in [.64,1.44]:B('Forged horizontal tie',(0,-.005,z),(width,.025,.025),iron,bevel=.002)
  count=7 if door else 11
  for j in range(1,count):
   x=-width/2+j*width/count;R('Square forged vertical bar',(x,0,.045),(x,0,height),.011,iron)
   for z in [.64,1.44]:E('Bar riveting',(x,-.022,z),(.013,.007,.013),iron)
  if door:
   B('Iron lock plate',(.32,-.037,1.05),(.18,.018,.17),iron,bevel=.008);B('Dark keyhole',(.33,-.049,1.04),(.012,.003,.027),dark,bevel=.003)
   for z in [.37,1.76]:R('Door hinge barrel',(-width/2-.018,0,z-.08),(-width/2-.018,0,z+.08),.025,iron)
 elif asset in ['stairs_up','stairs_down']:
  down=asset=='stairs_down';N=7;step=.14 if down else .18;depth=.32 if down else .28;width=1.10
  for j in range(N):
   y=(-.96 if down else -.84)+j*depth;top=-(j+.5)*step if down else (j+1)*step;bottom=-N*step-.09 if down else 0
   B('Individual worn stone step',(0,y,(top+bottom)/2),(width,depth+.003,top-bottom),stone,bevel=.009);B('Worn stair nosing',(0,y+(depth*.42 if down else -depth*.48),top+(.004 if down else -.014)),(width+.008,.060 if down else .035,.015 if down else .027),edge,bevel=.008)
  if down:
   for side in [-1,1]:B('Stairwell stone side',(side*.63,0,-.46),(.17,2.40,1.10),stone,bevel=.014)
   B('Stairwell rear wall',(0,1.20,-.46),(1.43,.16,1.10),dark,bevel=.008)
   for side in [-1,1]:B('Stairwell upper coping',(side*.63,0,.095),(.21,2.44,.13),edge,bevel=.012)
   # Invisible ground outside the opening occludes the buried exterior faces.
   maskmat=bpy.data.materials.new('Ground level holdout, not artwork');maskmat.use_nodes=True;nodes=maskmat.node_tree.nodes;nodes.clear();out=nodes.new('ShaderNodeOutputMaterial');hold=nodes.new('ShaderNodeHoldout');maskmat.node_tree.links.new(hold.outputs[0],out.inputs[0])
   rig=bpy.data.collections['RENDER_RIG']
   for x1,x2,y1,y2 in [(-8,-.55,-8,8),(.55,8,-8,8),(-.55,.55,-8,-1.12),(-.55,.55,1.12,8)]:
    mesh=bpy.data.meshes.new('Invisible ground mask');mesh.from_pydata([(x1,y1,.01),(x2,y1,.01),(x2,y2,.01),(x1,y2,.01)],[],[(0,1,2,3)]);o=bpy.data.objects.new('HOLDOUT outside stairwell',mesh);rig.objects.link(o);o.parent=root;mesh.materials.append(maskmat)
   daylight=bpy.data.lights.new('Stairwell skylight','AREA');daylight.energy=60;daylight.shape='DISK';daylight.size=.7;lamp=bpy.data.objects.new('Stairwell skylight',daylight);rig.objects.link(lamp);lamp.location=(0,0,1.5)
  else:
   for side in [-1,1]:
    for j in range(N):B('Stepped stone side',(side*.63,-.84+j*depth,(j+1)*step/2),(.16,depth,(j+1)*step+.11),stone,bevel=.009)
 elif asset=='sarcophagus':
  # Rectangular stone chest, a truly hollow interior and a separate removable lid.
  B('Sarcophagus bottom',(0,0,.10),(.84,1.95,.20),stone,bevel=.025)
  for side in [-1,1]:B('Sarcophagus side',(side*.395,0,.36),(.15,1.95,.47),stone,bevel=.025);B('End slab',(0,side*.92,.36),(.82,.14,.47),stone,bevel=.02)
  lid=B('Sarcophagus removable stone lid',(0,0,.65),(.94,2.04,.17),edge,bevel=.034);lid['variant']='hide this object to reveal the empty stone trough'
  # Shallow carved cross and inset border, no text or glowing ornament.
  B('Carved lid longitudinal relief',(0,0,.741),(.055,1.36,.018),stone,bevel=.009);B('Carved lid cross arm',(0,.32,.742),(.37,.055,.018),stone,bevel=.009)
  for side in [-1,1]:
   B('Lid border edge',(side*.37,0,.741),(.025,1.70,.012),stone,bevel=.006);B('Lid border end',(0,side*.84,.741),(.76,.025,.012),stone,bevel=.006)
 elif asset=='stalagmite':
  calcite=M('Damp calcite deposits',(.27,.255,.20),rough=.57,texture=65)
  for j,(x,y,h,rr) in enumerate([(0,0,1.68,.31),(.40,.13,.93,.24),(-.30,-.09,.65,.19),(.15,-.30,.42,.15)]):
   V=[];F=[];N=64;L=36
   for k in range(L+1):
    q=k/L;z=.015+h*q;rad=rr*(1-q)**.73*(1+.08*math.cos(q*math.pi*4))+.003
    for b in range(N):
     t=b*math.tau/N;radial=rad*(1+.055*math.sin(t*9+q*1.5)+.025*noise.noise(Vector((math.cos(t)*2,math.sin(t)*2,q*10))));V.append((x+radial*math.cos(t)+.025*q*q,y+radial*math.sin(t),z))
   for k in range(L):
    for b in range(N):F.append((k*N+b,k*N+(b+1)%N,(k+1)*N+(b+1)%N,(k+1)*N+b))
   F.append(tuple(range(L*N,(L+1)*N)));m=bpy.data.meshes.new('Natural calcite deposition');m.from_pydata(V,[],F);o=bpy.data.objects.new('Irregular cave stalagmite',m);c.objects.link(o);o.parent=root;m.materials.append(calcite)
   for p in m.polygons:p.use_smooth=True
 fit_finish(ns,asset,rotation=0 if asset=='stairs_down' else -.45,sources=[str(Path(__file__))])
