"""Self-contained living vessel, tuning ring and two reversible tool exchanges."""
import bpy,math
from mathutils import Vector,Matrix

def create(ns,root,body,ch):
    from humanoid import empty,keep
    c=ns['c'];ell=ns['ell'];rod=ns['rod'];box=ns['box'];rings=ns['rings'];material=ns['material'];tools={}
    metal=material('Workshop tool alloy',(.16,.18,.14),rough=.55,metal=.65)
    ceramic=material('Workshop tool ceramic',(.28,.27,.18),rough=.75)
    plant=material('Living vessel outer tissue',(.15,.095,.13),rough=.86,texture=75)
    inner=material('Living vessel lip',(.24,.17,.19),rough=.80,texture=95)
    leather=material('Workshop tool pouch',(.065,.070,.055),rough=.88,texture=120)
    bowl=empty(c,'PROP living bowl',(0,-.012,-.09),ch[-1][5]);tools['living_bowl']=bowl
    o=rod('TOOL vessel supporting stem',(0,0,-.04),(0,0,.06),.025,plant,r2=.035);o.parent=bowl
    o=rings('TOOL living hollow cup',[(.05,.025,.025),(.08,.10,.10),(.15,.17,.17),(.21,.18,.18),(.215,.15,.15),(.15,.13,.13),(.10,.055,.055)],plant);o.parent=bowl
    for i in range(8):
        a=i*math.tau/8;o=ell('TOOL living cup rim fold',(.165*math.cos(a),.165*math.sin(a),.195),(.032,.032,.035),inner);o.parent=bowl
    ring=empty(c,'PROP vessel tuning ring',(0,0,.22),bowl);tools['tuning_ring']=ring
    bpy.ops.mesh.primitive_torus_add(major_radius=.11,minor_radius=.009,major_segments=32,minor_segments=8,location=(0,0,0));o=bpy.context.object;o.name='TOOL vessel tuning collar'
    for col in list(o.users_collection):col.objects.unlink(o)
    c.objects.link(o);o.parent=ring;o.data.materials.append(metal)
    notch=empty(c,'PROP tuning notch',(.11*math.cos(-.7),.11*math.sin(-.7),0),ring);tools['tuning_notch']=notch
    o=ell('TOOL tuning key',(0,0,0),(.016,.016,.012),ceramic);o.parent=notch
    dock=empty(c,'PROP forearm tool dock',(-.434,-.25,1.29),root);keep(dock,ch[-1][4]);tools['tool_dock']=dock
    o=rod('TOOL universal socket',(0,.012,0),(0,-.012,0),.046,metal);o.parent=dock
    holster=empty(c,'PROP workshop holster',(.30,-.17,1.20),body);tools['tool_holster']=holster
    walls=[('TOOL pouch bottom',(0,0,-.14),(.19,.13,.012)),('TOOL pouch reinforced edge',(0,-.066,.078),(.20,.012,.025))]
    for side in [-1,1]:
        walls += [('TOOL pouch side',(side*.091,0,-.025),(.008,.13,.23)),('TOOL pouch face',(0,side*.061,-.025),(.19,.008,.23))]
    for name,loc,sz in walls:
        o=box(name,loc,sz,leather,bevel=.003);o.parent=holster
    def tip(key,parent,loc,new=False):
        pivot=empty(c,'PROP '+key,loc,parent);tools[key]=pivot
        o=rod('TOOL interchangeable base',(0,.008,0),(0,-.035,0),.030,metal);o.parent=pivot
        if new:
            for z in [-.020,0,.020]:
                o=rod('TOOL three prong attachment',(0,-.025,z),(0,-.11,z),.006,ceramic,r2=.0025);o.parent=pivot
        else:
            o=rod('TOOL fine attachment',(0,-.025,0),(0,-.12,0),.012,ceramic,r2=.002);o.parent=pivot
    tip('old_attached',dock,(0,0,0));tip('new_attached',dock,(0,0,0),True)
    tip('old_carried',ch[1][5],(0,-.012,-.09));tip('new_carried',ch[1][5],(0,-.012,-.09),True)
    return tools

def pose(tools,ch,body,root,name,t):
    from humanoid import reach,torso_pivot,phase_curve,smooth
    work=name=='work';tools['tuning_ring'].rotation_euler.z=0
    flags={'old_attached':True,'new_attached':False,'old_carried':False,'new_carried':False}
    if work:
        body.rotation_euler=(.025,0,-.15);body.location=(0,0,-.02)
        reach(ch[-1],-1,(.10,-.30,1.52),Matrix.Identity(4).to_quaternion())
        twist=phase_curve(t,[(0,0),(.50,0),(.58,.45),(.60,.45),(.62,0),(1,0)]);tools['tuning_ring'].rotation_euler.z=twist
        original=body.location.copy();body.location+=torso_pivot(body);bpy.context.view_layer.update();inv=root.matrix_world.inverted()
        dock=inv@tools['tool_dock'].matrix_world;holster=inv@tools['tool_holster'].matrix_world;notch=inv@tools['tuning_notch'].matrix_world;body.location=original
        qdock=dock.to_quaternion();qhip=holster.to_quaternion()@Matrix.Rotation(math.pi/2,4,'X').to_quaternion();qzero=Matrix.Identity(4).to_quaternion();grip=Vector((0,-.012,-.09))
        poses={'dock':(dock.translation-qdock@grip,qdock),'hip':(holster@Vector((0,0,.07))-qhip@grip,qhip),'tune':(notch.translation-qzero@grip,qzero),'rest':(Vector((.32,-.26,1.43)),qzero)}
        segments=[(0,.12,'rest','dock'),(.12,.16,'dock','dock'),(.16,.24,'dock','hip'),(.24,.34,'hip','hip'),(.34,.44,'hip','dock'),(.44,.46,'dock','dock'),(.46,.50,'dock','tune'),(.50,.60,'tune','tune'),(.60,.62,'tune','dock'),(.62,.70,'dock','hip'),(.70,.80,'hip','hip'),(.80,.90,'hip','dock'),(.90,.92,'dock','dock'),(.92,1,'dock','rest')]
        for a,b,left,right in segments:
            if t<=b:
                u=smooth((t-a)/(b-a));pa,qa=poses[left];pb,qb=poses[right];reach(ch[1],1,pa.lerp(pb,u),qa.slerp(qb,u));break
        flags={'old_attached':t<.16 or t>=.92,'new_attached':.46<=t<.62,'old_carried':.16<=t<.28 or .74<=t<.92,'new_carried':.28<=t<.46 or .62<=t<.74}
    for key,visible in flags.items():
        for o in tools[key].children:
            o.hide_render=not visible;o.hide_viewport=not visible
    for key in ['living_bowl','tuning_ring','tuning_notch']:
        for o in tools[key].children:
            if o.type not in {'MESH','CURVE'}:continue
            o.hide_render=not work;o.hide_viewport=not work
