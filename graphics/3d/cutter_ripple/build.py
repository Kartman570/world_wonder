"""Brief contour separation left by the arctarian cutter; no solid laser beam."""
from pathlib import Path
import sys,math,json
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
import bpy
from environment_studio import begin,finish
from fx_geometry import material,mesh,key_pose,linearize_materials
FRAMES,N,K=12,65,9

def geometry(t):
    points=[];faces=[];colors=[];phase=math.tau*t
    for layer in [-1,0,1]:
        offset=len(points);gap=.025+.045*math.sin(math.pi*t)
        for i in range(N):
            u=i/(N-1);z=layer*gap+.025*math.sin(math.tau*(3*u-t))*math.sin(math.pi*u)
            for j in range(K):
                v=2*j/(K-1)-1;points.append((1.1*u,.012*layer,z+v*.018));alpha=.60*(1-v*v)*math.sin(math.pi*u)**.4*(.3 if layer==0 else 1);colors.append((.25,.28,.32,alpha))
        for i in range(N-1):
            for j in range(K-1):a=offset+i*K+j;faces.append((a,a+K,a+K+1,a+1))
    return points,faces,colors

def build():
    ns,task=begin('cutter_ripple');s=ns['s'];mat,fade,emission=material('Cutter displaced contours',1.1);points,faces,colors=geometry(0);o=mesh(ns,'CUTTER spatial ripple',points,faces,colors,mat)
    for j in range((FRAMES-1)*4+1):
        t=j/((FRAMES-1)*4);frame=1+j*.25;key_pose(o,frame,geometry(t)[0]);opacity=math.sin(math.pi*t)**.8
        if j in [0,(FRAMES-1)*4]:opacity=0
        fade.outputs[0].default_value=opacity;fade.outputs[0].keyframe_insert('default_value',frame=frame)
    linearize_materials();s['environment_design']=json.dumps(dict(kind='short spatial contour separation',origin='start of cutter trail; engine sets position, direction and length',ending='fully transparent final frame'))
    finish(ns,'cutter_ripple',dict(loop=dict(start=1,frames=FRAMES,fps=20,loop=False)),size=96,target=0,sources=['validate_ripple.py'],allow_empty=True)
    text=bpy.data.texts.get('fx_geometry.py') or bpy.data.texts.new('fx_geometry.py');text.clear();text.write((Path(__file__).resolve().parents[1]/'_shared/fx_geometry.py').read_text());bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath,compress=True)

if __name__ in ['__main__','environment_build']:build()
