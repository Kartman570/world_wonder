"""Kneeling offer of a closed-breathing garment and explanatory pointing."""
import bpy,math
from mathutils import Vector,Matrix
FOOT_POINTS={}

def create(ns,root,ch):
    from humanoid import empty
    c=ns['c'];box=ns['box'];ell=ns['ell'];rod=ns['rod'];material=ns['material']
    fabric=material('Closed breathing garment cloth',(.30,.35,.30),rough=.79,texture=170)
    seams=material('Closed garment sealed seams',(.08,.115,.10),rough=.76)
    clear=material('Closed garment visor',(.21,.27,.23),rough=.18);p=clear.node_tree.nodes.get('Principled BSDF');p.inputs['Alpha'].default_value=.30;p.inputs['Transmission Weight'].default_value=.3
    shell=empty(c,'PROP offered breathing garment',(0,-.35,1.37),root)
    verts=[];faces=[];nx=15;ny=9
    for j in range(ny):
        y=-.12+.24*j/(ny-1)
        for i in range(nx):
            x=-.22+.44*i/(nx-1);z=.016*math.sin((x+.22)*38)+.006*math.cos(y*45);verts.append((x,y,z))
    for j in range(ny-1):
        for i in range(nx-1):a=j*nx+i;faces.append((a,a+1,a+1+nx,a+nx))
    mesh=bpy.data.meshes.new('Folded protective garment');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('TOOL folded protective garment',mesh);c.objects.link(o);o.parent=shell;mesh.materials.append(fabric);o.modifiers.new('Folded fabric thickness','SOLIDIFY').thickness=.055
    for x in [-.17,.17]:
        o=box('TOOL folded garment sleeve',(x,.03,.045),(.095,.19,.035),fabric,bevel=.014);o.parent=shell
        o=rod('TOOL sleeve sealing edge',(x-.045,-.064,.060),(x+.045,-.064,.060),.004,seams);o.parent=shell
    o=ell('TOOL folded garment hood',(0,-.025,.085),(.085,.07,.075),fabric);o.parent=shell
    o=ell('TOOL garment face window',(0,-.084,.09),(.060,.012,.046),clear);o.parent=shell
    for x in [-.045,.045]:
        o=rod('TOOL hood sealed seam',(x,-.081,.055),(x,-.081,.123),.003,seams);o.parent=shell
    FOOT_POINTS.clear()
    for side,chain in ch.items():
        points=[]
        for o in chain[2].children:
            if o.type=='MESH' and o.name.startswith(('Boot upper','Boot sole')):
                points += [o.matrix_local@v.co for v in o.data.vertices]
        FOOT_POINTS[side]=points
    return {'offered_shell':shell}

def floor_height(side,pitch):
    matrix=Matrix.Rotation(pitch,3,'X');return .001-min((matrix@v).z for v in FOOT_POINTS[side])

def pose(tools,ch,body,root,name,t,rest_fingers,index_fingers):
    from humanoid import ik,reach,smooth,phase_curve,torso_pivot
    shell=tools['offered_shell'];shell.location=(0,-.35,1.37);shell.rotation_euler=(0,0,0);kneel=0;drop=0
    if name=='work':
        kneel=phase_curve(t,[(0,0),(.18,1),(.82,1),(1,0)]);drop=.605*kneel;offer=phase_curve(t,[(0,0),(.20,1),(.78,1),(1,0)])
        body.location=(0,0,-.02-drop);body.rotation_euler=(.06*kneel,0,0)
        for side,chain in ch.items():
            pitch=.90*kneel if side==1 else 0;y=(.55 if side==1 else -.36)*kneel;z=floor_height(side,pitch);ik(chain,y,z,1.135-drop,side);chain[2].rotation_euler.x+=pitch
        shell.location=(0,-.35-.15*offer,1.37+.10*offer-drop)
        tilt=phase_curve(t,[(0,0),(.30,0),(.40,.35),(.72,.35),(.82,0),(1,0)]);shell.rotation_euler.y=tilt
    elif name in ['walk','run']:shell.location.z=1.44 if name=='run' else 1.39
    elif name=='attack':shell.location=(-.18,-.30,1.25);shell.rotation_euler.y=.35
    elif name=='death':
        fall=smooth(t/.85);shell.location=Vector((0,-.35,1.37)).lerp(Vector((.55,.08,.70)),fall);shell.rotation_euler.y=.3*fall
    if name!='death':
        transform=Matrix.Translation(shell.location)@shell.rotation_euler.to_matrix().to_4x4();q=shell.rotation_euler.to_quaternion()
        reach(ch[-1],-1,transform@Vector((-.18,.02,.12)),q)
        right_corner=transform@Vector((.18,.02,.12))
        if name!='attack':reach(ch[1],1,right_corner,q)
        if name=='work':
            original=body.location.copy();body.location+=torso_pivot(body);bpy.context.view_layer.update();inv=root.matrix_world.inverted();screen=bpy.data.objects['ARCT chest display'];chest=inv@screen.matrix_world@Vector((0,-.012,0));body.location=original
            qchest=body.rotation_euler.to_quaternion()@Matrix.Rotation(math.pi/2,4,'X').to_quaternion();qlower=Matrix.Rotation(-.65,4,'X').to_quaternion();index_tip=Vector((-.0432,-.012,-.1595));chest_wrist=chest-qchest@index_tip;lower_wrist=Vector((.33,-.42,1.25-drop))
            positions={'corner':(right_corner,q),'chest':(chest_wrist,qchest),'lower':(lower_wrist,qlower)}
            segments=[(0,.30,'corner','corner'),(.30,.40,'corner','chest'),(.40,.52,'chest','chest'),(.52,.62,'chest','lower'),(.62,.72,'lower','lower'),(.72,.82,'lower','corner'),(.82,1,'corner','corner')]
            for a,b,left,right in segments:
                if t<=b:
                    u=smooth((t-a)/(b-a));pa,qa=positions[left];pb,qb=positions[right];reach(ch[1],1,pa.lerp(pb,u),qa.slerp(qb,u));break
            point=phase_curve(t,[(0,0),(.30,0),(.40,1),(.72,1),(.82,0),(1,0)])
            for o in index_fingers:
                loc,scale=rest_fingers[o];target=loc.copy();target.y=-.012;target.z=-.125 if o.name.startswith('Curled') else -.09;o.location=loc.lerp(target,point);o.scale=scale;o.scale.z=scale.z*(1+.5*point)
