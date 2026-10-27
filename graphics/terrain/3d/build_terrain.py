"""Blender 4+: seamless orthographic ground materials, geometry details and PNG exports.
Run: blender --background --factory-startup --python graphics/terrain/3d/build_terrain.py
No third-party textures; all source geometry/materials generated here.
"""
import bpy, math, random, json, hashlib, pathlib, sys
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[1]
PRESETS={
 'grass':('#37472b','#66734a','grass'),
 'forest':('#302f22','#62533b','leaves'),
 'soil':('#5f5039','#998263','grit'),
 'mud':('#353b30','#615c46','mud'),
 'sand':('#9d8655','#c9b27b','sand'),
 'gravel':('#555751','#919082','stones'),
 'paving':('#65685d','#a2a18c','paving'),
 'cave':('#4a4940','#827964','stones'),
 'catacomb':('#55584f','#8d8e7b','slabs'),
 'alien':('#4a405c','#8b7890','alien'),
 'snow':('#8a9691','#ced3c5','snow'),
 'water':('#203f43','#466b69','water'),
 'boards':('#534530','#927950','boards'),
 'dry_grass':('#67603a','#a69b66','grass'),
}
def rgb(h):return tuple((int(h[i:i+2],16)/255)**2.2 for i in (1,3,5))+(1,)
def flat(name,color):
 m=bpy.data.materials.new(name);m.diffuse_color=rgb(color);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=rgb(color);p.inputs['Roughness'].default_value=.95
 if name.startswith('detail_'):
  n=m.node_tree.nodes;l=m.node_tree.links;coord=n.new('ShaderNodeNewGeometry');noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=67;noise.inputs['Detail'].default_value=3;l.new(coord.outputs['Position'],noise.inputs['Vector']);ramp=n.new('ShaderNodeValToRGB');base=rgb(color)
  for e,factor in zip(ramp.color_ramp.elements,[.65,1.22]):e.color=tuple(min(1,v*factor) for v in base[:3])+(1,)
  l.new(noise.outputs['Fac'],ramp.inputs[0]);l.new(ramp.outputs[0],p.inputs['Base Color']);bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.65;bump.inputs['Distance'].default_value=.025;l.new(noise.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs[0],p.inputs['Normal'])
 return m

def material(name,colors,variant):
 m=flat(name,colors[0]);n=m.node_tree.nodes;l=m.node_tree.links;p=n.get('Principled BSDF');uv=n.new('ShaderNodeTexCoord');sep=n.new('ShaderNodeSeparateXYZ');l.new(uv.outputs['UV'],sep.inputs[0]);values=[]
 for axis in ('X','Y'):
  mul=n.new('ShaderNodeMath');mul.operation='MULTIPLY';mul.inputs[1].default_value=math.tau*3;l.new(sep.outputs[axis],mul.inputs[0])
  for op in ('SINE','COSINE'):
   a=n.new('ShaderNodeMath');a.operation=op;l.new(mul.outputs[0],a.inputs[0]);values.append(a.outputs[0])
 combine=n.new('ShaderNodeCombineXYZ')
 for i in range(3):l.new(values[i],combine.inputs[i])
 def noise(scale):
  q=n.new('ShaderNodeTexNoise');q.noise_dimensions='4D';q.inputs['Scale'].default_value=scale;q.inputs['Detail'].default_value=3;q.inputs['Roughness'].default_value=.7;l.new(combine.outputs[0],q.inputs['Vector']);l.new(values[3],q.inputs['W']);return q
 broad=noise(2.5+variant*.77);fine=noise(48+variant*11);mix=n.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=.55;l.new(broad.outputs['Fac'],mix.inputs[1]);l.new(fine.outputs['Fac'],mix.inputs[2]);ramp=n.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.15;ramp.color_ramp.elements[0].color=rgb(colors[0]);ramp.color_ramp.elements[1].position=.68;ramp.color_ramp.elements[1].color=rgb(colors[1]);l.new(mix.outputs[0],ramp.inputs[0]);l.new(ramp.outputs[0],p.inputs['Base Color']);bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.55;bump.inputs['Distance'].default_value=.055;l.new(fine.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs[0],p.inputs['Normal']);return m

