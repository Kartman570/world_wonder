"""Periodic cave wall profile, ossuary wall and loose masonry rubble."""
import bpy,math,random
from pathlib import Path
from mathutils import Vector,noise
from environment_studio import begin,fit_finish

def build(asset):
 ns,task=begin(asset);c=ns['c'];root=ns['root'];M=ns['material'];B=ns['box'];r=random.Random(379);stone=M('Damp fractured limestone',(.19,.185,.15),rough=.92,texture=18);dark=M('Recessed grey mortar',(.13,.135,.11),rough=.95,texture=55)
 if asset=='cave_wall':
  NX=64;NZ=64;V=[];F=[]
  for k in range(NZ+1):
   q=k/NZ
   for j in range(NX+1):
    t=j*math.tau/NX;x=-1.05+j*2.1/NX;z=2.625*q+.055*math.sin(t*3)*q;co=Vector((math.cos(t)*1.1,math.sin(t)*1.1,z*1.6));n=noise.noise(co)+.35*noise.noise(co*3.3);y=-.36-.18*n-.045*math.sin(z*11+t*2);V.append((x,y,z))
  for k in range(NZ):
   for j in range(NX):i=k*(NX+1)+j;F.append((i,i+1,i+NX+2,i+NX+1))
  # Back and end faces match the same profile at both periodic ports.
  front_count=len(V);V.extend([(-1.05,.25,0),(1.05,.25,0),(-1.05,.25,2.625),(1.05,.25,2.625)]);F.append((front_count,front_count+2,front_count+3,front_count+1))
  F.append(tuple([k*(NX+1) for k in range(NZ+1)]+[front_count+2,front_count]));F.append(tuple([k*(NX+1)+NX for k in reversed(range(NZ+1))]+[front_count+1,front_count+3]));F.append(tuple(list(range(NX+1))+[front_count+1,front_count]));F.append(tuple([NZ*(NX+1)+j for j in reversed(range(NX+1))]+[front_count+2,front_count+3]))
  mesh=bpy.data.meshes.new('Continuous fractured cave module');mesh.from_pydata(V,[],F);o=bpy.data.objects.new('Natural cave wall',mesh);c.objects.link(o);o.parent=root;mesh.materials.append(stone)
  for p in mesh.polygons:p.use_smooth=p.loop_total==4
  # Both end profiles must match, including intermediate height levels.
  assert max(abs(V[k*(NX+1)][1]-V[k*(NX+1)+NX][1]) for k in range(NZ+1))<1e-6
 elif asset=='catacomb_wall':
  body=B('Solid ossuary wall',(0,0,1.3125),(2.10,.525,2.625),stone,bevel=.012)
  for x in [-.525,.525]:
   for z in [.65,1.70]:
    cutters=[];cut=B('Burial niche rectangular void',(x,-.30,z),(.60,.50,.45),dark,bevel=.004);cutters.append(cut)
    bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=.30,depth=.50,location=(x,-.30,z+.225),rotation=(math.pi/2,0,0));cutters.append(bpy.context.object)
    for cut in cutters:
     bpy.context.view_layer.objects.active=body;mod=body.modifiers.new('Recessed burial niche','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cut;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cut,do_unlink=True)
    B('Niche stone sill',(x,-.265,z-.25),(.70,.15,.05),stone,bevel=.008)
  nodes=stone.node_tree.nodes;links=stone.node_tree.links;coords=nodes.new('ShaderNodeTexCoord');sep=nodes.new('ShaderNodeSeparateXYZ');comb=nodes.new('ShaderNodeCombineXYZ');links.new(coords.outputs['Object'],sep.inputs[0]);links.new(sep.outputs['X'],comb.inputs['X']);links.new(sep.outputs['Z'],comb.inputs['Y']);brick=nodes.new('ShaderNodeTexBrick');brick.inputs['Scale'].default_value=1;brick.inputs['Brick Width'].default_value=.525;brick.inputs['Row Height'].default_value=.2625;brick.inputs['Mortar Size'].default_value=.006;brick.inputs['Mortar Smooth'].default_value=.003;brick.inputs['Color1'].default_value=(.21,.21,.18,1);brick.inputs['Color2'].default_value=(.15,.155,.13,1);brick.inputs['Mortar'].default_value=(.07,.075,.055,1);links.new(comb.outputs[0],brick.inputs['Vector']);links.new(brick.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color']);bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.55;bump.inputs['Distance'].default_value=.022;links.new(brick.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs[0],nodes.get('Principled BSDF').inputs['Normal'])
 else:
  # A low aggregate mass gives every scattered block a physically supported base.
  bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3,radius=1,location=(0,0,0));o=bpy.context.object;o.name='Collapsed masonry aggregate'
  for col in list(o.users_collection):col.objects.unlink(o)
  c.objects.link(o);o.parent=root;o.data.materials.append(dark)
  for v in o.data.vertices:
   p=v.co.copy();v.co=(p.x*.85,p.y*.61,max(.006,(p.z*.5+.5)*.32)*(1+.1*noise.noise(p*7)))
  for j in range(55):
   x,y=r.uniform(-.88,.88),r.uniform(-.57,.57);rad=math.hypot(x/.85,y/.61);dims=(r.uniform(.12,.35),r.uniform(.10,.26),r.uniform(.08,.18));z=.16+.16*math.sqrt(max(0,1-rad*rad))+.25*dims[2] if rad<=1 else dims[2]/2+.008;o=B('Broken dressed masonry block',(x,y,z),dims,stone,bevel=.012);o.rotation_euler=(r.uniform(-.17,.17),r.uniform(-.17,.17),r.random()*math.tau)
 fit_finish(ns,asset,sources=[str(Path(__file__))])
