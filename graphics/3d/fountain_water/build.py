"""Water-only fountain layer: curved jets, droplets and ripples over a separate bowl."""
from pathlib import Path
import sys,math,json
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
import bpy,bmesh
from mathutils import Vector
from environment_studio import begin,finish
from fx_geometry import key_pose,linearize_materials
FRAMES=24

def water_material(name,opacity):
    mat=bpy.data.materials.new(name);mat.use_nodes=True;n=mat.node_tree.nodes;l=mat.node_tree.links;n.clear();out=n.new('ShaderNodeOutputMaterial');bsdf=n.new('ShaderNodeBsdfPrincipled');bsdf.inputs['Base Color'].default_value=(.22,.31,.33,1);bsdf.inputs['Roughness'].default_value=.16;bsdf.inputs['IOR'].default_value=1.333;bsdf.inputs['Coat Weight'].default_value=.25;transparent=n.new('ShaderNodeBsdfTransparent');fade=n.new('ShaderNodeValue');fade.label='Water opacity';fade.outputs[0].default_value=opacity;mix=n.new('ShaderNodeMixShader');l.new(fade.outputs[0],mix.inputs[0]);l.new(transparent.outputs[0],mix.inputs[1]);l.new(bsdf.outputs[0],mix.inputs[2]);l.new(mix.outputs[0],out.inputs['Surface']);return mat,fade

def stream(u,index,t):
    a=index*math.tau/6+.035*math.sin(math.tau*t+u*9)*math.sin(math.pi*u);r=.46*u+.008*math.sin(math.tau*t+u*12+index)*math.sin(math.pi*u);return Vector((r*math.cos(a),r*math.sin(a),1.18+1.7*u-2.28*u*u+.009*math.sin(math.tau*t+u*11+index)*math.sin(math.pi*u)))

def jet(t,index):
    centers=[stream(j/40,index,t) for j in range(41)];points=[];right=Vector((1,0,0))
    for j,center in enumerate(centers):
        u=j/40;axis=(centers[min(j+1,40)]-centers[max(j-1,0)]).normalized();right=(right-axis*right.dot(axis)).normalized();depth=axis.cross(right).normalized();r=.010*(1-.4*u)*(.78+.22*math.sin(math.tau*(6*u-2*t)+index))
        for k in range(8):a=k*math.tau/8;points.append(center+right*(r*math.cos(a))+depth*(r*math.sin(a)))
    return points

def pool(t):
    points=[]
    for j in range(25):
        r=.10+.48*j/24
        for k in range(128):
            a=k*math.tau/128;x,y=r*math.cos(a),r*math.sin(a);z=.60
            for index in range(6):
                b=index*math.tau/6;d=math.hypot(x-.46*math.cos(b),y-.46*math.sin(b));z+=.0018*math.sin(math.tau*(d/.12-t))*math.exp(-d*7)
            points.append((x,y,z))
    return points

def build():
    ns,task=begin('fountain_water');s=ns['s'];c=ns['c'];root=ns['root'];mat,fade=water_material('Fountain pale reflective water',.72)
    def mesh(name,points,faces):
        m=bpy.data.meshes.new(name);m.from_pydata(points,[],faces);m.update();m.materials.append(mat);bm=bmesh.new();bm.from_mesh(m);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(m);bm.free();o=bpy.data.objects.new(name,m);c.objects.link(o);o.parent=root
        for p in m.polygons:p.use_smooth=True
        o.shape_key_add(name='Basis');return o
    faces=[]
    for j in range(24):
        for k in range(128):a=j*128+k;b=j*128+(k+1)%128;faces.append((a,b,b+128,a+128))
    basin=mesh('FOUNTAIN water surface',pool(0),faces);jets=[];faces=[]
    for j in range(40):
        for k in range(8):a=j*8+k;b=j*8+(k+1)%8;faces.append((a,b,b+8,a+8))
    faces.extend([tuple(reversed(range(8))),tuple(range(320,328))])
    for index in range(6):jets.append((index,mesh('FOUNTAIN jet '+str(index),jet(0,index),faces)))
    core=ns['rod']('FOUNTAIN central water stem',(0,0,1.0),(0,0,1.18),.018,mat,r2=.015);core.parent=root;drops=[]
    for index in range(10):
        dm,opacity=water_material('Fountain droplet '+str(index),0);o=ns['ell']('FOUNTAIN droplet '+str(index),(0,0,1.18),(.009,.009,.016),dm);o.parent=root;drops.append((index,o,opacity))
    for j in range(FRAMES*4+1):
        frame=1+j*.25;t=j/(FRAMES*4);key_pose(basin,frame,pool(t))
        for index,o in jets:key_pose(o,frame,jet(t,index))
        for index,o,opacity in drops:
            q=(t+index/10)%1;o.location=stream(q,index%6,t);o.keyframe_insert('location',frame=frame);opacity.outputs[0].default_value=.85*math.sin(math.pi*q)**2;opacity.outputs[0].keyframe_insert('default_value',frame=frame)
    linearize_materials();s['environment_design']=json.dumps(dict(kind='fountain water only',layout='bowl water z=.60 radius .58; separate stone spout z=1.0',motion='six curved jets, fading advected droplets and impact ripples',origin='ground point shared with static fountain'))
    finish(ns,'fountain_water',dict(loop=dict(start=1,frames=FRAMES,fps=16,loop=True)),size=112,target=.77,sources=['validate_water.py'],alpha_levels=32)
    text=bpy.data.texts.get('fx_geometry.py') or bpy.data.texts.new('fx_geometry.py');text.clear();text.write((Path(__file__).resolve().parents[1]/'_shared/fx_geometry.py').read_text());bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath,compress=True)

if __name__ in ['__main__','environment_build']:build()
