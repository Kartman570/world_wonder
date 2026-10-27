"""A ragged blue-grey tear in air, with an actually transparent center."""
from pathlib import Path
import sys,math,json
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
import bpy
from environment_studio import begin,finish
from fx_geometry import material,mesh,key_pose

N,K,FRAMES=144,11,16
WIDTH,HEIGHT,CENTER=.50,1.12,1.25

def geometry(t):
    phase=math.tau*t;vertices=[];colors=[];faces=[]
    for layer,halfwidth in enumerate([.13,.037]):
        offset=len(vertices)
        for j in range(N):
            a=math.tau*j/N;r=1+.048*math.sin(5*a+phase)+.033*math.sin(9*a-2*phase)+.018*math.sin(13*a+3*phase);pulse=1+.035*math.sin(phase);nx=math.cos(a)/WIDTH;nz=math.sin(a)/HEIGHT;length=math.hypot(nx,nz);nx/=length;nz/=length
            for k in range(K):
                v=2*k/(K-1)-1;width=halfwidth*(.8+.2*math.sin(7*a-phase));vertices.append((WIDTH*r*pulse*math.cos(a)+nx*v*width,.025*math.sin(3*a-phase)+layer*.002,CENTER+HEIGHT*r*pulse*math.sin(a)+nz*v*width))
                alpha=(.17 if layer==0 else .88)*math.exp(-4*v*v)*(1-v*v);light=.84+.16*math.sin(11*a+1.2);colors.append((.18*light,.29*light,.33*light,alpha))
        for j in range(N):
            for k in range(K-1):a=offset+j*K+k;b=offset+((j+1)%N)*K+k;faces.append((a,b,b+1,a+1))
    return vertices,faces,colors

def build():
    ns,task=begin('rift');s=ns['s'];mat,fade,emission=material('Rift subdued cold scattering',1.45);points,faces,colors=geometry(0);o=mesh(ns,'RIFT ragged atmospheric edge',points,faces,colors,mat)
    for j in range(FRAMES*4+1):
        t=j/(FRAMES*4);frame=1+j*.25;key_pose(o,frame,geometry(t)[0]);emission.inputs['Strength'].default_value=1.45+.15*math.sin(math.tau*t);emission.inputs['Strength'].keyframe_insert('default_value',frame=frame)
    s['environment_design']=json.dumps(dict(kind='unstable tear in air',palette='subdued blue-grey from lore-render, no solid center',motion='irregular pulsing edge; engine handles world drift',origin='ground point under the tear'))
    finish(ns,'rift',dict(loop=dict(start=1,frames=FRAMES,fps=12,loop=True)),size=112,target=1.18,sources=['validate_rift.py'])
    text=bpy.data.texts.get('fx_geometry.py') or bpy.data.texts.new('fx_geometry.py');text.clear();text.write((Path(__file__).resolve().parents[1]/'_shared/fx_geometry.py').read_text());bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath,compress=True)

if __name__ in ['__main__','environment_build']:build()
