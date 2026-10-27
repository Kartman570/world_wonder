"""Apothecary's supported mortar and pestle with continuous grinding contacts."""
import bpy,math
from mathutils import Vector,Matrix

def create(ns,root,body,ch):
    from humanoid import empty,keep
    c=ns['c'];material=ns['material'];ell=ns['ell'];rod=ns['rod'];rings=ns['rings']
    brass=material('Apothecary bronze mortar',(.28,.19,.075),rough=.52,metal=.65,texture=95)
    wood=material('Apothecary pestle',(.16,.105,.050),rough=.83,texture=100)
    powder=material('Apothecary ground medicine',(.16,.19,.055),rough=.98)
    mortar=empty(c,'PROP medicine mortar',(-.10,-.42,1.28),root)
    o=rings('TOOL bronze medicine mortar',[(0,.065,.065),(.02,.075,.075),(.12,.105,.105),(.145,.108,.108),(.15,.102,.102),(.15,.088,.088),(.13,.085,.085),(.035,.050,.050)],brass);o.parent=mortar
    o=ell('TOOL medicine powder',(0,0,.039),(.044,.044,.009),powder);o.parent=mortar
    pestle=empty(c,'PROP medicine pestle',(0,-.42,1.50),root)
    o=rod('TOOL medicine pestle handle',(0,0,-.125),(0,0,.075),.017,wood,r2=.021);o.parent=pestle
    o=ell('TOOL medicine pestle foot',(0,0,-.15),(.025,.025,.035),wood);o.parent=pestle
    ceramic=material('Apothecary stoneware phials',(.12,.17,.14),rough=.65)
    cork=material('Apothecary corks',(.20,.14,.07),rough=.96)
    for x in [-.24,-.315]:
        o=ell('COSTUME apothecary phial',(x,-.095,1.20),(.031,.028,.063),ceramic);keep(o,body)
        o=rod('COSTUME phial neck',(x,-.095,1.24),(x,-.095,1.29),.015,ceramic);keep(o,body)
        o=rod('COSTUME phial cork',(x,-.095,1.285),(x,-.095,1.304),.016,cork);keep(o,body)
        o=rod('COSTUME phial retaining strap',(x-.03,-.116,1.22),(x+.03,-.116,1.22),.005,wood);keep(o,body)
    return dict(medicine_mortar=mortar,medicine_pestle=pestle)

def pose(tools,ch,body,root,name,t,frame):
    from humanoid import reach
    mortar=tools['medicine_mortar'];pestle=tools['medicine_pestle'];p=math.tau*t*2
    if name=='work':
        body.rotation_euler=(.09,0,.012*math.sin(p));body.location.z=-.02
        mortar.location=(-.10,-.42,1.28);mortar.rotation_euler=(0,0,0)
        left_q=Matrix.Rotation(-math.pi/2,4,'X').to_quaternion()
        target=Vector(mortar.location)+Vector((0,0,-.012))-left_q@Vector((0,-.012,-.09))
        reach(ch[-1],-1,target,left_q)
        pestle.rotation_euler=(.10*math.sin(p),.10*math.cos(p),0)
        q=pestle.rotation_euler.to_quaternion()
        foot=Vector(mortar.location)+Vector((.027*math.cos(p),.027*math.sin(p),.069+.006*(.5-.5*math.cos(p*2))))
        pestle.location=foot-q@Vector((0,0,-.15))
        reach(ch[1],1,Vector(pestle.location)-q@Vector((0,-.012,-.09)),q)
    for pivot in [mortar,pestle]:
        for o in pivot.children:
            hidden=name!='work';o.hide_render=hidden;o.hide_viewport=hidden
            o.keyframe_insert('hide_render',frame=frame);o.keyframe_insert('hide_viewport',frame=frame)
