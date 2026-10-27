"""Defensive stonework on a 0.525 m grid, common wall thickness and wall-walk level."""
import bpy,math,random,json
from pathlib import Path
from mathutils import Vector
from environment_studio import begin,fit_finish
GRID=.525
THICKNESS=1.05
WALL_TOP=3.15

def build(asset):
 ns,task=begin(asset);c=ns['c'];root=ns['root'];M=ns['material'];B=ns['box'];R=ns['rod'];r=random.Random(331);stone=[M('Grey weathered masonry %d'%i,(.19+i*.018,.195+i*.017,.17+i*.015),texture=65) for i in range(5)];mortar=M('Recessed old lime mortar',(.12,.125,.105),texture=100);wood=M('Iron bound oak gate',(.10,.063,.03),texture=90);iron=M('Rusty gate iron',(.043,.045,.043),metal=.65,rough=.7,texture=100);dark=M('Unlit arrow loop recess',(.015,.017,.014))
 for mat in stone:
  nodes=mat.node_tree.nodes;links=mat.node_tree.links;tex=next(n for n in nodes if n.type=='TEX_NOISE');tex.inputs['Scale'].default_value=7;tex.inputs['Detail'].default_value=4;tex.noise_dimensions='4D';info=nodes.new('ShaderNodeObjectInfo');mul=nodes.new('ShaderNodeMath');mul.operation='MULTIPLY';mul.inputs[1].default_value=31;links.new(info.outputs['Random'],mul.inputs[0]);links.new(mul.outputs[0],tex.inputs['W']);bump=next(n for n in nodes if n.type=='BUMP');bump.inputs['Strength'].default_value=.5;bump.inputs['Distance'].default_value=.025;nodes.get('Principled BSDF').inputs['Roughness'].default_value=.92
 def box(n,p,d,mat=None,bevel=.008):return B(n,p,d,mat or r.choice(stone),bevel=bevel)
 def brick_face(cx,cy,length,height,axis='X',bottom=0,skip=None):
  for row in range(round(height/.2625)):
   z=bottom+(row+.5)*.2625;start=-length/2-(.2625 if row%2 else 0)
   for j in range(math.ceil(length/.525)+2):
    a=max(-length/2,start+j*.525);b=min(length/2,start+(j+1)*.525)
    if b-a<.02:continue
    mid=(a+b)/2
    if skip and skip(mid,z):continue
    p=(cx+mid,cy,z) if axis=='X' else (cx,cy+mid,z);dims=(b-a-.009,.027,.2535) if axis=='X' else (.027,b-a-.009,.2535);box('Individual rusticated face stone',p,dims,bevel=.006)
 def battlements(cx,cy,length,axis='X',z=WALL_TOP):
  count=round(length/GRID)
  for j in range(count):
   if j%2:continue
   along=-length/2+(j+.5)*GRID;p=(cx+along,cy,z+.2625) if axis=='X' else (cx,cy+along,z+.2625);dims=(GRID,.25,.525) if axis=='X' else (.25,GRID,.525);box('Merlon with worn coping',p,dims,bevel=.013)
 def straight(cx,cy,length=4.2,axis='X',caps=True):
  dims=(length-.03,THICKNESS-.03,WALL_TOP) if axis=='X' else (THICKNESS-.03,length-.03,WALL_TOP);box('Solid wall core',(cx,cy,WALL_TOP/2),dims,mortar,.005)
  for side in [-1,1]:
   x,y=(cx,cy+side*(THICKNESS/2-.0135)) if axis=='X' else (cx+side*(THICKNESS/2-.0135),cy);brick_face(x,y,length,WALL_TOP,axis);battlements(x,y,length,axis)
  if caps:
   for side in [-1,1]:
    if axis=='X':brick_face(cx+side*(length/2-.0135),cy,THICKNESS,WALL_TOP,'Y')
    else:brick_face(cx,cy+side*(length/2-.0135),THICKNESS,WALL_TOP,'X')
  box('Wall walk coping',(cx,cy,WALL_TOP-.02),(length,THICKNESS,.06) if axis=='X' else (THICKNESS,length,.06),stone[3],.008)
 if asset=='city_wall':straight(0,0)
 elif asset=='city_corner':
  # A compact elbow; the two exposed connection ports share the straight profile.
  straight(1.05,.525,2.1,'X',caps=False);straight(.525,1.05,2.1,'Y',caps=False)
  brick_face(2.1-.0135,.525,1.05,WALL_TOP,'Y');brick_face(.525,2.1-.0135,1.05,WALL_TOP,'X')
  # Remove overlapping internal face stones and merlons, then fill the joined walk.
  for o in list(c.objects):
   if o.type=='MESH' and ('face stone' in o.name or 'Merlon' in o.name):
    p=o.location
    if (o.dimensions.y<o.dimensions.x and abs(p.y-1.05)<.02 and 0<p.x<1.05) or (o.dimensions.x<o.dimensions.y and abs(p.x-1.05)<.02 and 0<p.y<1.05):bpy.data.objects.remove(o,do_unlink=True)
  for prefix in ['Solid wall core','Wall walk coping']:
   objects=[o for o in c.objects if o.name.startswith(prefix)]
   if len(objects)==2:
    obj,other=objects;bpy.context.view_layer.objects.active=obj;mod=obj.modifiers.new('Joined corner masonry','BOOLEAN');mod.operation='UNION';mod.object=other;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(other,do_unlink=True)
 elif asset in ['gate','port_gate']:
  width=4.2;inner=1.05;zc=1.575
  body=box('Gatehouse solid masonry',(0,0,WALL_TOP/2),(width-.03,THICKNESS-.03,WALL_TOP),mortar,.005)
  # Exact arched opening, open in the canonical sprite so it remains a passage.
  cutter=box('Lower portal void',(0,0,.70),(2.10,1.8,1.80),dark,.001)
  bpy.context.view_layer.objects.active=body;mod=body.modifiers.new('Straight portal sides','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
  bpy.ops.mesh.primitive_cylinder_add(vertices=96,radius=inner,depth=1.8,location=(0,0,zc),rotation=(math.pi/2,0,0));cut=bpy.context.object;bpy.context.view_layer.objects.active=body;mod=body.modifiers.new('Portal arch','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cut;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cut,do_unlink=True)
  for side in [-1,1]:
   brick_face(0,side*(THICKNESS/2-.0135),width,WALL_TOP,skip=lambda x,z:abs(x)<1.10 and z<2.89)
   battlements(0,side*THICKNESS/2,width)
   # Wedge-shaped arch stones run through the opening depth.
  for j in range(15):
   a=j*math.pi/15+.003;b=(j+1)*math.pi/15-.003;V=[]
   for y in [-.55,.55]:
    for rr,t in [(inner,a),(inner,b),(inner+.2625,b),(inner+.2625,a)]:V.append((rr*math.cos(t),y,zc+rr*math.sin(t)))
   faces=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)];m=bpy.data.meshes.new('Cut arch voussoir');m.from_pydata(V,[],faces);o=bpy.data.objects.new('Gate arch voussoir',m);c.objects.link(o);o.parent=root;m.materials.append(r.choice(stone));be=o.modifiers.new('Chipped arch edges','BEVEL');be.width=.006;be.segments=2
  for side in [-1,1]:brick_face(side*(width/2-.0135),0,THICKNESS,WALL_TOP,'Y')
  box('Gatehouse wall-walk coping',(0,0,WALL_TOP-.02),(width,THICKNESS,.06),stone[3],.008)
  if asset=='gate':
   for side in [-1,1]:
    # Open oak leaves sit against the inner reveal; no closed gate baked over passage.
    for j in range(5):
     dist=(j+.5)*.21;h=zc+math.sqrt(max(0,inner*inner-(inner-dist)**2))-.04;box('Open arched gate leaf plank',(side*1.025,.56+dist,h/2),(.06,.204,h),wood,.004)
    for z in [.35,1.45]:box('Open leaf iron binding',(side*.986,1.085,z),(.02,1.05,.07),iron,.003)
  else:
   for side in [-1,1]:
    R('Port mooring ring pin',(side*1.54,-.55,.72),(side*1.54,-.65,.72),.018,iron)
 elif asset=='wall_tower':
  w=3.15;top=4.20;box('Square stone tower core',(0,0,top/2),(w-.03,w-.03,top),mortar,.012)
  for side in [-1,1]:
   brick_face(0,side*(w/2-.0135),w,top);brick_face(side*(w/2-.0135),0,w,top,'Y');battlements(0,side*w/2,w,z=top);battlements(side*w/2,0,w,'Y',z=top)
  box('Tower upper walking platform',(0,0,top-.015),(w,w,.07),stone[3],.009)
  for side in [-1,1]:
   for x in [-.67,.67]:box('Deep front arrow slit',(x,side*(w/2+.019),2.90),(.075,.008,.62),dark,.005)
   for y in [-.67,.67]:box('Deep side arrow slit',(side*(w/2+.019),y,2.90),(.008,.075,.62),dark,.005)
  for j in range(7):box('Tower oak entry plank',(-.45+j*.15,-w/2-.027,1.0),(.144,.04,1.98),wood,.004)
  for z in [.35,1.45]:box('Tower door forged strap',(0,-w/2-.052,z),(1.03,.025,.06),iron,.003)
 ns['s']['environment_design']=json.dumps(dict(grid=GRID,wall_span=4.2,wall_thickness=THICKNESS,wall_walk_height=WALL_TOP,merlon_top=3.675,gate_clear_width=2.1,gate_clear_height=2.625))
 fit_finish(ns,asset,sources=[str(Path(__file__))])
