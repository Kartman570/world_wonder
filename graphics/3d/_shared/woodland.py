"""Botanical meshes: tapered branching wood and individually folded leaves."""
import bpy,math,random,json
from pathlib import Path
from mathutils import Vector
from environment_studio import begin,finish

def tree(asset):
 ns,task=begin(asset);rng=random.Random({'oak':31,'pine':51,'birch':71,'dead_tree':91}[asset]);root=ns['root'];c=ns['c'];rod=ns['rod'];ell=ns['ell'];material=ns['material'];dead=asset=='dead_tree';pine=asset=='pine';birch=asset=='birch'
 bark=material('Fissured birch bark' if birch else 'Furrowed grey brown bark',(.58,.57,.49) if birch else (.11,.085,.058),texture=26)
 # Longitudinal ridges and small-scale cracking remain in the detailed source.
 n=bark.node_tree.nodes;l=bark.node_tree.links;p=n.get('Principled BSDF');tc=n.new('ShaderNodeTexCoord');mp=n.new('ShaderNodeVectorMath');mp.operation='MULTIPLY';mp.inputs[1].default_value=(8,8,.65);l.new(tc.outputs['Object'],mp.inputs[0]);noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=8;noise.inputs['Detail'].default_value=5;l.new(mp.outputs[0],noise.inputs['Vector']);bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.7;bump.inputs['Distance'].default_value=.035;l.new(noise.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs[0],p.inputs['Normal'])
 leaves=[material('Needle green %d'%i,(.022+i*.009,.052+i*.018,.020+i*.006),rough=.8) if pine else material('Leaf green %d'%i,(.045+i*.014,.085+i*.024,.019+i*.009),rough=.78) for i in range(5)]
 verts=[];faces=[];mi=[]
 def leaf(center,direction,length,width,idx):
  d=Vector(direction).normalized();side=d.cross(Vector((0,0,1)))
  if side.length<.1:side=d.cross(Vector((0,1,0)))
  side.normalize();up=d.cross(side);a=Vector(center);k=len(verts)
  verts.extend([tuple(a),tuple(a+d*length*.45+side*width),tuple(a+d*length*.48+up*.016),tuple(a+d*length*.45-side*width),tuple(a+d*length)])
  faces.extend([(k,k+1,k+2),(k,k+2,k+3),(k+1,k+4,k+2),(k+2,k+4,k+3)]);mi.extend([idx]*4)
 def cluster(a,b,count,spread):
  a,b=Vector(a),Vector(b)
  for j in range(count):
   q=rng.random();pos=a.lerp(b,q)+Vector((rng.gauss(0,spread),rng.gauss(0,spread),rng.gauss(0,spread*.65)));ang=rng.random()*math.tau
   leaf(pos,(math.cos(ang),math.sin(ang),rng.uniform(-.45,.6)),rng.uniform(.09,.16) if birch else rng.uniform(.11,.23),rng.uniform(.025,.05) if birch else rng.uniform(.038,.075),rng.randrange(5))
 def branch(name,a,b,r,r2):return rod(name,a,b,r,bark,r2=r2)
 height=7.8 if pine else 6.8 if birch else 6.5 if dead else 7.0
 trunk=[Vector((.1*math.sin(j*.9),.08*math.sin(j*1.2),height*j/10)) for j in range(11)]
 for j in range(10):branch('Tapering main trunk',trunk[j],trunk[j+1],(.24 if birch else .32)*(1-j/11)**1.15,max(.012,(.24 if birch else .32)*(1-(j+1)/11)**1.15))
 for j in range(7):
  a=j*math.tau/7;r=.65 if birch else .85;branch('Exposed tapering root',(r*math.cos(a),r*math.sin(a),.025),(.04*math.cos(a),.04*math.sin(a),.35),.018,.10)
 if pine:
  for level in range(12):
   z=1.35+level*.50;reach=2.25*(1-level/13)**.8
   for k in range(7):
    ang=k*math.tau/7+level*1.9;a=Vector((0,0,z));b=Vector((reach*math.cos(ang),reach*math.sin(ang),z-.25));branch('Pine drooping bough',a,b,.055*(1-level/14),.008)
    for t in range(9):
     q=.18+t*.09;pos=a.lerp(b,q)
     for side in [-1,1]:
      aa=ang+side*.8;end=pos+Vector((.43*(1-q/2)*math.cos(aa),.43*(1-q/2)*math.sin(aa),.12));branch('Pine secondary twig',pos,end,.009,.002)
      for v in range(24):
       u=rng.random();pp=pos.lerp(end,u)+Vector((rng.uniform(-.025,.025),rng.uniform(-.025,.025),rng.uniform(-.045,.045)))
       for sign in [-1,1]:
        angle=aa+sign*rng.uniform(.35,1.25);leaf(pp,(math.cos(angle),math.sin(angle),rng.uniform(-.5,.7)),rng.uniform(.09,.17),.013,rng.randrange(5))
  for j in range(160):
   z=rng.uniform(6.5,7.8);ang=rng.random()*math.tau;leaf((0,0,z),(math.cos(ang),math.sin(ang),.4),rng.uniform(.10,.18),.012,rng.randrange(5))
 else:
  for j in range(17 if not dead else 12):
   z=1.6+j*.27;ang=j*2.399;reach=(1.4 if birch else 2.1)*math.sin(math.pi*(z/height)*.85)+rng.uniform(-.2,.35);a=Vector((0,0,z));mid=a+Vector((reach*.55*math.cos(ang),reach*.55*math.sin(ang),.42));end=a+Vector((reach*math.cos(ang),reach*math.sin(ang),.7 if birch else 1.0));branch('Ascending main bough',a,mid,.065 if birch else .11,.032);branch('Curved limb',mid,end,.032,.009)
   for k in range(7):
    q=.28+k*.10;aa=ang+(-1 if k%2 else 1)*rng.uniform(.5,1.2);start=mid.lerp(end,q);tip=start+Vector((rng.uniform(.4,.9)*math.cos(aa),rng.uniform(.4,.9)*math.sin(aa),rng.uniform(-.25,.40) if birch else rng.uniform(.1,.55)));branch('Fine branch',start,tip,.014,.003)
    if not dead:
     cluster(start,tip,85 if birch else 130,.22 if birch else .31)
     # Terminal twig forks, visible through gaps rather than solid canopy blobs.
     for side in [-1,1]:
      ttip=tip+Vector((.22*math.cos(aa+side),.22*math.sin(aa+side),-.15 if birch else .18));branch('Terminal twig',tip,ttip,.004,.001);cluster(tip,ttip,18,.13)
 if birch:
  scars=material('Dark curling birch lenticels',(.045,.038,.03),texture=50)
  for j in range(95):
   z=rng.uniform(.25,6);ang=rng.random()*math.tau;r=.24*(1-z/height)**1.15+.002
   o=ell('Horizontal birch bark scar',(r*math.cos(ang),r*math.sin(ang),z),(.044,.007,.009),scars);o.rotation_euler[2]=ang-math.pi/2
 if verts:
  m=bpy.data.meshes.new('Individual folded botanical foliage');m.from_pydata(verts,[],faces);m.update();o=bpy.data.objects.new('Foliage individual leaves',m);c.objects.link(o);o.parent=root
  for mat in leaves:m.materials.append(mat)
  for poly,idx in zip(m.polygons,mi):poly.material_index=idx
 ns['s']['environment_design']=json.dumps(dict(species=asset,height=height,leaf_faces=len(faces),root='ground contact',description='Tapered branching wood, botanical leaf meshes, no opaque canopy proxy'))
 finish_tree(ns,asset)