def details(scene,kind,r,colors):
 verts=[];faces=[];indices=[];mats=[flat('detail_'+str(i),c) for i,c in enumerate(colors)]
 def face(points,mi):
  # Wrapped copies along borders preserve seamless geometry, not only shader noise.
  cx=sum(p[0] for p in points)/len(points);cy=sum(p[1] for p in points)/len(points)
  if not (-2<=cx<2 and -2<=cy<2):return
  offsets=[(ox,oy) for ox in (-4,0,4) for oy in (-4,0,4)]
  for ox,oy in offsets:
   start=len(verts);verts.extend((x+ox,y+oy,z) for x,y,z in points);faces.append(tuple(range(start,start+len(points))));indices.append(mi%len(mats))
 if kind in ('paving','slabs','boards'):
  nx,ny=(9,10) if kind=='paving' else (5,6) if kind=='slabs' else (6,18)
  for j in range(-1,ny+1):
   for i in range(-1,nx+1):
    x=-2+i*4/nx+(j%2)*2/nx;y=-2+j*4/ny;w=4/nx;h=4/ny;gap=.009 if kind=='boards' else .018;z=.012+r.random()*.01
    cut=.025 if kind!='boards' else .004
    points=[(x+gap+cut,y+gap,z),(x+w-gap-cut,y+gap,z),(x+w-gap,y+gap+cut,z),(x+w-gap,y+h-gap-cut,z),(x+w-gap-cut,y+h-gap,z),(x+gap+cut,y+h-gap,z),(x+gap,y+h-gap-cut,z),(x+gap,y+gap+cut,z)]
    points=[(xx+r.uniform(-.006,.006),yy+r.uniform(-.006,.006),zz) for xx,yy,zz in points]
    face(points,r.randrange(len(mats)))
 else:
  count={'grass':2100,'leaves':1200,'grit':900,'mud':240,'sand':100,'stones':620,'alien':550,'snow':160,'water':0}.get(kind,0)
  for i in range(count):
   x=r.uniform(-2,2);y=r.uniform(-2,2);a=r.uniform(0,math.tau);length=r.uniform(.018,.075);width=length*.45;z=.004
   if kind=='grass':length=r.uniform(.025,.11);width=length*.12;z=r.uniform(.005,.025)
   elif kind=='leaves':length=r.uniform(.025,.09);width=length*.45;z=.008
   elif kind in ('grit','sand'):length*=.45;width=length*.7
   elif kind=='stones':length=r.uniform(.018,.085);width=length*.7;z=r.uniform(.012,.04)
   elif kind=='alien':length=r.uniform(.015,.07);width=length*.5;z=.018
   def pt(u,v,h=z):return (x+u*math.cos(a)-v*math.sin(a),y+u*math.sin(a)+v*math.cos(a),h)
   mi=r.randrange(len(mats));face([pt(-length/2,0),pt(0,width/2),pt(length/2,0),pt(0,-width/2)],mi)
   if kind in ('stones','grit','alien'):face([pt(-length/2,0),pt(0,width/2),pt(0,0,z+.025)],(mi+1)%len(mats))
 mesh=bpy.data.meshes.new('Seamless micro geometry');mesh.from_pydata(verts,[],faces);mesh.materials.clear()
 for m in mats:mesh.materials.append(m)
 for f,i in zip(mesh.polygons,indices):f.material_index=i
 obj=bpy.data.objects.new('Ground detail',mesh);scene.collection.objects.link(obj)

args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
selected=[a for a in args if a in PRESETS] or list(PRESETS)
bpy.context.preferences.filepaths.save_version=0
exports={}
for name in selected:
 colors=PRESETS[name];exports[name]={'files':[],'worldPeriod':192 if name=='paving' else 384,'priority':list(PRESETS).index(name)}
 for variant in range(2):
  bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0;s=bpy.context.scene;s.name='Terrain_'+name
  s.render.engine='CYCLES';s.cycles.samples=8;s.cycles.use_denoising=True;s.render.resolution_x=s.render.resolution_y=512;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGB';s.render.image_settings.compression=80;s.view_settings.view_transform='Standard';s.view_settings.look='Medium High Contrast' if False else 'None';s.world=bpy.data.worlds.new('Soft overcast');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.72,.78,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.65
  bpy.ops.mesh.primitive_plane_add(size=12);plane=bpy.context.object;plane.name='12m overscan around 4m repeating ground';plane.data.materials.append(material(name,colors,variant))
  palette={'grass':['#667048','#7b8050','#404e2d','#8a8154'],'leaves':['#746342','#493d2a','#90805b','#4b5033'],'stones':['#8e8a78','#66675d','#aaa18a','#494e49'],'paving':['#75766b','#818174','#89887a','#70736a'],'slabs':['#73766a','#858779','#969687','#686e65'],'alien':['#9c8da7','#625775','#827a92','#b0a1b7']}.get(colors[2],[colors[0],colors[1],'#7b735c','#99917a'])
  details(s,colors[2],random.Random(72013+variant*973+list(PRESETS).index(name)*1001),palette)
  bpy.ops.object.camera_add(location=(0,0,8));camera=bpy.context.object;camera.data.type='ORTHO';camera.data.ortho_scale=4;s.camera=camera
  bpy.ops.object.light_add(type='SUN',location=(0,0,5));sun=bpy.context.object;sun.rotation_euler=(.35,-.3,-.35);sun.data.energy=1.6;sun.data.angle=.35
  folder=ROOT/'sprites'/name;folder.mkdir(parents=True,exist_ok=True);path=folder/f'{name}_{variant}.png';s.render.filepath=str(path)
  if variant==0:bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'3d'/f'{name}.blend'),compress=True)
  bpy.ops.render.render(write_still=True);exports[name]['files'].append(str(path.relative_to(ROOT/'sprites')))
  print('TERRAIN_DONE',name,variant,flush=True)
 exports[name]['hashes']=[hashlib.sha256((ROOT/'sprites'/f).read_bytes()).hexdigest()[:16] for f in exports[name]['files']];exports[name]['source']='../3d/'+name+'.blend'
 manifest_path=ROOT/'sprites'/'manifest.json';old=json.loads(manifest_path.read_text()) if manifest_path.exists() else {'version':1,'size':512,'materials':{}}
 old['materials'][name]=exports[name];manifest_path.write_text(json.dumps(old,indent=2)+'\n')
