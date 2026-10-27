"""Naturalistic authored flame meshes; variants specify physical size and fuel footprint."""
import bpy,math,json,random
from pathlib import Path
from mathutils import Vector
from environment_studio import begin,finish
from fx_geometry import material,mesh,key_pose,linearize_materials
ROOT=Path(__file__).resolve().parents[2]

def flame_points(t,index,height,width,inner=False):
    p=math.tau*t;phase=index*2.37;points=[];rows,cols=19,24;base=Vector((width*.34*math.cos(phase),width*.28*math.sin(phase),.012));length=height*(.70+.22*math.sin(phase+1)**2)*(.90+.10*math.sin(p+phase))
    if inner:length*=.72
    for j in range(rows):
        u=j/(rows-1);center=base+Vector((width*.14*u*u*math.sin(p+phase+u*4),width*.10*u*u*math.sin(2*p-phase+u*5),length*u));r=width*(.16+.045*math.sin(phase))*(1-u)**.70*(.65+.55*math.sin(math.pi*u))
        if inner:r*=.57
        for k in range(cols):
            a=k*math.tau/cols;rough=1+.16*math.sin(3*a+u*11-p+phase)+.07*math.sin(7*a-u*9+2*p);points.append(center+Vector((r*rough*math.cos(a),r*rough*.8*math.sin(a),.014*math.sin(3*a+phase)*math.sin(math.pi*u))))
    return points

