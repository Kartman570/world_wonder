"""Draw a two-hand fleshing knife down a hide on a separate frame."""
import bpy,math
from mathutils import Vector,Matrix

def create(ns,root,ch):
    from humanoid import empty
    c=ns['c'];material=ns['material'];rod=ns['rod']
    steel=material('Tanner worn scraper steel',(.19,.20,.19),rough=.53,metal=.75)
    wood=material('Tanner knife handles',(.105,.060,.025),rough=.89,texture=115)
    tool=empty(c,'PROP fleshing knife',(0,-.60,1.46),root)
    verts=[];faces=[];n=25
    for z in [-.007,.007]:
        for i in range(n):
            x=-.18+.36*i/(n-1);bend=.022*(1-(x/.18)**2)
            verts.extend([(x,-.012-bend,z),(x,.022-bend,z)])
    for i in range(n-1):
        a=i*2;b=a+2;faces.extend([(a,b,b+1,a+1),(a+2*n+1,b+2*n+1,b+2*n,a+2*n),(a,a+2*n,b+2*n,b),(a+1,b+1,b+2*n+1,a+2*n+1)])
    faces.extend([(0,1,2*n+1,2*n),(2*n-2,4*n-2,4*n-1,2*n-1)])
    mesh=bpy.data.meshes.new('Curved fleshing blade');mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new('TOOL fleshing knife blade',mesh);c.objects.link(o);o.parent=tool;mesh.materials.append(steel)
    o.modifiers.new('Worn blade corners','BEVEL').width=.0015
    for side in [-1,1]:
        o=rod('TOOL fleshing knife tang',(side*.16,.012,0),(side*.27,.025,.025),.007,steel);o.parent=tool
        o=rod('TOOL fleshing knife handle',(side*.19,.025,.025),(side*.29,.025,.025),.018,wood);o.parent=tool
    return dict(fleshing_knife=tool)

def pose(tools,ch,body,root,name,t,frame):
    from humanoid import reach,ik,vector_curve
    tool=tools['fleshing_knife']
    if name=='work':
        tool.location=vector_curve(t,[(0,(0,-.60,1.46)),(.15,(0,-.60,1.46)),(.55,(0,-.60,1.12)),(.65,(0,-.60,1.12)),(.72,(0,-.50,1.12)),(.90,(0,-.50,1.46)),(1,(0,-.60,1.46))])
        down=(1.46-tool.location.z)/.34
        body.rotation_euler=(.20+.20*down,0,0);body.location.z=-.055-.045*down
        for side,chain in ch.items():ik(chain,-.03 if side==-1 else .03,.174,1.10-.045*down,side)
        tool.rotation_euler=(0,0,0)
        transform=Matrix.Translation(tool.location)
        for side in [-1,1]:
            grip=Vector((side*.235,.025,.025));target=transform@grip-Vector((0,-.012,-.09))
            reach(ch[side],side,target,Matrix.Identity(4).to_quaternion())
    for o in tool.children:
        hidden=name!='work';o.hide_render=hidden;o.hide_viewport=hidden
        o.keyframe_insert('hide_render',frame=frame);o.keyframe_insert('hide_viewport',frame=frame)
