"""Knead on a supported wooden peel, take its handle and feed it into an oven."""
import bpy,math
from mathutils import Vector,Matrix

def create(ns,root,ch):
    from humanoid import empty
    c=ns['c'];box=ns['box'];rod=ns['rod'];ell=ns['ell'];material=ns['material']
    wood=material('Baker peel ash wood',(.22,.15,.075),rough=.91,texture=125)
    dough=material('Baker unbaked loaf',(.44,.35,.22),rough=.94,texture=180)
    peel=empty(c,'PROP baking peel',(.10,-.38,1.12),root)
    o=box('TOOL baking peel blade',(0,0,0),(.30,.40,.022),wood,bevel=.015);o.parent=peel
    o=rod('TOOL baking peel handle',(0,.16,0),(0,.67,0),.019,wood,r2=.016);o.parent=peel
    loaf=ell('TOOL kneaded loaf',(0,0,.071),(.115,.145,.060),dough);loaf.parent=peel
    for x in [-.14,.14]:
        o=rod('TOOL peel edge wear',(x,-.17,.012),(x,.14,.012),.002,wood);o.parent=peel
    return dict(baking_peel=peel)

def pose(tools,ch,body,root,name,t,frame):
    from humanoid import reach,phase_curve,torso_pivot,ik
    peel=tools['baking_peel'];loaf=bpy.data.objects['TOOL kneaded loaf']
    peel.location=(.10,-.38,1.12);peel.rotation_euler=(0,0,-.5)
    if name=='work':
        push=phase_curve(t,[(0,0),(.52,0),(.70,1),(.78,1),(.92,0),(1,0)])
        body.rotation_euler=(.16+.15*push,0,0);body.location.z=-.035-.035*push
        for side,chain in ch.items():ik(chain,0,.174,1.12-.035*push,side)
        orientation=peel.rotation_euler.to_matrix().to_4x4()
        peel.location+=orientation.to_3x3()@Vector((0,-.18*push,0))
        transform=Matrix.Translation(peel.location)@orientation
        # Left hand supports the blade's edge throughout; it never floats.
        left_q=orientation.to_quaternion();left=transform@Vector((-.14,.025,.018))-left_q@Vector((0,-.012,-.09))
        reach(ch[-1],-1,left,left_q)
        press=0.
        if t<.40:press=(.5-.5*math.cos(t/.20*math.tau))
        loaf.scale=(.115*(1+.12*press),.145*(1+.12*press),.060*(1-.30*press));loaf.location.z=.011+loaf.scale.z
        knead_q=(orientation@Matrix.Rotation(math.pi/2,4,'X')).to_quaternion()
        contact=transform@Vector((.012,0,.011+loaf.scale.z*2))
        knead=contact-knead_q@Vector((0,-.012,-.09))
        grip_q=orientation.to_quaternion();grip=transform@Vector((0,.50,0))-grip_q@Vector((0,-.012,-.09))
        take=phase_curve(t,[(0,0),(.40,0),(.52,1),(.92,1),(1,0)])
        # Lift away before crossing to the handle; return along the same arc.
        right=knead.lerp(grip,take);right.z+=.10*math.sin(math.pi*take)
        reach(ch[1],1,right,knead_q.slerp(grip_q,take))
    for o in peel.children:
        hidden=name!='work';o.hide_render=hidden;o.hide_viewport=hidden
        o.keyframe_insert('hide_render',frame=frame);o.keyframe_insert('hide_viewport',frame=frame)
    loaf.keyframe_insert('scale',frame=frame);loaf.keyframe_insert('location',frame=frame)
