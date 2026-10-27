"""Ground remains and a game-animal carcass, independent of animated actors."""
import bpy,math,random
from pathlib import Path
from mathutils import Vector
from environment_studio import begin,finish

def build(asset):
 ns,task=begin(asset);c=ns['c'];root=ns['root'];ell=ns['ell'];rod=ns['rod'];material=ns['material'];bone=material('Sun bleached weathered bone',(.40,.35,.25),texture=95);dark=material('Deep bone recess',(.028,.022,.016));rag=material('Dusty frayed linen',(.13,.11,.075),texture=130)
 def tube(name,points,r,mat=bone):
  curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.bevel_depth=r;curve.bevel_resolution=3;spl=curve.splines.new('POLY');spl.points.add(len(points)-1)
  for p,v in zip(spl.points,points):p.co=(*v,1)
  o=bpy.data.objects.new(name,curve);c.objects.link(o);o.parent=root;curve.materials.append(mat);return o
 if asset=='desert_remains':
  # Rib cage and segmented spine of a supine human, with broken scattered limbs.
  for j in range(16):
   x=-.46+j*.053;ell('Vertebra centrum',(x,0,.085),(.025,.035,.022),bone);rod('Vertebra transverse process',(x,-.065,.085),(x,.065,.085),.008,bone)
  for j in range(10):
   x=-.12+j*.043;w=.115+.047*math.sin(j*math.pi/10);h=.11+.025*math.sin(j*math.pi/10)
   for side in [-1,1]:
    points=[]
    for k in range(18):
     t=k*math.pi*.82/17;points.append((x+.015*math.sin(t),side*w*math.sin(t),.07+h*(1-math.cos(t))))
    tube('Curved rib',points,.007)
  rod('Breast bone',(-.04,0,.28),(.26,0,.25),.014,bone)
  for side in [-1,1]:
   ell('Iliac pelvic wing',(-.48,side*.105,.10),(.12,.045,.08),bone)
   for a,b in [((-.52,side*.09,.11),(-.91,side*.16,.065)),((-.92,side*.16,.06),(-1.24,side*.22,.035)),((.27,side*.16,.11),(-.02,side*.30,.07)),((-.02,side*.30,.07),(-.30,side*.38,.035))]:
    rod('Long bone shaft',a,b,.016,bone,r2=.012);ell('Bone epiphysis',a,(.025,.025,.025),bone);ell('Bone epiphysis',b,(.023,.023,.023),bone)
  skull=ell('Cranium',(.48,0,.13),(.13,.09,.105),bone)
  # Physically recessed orbital cavities and nasal opening, not painted eyes.
  for yy in [-.039,.039]:
   cutter=ell('Orbit cutter',(.565,yy,.153),(.043,.029,.029),dark);bpy.context.view_layer.objects.active=skull;mod=skull.modifiers.new('Eye orbit cavity','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
  ell('Nasal cavity',(.591,0,.116),(.012,.015,.023),dark);tube('Mandible',[ (.51,-.07,.055),(.58,-.055,.055),(.61,0,.052),(.58,.055,.055),(.51,.07,.055)],.013)
  for side in [-1,1]:
   for j in range(6):ell('Small teeth',(.565+j*.006,side*(.045-j*.005),.071),(.005,.006,.009),bone)
  # Torn remnants of clothing, lying between bones rather than a sand backdrop.
  for side in [-1,1]:
   verts=[(-.46,side*.06,.025),(-.3,side*.24,.025),(-.06,side*.23,.025),(.13,side*.16,.025),(.12,side*.09,.025),(-.15,side*.15,.03)];mesh=bpy.data.meshes.new('Torn dry cloth');mesh.from_pydata(verts,[],[(0,1,5),(1,2,5),(2,3,4,5)]);o=bpy.data.objects.new('Weathered rag',mesh);c.objects.link(o);o.parent=root;mesh.materials.append(rag)
  size=96;target=.10
 else:
  flesh=material('Dried dark red muscle',(.16,.047,.031),texture=100);fat=material('Pale connective tissue',(.34,.26,.16),texture=150);hide=material('Brown deer hide',(.12,.075,.035),texture=160)
  # Deer-sized torso with flayed side, separate muscle groups and visible ribs.
  ell('Carcass torso',(0,0,.25),(.66,.23,.24),flesh)
  ell('Haunch muscle',(-.48,.04,.26),(.25,.22,.23),flesh)
  ell('Shoulder muscle',(.43,.025,.24),(.23,.22,.19),flesh)
  for j in range(10):
   x=-.25+j*.055;points=[]
   for k in range(20):
    t=k*math.pi*.82/19;points.append((x,.015-.225*math.sin(t),.16+.24*(1-math.cos(t))))
   tube('Exposed carcass rib',points,.010,bone)
  for j in range(9):ell('Carcass vertebra',(-.36+j*.095,.065,.45),(.035,.04,.025),bone)
  for side in [-1,1]:
   for x in [-.45,.42]:
    a=(x,side*.12,.20);b=(x-.12,side*.40,.10);d=(x-.30,side*.49,.04);rod('Truncated upper leg',a,b,.065,flesh,r2=.04);rod('Trimmed bone',b,d,.016,bone);ell('Cut connective tissue',b,(.045,.04,.035),fat)
  # Discarded hide folded beneath, asymmetric perimeter and fur bump.
  verts=[];faces=[]
  for j in range(49):
   t=j*math.tau/48;rr=1+.12*math.sin(7*t);verts.append((.76*rr*math.cos(t),.36*rr*math.sin(t)+.09,.018+.015*math.sin(t*3)**2))
  verts.append((0,.09,.025))
  for j in range(48):faces.append((49,j,j+1))
  m=bpy.data.meshes.new('Flayed hide outline');m.from_pydata(verts,[],faces);o=bpy.data.objects.new('Folded hide',m);c.objects.link(o);o.parent=root;m.materials.append(hide)
  size=80;target=.18
 root.rotation_euler[2]=-.22
 finish(ns,asset,size=size,target=target,sources=[str(Path(__file__))])
