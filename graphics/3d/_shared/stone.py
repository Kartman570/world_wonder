"""Weathered granite and iron-bearing outcrops, with real chipped geometry."""
import bpy,math,random
from pathlib import Path
from mathutils import noise,Vector
from environment_studio import begin,finish

def build(asset):
 ns,task=begin(asset);r=random.Random(113);c=ns['c'];root=ns['root'];mat=ns['material']('Weathered granite' if asset=='boulder' else 'Iron bearing host rock',(.18,.185,.17) if asset=='boulder' else (.12,.105,.085),rough=.93,texture=22);rust=ns['material']('Weathered hematite rust',(.23,.095,.035),rough=.88,texture=80);ore=ns['material']('Dark specular hematite',(.07,.065,.06),rough=.48,metal=.45,texture=65)
 for j,(loc,scale) in enumerate([((0,0,0),(.83,.60,1.10)),((.65,.17,0),(.39,.34,.49)),((-.52,-.25,0),(.28,.29,.32))] if asset=='boulder' else [((0,0,0),(.59,.43,.68)),((.44,.09,0),(.29,.29,.35))]):
  bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4,radius=1,location=(0,0,0));o=bpy.context.object;o.name='Weathered angular outcrop'
  for col in list(o.users_collection):col.objects.unlink(o)
  c.objects.link(o);o.parent=root
  for v in o.data.vertices:
   p=v.co.copy();f=1+.14*noise.noise_vector(p*2.7+Vector((j*3,0,1))).x+.055*noise.noise(p*12);p*=f;v.co=(p.x*scale[0]+loc[0],p.y*scale[1]+loc[1],max(.012,(p.z*.5+.5)*scale[2])+loc[2])
  o.data.materials.append(mat);o.data.materials.append(rust);o.data.materials.append(ore)
  if asset=='ore':
   for poly in o.data.polygons:
    pos=sum((o.data.vertices[i].co for i in poly.vertices),Vector())/len(poly.vertices);v=math.sin(pos.z*17+pos.x*11+noise.noise(pos*7)*2)
    if v>.73:poly.material_index=1 if v<.94 else 2
  bevel=o.modifiers.new('Small chipped edge bevel','BEVEL');bevel.width=.008;bevel.segments=2
 finish(ns,asset,size=80 if asset=='boulder' else 64,target=.38 if asset=='boulder' else .27,sources=[str(Path(__file__))])