def timber(asset):
 ns,task=begin(asset);rng=random.Random(23);rod=ns['rod'];ell=ns['ell'];c=ns['c'];root=ns['root'];material=ns['material'];bark=material('Rough old oak bark',(.12,.087,.05),texture=42);wood=material('Weathered end grain',(.29,.21,.12),texture=90);dark=material('Growth ring recess',(.12,.08,.04));moss=material('Dry moss',(.055,.085,.022),texture=45)
 def log(a,b,r):
  a,b=Vector(a),Vector(b);axis=(b-a).normalized();right=axis.cross(Vector((0,0,1)))
  if right.length<.1:right=axis.cross(Vector((0,1,0)))
  right.normalize();up=axis.cross(right);n=64;verts=[]
  for k in range(11):
   q=k/10
   for j in range(n):
    t=math.tau*j/n;rr=r*(1+.045*math.sin(17*t)+.028*math.sin(31*t+q*3));p=a.lerp(b,q)+(right*math.cos(t)+up*math.sin(t))*rr;verts.append(tuple(p))
  faces=[]
  for k in range(10):
   for j in range(n):faces.append((k*n+j,k*n+(j+1)%n,(k+1)*n+(j+1)%n,(k+1)*n+j))
  m=bpy.data.meshes.new('Ribbed bark mesh');m.from_pydata(verts,[],faces);o=bpy.data.objects.new('Rough bark cylinder',m);c.objects.link(o);o.parent=root;m.materials.append(bark)
  for center,sign in [(a,-1),(b,1)]:
   center=center+axis*.002*sign;rod('Exposed cut end',center-axis*.004,center+axis*.004,r*.97,wood)
   for j in range(1,13):
    radius=r*.94*j/13;points=[]
    for k in range(65):
     t=math.tau*k/64;rr=radius*(1+.025*math.sin(5*t+j));points.append(center+axis*.006*sign+(right*math.cos(t)+up*math.sin(t))*rr)
    curve=bpy.data.curves.new('Annual growth ring','CURVE');curve.dimensions='3D';curve.bevel_depth=.0015;curve.bevel_resolution=1;spl=curve.splines.new('POLY');spl.points.add(len(points)-1)
    for pp,p in zip(spl.points,points):pp.co=(*p,1)
    obj=bpy.data.objects.new('Annual growth ring',curve);c.objects.link(obj);obj.parent=root;curve.materials.append(dark)
   for j in range(4):
    t=j*1.73+.4;p1=center+axis*.007*sign+(right*math.cos(t)+up*math.sin(t))*r*.4;p2=center+axis*.007*sign+(right*math.cos(t+.09)+up*math.sin(t+.09))*r*.92;rod('Radial drying split',p1,p2,.003,dark)
 if asset=='tree_stump':
  log((0,0,.12),(.03,.02,.57),.34)
  for j in range(7):
   t=j*math.tau/7;rod('Old buttress root',(.75*math.cos(t),.75*math.sin(t),.035),(.21*math.cos(t),.21*math.sin(t),.28),.025,bark,r2=.13)
  for j in range(22):
   t=rng.random()*math.tau;ell('Moss at root',(.38*math.cos(t),.38*math.sin(t),.055),(.10,.06,.025),moss)
  size=64;target=.18
 else:
  log((-.92,-.20,.22),(.88,.12,.22),.22);log((-.65,.34,.19),(.90,.55,.19),.18);log((-.55,.14,.59),(.67,.30,.57),.20);rod('Snapped branch',(.21,.23,.55),(.29,-.03,.88),.06,bark,r2=.02);size=80;target=.32
 
 if asset=='fallen_logs':root.rotation_euler[2]=.38
 finish(ns,asset,size=size,target=target,sources=[str(Path(__file__))])


def finish_tree(ns,asset):
 import numpy as np
 bpy.context.view_layer.update();points=[(0,0,0)]
 for o in ns['c'].objects:
  if o.type=='MESH':points.extend([tuple(o.matrix_world@v.co) for v in o.data.vertices])
 p=np.array(points);vertical=p[:,2]*math.cos(math.pi/6)+p[:,1]*.5
 lo,hi=float(vertical.min()),float(vertical.max());target=(lo+hi)/(2*math.cos(math.pi/6));extent=max(2*abs(p[:,0]).max(),hi-lo)+.6;size=math.ceil(extent*(128/4.2)/32)*32
 
 finish(ns,asset,size=size,target=target,sources=[str(Path(__file__))])
