"""Cold supports for the separate fire sprites. No emissive or baked flames."""
import bpy,math,random,json
from pathlib import Path
from mathutils import Vector,noise
from environment_studio import begin,fit_finish

def build(asset):
 ns,task=begin(asset);c=ns['c'];root=ns['root'];M=ns['material'];B=ns['box'];R=ns['rod'];E=ns['ell'];iron=M('Blackened wrought iron',(.035,.040,.043),metal=.7,rough=.66,texture=100);stone=M('Soot stained fieldstone',(.16,.16,.135),texture=65);wood=M('Charred fuel wood',(.075,.045,.022),texture=110);ash=M('Cold charcoal and ash',(.028,.027,.024),texture=130);linen=M('Tarred flax wrapping',(.095,.065,.033),texture=170);r=random.Random(241)
 def curve(name,points,rad,mat):
  cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.bevel_depth=rad;cu.bevel_resolution=3;sp=cu.splines.new('POLY');sp.points.add(len(points)-1)
  for p,v in zip(sp.points,points):p.co=(*v,1)
  o=bpy.data.objects.new(name,cu);c.objects.link(o);o.parent=root;cu.materials.append(mat);return o
 def ring(name,rr,z,rad,mat):return curve(name,[(rr*math.cos(j*math.tau/80),rr*math.sin(j*math.tau/80),z) for j in range(81)],rad,mat)
 def rock(name,p,scale):
  bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=p);o=bpy.context.object;o.name=name
  for col in list(o.users_collection):col.objects.unlink(o)
  c.objects.link(o);o.parent=root;o.data.materials.append(stone)
  for v in o.data.vertices:v.co*=1+.10*noise.noise(v.co*4+Vector((p[0],p[1],1)))
  o.scale=scale;return o
 if asset=='brazier':
  # A shallow iron bowl formed as a solid shell, with three forged legs.
  V=[];F=[];profile=[(.58,.04),(.61,.13),(.68,.23),(.74,.27),(.755,.27),(.755,.252),(.69,.21),(.63,.12),(.60,.035)];N=64
  for z,rr in profile:
   for j in range(N):t=j*math.tau/N;V.append((rr*math.cos(t),rr*math.sin(t),z))
  for k in range(len(profile)-1):
   for j in range(N):F.append((k*N+j,k*N+(j+1)%N,(k+1)*N+(j+1)%N,(k+1)*N+j))
  m=bpy.data.meshes.new('Beaten iron brazier bowl');m.from_pydata(V,[],F);o=bpy.data.objects.new('Brazier bowl',m);c.objects.link(o);o.parent=root;m.materials.append(iron)
  for p in m.polygons:p.use_smooth=True
  ring('Rolled iron bowl lip',.264,.75,.010,iron);ring('Brazier lower brace',.15,.24,.012,iron)
  for j in range(3):
   t=j*math.tau/3;curve('Forged brazier leg',[(.25*math.cos(t),.25*math.sin(t),.025),(.17*math.cos(t),.17*math.sin(t),.13),(.12*math.cos(t),.12*math.sin(t),.54),(.19*math.cos(t),.19*math.sin(t),.68)],.014,iron)
  for j in range(18):t=r.random()*math.tau;rr=.18*math.sqrt(r.random());E('Cold fuel coal',(rr*math.cos(t),rr*math.sin(t),.68),(.025,.022,.015),ash)
  attach=(0,0,.69);effect='brazier_fire'
 elif asset=='hearth':
  for row in range(7):
   for side in [-1,1]:B('Stone jamb',(side*.39,.03,.08+row*.13),(.21,.57,.12),stone,bevel=.016)
   for j in range(4):B('Sooty fireback stone',(-.30+j*.20,.29,.08+row*.13),(.19,.13,.12),stone,bevel=.012)
  B('Hearth sole',(0,0,.07),(1.0,.78,.13),stone,bevel=.014);B('Massive hearth lintel',(0,.02,1.01),(1.06,.65,.16),stone,bevel=.018)
  for side in [-1,1]:R('Fire dog leg',(side*.20,-.13,.14),(side*.20,-.13,.25),.012,iron);R('Fire dog fuel bar',(side*.20,-.22,.22),(side*.20,.14,.22),.012,iron)
  for j in range(3):R('Unlit hearth billet',(-.24,-.13+j*.09,.23),(.24,-.10+j*.09,.23),.035,wood)
  attach=(0,0,.15);effect='hearth_fire'
 elif asset=='torch_bracket':
  B('Wall iron fixing plate',(0,0,0),(.09,.025,.23),iron,bevel=.009)
  for z in [-.075,.075]:E('Wall bracket rivet',(0,-.018,z),(.011,.007,.011),iron)
  curve('Curled iron torch bracket',[(0,-.02,-.06),(0,-.14,-.12),(0,-.23,-.07),(0,-.22,.02)],.009,iron)
  R('Ash torch handle',(0,-.17,-.25),(0,-.22,.29),.018,wood,r2=.024)
  for j in range(9):
   z=.17+j*.014;curve('Overlapping tarred wrapping',[(.036*math.cos(k*math.tau/48),-.22+.030*math.sin(k*math.tau/48),z+.004*math.sin(k*math.tau/48)) for k in range(49)],.009,linen)
  attach=(0,-.22,.30);effect='torch_flame'
 else:
  for j in range(11):
   t=j*math.tau/11;rock('Firepit fieldstone',(.50*math.cos(t),.50*math.sin(t),.085),(.13,.11,.085))
  E('Cold ash bed',(0,0,.017),(.41,.41,.015),ash)
  for j in range(4):
   t=j*math.pi/4;R('Unlit firepit log',(-.33*math.cos(t),-.33*math.sin(t),.10+j*.012),(.33*math.cos(t),.33*math.sin(t),.10+j*.012),.053,wood,r2=.045)
  attach=(0,0,.08);effect='campfire'
 ns['s']['environment_design']=json.dumps(dict(effect=effect,effect_attachment=list(attach),origin='wall plate centre' if asset=='torch_bracket' else 'shared ground'))
 fit_finish(ns,asset,rotation=0,sources=[str(Path(__file__))])