def build(asset,height,width,tongues=6,coals=False,sparks=4,optical_gain=1):
    ns,task=begin(asset);s=ns['s'];root=ns['root'];c=ns['c'];mat=bpy.data.materials.new(asset+' turbulent fire volume');mat.use_nodes=True;nodes=mat.node_tree.nodes;links=mat.node_tree.links;nodes.clear()
    out=nodes.new('ShaderNodeOutputMaterial');volume=nodes.new('ShaderNodeVolumePrincipled');volume.inputs['Color'].default_value=(.18,.065,.012,1);links.new(volume.outputs['Volume'],out.inputs['Volume'])
    coords=nodes.new('ShaderNodeTexCoord');coords.object=root;drift=nodes.new('ShaderNodeVectorMath');drift.operation='ADD';links.new(coords.outputs['Object'],drift.inputs[0]);noise=nodes.new('ShaderNodeTexNoise');noise.noise_dimensions='4D';noise.inputs['Scale'].default_value=9/max(height,.3);noise.inputs['Detail'].default_value=4;noise.inputs['Roughness'].default_value=.7;links.new(drift.outputs[0],noise.inputs['Vector'])
    density=nodes.new('ShaderNodeMapRange');density.clamp=True;density.inputs['From Min'].default_value=.28;density.inputs['From Max'].default_value=.69;links.new(noise.outputs['Fac'],density.inputs['Value']);sep=nodes.new('ShaderNodeSeparateXYZ');links.new(coords.outputs['Generated'],sep.inputs[0])
    def M(op,a,b):
        n=nodes.new('ShaderNodeMath');n.operation=op
        for i,x in enumerate([a,b]):
            if isinstance(x,(int,float)):n.inputs[i].default_value=x
            else:links.new(x,n.inputs[i])
        return n.outputs[0]
    dx=M('SUBTRACT',sep.outputs['X'],.5);dy=M('SUBTRACT',sep.outputs['Y'],.5);edge=M('MAXIMUM',M('SUBTRACT',1,M('MULTIPLY',4,M('ADD',M('MULTIPLY',dx,dx),M('MULTIPLY',dy,dy)))),0);field=M('MULTIPLY',density.outputs[0],edge);links.new(M('MULTIPLY',field,4*optical_gain),volume.inputs['Density']);links.new(M('MULTIPLY',field,3.5*math.sqrt(optical_gain)),volume.inputs['Emission Strength']);blackbody=nodes.new('ShaderNodeBlackbody');links.new(M('ADD',M('SUBTRACT',1650,M('MULTIPLY',sep.outputs['Z'],350)),M('MULTIPLY',noise.outputs['Fac'],150)),blackbody.inputs[0]);links.new(blackbody.outputs[0],volume.inputs['Emission Color'])
    faces=[];rows,cols=19,24
    for j in range(rows-1):
        for k in range(cols):a=j*cols+k;b=j*cols+(k+1)%cols;faces.append((a,b,b+cols,a+cols))
    faces.extend([tuple(reversed(range(cols))),tuple(range((rows-1)*cols,rows*cols))]);flames=[]
    for index in range(tongues):
        for inner in [False]:
            colors=[]
            for j in range(rows):
                u=j/(rows-1)
                if inner:rgb=(1,.62-.22*u,.19-.15*u);opacity=.60*(1-u)**.65
                else:rgb=(.90,.20+.22*math.sin(math.pi*u),.012+.025*math.sin(math.pi*u));opacity=.70*(1-u)**.35
                colors.extend([(*rgb,opacity)]*cols)
            o=mesh(ns,'FIRE %s tongue %s'%('hot' if inner else 'outer',index),flame_points(0,index,height,width,inner),faces,colors,mat);flames.append((index,inner,o))
    rng=random.Random(802);coal_nodes=[]
    if coals:
        coal=ns['material']('Fire blackened glowing embers',(.025,.008,.002),rough=.95,texture=110);bsdf=coal.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Emission Color'].default_value=(.22,.026,.001,1);bsdf.inputs['Emission Strength'].default_value=.7;coal_nodes.append(bsdf.inputs['Emission Strength']);nt=coal.node_tree;cn=next(n for n in nt.nodes if n.bl_idname=='ShaderNodeTexNoise');cr=nt.nodes.new('ShaderNodeValToRGB');cr.color_ramp.elements[0].position=.35;cr.color_ramp.elements[0].color=(.001,.0001,0,1);cr.color_ramp.elements[1].position=.70;cr.color_ramp.elements[1].color=(.45,.025,.0005,1);nt.links.new(cn.outputs['Fac'],cr.inputs[0]);nt.links.new(cr.outputs[0],bsdf.inputs['Emission Color'])
        for k in range(9):
            a=k*math.tau/9;r=width*rng.uniform(.07,.25);o=ns['ell']('FIRE coal',(r*math.cos(a),r*math.sin(a),.015),(.035,.025,.016),coal);o.parent=root
            for v in o.data.vertices:v.co*=1+.15*math.sin(v.co.x*9+v.co.y*7+v.co.z*11+k)
    particles=[]
    for k in range(sparks):
        sm,sfade,se=material('Fire spark '+str(k),2.5);o=mesh(ns,'FIRE rising spark '+str(k),[(0,0,0),(.007,0,.014),(-.007,0,.014),(0,0,.045)],[(0,1,3),(0,3,2)],[(1,.32,.03,.9)]*4,sm);particles.append((k,o,sfade))
    frames=16
    for j in range(frames*4+1):
        t=j/(frames*4);frame=1+j*.25;p=math.tau*t
        for index,inner,o in flames:key_pose(o,frame,flame_points(t,index,height,width,inner))
        noise.inputs['W'].default_value=.65*math.cos(p);noise.inputs['W'].keyframe_insert('default_value',frame=frame);drift.inputs[1].default_value=(.05*math.cos(p),.05*math.sin(p),-.22*math.sin(p));drift.inputs[1].keyframe_insert('default_value',frame=frame)
        for k,o,opacity in particles:
            q=(t+k*.271)%1;o.location=(width*(.10*math.sin(k*2.1)+.18*q*math.sin(k+p)),width*.1*math.cos(k*2.1),height*(.25+.95*q));o.rotation_euler=(0,0,.2*math.sin(p+k));o.keyframe_insert('location',frame=frame);o.keyframe_insert('rotation_euler',frame=frame);opacity.outputs[0].default_value=math.sin(math.pi*q)**2*.8;opacity.outputs[0].keyframe_insert('default_value',frame=frame)
        for node in coal_nodes:node.default_value=.7+.3*math.sin(2*p);node.keyframe_insert('default_value',frame=frame)
    s['environment_design']=json.dumps(dict(kind='authored natural flame',physical_height=height,physical_width=width,tongues=tongues,coals=coals,sparks=sparks,optical_gain=optical_gain,layering='flame and optional coals only; rigid support is a separate static asset'))
    linearize_materials()
    finish(ns,asset,dict(loop=dict(start=1,frames=frames,fps=14,loop=True)),size=96,target=height*.50,sources=[str(ROOT/'3d/_shared/validate_fire.py')])
    for filename in ['flame_effect.py','fx_geometry.py']:
        text=bpy.data.texts.get(filename) or bpy.data.texts.new(filename);text.clear();text.write((ROOT/'3d/_shared'/filename).read_text())
    bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath,compress=True)
