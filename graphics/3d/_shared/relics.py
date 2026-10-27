"""Nine unlabelled relics: physical materials, separate objects, no UI or baked scene effects."""
import bpy,bmesh,math
from pathlib import Path
from mathutils import Vector
from environment_studio import begin,fit_finish

def build(asset):
 ns,task=begin(asset);c=ns['c'];root=ns['root'];M=ns['material'];B=ns['box'];R=ns['rod'];E=ns['ell'];dark=M('Deep unmarked mineral',(.022,.028,.033),rough=.29,metal=.25,texture=130);metal=M('Unrusted dull grey metal',(.22,.25,.24),rough=.37,metal=.75,texture=150);black=M('Dark optical inclusion',(.009,.013,.015),rough=.36);violet=M('Muted violet mineral rim',(.18,.11,.22),rough=.46,metal=.35,texture=160);pale=M('Pale ceramic metal',(.29,.31,.27),rough=.42,metal=.45,texture=150)
 def glass(name,color=(.40,.46,.43),rough=.14,ior=1.46):
  mat=M(name,color,rough=rough);p=mat.node_tree.nodes.get('Principled BSDF');p.inputs['Transmission Weight'].default_value=.82;p.inputs['IOR'].default_value=ior;return mat
 clear=glass('Old clear rind');cloudy=glass('Clouded old glass',(.23,.29,.27),.24)
 def mesh(name,V,F,mats):
  data=bpy.data.meshes.new(name);data.from_pydata(V,[],F);data.update();bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free();o=bpy.data.objects.new(name,data);c.objects.link(o);o.parent=root
  for mat in mats:data.materials.append(mat)
  return o
 def cylinder(name,loc,rr,h,mat):
  bpy.ops.mesh.primitive_cylinder_add(vertices=96,radius=rr,depth=h,location=loc);o=ns['done'](bpy.context.object,name,mat);be=o.modifiers.new('Soft worn rim','BEVEL');be.width=.003;be.segments=3;return o
 def curve(name,points,rad,mat):
  cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.bevel_depth=rad;cu.bevel_resolution=3;cu.use_fill_caps=True;sp=cu.splines.new('POLY');sp.points.add(len(points)-1)
  for p,v in zip(sp.points,points):p.co=(*v,1)
  o=bpy.data.objects.new(name,cu);c.objects.link(o);o.parent=root;cu.materials.append(mat);return o
 def torus(name,rr,minor,z,mat,rot=(0,0,0)):
  bpy.ops.mesh.primitive_torus_add(major_segments=96,minor_segments=16,major_radius=rr,minor_radius=minor,location=(0,0,z),rotation=rot);o=ns['done'](bpy.context.object,name,mat);return o
 if asset=='artifact_relic':
  outline=[(-.23,-.14),(.19,-.13),(.23,-.04),(.14,.02),(.22,.12),(-.17,.15),(-.23,.08)];N=len(outline);V=[(x,y,z) for z in [.01,.055] for x,y in outline];F=[tuple(reversed(range(N))),tuple(range(N,2*N))]+[(j,(j+1)%N,(j+1)%N+N,j+N) for j in range(N)];o=mesh('Unhammered dark shard',V,F,[dark]);be=o.modifiers.new('Tiny fracture edge','BEVEL');be.width=.002;be.segments=2
  # A thin physical interference coating only on the broken corner.
  film=M('Thin iridescent fracture',(.06,.12,.14),rough=.18,metal=.8);p=film.node_tree.nodes.get('Principled BSDF')
  if 'Thin Film Thickness' in p.inputs:p.inputs['Thin Film Thickness'].default_value=550
  if 'Thin Film IOR' in p.inputs:p.inputs['Thin Film IOR'].default_value=1.36
  if 'Thin Film Thickness' not in p.inputs:
   facing=film.node_tree.nodes.new('ShaderNodeLayerWeight');ramp=film.node_tree.nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(.07,.13,.17,1);ramp.color_ramp.elements[1].color=(.13,.065,.16,1);film.node_tree.links.new(facing.outputs['Facing'],ramp.inputs[0]);film.node_tree.links.new(ramp.outputs[0],p.inputs['Base Color'])
  mesh('Thin rainbow chip face',[(.192,-.132,.041),(.232,-.042,.041),(.219,-.043,.056),(.185,-.120,.056)],[(0,1,2,3)],[film])
 elif asset=='artifact_moon_relic':
  body=cylinder('Round unmarked lunar seal',(0,0,.041),.215,.060,metal)
  for j,rr in enumerate([.07,.12,.175]):
   start=.25+j*.72;cut=curve('Unclosed seal groove',[(rr*math.cos(start+k*math.tau*.82/100),rr*math.sin(start+k*math.tau*.82/100),.071) for k in range(101)],.005,black);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();data=bpy.data.meshes.new_from_object(cut.evaluated_get(dg));cutter=bpy.data.objects.new('Groove cutter mesh',data);c.objects.link(cutter);cutter.parent=root;bpy.data.objects.remove(cut,do_unlink=True);bpy.context.view_layer.objects.active=body;mod=body.modifiers.new('Recessed partial ring','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
 elif asset=='artifact_tide_relic':
  B('Small dense tidal bar',(0,0,.065),(.30,.14,.12),dark,bevel=.012);water=glass('Gathered water droplets',(.48,.55,.57),.07,1.333)
  for x,y,rr in [(.10,-.045,.012),(.12,-.01,.016),(.105,.035,.011),(.135,.04,.008)]:E('Water gathered at one end',(x,y,.125+rr*.65),(rr,rr,rr*.8),water)
 elif asset=='artifact_hush_lens':
  E('Murky glass body',(0,0,.15),(.235,.19,.14),cloudy);o=E('Dark turning slit frozen within glass',(0,-.025,.15),(.014,.09,.105),black);o.rotation_euler[1]=-.22;curve('Worn mineral lens rim',[(.237*math.cos(j*math.tau/96),.192*math.sin(j*math.tau/96),.15) for j in range(97)],.010,metal)
 elif asset=='artifact_thread_spool':
  cylinder('Spool lower flange',(0,0,.03),.135,.04,metal);cylinder('Spool upper flange',(0,0,.35),.135,.035,metal);cylinder('Spool core',(0,0,.19),.045,.30,dark)
  thread=M('Almost invisible unending thread',(.16,.21,.22),rough=.22,metal=.3)
  curve('Unbroken fine wound filament',[(.084*math.cos(j*math.tau/32),.084*math.sin(j*math.tau/32),.055+j*(.275/(80*32))) for j in range(80*32+1)],.0008,thread)
 elif asset=='artifact_mirror_seed':
  mirror=M('Impossible mirror seed surface',(.35,.38,.36),rough=.10,metal=.92);E('Smooth mirrored seed',(0,0,.145),(.14,.085,.12),mirror);E('Transparent seed rind',(0,0,.145),(.16,.104,.14),clear)
  for side in [-1,1]:
   curve('Impossibly reflected thin branch',[(0,-.088,.07),(side*.04,-.085,.12),(side*.08,-.075,.19)],.0018,black)
   for j in range(3):curve('Fine reflected twig',[(side*(.02+j*.018),-.087+j*.003,.10+j*.025),(side*(.06+j*.02),-.075,.13+j*.028)],.0011,black)
 elif asset=='artifact_wind_knot':
  for i,(rr,minor,rot) in enumerate([(.25,.016,(math.pi/2,0,0)),(.17,.012,(math.pi/2+.62,.34,.2)),(.09,.009,(math.pi/2-.65,-.40,-.2))]):torus('Non touching nested relic ring',rr,minor,.266,pale,rot)
 elif asset=='artifact_breath_vessel':
  E('Sealed clear breath vessel',(0,0,.255),(.17,.15,.225),clear);cylinder('Sealed vessel base',(0,0,.035),.13,.04,metal);cylinder('Sealed vessel cap',(0,0,.465),.12,.04,metal);torus('Violet vessel collar',.145,.014,.435,violet)
  film=M('Faint violet internal lamina',(.12,.08,.17),rough=.24);p=film.node_tree.nodes.get('Principled BSDF');p.inputs['Transmission Weight'].default_value=.6
  for z in [.16,.24,.32]:E('Orderly internal empty-space layer',(0,0,z),(.115,.105,.0025),film)
 elif asset=='artifact_broken_crown':
  V=[];F=[];N=96;K=12
  for j in range(N+1):
   a=-2.35+j*4.05/N
   for k in range(K):b=k*math.tau/K;rr=.30+.025*math.cos(b);V.append((rr*math.cos(a),rr*math.sin(a),.038+.020*math.sin(b)))
  for j in range(N):
   for k in range(K):F.append((j*K+k,j*K+(k+1)%K,(j+1)*K+(k+1)%K,(j+1)*K+k))
  F.extend([tuple(reversed(range(K))),tuple(range(N*K,(N+1)*K))]);o=mesh('Broken smooth crown arc',V,F,[pale])
  for p in o.data.polygons:p.use_smooth=True
  for j in range(7):
   a=-2.05+j*.52;o=B('Smooth inner arc tooth',(.264*math.cos(a),.264*math.sin(a),.038),(.065,.025,.024),pale,bevel=.010);o.rotation_euler[2]=a
 fit_finish(ns,asset,rotation=-.20,sources=[str(Path(__file__))],alpha_levels=32)
