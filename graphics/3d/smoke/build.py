"""Soft, illuminated volume plume. Source stays at origin; no baked chimney."""
import bpy,sys,math,json,random
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from environment_studio import begin,finish
from fx_geometry import linearize_materials

def build():
 ns,task=begin('smoke',lighting='daylight');s=ns['s'];root=ns['root'];c=ns['c'];N=24
 for i in range(7):
  bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16)
  o=bpy.context.object;o.name='Smoke turbulent billow %02d'%i
  for col in list(o.users_collection):col.objects.unlink(o)
  c.objects.link(o);o.parent=root
  for v in o.data.vertices:
   x,y,z=v.co;v.co*=1+.13*math.sin(5*x+3*y+i)*math.sin(4*z-2*y)
  for p in o.data.polygons:p.use_smooth=True
  mat=bpy.data.materials.new(o.name);mat.use_nodes=True;n=mat.node_tree.nodes;l=mat.node_tree.links;n.clear();out=n.new('ShaderNodeOutputMaterial');vol=n.new('ShaderNodeVolumePrincipled');vol.inputs['Color'].default_value=(.50,.53,.55,1);vol.inputs['Anisotropy'].default_value=.15;l.new(vol.outputs[0],out.inputs['Volume']);coord=n.new('ShaderNodeTexCoord');noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=4.2;noise.inputs['Detail'].default_value=3;l.new(coord.outputs['Generated'],noise.inputs['Vector']);ramp=n.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.28;ramp.color_ramp.elements[1].position=.72;l.new(noise.outputs['Fac'],ramp.inputs[0]);gain=n.new('ShaderNodeValue');gain.label='Billow density envelope';mul=n.new('ShaderNodeMath');mul.operation='MULTIPLY';l.new(gain.outputs[0],mul.inputs[0]);l.new(ramp.outputs[0],mul.inputs[1]);l.new(mul.outputs[0],vol.inputs['Density']);o.data.materials.append(mat)
  for j in range(N*4+1):
   f=1+j*.25;q=(j/(N*4)+i/7)%1;p=math.tau*q
   o.location=(.16*math.sin(p+i*.6)*q,.09*math.cos(p*.8+i)*q,.12+1.48*q);r=.11+.32*q;o.scale=(r*(1+.15*math.sin(p+i)),r*.82,r*(1.2+.2*math.cos(p)))
   o.rotation_euler=(.15*math.sin(p),.12*math.cos(p),i+q*.7)
   o.keyframe_insert('location',frame=f);o.keyframe_insert('scale',frame=f);o.keyframe_insert('rotation_euler',frame=f)
   gain.outputs[0].default_value=3.2*math.sin(math.pi*q)**2;gain.outputs[0].keyframe_insert('default_value',frame=f)
 linearize_materials();s['environment_design']=json.dumps(dict(description='Non-emissive grey smoke; seven rising noise volumes with zero-density resets',source='origin at emitter',period_frames=N))
 finish(ns,'smoke',dict(loop=dict(start=1,frames=N,fps=12,loop=True)),size=96,target=.85,alpha_levels=32)

if __name__ in ['__main__','environment_build']:build()
