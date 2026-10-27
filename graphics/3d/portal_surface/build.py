"""Faint travelling distortions between the arcs of a separately rendered ancient frame."""
from pathlib import Path
import sys,math,json
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
import bpy
from environment_studio import begin,finish
from fx_geometry import material,mesh,key_pose,linearize_materials
FRAMES,N,K=24,65,9

def geometry(t,index):
    q=(t+index/8)%1;width=.59*math.sin(math.pi*q)**.55;center=.28+1.94*q;p=math.tau*t;points=[];faces=[];colors=[]
    for i in range(N):
        u=2*i/(N-1)-1;z=center+.027*math.sin(6*u+p+index*1.7);y=.022*math.sin(4*u-p+index)
        for j in range(K):
            v=2*j/(K-1)-1;points.append((width*u,y,z+v*.033));alpha=.36*(1-v*v)*(1-u*u);colors.append((.20+.02*math.sin(index),.25,.29+.02*math.cos(index),alpha))
    for i in range(N-1):
        for j in range(K-1):a=i*K+j;faces.append((a,a+K,a+K+1,a+1))
    return points,faces,colors,q

def build():
    ns,task=begin('portal_surface');s=ns['s'];strips=[]
    for index in range(8):
        mat,fade,emission=material('Ancient frame optical fold '+str(index),1.0);p,f,c,q=geometry(0,index);o=mesh(ns,'PORTAL travelling fold '+str(index),p,f,c,mat);strips.append((index,o,fade))
    for j in range(FRAMES*4+1):
        t=j/(FRAMES*4);frame=1+j*.25
        for index,o,fade in strips:
            points,faces,colors,q=geometry(t,index);key_pose(o,frame,points);fade.outputs[0].default_value=math.sin(math.pi*q)**2;fade.outputs[0].keyframe_insert('default_value',frame=frame)
    linearize_materials();s['environment_design']=json.dumps(dict(kind='ancient frame optical distortions',appearance='faint translucent folds, no opaque panel or modern display',motion='upward local folds fade before wrapping',origin='shared ground point with portal_frame'))
    finish(ns,'portal_surface',dict(loop=dict(start=1,frames=FRAMES,fps=12,loop=True)),size=112,target=1.13,sources=['validate_portal.py'],alpha_levels=32)
    text=bpy.data.texts.get('fx_geometry.py') or bpy.data.texts.new('fx_geometry.py');text.clear();text.write((Path(__file__).resolve().parents[1]/'_shared/fx_geometry.py').read_text());bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath,compress=True)

if __name__ in ['__main__','environment_build']:build()
