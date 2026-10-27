"""Arctarian anatomy and engineering implants from the local character description."""
import bpy,math
from mathutils import Vector,Matrix

def anatomy(ns,skin,iron,leather,design):
    c=ns['c'];root=ns['root'];ell=ns['ell'];rod=ns['rod'];rings=ns['rings'];box=ns['box'];material=ns['material']
    remove=('Anatomical head','Nose','Ear','Eye','Iris','Upper eyelid','Brow','Nostril','Mouth line','Lower lip','HAIR','COSTUME tunic','COSTUME rolled cuff','Leather bracer')
    for o in list(c.objects):
        if o.name.startswith(remove):bpy.data.objects.remove(o,do_unlink=True)
    nodes=skin.node_tree.nodes;links=skin.node_tree.links;bsdf=nodes.get('Principled BSDF')
    vor=nodes.new('ShaderNodeTexVoronoi');vor.feature='DISTANCE_TO_EDGE';vor.inputs['Scale'].default_value=48
    ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.012;ramp.color_ramp.elements[0].color=tuple(v*.23 for v in design.get('skin',(.21,.24,.14)))+(1,);ramp.color_ramp.elements[1].position=.055;ramp.color_ramp.elements[1].color=(*design.get('skin',(.21,.24,.14)),1)
    links.new(vor.outputs['Distance'],ramp.inputs[0]);links.new(ramp.outputs[0],bsdf.inputs['Base Color'])
    bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.30;bump.inputs['Distance'].default_value=.018
    old=next(iter(bsdf.inputs['Normal'].links),None)
    if old:links.new(old.from_socket,bump.inputs['Normal'])
    links.new(vor.outputs['Distance'],bump.inputs['Height']);links.new(bump.outputs[0],bsdf.inputs['Normal']);bsdf.inputs['Roughness'].default_value=.81
    for o in c.objects:
        if o.type!='MESH':continue
        if o.name.startswith('Continuous wool sleeve'):
            o.data.materials.clear();o.data.materials.append(skin)
            for f in o.data.polygons:f.material_index=0
            side=-1 if sum(v.co.x for v in o.data.vertices)<0 else 1;a=Vector((side*.335,0,1.745));b=Vector((side*.455,-.10,1.115));axis=(b-a).normalized()
            for v in o.data.vertices:
                u=max(0,min(1,(v.co-a).dot(axis)/(b-a).length));center=a+axis*(v.co-a).dot(axis);v.co=center+(v.co-center)*(1.35+.25*math.exp(-((u-.76)/.24)**2))
        if o.name.startswith(('Wrist','Hand','Knuckle','Curled finger','Thumb')):
            side=-1 if o.location.x<0 else 1;o.location.x=side*.455+(o.location.x-side*.455)*1.60;o.scale.x*=1.60;o.scale.y*=1.25;o.scale.z*=1.15
        if o.name.startswith('Neck'):o.scale.x*=1.45;o.scale.y*=1.45
    body=rings('ARCT body core',[(1.15 if design.get('arct_rescue') else 1.20,.255,.17),(1.31,.235,.17),(1.48,.26,.18),(1.65,.30,.18),(1.75,.31,.15),(1.82,.16,.10)],skin)
    for side in [-1,1]:
        ell('ARCT body pectoral',(side*.14,-.12,1.65),(.16,.105,.135),skin)
        ell('ARCT body shoulder',(side*.30,0,1.75),(.14,.15,.15),skin)
        ell('ARCT body back muscle',(side*.14,.10,1.72),(.17,.10,.16),skin)
        ell('ARCT body oblique',(side*.21,-.015,1.45),(.075,.16,.20),skin)
        for z in [1.31,1.42,1.52]:ell('ARCT body abdominal fold',(side*.07,-.15,z),(.077,.055,.064),skin)
    pieces=[o for o in c.objects if o.name.startswith(('ARCT body','Neck')) and o.type=='MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in pieces:o.select_set(True)
    bpy.context.view_layer.objects.active=body;bpy.ops.object.join();body=bpy.context.object;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    mod=body.modifiers.new('Continuous muscular skin','REMESH');mod.mode='VOXEL';mod.voxel_size=.014;bpy.ops.object.modifier_apply(modifier=mod.name)
    mod=body.modifiers.new('Loose skin surface','SMOOTH');mod.factor=.8;mod.iterations=3;bpy.ops.object.modifier_apply(modifier=mod.name)
    for f in body.data.polygons:f.use_smooth=True
    head=rings('Anatomical head arctarian',[(1.91,.10,.08),(1.95,.14,.10),(2.00,.17,.12),(2.07,.185,.125),(2.16,.18,.125),(2.22,.16,.115),(2.28,.105,.095),(2.30,.008,.012)],skin)
    mod=head.modifiers.new('Head planes','SUBSURF');mod.levels=1;bpy.context.view_layer.objects.active=head;bpy.ops.object.modifier_apply(modifier=mod.name)
    cutter=ell('ARCT mouth cutter',(0,-.11,1.997),(.115,.075,.047),skin)
    mod=head.modifiers.new('Open toothed mouth','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter;bpy.context.view_layer.objects.active=head;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
    gums=material('Arctarian mouth interior',(.025,.022,.015),rough=.93);tooth=material('Arctarian dentine',(.50,.46,.30),rough=.63)
    ell('FACE mouth interior',(0,-.085,1.997),(.11,.035,.043),gums)
    for i in range(9):
        x=(i-4)*.022
        rod('FACE upper tooth',(x,-.135,2.019),(x,-.142,1.995),.008,tooth,r2=.0015)
        rod('FACE lower tooth',(x+.004,-.135,1.978),(x+.004,-.142,1.995),.007,tooth,r2=.0015)
    plate=material('Arctarian sensory keratin',(.25,.28,.15),rough=.75,texture=80)
    for x,z in [(-.085,2.195),(0,2.230),(.085,2.195)]:
        o=ell('FACE forehead sensory plate',(x,-.102,z),(.044,.023,.056),plate);o.rotation_euler.y=-x*2
        for k in range(4):rod('FACE sensory lattice',(x-.035,-.126,z-.029+k*.017),(x+.035,-.126,z-.029+k*.017),.0028,iron)
    if design.get('arct_rescue') or design.get('breath_mask'):
        seal=material('Arctarian respirator seal',(.035,.042,.037),rough=.72)
        glass=material('Arctarian clear respirator window',(.35,.39,.34),rough=.12);p=glass.node_tree.nodes.get('Principled BSDF');p.inputs['Alpha'].default_value=.12;p.inputs['Transmission Weight'].default_value=.75
        ell('FACE clear breathing cup',(0,-.14,1.997),(.126,.047,.057),glass)
        for side in [-1,1]:
            rod('FACE breathing cartridge',(side*.139,-.08,1.986),(side*.139,-.16,1.986),.025,iron)
            rod('FACE respirator strap',(side*.14,-.10,1.997),(side*.14,.08,2.01),.009,seal)
    scanner=material('Arctarian scanner casing',(.075,.085,.073),rough=.60,metal=.45)
    display=material('Arctarian bioscanner screen',(.095,.17,.085),rough=.32);p=display.node_tree.nodes.get('Principled BSDF');p.inputs['Emission Color'].default_value=(.06,.12,.045,1);p.inputs['Emission Strength'].default_value=.3
    box('ARCT chest bioscanner',(0,-.228,1.66),(.145,.045,.14),scanner,bevel=.015)
    box('ARCT chest display',(0,-.253,1.66),(.11,.006,.10),display,bevel=.006)
    signal=material('Arctarian instrument trace',(.40,.47,.25),rough=.55)
    for i in range(7):
        z=1.635+.019*math.sin(i*2.4);rod('ARCT chest vital trace',(-.045+i*.012,-.258,z),(-.033+i*.012,-.258,1.635+.019*math.sin((i+1)*2.4)),.0022,signal)
    scar=material('Arctarian healed surgical scar',(.28,.29,.18),rough=.9)
    for side in [-1,1]:
        rod('ARCT chest implant scar',(side*.085,-.232,1.58),(side*.095,-.221,1.74),.004,scar)
        for z in [1.59,1.63,1.70,1.73]:rod('ARCT chest surgical staple',(side*.078,-.239,z),(side*.097,-.239,z),.0025,iron)
    box('ARCT arm implant socket',(-.434,-.190,1.29),(.14,.075,.19),scanner,bevel=.014)
    box('ARCT arm implant control',(-.434,-.232,1.29),(.095,.012,.11),iron,bevel=.008)
    for z in [1.23,1.27,1.31,1.35]:rod('ARCT arm implant conduit',(-.49,-.240,z),(-.38,-.240,z),.005,leather)
    for z in [1.24,1.33]:
        for x in [-.483,-.385]:ell('ARCT arm implant fastener',(x,-.245,z),(.008,.004,.008),iron)
    if design.get('arct_rescue'):
        harness=material('Rescue protective harness',(.36,.40,.32),rough=.80,texture=150)
        bpy.context.view_layer.update()
        for side in [-1,1]:
            strips=[]
            for back in [False,True]:
                rows=[]
                for j in range(16):
                    z=1.28+.50*j/15;row=[]
                    for edge in [-1,1]:
                        x=side*.21+edge*.019;hit,point,normal,_=body.ray_cast(Vector((x,1 if back else -1,z)),Vector((0,-1 if back else 1,0)))
                        if not hit:raise AssertionError(('rescue harness surface',x,z))
                        row.append(tuple(point+normal*.006))
                    rows.append(row)
                strips.append(rows)
            top=[];front_y=sum(v[1] for v in strips[0][-1])/2;back_y=sum(v[1] for v in strips[1][-1])/2
            for j in range(9):
                row=[]
                for e,edge in enumerate([-1,1]):
                    ya=strips[0][-1][e][1]+.015;yb=strips[1][-1][e][1]-.015;y=ya+(yb-ya)*j/8
                    x=side*.21+edge*.019;hit,point,normal,_=body.ray_cast(Vector((x,y,2.3)),Vector((0,0,-1)))
                    if not hit:raise AssertionError(('rescue shoulder strap',x,y))
                    row.append(tuple(point+normal*.006))
                top.append(row)
            rows=strips[0]+top+list(reversed(strips[1]));verts=[p for row in rows for p in row];faces=[(j*2,j*2+1,j*2+3,j*2+2) for j in range(len(rows)-1)]
            mesh=bpy.data.meshes.new('Conforming rescue harness');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('COSTUME rescue harness',mesh);c.objects.link(o);o.parent=root;mesh.materials.append(harness);o.modifiers.new('Harness thickness','SOLIDIFY').thickness=.003
    return dict(body=body,head=head)
