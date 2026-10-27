"""Spatially tileable lake ripples, without any baked river translation."""
from pathlib import Path
import sys,math,json
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
import bpy
from environment_studio import begin,finish
from fx_geometry import linearize_materials
PERIOD=2.1
FRAMES=24

def build():
    ns,task=begin('water_surface');s=ns['s'];root=ns['root'];c=ns['c'];mat=bpy.data.materials.new('Periodic reflective lake water');mat.use_nodes=True;nodes=mat.node_tree.nodes;links=mat.node_tree.links;nodes.clear();out=nodes.new('ShaderNodeOutputMaterial');bsdf=nodes.new('ShaderNodeBsdfPrincipled');bsdf.inputs['Base Color'].default_value=(.045,.105,.13,1);bsdf.inputs['Roughness'].default_value=.18;bsdf.inputs['IOR'].default_value=1.333;links.new(bsdf.outputs[0],out.inputs[0]);coords=nodes.new('ShaderNodeTexCoord');coords.object=root;sep=nodes.new('ShaderNodeSeparateXYZ');links.new(coords.outputs['Object'],sep.inputs[0]);sn=nodes.new('ShaderNodeValue');sn.label='Temporal sine';cs=nodes.new('ShaderNodeValue');cs.label='Temporal cosine'
    def M(op,a,b=None):
        n=nodes.new('ShaderNodeMath');n.operation=op
        for i,x in enumerate([a,b]):
            if x is None:continue
            if isinstance(x,(int,float)):n.inputs[i].default_value=x
            else:links.new(x,n.inputs[i])
        return n.outputs[0]
    x=M('MULTIPLY',sep.outputs['X'],math.tau/PERIOD);y=M('MULTIPLY',sep.outputs['Y'],math.tau/PERIOD);sin=sn.outputs[0];cos=cs.outputs[0];sin2=M('MULTIPLY',2,M('MULTIPLY',sin,cos));cos2=M('SUBTRACT',M('MULTIPLY',cos,cos),M('MULTIPLY',sin,sin))
    def phased(space,s,c):return M('ADD',M('MULTIPLY',M('SINE',space),c),M('MULTIPLY',M('COSINE',space),s))
    h=M('ADD',M('MULTIPLY',.010,M('MULTIPLY',M('SINE',x),cos)),M('MULTIPLY',.007,M('MULTIPLY',M('SINE',y),sin)))
    h=M('ADD',h,M('MULTIPLY',.003,phased(M('MULTIPLY',x,6),sin2,cos2)));h=M('ADD',h,M('MULTIPLY',.002,phased(M('MULTIPLY',y,4),M('MULTIPLY',sin2,-1),cos2)));h=M('ADD',h,M('MULTIPLY',.002,phased(M('MULTIPLY',M('ADD',x,y),3),sin,cos)))
    bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=1;bump.inputs['Distance'].default_value=2;links.new(h,bump.inputs['Height']);links.new(bump.outputs[0],bsdf.inputs['Normal'])
    m=bpy.data.meshes.new('Extended periodic water plane');w=PERIOD*1.5;m.from_pydata([(-w,-w,0),(w,-w,0),(w,w,0),(-w,w,0)],[],[(0,1,2,3)]);m.materials.append(mat);o=bpy.data.objects.new('WATER stationary lake surface',m);c.objects.link(o);o.parent=root
    for light in bpy.data.collections['RENDER_RIG'].objects:
        if light.type=='LIGHT':light.hide_render=True
    data=bpy.data.lights.new('Water directional daylight','SUN');data.energy=2.0;data.angle=.12;light=bpy.data.objects.new('Water directional daylight',data);bpy.data.collections['RENDER_RIG'].objects.link(light);light.rotation_euler=(math.radians(15),math.radians(-10),math.radians(-20))
    for j in range(FRAMES*4+1):
        frame=1+j*.25;p=math.tau*j/(FRAMES*4);sn.outputs[0].default_value=0 if j in [0,FRAMES*4] else math.sin(p);cs.outputs[0].default_value=1 if j in [0,FRAMES*4] else math.cos(p)
        for n in [sn,cs]:n.outputs[0].keyframe_insert('default_value',frame=frame)
    linearize_materials();s['environment_design']=json.dumps(dict(kind='spatially tileable water material',period_metres=PERIOD,motion='standing waves and opposing small ripples; no root or texture translation',lighting='orthographic top view and directional daylight preserve spatial repetition'))
    finish(ns,'water_surface',dict(loop=dict(start=1,frames=FRAMES,fps=12,loop=True)),size=64,target=0,sources=['validate_surface.py'])
    s.camera.location=(0,0,10);s.camera.rotation_euler=(0,0,0);s.camera.data.ortho_scale=PERIOD;cfg=json.loads(s['sprite_export_json']);cfg.update(tileable=True,crop=False);s['sprite_export_json']=json.dumps(cfg,indent=2);s.cycles.use_animated_seed=False;bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath,compress=True)

if __name__ in ['__main__','environment_build']:build()
