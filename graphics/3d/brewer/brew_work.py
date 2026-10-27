"""Two handed circular mash stirring with a long wooden paddle."""
import bpy,math
from mathutils import Vector,Matrix

def create(ns,root,ch):
    from humanoid import empty
    wood=ns['material']('Brewer wet oak paddle',(.15,.095,.035),rough=.87,texture=100)
    c=ns['c'];rod=ns['rod'];ell=ns['ell'];box=ns['box']
    paddle=empty(c,'PROP brewing paddle',(0,-.40,1.47),root)
    o=rod('TOOL brewing paddle shaft',(0,0,-.68),(0,0,.39),.023,wood,r2=.021);o.parent=paddle
    o=ell('TOOL brewing paddle blade',(0,0,-.77),(.105,.025,.22),wood);o.parent=paddle
    o=ell('TOOL paddle handle crown',(0,0,.39),(.027,.026,.035),wood);o.parent=paddle
    for z in [-.015,.055,.125,.195]:
        o=rod('TOOL paddle worn grip',(0,0,z),(0,0,z+.008),.024,wood);o.parent=paddle
    return dict(brewing_paddle=paddle)

def pose(tools,ch,body,root,name,t,frame):
    from humanoid import reach,ik
    paddle=tools['brewing_paddle'];p=t*math.tau
    if name=='work':
        body.rotation_euler=(.15+.025*math.sin(p),.025*math.cos(p),0)
        body.location=(.018*math.cos(p),0,-.04)
        for side,chain in ch.items():ik(chain,-.035 if side==-1 else .025,.174,1.115,side)
        paddle.location=(.055*math.cos(p),-.43+.045*math.sin(p),1.47)
        paddle.rotation_euler=(-.30+.14*math.sin(p),-.14*math.cos(p),0)
        transform=Matrix.Translation(paddle.location)@paddle.rotation_euler.to_matrix().to_4x4();q=paddle.rotation_euler.to_quaternion()
        for side,z in [(-1,-.19),(1,.12)]:
            target=transform@Vector((0,0,z))-q@Vector((0,-.012,-.09))
            reach(ch[side],side,target,q)
    for o in paddle.children:
        hidden=name!='work';o.hide_render=hidden;o.hide_viewport=hidden
        o.keyframe_insert('hide_render',frame=frame);o.keyframe_insert('hide_viewport',frame=frame)
