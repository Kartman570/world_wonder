"""A brief branching electrical discharge around a target, without an explosion."""
from pathlib import Path
import sys,math,random,json
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
import bpy
from mathutils import Vector
from environment_studio import begin,finish
from fx_geometry import material,mesh,key_pose,linearize_materials
FRAMES=12

def paths(t):
    result=[]
    for k in range(7):
        a=k*math.tau/7;rng=random.Random(134+k*37+int(t*11)*103);start=Vector((.38*math.cos(a),.20*math.sin(a),.64+.32*math.sin(a+1)));end=Vector((.38*math.cos(a+.9),.20*math.sin(a+.9),.64+.34*math.sin(a+1.9)));points=[]
        for j in range(11):
            u=j/10;points.append(start.lerp(end,u)+Vector((rng.uniform(-.065,.065),rng.uniform(-.025,.025),rng.uniform(-.06,.06)))*math.sin(math.pi*u))
        result.append(points);b=points[4]+Vector((.14*math.cos(a),.07*math.sin(a),.12*math.sin(a+2)))
        result.append([points[4].lerp(b,j/5)+Vector((rng.uniform(-.025,.025),0,rng.uniform(-.025,.025)))*math.sin(math.pi*j/5) for j in range(6)])
    return result

def tube(points,radius):
    v=[];f=[];cols=8
    for j,p in enumerate(points):
        axis=(points[min(j+1,len(points)-1)]-points[max(j-1,0)]).normalized();right=axis.cross(Vector((0,1,0))).normalized();depth=axis.cross(right).normalized()
        for k in range(cols):a=k*math.tau/cols;v.append(p+right*(radius*math.cos(a))+depth*(radius*math.sin(a)))
    for j in range(len(points)-1):
        for k in range(cols):a=j*cols+k;b=j*cols+(k+1)%cols;f.append((a,b,b+cols,a+cols))
    f.extend([tuple(reversed(range(cols))),tuple(range((len(points)-1)*cols,len(points)*cols))]);return v,f

def build():
    ns,task=begin('fairy_field');s=ns['s'];core,copacity,ce=material('Fairy cold-white discharge',2.4);halo,hopacity,he=material('Fairy subdued electrical halo',1.2);arcs=[]
    for index,points in enumerate(paths(0)):
        for wide in [False,True]:
            radius=.018 if wide else .0055;v,f=tube(points,radius);color=(.10,.23,.32,.22) if wide else (.52,.69,.72,.95);o=mesh(ns,'FIELD %s branch %s'%('halo' if wide else 'core',index),v,f,[color]*len(v),halo if wide else core);arcs.append((index,wide,o))
    for j in range((FRAMES-1)*4+1):
        t=j/((FRAMES-1)*4);frame=1+j*.25;p=paths(t);opacity=math.sin(math.pi*t)**.65*(.68+.32*math.sin(5*math.pi*t)**2)
        if j in [0,(FRAMES-1)*4]:opacity=0
        for index,wide,o in arcs:key_pose(o,frame,tube(p[index],.018 if wide else .0055)[0])
        for n in [copacity,hopacity]:n.outputs[0].default_value=opacity;n.outputs[0].keyframe_insert('default_value',frame=frame)
    linearize_materials();s['environment_design']=json.dumps(dict(kind='short electrical field',scale='small target-sized arcs, not an explosion',origin='target ground point',ending='transparent first and last frames; one-shot'))
    finish(ns,'fairy_field',dict(loop=dict(start=1,frames=FRAMES,fps=20,loop=False)),size=96,target=.53,sources=['validate_field.py'],allow_empty=True)
    text=bpy.data.texts.get('fx_geometry.py') or bpy.data.texts.new('fx_geometry.py');text.clear();text.write((Path(__file__).resolve().parents[1]/'_shared/fx_geometry.py').read_text());bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath,compress=True)

if __name__ in ['__main__','environment_build']:build()
