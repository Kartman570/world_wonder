"""Low draped terrestrial web: unequal tension, broken rings and loose silk."""
import bpy,sys,math,random
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from environment_studio import begin,finish

def build():
 ns,task=begin('spider_web');r=random.Random(79);mat=ns['material']('Dusty silk',(.40,.43,.40),rough=.55);c=ns['c'];root=ns['root']
 def line(points,radius=.002):
  curve=bpy.data.curves.new('Fine silk strand','CURVE');curve.dimensions='3D';curve.bevel_depth=radius;curve.bevel_resolution=2;spl=curve.splines.new('POLY');spl.points.add(len(points)-1)
  for p,v in zip(spl.points,points):p.co=(*v,1)
  o=bpy.data.objects.new('Draped silk',curve);c.objects.link(o);o.parent=root;curve.materials.append(mat)
 def pos(angle,q):return (.58*q*math.cos(angle),.42*q*math.sin(angle),.025+.18*q*q+.015*math.sin(angle*3)*q)
 # An asymmetric funnel web, stretched just above ground.
 for j in range(23):
  angle=j*math.tau/23+r.uniform(-.035,.035);line([pos(angle,q/24) for q in range(25)],.0026)
 for j in range(13):
  q=.12+j*.065;start=r.random()*.4;points=[]
  for k in range(117):
   t=start+k*math.tau/116;p=pos(t,q+.012*math.sin(7*t+j));points.append(p)
  line(points,.0018)
 for j in range(35):
  a=r.random()*math.tau;b=a+r.uniform(.18,.65);q=r.uniform(.25,.9);pa=pos(a,q);pb=pos(b,min(1,q+r.uniform(-.12,.15)));line([(pa[0]*(1-u)+pb[0]*u,pa[1]*(1-u)+pb[1]*u,pa[2]*(1-u)+pb[2]*u-.025*math.sin(math.pi*u)) for u in [k/12 for k in range(13)]],.0013)
 finish(ns,'spider_web',size=64,target=.10,alpha_levels=32)
if __name__ in ['__main__','environment_build']:build()
