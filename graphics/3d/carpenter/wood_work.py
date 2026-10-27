"""Saw a supported plank, dock the saw, take a hammer, drive a nail and return."""
import bpy,math
from mathutils import Vector,Matrix
SAW_GRIP=Vector((0,.20,0))
HAMMER_GRIP=Vector((0,0,0))
PALM=Vector((0,-.012,-.09))

def create(ns,root,body,ch):
    from humanoid import empty,keep
    c=ns['c'];material=ns['material'];rod=ns['rod'];box=ns['box'];ell=ns['ell']
    wood=material('Carpenter seasoned ash',(.20,.12,.050),rough=.90,texture=100)
    pine=material('Carpenter fresh plank',(.33,.24,.12),rough=.94,texture=160)
    steel=material('Carpenter tool steel',(.17,.19,.18),rough=.48,metal=.8)
    cord=material('Carpenter saw tension cord',(.28,.24,.16),rough=.97)
    board=empty(c,'PROP carpentry plank',(-.04,-.46,1.14),root)
    o=box('TOOL supported pine plank',(0,0,0),(.48,.13,.025),pine,bevel=.003);o.parent=board
    # A shallow kerf marks the cut without a detached, floating offcut.
    o=box('TOOL saw kerf',(.17,0,.013),(.003,.13,.0015),wood,bevel=.0003);o.parent=board
    nail=rod('TOOL carpentry nail',(.17,0,.012),(.17,0,.040),.0025,steel);nail.parent=board
    o=ell('TOOL carpentry nail head',(.17,0,.040),(.006,.006,.002),steel);o.parent=board
    saw=empty(c,'PROP carpenter frame saw',(.13,-.46,1.32),root)
    for y in [-.28,.20]:
        o=rod('TOOL frame saw upright',(0,y,-.18),(0,y,.20),.016,wood);o.parent=saw
    o=rod('TOOL frame saw crossbar',(0,-.28,.045),(0,.20,.045),.014,wood);o.parent=saw
    for x in [-.004,.004]:
        o=rod('TOOL saw tension cord',(x,-.28,.20),(x,.20,.20),.0025,cord);o.parent=saw
    o=rod('TOOL saw tension toggle',(0,-.04,.17),(0,-.04,.29),.006,wood);o.parent=saw
    verts=[];faces=[];n=41
    for x in [-.0015,.0015]:
        for i in range(n):
            y=-.28+.48*i/(n-1);verts.extend([(x,y,-.153),(x,y,-.182-(.008 if i%2 else 0))])
    for i in range(n-1):
        a=i*2;b=a+2;faces.extend([(a,b,b+1,a+1),(a+2*n+1,b+2*n+1,b+2*n,a+2*n),(a+1,b+1,b+2*n+1,a+2*n+1)])
    mesh=bpy.data.meshes.new('Toothed frame saw blade');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('TOOL toothed frame saw blade',mesh);c.objects.link(o);o.parent=saw;mesh.materials.append(steel)
    hammer=empty(c,'PROP carpenter hammer',(.37,-.02,1.20),root)
    o=rod('TOOL carpenter hammer haft',(0,.085,0),(0,-.23,0),.016,wood);o.parent=hammer
    o=box('TOOL carpenter hammer head',(0,-.22,0),(.07,.07,.13),steel,bevel=.006);o.parent=hammer
    o=box('TOOL carpenter striking face',(0,-.22,-.07),(.075,.075,.015),steel,bevel=.004);o.parent=hammer
    # A stiff leather carrier joins the outboard tool loops to the waist belt.
    o=box('COSTUME carpenter leather carrier',(.34,0,1.23),(.20,.14,.14),ns['leather'],bevel=.018);keep(o,body)
    paths=[[(.42,-.045,1.28),(.45,-.025,1.25),(.45,.035,1.25),(.42,.045,1.28)],[(.34,-.065,1.28),(.37,-.17,1.26),(.39,-.15,1.25),(.38,-.065,1.28)]]
    for points in paths:
        for a,b in zip(points,points[1:]):
            o=rod('COSTUME carpenter tool loop',a,b,.009,ns['leather']);keep(o,body)
    return dict(carpentry_plank=board,carpentry_saw=saw,carpentry_hammer=hammer)

