"""Three pleated arctarian filter lobes with genuinely opening recessed pores."""
from pathlib import Path
import sys,math,json
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
import bpy,bmesh
from environment_studio import begin,finish
ROWS,COLS,FRAMES=41,64,24

def geometry(t,index):
    phase=math.tau*t+index*.8;height=2.2 if index==1 else 1.96;radius=.205 if index==1 else .19;points=[]
    for j in range(ROWS):
        u=j/(ROWS-1);profile=(.88+.18*math.sin(math.pi*u))*(1-.30*max(0,(u-.8)/.2));r=radius*profile*(1+.075*math.sin(phase)*math.sin(math.pi*u))
        for k in range(COLS):a=k*math.tau/COLS;fold=1+.13*math.cos(8*a+.12*math.sin(phase))*(.35+.65*math.sin(math.pi*u));points.append((r*fold*math.cos(a),r*fold*math.sin(a),.25+height*u))
    aperture=.037+.068*(.5+.5*math.sin(phase));top=.25+height
    for r,z in [(aperture,top+.002),(aperture*.90,top-.075),(aperture*.75,top-.15)]:
        for k in range(COLS):a=k*math.tau/COLS;points.append((r*math.cos(a),r*math.sin(a),z))
    return points

def build():
    ns,task=begin('ark_filter');s=ns['s'];c=ns['c'];root=ns['root'];skin=ns['material']('Arctarian grey mauve folded filter',(.22,.205,.285),rough=.92,texture=150);lip=ns['material']('Arctarian dark pore rim',(.085,.060,.12),rough=.94,texture=140);inside=ns['material']('Arctarian pore interior',(.020,.015,.035),rough=.98);lobes=[]
    for index,x in enumerate([-.58,0,.58]):
        p=geometry(0,index);faces=[tuple(reversed(range(COLS)))];matids=[0]
        for j in range(ROWS+2):
            for k in range(COLS):a=j*COLS+k;b=j*COLS+(k+1)%COLS;faces.append((a,b,b+COLS,a+COLS));matids.append(0 if j<ROWS-1 else 1 if j==ROWS-1 else 2)
        faces.append(tuple(range((ROWS+2)*COLS,(ROWS+3)*COLS)));matids.append(2);m=bpy.data.meshes.new('Pleated breathing filter');m.from_pydata(p,[],faces);m.update()
        for mat in [skin,lip,inside]:m.materials.append(mat)
        bm=bmesh.new();bm.from_mesh(m);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(m);bm.free();o=bpy.data.objects.new('FILTER lobe '+str(index),m);c.objects.link(o);o.parent=root;o.location=(x,-.055 if index==1 else .055,0)
        for face,material_index in zip(m.polygons,matids):face.use_smooth=True;face.material_index=material_index
        group=o.vertex_groups.new(name='APERTURE');group.add(list(range(ROWS*COLS,(ROWS+1)*COLS)),1,'REPLACE');o.shape_key_add(name='Basis');lobes.append((index,o))
    for j in range(FRAMES*4+1):
        frame=1+j*.25;t=j/(FRAMES*4)
        for index,o in lobes:
            key=o.shape_key_add(name='Breath_%.2f'%frame)
            for v,p in zip(key.data,geometry(t,index)):v.co=p
            for f,value in [(frame-.25,0),(frame,1),(frame+.25,0)]:key.value=value;key.keyframe_insert('value',frame=f)
            key.value=0
    s['environment_design']=json.dumps(dict(kind='three grey-mauve breathing filter lobes',reference='alien-render arkFilter; arctarian atmospheric infrastructure',motion='pleated walls inflate and recessed apertures open; no baked pedestal',origin='same ground point as separate ark_filter_base, lobes start at z=.25'))
    finish(ns,'ark_filter',dict(loop=dict(start=1,frames=FRAMES,fps=12,loop=True)),size=128,target=1.28,sources=['validate_filter.py'])

if __name__ in ['__main__','environment_build']:build()
