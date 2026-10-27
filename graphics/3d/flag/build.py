"""Weathered town banner: pinned hoist, travelling folds and editable heraldic palette."""
from pathlib import Path
import sys,math,json
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
import bpy,bmesh
from mathutils import Vector
from environment_studio import begin,finish

PRIMARY=(.16,.045,.028)
SYMBOL=(.38,.33,.22)
WIDTH,HEIGHT=1.05,.60
COLS,ROWS=57,33
FRAMES=16

def positions(t):
    p=math.tau*t;out=[]
    for j in range(ROWS):
        v=j/(ROWS-1)
        for i in range(COLS):
            u=i/(COLS-1);wave=math.sin(math.tau*(1.1*u-.10*v)-p);fine=math.sin(math.tau*(2*u+.25*v)-2*p)
            out.append((WIDTH*u,.044*u*wave+.011*u*u*fine,-HEIGHT*v-.025*u+.012*u*math.sin(math.tau*u-p+.4*v)))
    return out

def build():
    ns,task=begin('flag');s=ns['s'];c=ns['c'];root=ns['root'];mat=ns['material']('Banner woven linen',PRIMARY,rough=.98,texture=180);nodes=mat.node_tree.nodes;links=mat.node_tree.links;bsdf=nodes.get('Principled BSDF')
    uv=nodes.new('ShaderNodeTexCoord');sep=nodes.new('ShaderNodeSeparateXYZ');links.new(uv.outputs['UV'],sep.inputs[0])
    def mathnode(op,a,b=None):
        n=nodes.new('ShaderNodeMath');n.operation=op
        if isinstance(a,(int,float)):n.inputs[0].default_value=a
        else:links.new(a,n.inputs[0])
        if b is not None:
            if isinstance(b,(int,float)):n.inputs[1].default_value=b
            else:links.new(b,n.inputs[1])
        return n.outputs[0]
    du=mathnode('DIVIDE',mathnode('ABSOLUTE',mathnode('SUBTRACT',sep.outputs['X'],.56)),.17);dv=mathnode('DIVIDE',mathnode('ABSOLUTE',mathnode('SUBTRACT',sep.outputs['Y'],.50)),.25);emblem=mathnode('LESS_THAN',mathnode('ADD',du,dv),1)
    primary=nodes.new('ShaderNodeRGB');primary.label='PALETTE Primary';primary.outputs[0].default_value=(*PRIMARY,1);symbol=nodes.new('ShaderNodeRGB');symbol.label='PALETTE Heraldic mark';symbol.outputs[0].default_value=(*SYMBOL,1)
    mix=nodes.new('ShaderNodeMixRGB');links.new(emblem,mix.inputs[0]);links.new(primary.outputs[0],mix.inputs[1]);links.new(symbol.outputs[0],mix.inputs[2])
    noise=next(n for n in nodes if n.bl_idname=='ShaderNodeTexNoise');wear=nodes.new('ShaderNodeMapRange');wear.inputs['To Min'].default_value=.79;wear.inputs['To Max'].default_value=1.12;links.new(noise.outputs['Fac'],wear.inputs['Value']);final=nodes.new('ShaderNodeMixRGB');final.blend_type='MULTIPLY';final.inputs[0].default_value=1;links.new(mix.outputs[0],final.inputs[1]);links.new(wear.outputs[0],final.inputs[2]);links.new(final.outputs[0],bsdf.inputs['Base Color'])
    v=positions(0);f=[]
    for j in range(ROWS-1):
        for i in range(COLS-1):a=j*COLS+i;f.append((a,a+COLS,a+COLS+1,a+1))
    m=bpy.data.meshes.new('Woven banner grid');m.from_pydata(v,[],f);m.update();m.materials.append(mat);o=bpy.data.objects.new('FLAG cloth',m);c.objects.link(o);o.parent=root
    for poly in m.polygons:poly.use_smooth=True
    layer=m.uv_layers.new(name='BannerUV')
    for poly in m.polygons:
        for loop,index in zip(poly.loop_indices,poly.vertices):layer.data[loop].uv=((index%COLS)/(COLS-1),(index//COLS)/(ROWS-1))
    solid=o.modifiers.new('Real linen thickness','SOLIDIFY');solid.thickness=.0012;solid.offset=0;o.shape_key_add(name='Basis')
    # The reinforced hoist is fixed; the hem follows the same cloth vertices.
    dark=ns['material']('Banner reinforced hem',(.075,.033,.020),rough=.98,texture=180);hem_material=dark
    for poly in m.polygons:
        indices=list(poly.vertices);us=[i%COLS for i in indices];vs=[i//COLS for i in indices]
        if min(us)==0 or max(us)==COLS-1 or min(vs)==0 or max(vs)==ROWS-1:
            if len(m.materials)==1:m.materials.append(hem_material)
            poly.material_index=1
    metal=ns['material']('Banner dull brass eyelets',(.18,.125,.055),metal=.6,rough=.65)
    for z in [-.018,-HEIGHT+.018]:
        verts=[];faces=[];N,K=24,8
        for a in range(N):
            x=math.tau*a/N
            for b in range(K):
                y=math.tau*b/K;r=.007+.0015*math.cos(y);verts.append((.010+r*math.cos(x),.0015*math.sin(y),z+r*math.sin(x)))
        for a in range(N):
            for b in range(K):i=a*K+b;faces.append((i,a*K+(b+1)%K,((a+1)%N)*K+(b+1)%K,((a+1)%N)*K+b))
        mesh=bpy.data.meshes.new('Banner eyelet');mesh.from_pydata(verts,[],faces);mesh.materials.append(metal);eye=bpy.data.objects.new('FLAG fixed eyelet',mesh);c.objects.link(eye);eye.parent=root
    for j in range(FRAMES*4+1):
        frame=1+j*.25;key=o.shape_key_add(name='Cloth_%.2f'%frame)
        for vert,p in zip(key.data,positions(j/(FRAMES*4))):vert.co=p
        for f,value in [(frame-.25,0),(frame,1),(frame+.25,0)]:key.value=value;key.keyframe_insert('value',frame=f)
        key.value=0
    s['environment_design']=json.dumps(dict(kind='woven town banner',origin='upper hoist attachment, not the foot of the pole',palette='PALETTE Primary / PALETTE Heraldic mark',geometry='pinned hoist, subdued travelling folds, reinforced hem and brass eyelets'))
    finish(ns,'flag',dict(loop=dict(start=1,frames=FRAMES,fps=12,loop=True)),size=96,target=-.28,sources=['validate_flag.py'])

if __name__ in ['__main__','environment_build']:build()