def blend(a,b,u):
    from humanoid import smooth
    u=smooth(u);qa=a.to_quaternion();qb=b.to_quaternion()
    return Matrix.Translation(a.translation.lerp(b.translation,u))@qa.slerp(qb,u).to_matrix().to_4x4()

def dock_matrices(body,root):
    from humanoid import torso_pivot
    old=body.location.copy();body.location+=torso_pivot(body);bpy.context.view_layer.update()
    m=root.matrix_world.inverted()@body.matrix_world;body.location=old
    saw=m@Matrix.Translation((.45,.005,1.20))
    hammer=m@Matrix.Translation((.37,-.15,1.36))@Matrix.Rotation(math.pi/2,4,'X')
    return saw,hammer

def pose(tools,ch,body,root,name,t,frame):
    from humanoid import reach,phase_curve
    board=tools['carpentry_plank'];saw=tools['carpentry_saw'];hammer=tools['carpentry_hammer']
    if name=='work':
        body.rotation_euler=(.17,0,0);body.location.z=-.055
        board.location=(-.04,-.46,1.14);board.rotation_euler=(0,0,0)
        lq=Matrix.Rotation(-math.pi/2,4,'X').to_quaternion()
        reach(ch[-1],-1,Vector(board.location)+Vector((-.17,0,-.025))-lq@PALM,lq)
        ds,dh=dock_matrices(body,root)
        sawing=Matrix.Translation((.13,-.46+.115*math.sin(t/.34*math.tau*2),1.32))
        # Begin and finish at the same saw position so the cycle closes exactly.
        neutral=Matrix.Translation((.13,-.46,1.32))
        if t<=.34:sm=sawing
        elif t<.43:sm=blend(neutral,ds,(t-.34)/.09)
        elif t<.94:sm=ds
        else:sm=blend(ds,neutral,(t-.94)/.06)
        hm=dh
        contact=Matrix.Translation((.13,-.24,1.255))
        raised=Matrix.Translation((.18,-.32,1.48))@Matrix.Rotation(-1.3,4,'X')
        if .50<=t<.58:hm=blend(dh,raised,(t-.50)/.08)
        elif .58<=t<.64:hm=blend(raised,contact,(t-.58)/.06)
        elif .64<=t<.69:hm=blend(contact,raised,(t-.64)/.05)
        elif .69<=t<.75:hm=blend(raised,contact,(t-.69)/.06)
        elif .75<=t<.80:hm=blend(contact,raised,(t-.75)/.05)
        elif .80<=t<.88:hm=blend(raised,dh,(t-.80)/.08)
        for obj,m in [(saw,sm),(hammer,hm)]:obj.location=m.translation;obj.rotation_euler=m.to_euler()
        sw=sm@SAW_GRIP-sm.to_quaternion()@PALM;hw=hm@HAMMER_GRIP-hm.to_quaternion()@PALM
        if t<=.43 or t>=.94:target,q=sw,sm.to_quaternion()
        elif t<.50:
            u=(t-.43)/.07;target=sw.lerp(hw,u);target.z+=.10*math.sin(u*math.pi);q=sm.to_quaternion().slerp(hm.to_quaternion(),u)
        elif t<=.88:target,q=hw,hm.to_quaternion()
        else:
            u=(t-.88)/.06;target=hw.lerp(sw,u);target.z+=.10*math.sin(u*math.pi);q=hm.to_quaternion().slerp(sm.to_quaternion(),u)
        reach(ch[1],1,target,q)
    for pivot in [board,saw,hammer]:
        for o in pivot.children:
            hidden=name!='work';o.hide_render=hidden;o.hide_viewport=hidden
            o.keyframe_insert('hide_render',frame=frame);o.keyframe_insert('hide_viewport',frame=frame)
