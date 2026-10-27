"""Carved stone props and a cold masonry bread oven."""
import bpy,math,random,json
from pathlib import Path
from mathutils import Vector
from environment_studio import begin,fit_finish,ROOT

def build(asset):
 ns,task=begin(asset);c=ns['c'];root=ns['root'];M=ns['material'];B=ns['box'];R=ns['rod'];E=ns['ell'];stone=M('Weathered limestone',(.25,.245,.21),texture=65);edge=M('Worn pale stone edges',(.32,.31,.27),texture=80);dark=M('Soot and deep recesses',(.025,.021,.016),texture=100);wood=M('Weathered oak',(.15,.085,.035),texture=100)
 def lathe(name,profile,mat=stone,N=96):
  V=[];F=[]
  for z,rr in profile:
   for j in range(N):t=j*math.tau/N;V.append((rr*math.cos(t),rr*math.sin(t),z))
  for k in range(len(profile)-1):
   for j in range(N):F.append((k*N+j,k*N+(j+1)%N,(k+1)*N+(j+1)%N,(k+1)*N+j))
  mesh=bpy.data.meshes.new(name);mesh.from_pydata(V,[],F);o=bpy.data.objects.new(name,mesh);c.objects.link(o);o.parent=root;mesh.materials.append(mat)
  for p in mesh.polygons:p.use_smooth=True
  return o
 if asset=='pedestal_empty':
  for z,w,d,h in [(.045,.70,.70,.09),(.115,.61,.61,.05),(.43,.46,.46,.59),(.75,.58,.58,.06),(.815,.69,.69,.07)]:B('Stone pedestal course',(0,0,z),(w,d,h),stone,bevel=.012)
  for side in [-1,1]:B('Recessed pedestal panel',(side*.235,0,.43),(.007,.30,.39),edge,bevel=.004)
 elif asset=='fountain':
  lathe('Fountain pedestal',[(.005,0),(.005,.38),(.07,.38),(.12,.30),(.16,.18),(.35,.15),(.43,.26),(.47,.42),(.50,.57),(.55,.64),(.62,.66),(.65,.65),(.65,.58),(.60,.575),(.55,.49),(.51,.22),(.51,.10),(.005,0)])
  lathe('Central fountain spout',[(.50,0),(.50,.14),(.55,.14),(.59,.10),(.91,.075),(.95,.12),(.99,.115),(1.0,.07),(1.0,0)],edge)
  for j in range(12):
   t=j*math.tau/12;E('Weathered basin carving',(.638*math.cos(t),.638*math.sin(t),.57),(.025,.025,.025),edge)
  ns['s']['environment_design']=json.dumps(dict(water_layer='fountain_water',shared_ground_origin=True,water_plane=.60,jet_source=[0,0,1.18],stone_spout_top=1.0))
 elif asset=='fallen_column':
  # Truncated fluted shaft lies diagonally; chipped end caps remain visible.
  V=[];F=[];N=96;L=28
  for k in range(L+1):
   x=-.94+k*1.88/L
   for j in range(N):
    t=j*math.tau/N;rr=.25*(1-.045*math.cos(t*20));xx=x+(.028*math.sin(t*7) if k in [0,L] else 0);V.append((xx,rr*math.cos(t),.26+rr*math.sin(t)))
  F.append(tuple(reversed(range(N))))
  for k in range(L):
   for j in range(N):F.append((k*N+j,k*N+(j+1)%N,(k+1)*N+(j+1)%N,(k+1)*N+j))
  F.append(tuple(range(L*N,(L+1)*N)));m=bpy.data.meshes.new('Broken fluted shaft');m.from_pydata(V,[],F);o=bpy.data.objects.new('Fallen column shaft',m);c.objects.link(o);o.parent=root;m.materials.append(stone)
  for p in m.polygons:p.use_smooth=p.loop_total==4
  for j in range(8):
   t=j*2.4;E('Small limestone chip',(.90+.30*math.cos(t),.27*math.sin(t),.035),(.06,.045,.028),edge)
 elif asset=='bread_oven':
  brick=[M('Old oven brick %d'%j,(.18+j*.02,.095+j*.012,.047+j*.008),texture=75) for j in range(4)];r=random.Random(91)
  for row in range(5):
   for x in [-.50,.50]:
    for j in range(5):B('Oven base masonry',(x,-.4+j*.2,.07+row*.13),(.22,.19,.12),r.choice(brick),bevel=.007)
   for j in range(5):B('Rear oven base masonry',(-.4+j*.2,.45,.07+row*.13),(.19,.20,.12),r.choice(brick),bevel=.007)
  B('Oven stone sole',(0,0,.69),(1.20,1.12,.10),stone,bevel=.014)
  # Hollow brick vault, mouth remains open; no baked fire or illuminated coals.
  for row in range(6):
   y=-.39+row*.16
   for j in range(13):
    t=(j+.5)*math.pi/13;x=.51*math.cos(t);z=.78+.51*math.sin(t);o=B('Vault voussoir',(x,y,z),(.13,.15,.16),r.choice(brick),bevel=.005);o.rotation_euler[1]=t-math.pi/2
  B('Dark rear oven wall',(0,.51,.92),(.97,.08,.43),dark,bevel=.005)
  for j in range(7):
   t=(j+.5)*math.pi/7;x=.29*math.cos(t);z=.78+.29*math.sin(t);o=B('Oven mouth arch',(x,-.49,z),(.125,.16,.14),stone,bevel=.007);o.rotation_euler[1]=t-math.pi/2
  for side in [-1,1]:B('Oven mouth pier',(side*.33,-.49,.80),(.16,.16,.27),stone,bevel=.007)
  B('Bread peel blade',(.76,-.13,.24),(.29,.02,.41),wood,bevel=.035);R('Bread peel handle',(.76,-.13,.39),(.76,-.13,1.22),.017,wood)
 elif asset=='statue':
  src=ROOT/'3d/city_guard/city_guard.blend';base_name='ASSET • replace with your character'
  with bpy.data.libraries.load(str(src),link=False) as (data_from,data_to):data_to.collections=[base_name]
  imported=data_to.collections[0];ns['s'].collection.children.link(imported);ns['s'].frame_set(1);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get()
  for original in list(imported.all_objects):
   if original.type!='MESH':continue
   ev=original.evaluated_get(dg);mesh=bpy.data.meshes.new_from_object(ev,preserve_all_data_layers=True,depsgraph=dg);o=bpy.data.objects.new('Carved '+original.name,mesh);c.objects.link(o);o.parent=root;o.matrix_world=ev.matrix_world.copy();o.location.z+=.30;mesh.materials.clear();mesh.materials.append(stone)
  for original in list(imported.all_objects):bpy.data.objects.remove(original,do_unlink=True)
  bpy.data.collections.remove(imported)
  B('Statue stone plinth',(0,0,.15),(.85,.77,.30),stone,bevel=.017);B('Statue plinth cornice',(0,0,.30),(.91,.83,.05),edge,bevel=.01)
 fit_finish(ns,asset,rotation=0 if asset=='fountain' else -.45,sources=[str(Path(__file__))])
