"""Slumped leather travelling pouch, reinforced seams and a tied drawstring."""
import bpy,sys,math
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from environment_studio import begin,finish

def build():
 ns,task=begin('loot_bag');c=ns['c'];root=ns['root'];mat=ns['material']('Worn oiled hide',(.17,.095,.038),texture=115);thread=ns['material']('Flax seam and cord',(.27,.20,.11),texture=150);dark=ns['material']('Dark mouth of pouch',(.025,.017,.01));brass=ns['material']('Worn brass buckle',(.23,.16,.05),metal=.6,rough=.48)
 sections=[(.025,.14,.11),(.06,.21,.15),(.17,.24,.17),(.28,.23,.16),(.36,.15,.11),(.40,.075,.055),(.44,.09,.065)];V=[];F=[];N=64
 for z,w,d in sections:
  for j in range(N):
   t=j*math.tau/N;fold=1+(.05+.06*z/.44)*math.cos(t*11+z*2);V.append((w*math.cos(t)*fold+.05*z,d*math.sin(t)*fold,z+.012*math.sin(t*3)))
 F.append(tuple(reversed(range(N))))
 for k in range(len(sections)-1):
  for j in range(N):F.append((k*N+j,k*N+(j+1)%N,(k+1)*N+(j+1)%N,(k+1)*N+j))
 m=bpy.data.meshes.new('Sewn pleated leather shell');m.from_pydata(V,[],F);o=bpy.data.objects.new('Slumped travelling pouch',m);c.objects.link(o);o.parent=root;m.materials.append(mat)
 for p in m.polygons:p.use_smooth=True
 sol=o.modifiers.new('Leather thickness','SOLIDIFY');sol.thickness=.003
 ns['ell']('Interior shadow',(.02,0,.427),(.075,.051,.006),dark)
 def cord(name,points,r):
  cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.bevel_depth=r;cu.bevel_resolution=3;sp=cu.splines.new('POLY');sp.points.add(len(points)-1)
  for pp,p in zip(sp.points,points):pp.co=(*p,1)
  ob=bpy.data.objects.new(name,cu);c.objects.link(ob);ob.parent=root;cu.materials.append(thread)
 cord('Drawstring around gathered neck',[(.021+.084*math.cos(t*math.tau/64),.061*math.sin(t*math.tau/64),.405) for t in range(65)],.004)
 for side in [-1,1]:
  cord('Drawstring bow',[(.02+side*.065*math.sin(t*math.tau/40),-.067-.018*math.sin(t*math.pi/40),.398+.023*math.sin(t*math.tau/40)) for t in range(41)],.003)
  cord('Hanging cord',[(.02,-.067,.40),(.02+side*.025,-.11,.33),(.02+side*.05,-.14,.29)],.003)
  for j in range(24):
   z=.055+j*.013;q=min(range(len(sections)),key=lambda k:abs(sections[k][0]-z));w=sections[q][1];ns['rod']('Small saddle stitch',(side*w*.86,-.08,z),(side*w*.86,-.086,z+.004),.0015,thread)
 root.rotation_euler[2]=-.30;finish(ns,'loot_bag',size=48,target=.20)
if __name__ in ['__main__','environment_build']:build()
