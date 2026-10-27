"""A wooden grain measure, open flour sack and two-stage mill work cycle."""
import bpy,math
from mathutils import Vector,Matrix

def create(ns,root,ch):
    from humanoid import empty
    c=ns['c'];box=ns['box'];rod=ns['rod'];ell=ns['ell'];rings=ns['rings'];material=ns['material']
    wood=material('Miller worn wooden measure',(.18,.12,.065),rough=.90,texture=120)
    cloth=material('Miller empty sack linen',(.28,.24,.17),rough=.98,texture=190)
    grain=material('Miller dry grain',(.32,.25,.11),rough=.95)
    flour=material('Miller flour',(.51,.47,.36),rough=1)
    scoop=empty(c,'PROP mill measure',(0,0,0),ch[1][5])
    o=rod('TOOL mill measure handle',(0,-.012,.01),(0,-.012,-.15),.018,wood);o.parent=scoop
    o=box('TOOL mill measure bottom',(0,-.22,-.11),(.14,.26,.016),wood,bevel=.006);o.parent=scoop
    for x in [-.069,.069]:
        o=box('TOOL mill measure side',(x,-.22,-.075),(.012,.26,.07),wood,bevel=.004);o.parent=scoop
    o=box('TOOL mill measure heel',(0,-.095,-.075),(.14,.012,.07),wood,bevel=.004);o.parent=scoop
    # Thin contents can empty without changing the tool's silhouette.
    o=box('TOOL measure grain',(0,-.22,-.065),(.12,.23,.025),grain,bevel=.008);o.parent=scoop
    o=ell('TOOL measure flour',(0,-.22,-.069),(.059,.11,.027),flour);o.parent=scoop
    sack=empty(c,'PROP mill flour sack',(-.18,-.43,1.20),root)
    o=rings('TOOL open mill flour sack',[(-.34,.045,.035),(-.29,.12,.08),(-.12,.14,.09),(0,.115,.075),(.018,.12,.08),(.018,.106,.066),(-.015,.102,.062),(-.28,.075,.045)],cloth,fold=.025);o.parent=sack
    for side in [-1,1]:
        for j in range(12):
            z=-.28+j*.024;o=rod('TOOL sack seam stitch',(side*.122,-.012,z),(side*.122,.008,z+.007),.0018,cloth);o.parent=sack
    o=ell('TOOL flour in sack',(0,0,-.23),(.09,.055,.035),flour);o.parent=sack
    return dict(mill_measure=scoop,mill_sack=sack)

def pose(tools,ch,body,root,name,t,frame):
    from humanoid import reach,vector_curve,phase_curve,ik
    scoop=tools['mill_measure'];sack=tools['mill_sack']
    if name=='work':
        bend=phase_curve(t,[(0,.2),(.18,.3),(.34,.3),(.48,1),(.60,.3),(.76,.2),(.91,1),(1,.2)])
        body.rotation_euler=(.08+.18*bend,0,0);body.location.z=-.02-.055*bend
        for side,chain in ch.items():ik(chain,0,.174,1.135-.055*bend,side)
        sack.location=(-.18,-.43,1.20)
        # Left palm pinches the near-left corner of the open sack.
        reach(ch[-1],-1,(-.28,-.418,1.31),Matrix.Identity(4).to_quaternion())
        wrist=vector_curve(t,[(0,(.24,-.30,1.44)),(.10,(.24,-.48,1.52)),(.25,(.24,-.48,1.52)),(.34,(.24,-.40,1.44)),(.48,(.24,-.56,1.12)),(.60,(-.15,-.35,1.60)),(.76,(-.15,-.35,1.60)),(.83,(.24,-.40,1.44)),(.91,(.24,-.56,1.12)),(1,(.24,-.30,1.44))])
        tilt=phase_curve(t,[(0,0),(.10,0),(.23,1.20),(.34,0),(.48,-.15),(.60,0),(.74,1.05),(.83,0),(.91,-.15),(1,0)])
        reach(ch[1],1,wrist,Matrix.Rotation(tilt,4,'X').to_quaternion())
        bpy.data.objects['TOOL flour in sack'].scale.z=.035*(1+.4*phase_curve(t,[(0,0),(.60,0),(.76,1),(.90,1),(1,0)]))
    for pivot in [scoop,sack]:
        for o in pivot.children:
            hidden=name!='work'
            if o.name=='TOOL measure grain':hidden=hidden or not (t<.24 or t>.94)
            if o.name=='TOOL measure flour':hidden=hidden or not (.49<t<.73)
            o.hide_render=hidden;o.hide_viewport=hidden
            o.keyframe_insert('hide_render',frame=frame);o.keyframe_insert('hide_viewport',frame=frame)
            if o.name=='TOOL flour in sack':o.keyframe_insert('scale',frame=frame)
