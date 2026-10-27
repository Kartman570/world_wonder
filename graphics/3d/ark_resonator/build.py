"""Three worn pale resonator hoops hover over a separately rendered pedestal."""
from pathlib import Path
import sys,math,json
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
import bpy,bmesh
from environment_studio import begin,finish

def build():
    ns,task=begin('ark_resonator');s=ns['s'];c=ns['c'];root=ns['root'];mat=ns['material']('Arctarian worn pale resonator ceramic',(.29,.34,.31),rough=.78,texture=135);seedmat=ns['material']('Arctarian mauve resonant seed',(.30,.23,.35),rough=.80,texture=140);rings=[]
    for i,(radius,z) in enumerate([(.54,.72),(.41,1.32),(.30,1.92)]):
        points=[];faces=[];N,K=128,16
        for j in range(N):
            a=j*math.tau/N;major=radius*(1+.018*math.sin(5*a+i)+.012*math.sin(9*a));minor=(.050-i*.004)*(1+.065*math.cos(32*a))
            for k in range(K):b=k*math.tau/K;points.append(((major+minor*math.cos(b))*math.cos(a),(major+minor*math.cos(b))*math.sin(a),minor*math.sin(b)))
        for j in range(N):
            for k in range(K):a=j*K+k;b=j*K+(k+1)%K;faces.append((a,b,((j+1)%N)*K+(k+1)%K,((j+1)%N)*K+k))
        m=bpy.data.meshes.new('Irregular resonator hoop');m.from_pydata(points,[],faces);m.update();m.materials.append(mat);bm=bmesh.new();bm.from_mesh(m);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(m);bm.free();o=bpy.data.objects.new('RESONATOR hoop '+str(i),m);c.objects.link(o);o.parent=root;o.location.z=z
        for p in m.polygons:p.use_smooth=True
        rings.append((i,z,o))
    seed=ns['ell']('RESONATOR suspended seed',(0,0,1.15),(.085,.07,.16),seedmat);seed.parent=root
    for j in range(97):
        frame=1+j*.25;t=j/96;p=math.tau*t;s.frame_set(int(frame),subframe=frame%1)
        for i,z,o in rings:o.location.z=z+.022*math.sin(p+i*1.7);o.rotation_euler=(.22*math.sin(p+i*1.7),.25*math.cos(p-i*1.1),.12*math.sin(p+i));o.keyframe_insert('location',frame=frame);o.keyframe_insert('rotation_euler',frame=frame)
        seed.location.z=1.15+.018*math.sin(p+1);seed.rotation_euler=(.06*math.sin(p),.06*math.cos(p),p);seed.keyframe_insert('location',frame=frame);seed.keyframe_insert('rotation_euler',frame=frame)
    s['environment_design']=json.dumps(dict(kind='arctarian suspended resonator hoops',reference='alien-render arkResonator pale rings and mauve core',motion='slow changing mutual angles; no contacts between rings or seed',origin='ground point shared with ark_resonator_base'))
    finish(ns,'ark_resonator',dict(loop=dict(start=1,frames=24,fps=12,loop=True)),size=128,target=1.04,sources=['validate_resonator.py'])

if __name__ in ['__main__','environment_build']:build()
