"""Lift, inspect and replace natural comb from a separate medieval hive."""
import bpy,math
from mathutils import Vector,Matrix

def create(ns,root,ch):
    from humanoid import empty
    c=ns['c'];material=ns['material']
    wax=material('Apiary natural wax',(.38,.25,.075),rough=.85,texture=140)
    cells=material('Apiary comb walls',(.49,.34,.115),rough=.79)
    comb=empty(c,'PROP natural honeycomb',(0,-.58,1.05),root)
    verts=[];faces=[];n=64
    for y in [-.018,.018]:
        for i in range(n):
            a=i*math.tau/n;r=1+.035*math.sin(7*a)+.025*math.cos(11*a)
            verts.append((.17*math.cos(a)*r,y,.19*math.sin(a)*r))
    faces.extend([tuple(reversed(range(n))),tuple(range(n,n*2))])
    for i in range(n):j=(i+1)%n;faces.append((i,j,j+n,i+n))
    mesh=bpy.data.meshes.new('Naturally cut wax comb');mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new('TOOL natural honeycomb',mesh);c.objects.link(o);o.parent=comb;mesh.materials.append(wax)
    # Linked open hexagonal rims give close-up detail without one mesh per cell.
    r=.012;v=[];f=[]
    for y,rr in [(0,r),(.005,r),(.005,r-.0014),(0,r-.0014)]:
        for i in range(6):a=i*math.tau/6+math.pi/6;v.append((rr*math.cos(a),y,rr*math.sin(a)))
    for k in range(3):
        for i in range(6):j=(i+1)%6;f.append((k*6+i,k*6+j,(k+1)*6+j,(k+1)*6+i))
    cellmesh=bpy.data.meshes.new('Wax hexagonal rim');cellmesh.from_pydata(v,[],f);cellmesh.update();cellmesh.materials.append(cells)
    for row in range(-10,11):
        for col in range(-10,11):
            x=(col+.5*(row%2))*math.sqrt(3)*r;z=row*1.5*r
            if (x/.151)**2+(z/.171)**2>1:continue
            for side in [-1,1]:
                o=bpy.data.objects.new('TOOL wax cell',cellmesh);c.objects.link(o);o.parent=comb;o.location=(x,side*.018,z);o.rotation_euler.z=math.pi if side==-1 else 0
    return dict(honeycomb=comb)

def pose(tools,ch,body,root,name,t,frame):
    from humanoid import reach,ik,phase_curve,vector_curve
    comb=tools['honeycomb']
    if name=='work':
        lift=phase_curve(t,[(0,0),(.12,.25),(.38,1),(.68,1),(.92,0),(1,0)])
        body.rotation_euler=(.35-.27*lift,0,0);body.location.z=-.085+.05*lift
        for side,chain in ch.items():ik(chain,-.02 if side==-1 else .025,.174,1.07+.05*lift,side)
        comb.location=Vector((0,-.58,1.05)).lerp(Vector((0,-.45,1.48)),lift)
        examine=phase_curve(t,[(0,0),(.38,0),(.48,1),(.60,-1),(.68,0),(1,0)])
        comb.rotation_euler=(0,.18*examine,.035*examine)
        transform=Matrix.Translation(comb.location)@comb.rotation_euler.to_matrix().to_4x4();q=comb.rotation_euler.to_quaternion()
        for side in [-1,1]:
            target=transform@Vector((side*.125,0,.13))-q@Vector((0,-.012,-.09))
            reach(ch[side],side,target,q)
    for o in comb.children:
        hidden=name!='work';o.hide_render=hidden;o.hide_viewport=hidden
        o.keyframe_insert('hide_render',frame=frame);o.keyframe_insert('hide_viewport',frame=frame)
