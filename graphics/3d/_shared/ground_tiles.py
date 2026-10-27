"""Periodic 2.1 m ground materials and wrapped 3D litter, rendered at 64 pixels."""
import bpy,math,random,json
from pathlib import Path
from mathutils import Vector
from environment_studio import begin,finish
P=2.1

def build(asset):
 ns,task=begin(asset);s=ns['s'];c=ns['c'];root=ns['root'];r=random.Random(401)
 colors={'wood_floor':(.16,.10,.045),'stone_floor':(.24,.24,.21),'cave_floor':(.13,.135,.11),'catacomb_floor':(.15,.155,.135),'lake_bed':(.075,.085,.06),'sand_tile':(.34,.26,.145),'forest_ground':(.095,.065,.031),'road_tile':(.15,.115,.065),'trail_tile':(.12,.085,.038)};base=colors[asset];mat=bpy.data.materials.new('Periodic '+asset);mat.use_nodes=True;n=mat.node_tree.nodes;l=mat.node_tree.links;n.clear();out=n.new('ShaderNodeOutputMaterial');bsdf=n.new('ShaderNodeBsdfPrincipled');bsdf.inputs['Roughness'].default_value=.88;l.new(bsdf.outputs[0],out.inputs[0]);coord=n.new('ShaderNodeTexCoord');coord.object=root;sep=n.new('ShaderNodeSeparateXYZ');l.new(coord.outputs['Object'],sep.inputs[0])
 def M(op,a,b=None):
  node=n.new('ShaderNodeMath');node.operation=op
  for j,v in enumerate([a,b]):
   if v is None:continue
   if isinstance(v,(int,float)):node.inputs[j].default_value=v
   else:l.new(v,node.inputs[j])
  return node.outputs[0]
 x=M('MULTIPLY',sep.outputs['X'],math.tau/P);y=M('MULTIPLY',sep.outputs['Y'],math.tau/P)
 def periodic_noise(scale,wood=False):
  comb=n.new('ShaderNodeCombineXYZ');l.new(M('MULTIPLY',M('COSINE',x),.15 if wood else 1),comb.inputs['X']);l.new(M('MULTIPLY',M('SINE',x),.15 if wood else 1),comb.inputs['Y']);l.new(M('MULTIPLY',M('COSINE',y),2 if wood else 1),comb.inputs['Z']);tex=n.new('ShaderNodeTexNoise');tex.noise_dimensions='4D';tex.inputs['Scale'].default_value=scale;tex.inputs['Detail'].default_value=3;l.new(comb.outputs[0],tex.inputs['Vector']);l.new(M('MULTIPLY',M('SINE',y),2 if wood else 1),tex.inputs['W']);return tex.outputs['Fac']
 coarse=periodic_noise(2.6);fine=periodic_noise(23 if asset=='wood_floor' else 48,asset=='wood_floor');h=M('ADD',M('MULTIPLY',coarse,.007),M('MULTIPLY',fine,.0015));ramp=n.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=tuple(v*.58 for v in base)+(1,);ramp.color_ramp.elements[1].color=tuple(v*1.30 for v in base)+(1,);l.new(fine if asset=='wood_floor' else coarse,ramp.inputs[0]);color=ramp.outputs[0]
 if asset in ['stone_floor','catacomb_floor','wood_floor']:
  brick=n.new('ShaderNodeTexBrick');brick.inputs['Scale'].default_value=1;brick.inputs['Brick Width'].default_value=1.05 if asset=='wood_floor' else .525 if asset=='catacomb_floor' else .2625;brick.inputs['Row Height'].default_value=.175 if asset=='wood_floor' else .525 if asset=='catacomb_floor' else .21;brick.inputs['Mortar Size'].default_value=.003 if asset=='wood_floor' else .007;brick.inputs['Mortar Smooth'].default_value=.002;brick.inputs['Color1'].default_value=(1,1,1,1);brick.inputs['Color2'].default_value=(1,1,1,1);brick.inputs['Mortar'].default_value=(.17,.17,.17,1);l.new(coord.outputs['Object'],brick.inputs['Vector']);mix=n.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;l.new(color,mix.inputs[1]);l.new(brick.outputs['Color'],mix.inputs[2]);color=mix.outputs[0];h=M('SUBTRACT',h,M('MULTIPLY',brick.outputs['Fac'],.012))
 if asset=='sand_tile':h=M('ADD',h,M('MULTIPLY',.006,M('SINE',M('ADD',M('MULTIPLY',x,8),M('MULTIPLY',M('SINE',M('MULTIPLY',y,2)),.45)))))
 if asset=='road_tile':
  ruts=[]
  for side in [-1,1]:ruts.append(M('EXPONENT',M('MULTIPLY',M('SUBTRACT',1,M('COSINE',M('SUBTRACT',x,side*.70*math.tau/P))),-28)))
  rut=M('MAXIMUM',*ruts);h=M('SUBTRACT',h,M('MULTIPLY',rut,.014));mix=n.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';l.new(rut,mix.inputs[0]);l.new(color,mix.inputs[1]);mix.inputs[2].default_value=(.60,.60,.60,1);color=mix.outputs[0]
 if asset=='trail_tile':
  path=M('EXPONENT',M('MULTIPLY',M('SUBTRACT',1,M('COSINE',x)),-4));mix=n.new('ShaderNodeMixRGB');l.new(path,mix.inputs[0]);mix.inputs[1].default_value=(.050,.063,.025,1);l.new(color,mix.inputs[2]);color=mix.outputs[0]
 l.new(color,bsdf.inputs['Base Color']);bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.85;bump.inputs['Distance'].default_value=1;l.new(h,bump.inputs['Height']);l.new(bump.outputs[0],bsdf.inputs['Normal'])
 mesh=bpy.data.meshes.new('Extended periodic ground');w=P*1.5;mesh.from_pydata([(-w,-w,0),(w,-w,0),(w,w,0),(-w,w,0)],[],[(0,1,2,3)]);o=bpy.data.objects.new('Ground tile shader plane',mesh);c.objects.link(o);o.parent=root;mesh.materials.append(mat)
 # Objects are repeated over the eight neighboring cells too, including their shadows.
 V=[];F=[];MI=[];mats=[]
 if asset in ['forest_ground','trail_tile']:
  mats=[ns['material']('Fallen leaf %d'%i,col,texture=140) for i,col in enumerate([(.16,.085,.025),(.22,.13,.038),(.10,.095,.027),(.11,.065,.022)])]
  leaves=[]
  for j in range(140 if asset=='forest_ground' else 75):
   xx,yy=r.uniform(-P/2,P/2),r.uniform(-P/2,P/2)
   if asset=='trail_tile' and abs(xx)<.39:continue
   leaves.append((xx,yy,r.random()*math.tau,r.uniform(.07,.14),r.uniform(.019,.034),r.randrange(4)))
  for dx in [-P,0,P]:
   for dy in [-P,0,P]:
    for xx,yy,t,length,width,idx in leaves:
     a=Vector((xx+dx,yy+dy,.003));d=Vector((math.cos(t),math.sin(t),0));side=Vector((-math.sin(t),math.cos(t),0));start=len(V);V.append(tuple(a))
     for k in range(1,8):
      q=k/8;ww=width*math.sin(math.pi*q)*(.8 if k%2 else 1);center=a+d*length*q+Vector((0,0,.010*math.sin(math.pi*q)));V.extend([tuple(center-side*ww),tuple(center+side*ww)])
     V.append(tuple(a+d*length));F.append((start,start+2,start+1));MI.append(idx)
     for k in range(6):F.append((start+1+2*k,start+2+2*k,start+4+2*k,start+3+2*k));MI.append(idx)
     F.append((start+13,start+14,start+15));MI.append(idx)
 if asset in ['cave_floor','lake_bed','road_tile','trail_tile']:
  offset=len(mats);mats.append(ns['material']('Small worn gravel',(.17,.17,.14),rough=.9,texture=85));pebbles=[]
  for j in range(35 if asset=='lake_bed' else 14):pebbles.append((r.uniform(-P/2,P/2),r.uniform(-P/2,P/2),r.uniform(.012,.035)))
  for dx in [-P,0,P]:
   for dy in [-P,0,P]:
    for xx,yy,rr in pebbles:
     start=len(V);N=12
     for z,rad in [(0,rr*.7),(rr*.65,rr),(rr,rr*.35)]:
      for k in range(N):t=k*math.tau/N;V.append((xx+dx+rad*math.cos(t),yy+dy+rad*math.sin(t),.001+z))
     for j in range(2):
      for k in range(N):F.append((start+j*N+k,start+j*N+(k+1)%N,start+(j+1)*N+(k+1)%N,start+(j+1)*N+k));MI.append(offset)
     F.append(tuple(range(start+2*N,start+3*N)));MI.append(offset)
 if V:
  data=bpy.data.meshes.new('Wrapped surface litter geometry');data.from_pydata(V,[],F);ob=bpy.data.objects.new('Repeated physical surface litter',data);c.objects.link(ob);ob.parent=root
  for material in mats:data.materials.append(material)
  for face,i in zip(data.polygons,MI):face.material_index=i
 s['environment_design']=json.dumps(dict(period_metres=P,coverage='continuous opaque tile, top view',origin='tile centre',periodicity='toroidal noise coordinates and neighboring copies of litter'))
 finish(ns,asset,size=64,target=0,sources=[str(Path(__file__))]);s.camera.location=(0,0,10);s.camera.rotation_euler=(0,0,0);s.camera.data.ortho_scale=P;cfg=json.loads(s['sprite_export_json']);cfg.update(tileable=True,crop=False);s['sprite_export_json']=json.dumps(cfg,indent=2);s.cycles.use_animated_seed=False;bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath,compress=True)
