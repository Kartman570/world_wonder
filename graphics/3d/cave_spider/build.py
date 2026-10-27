"""Earthlike giant ground spider; eight articulated legs and six distinct clips."""
from pathlib import Path
import sys,math,random,json
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
import bpy
from mathutils import Vector,Matrix
from animal_studio import begin,clips_for,finish

def smooth(x):
    x=max(0,min(1,x));return x*x*(3-2*x)

def curve(t,keys):
    for (a,x),(b,y) in zip(keys,keys[1:]):
        if t<=b:return x+(y-x)*smooth((t-a)/(b-a))
    return keys[-1][1]

def build():
    ns,task=begin('cave_spider');s=ns['s'];c=ns['c'];root=ns['root'];ell=ns['ell'];rod=ns['rod'];material=ns['material']
    rng=random.Random(721)
    cuticle=material('Spider umber cuticle',(.080,.061,.046),rough=.65,texture=160)
    abdomen_mat=material('Spider mottled abdominal skin',(.105,.085,.065),rough=.84,texture=85)
    joints_mat=material('Spider flexible joints',(.036,.028,.022),rough=.88,texture=140)
    hair=material('Spider fine setae',(.075,.061,.043),rough=.96)
    eye=material('Spider black eyes',(.004,.004,.003),rough=.15)
    fang_mat=material('Spider dark fangs',(.020,.017,.013),rough=.44)
    silk=material('Spider silk',(.43,.43,.38),rough=.83)
    controlled=[]
    def empty(name,loc=(0,0,0),parent=root):
        o=bpy.data.objects.new(name,None);c.objects.link(o);o.parent=parent;o.location=loc;controlled.append(o);return o
    def E(name,loc,scale,mat,parent=root):
        o=ell(name,loc,scale,mat);o.parent=parent;return o
    def R(name,a,b,r,mat,parent=root,r2=None):
        o=rod(name,a,b,r,mat,r2=r2);o.parent=parent;return o
    prosoma=empty('SPIDER prosoma',(0,-.28,.38))
    E('SPIDER carapace',(0,0,0),(.23,.28,.14),cuticle,prosoma)
    E('SPIDER sternum',(0,.015,-.085),(.16,.205,.060),joints_mat,prosoma)
    abdomen=empty('SPIDER abdomen hinge',(0,.02,.40))
    E('SPIDER abdomen',(0,.34,.03),(.31,.42,.29),abdomen_mat,abdomen)
    E('SPIDER pedicel',(0,.035,-.005),(.070,.12,.065),joints_mat,abdomen)
    # The small eight-eye cluster sits on the anterior carapace, without a human face.
    for x,y,z,r in [(-.038,-.253,.067,.018),(.038,-.253,.067,.018),(-.087,-.230,.053,.012),(.087,-.230,.053,.012),(-.062,-.218,.103,.010),(.062,-.218,.103,.010),(-.122,-.200,.070,.010),(.122,-.200,.070,.010)]:
        E('SPIDER eye',(x,y,z),(r,r*.75,r),eye,prosoma)
    # An understated dorsal cardiac marking follows the abdomen's curved surface.
    mark=material('Spider dorsal marking',(.052,.040,.030),rough=.91)
    mv=[];mf=[]
    for i in range(13):
        u=i/12;y=.12+.43*u;width=(.008+.032*math.sin(math.pi*u)**.8)*(1+.10*math.sin(i*2.3))
        for side in [-1,-.5,0,.5,1]:
            x=side*width;zz=.03+.29*math.sqrt(max(0,1-((y-.34)/.42)**2-(x/.31)**2))+.001
            mv.append((x,y,zz))
    for i in range(12):
        for j in range(4):a=i*5+j;mf.append((a,a+1,a+6,a+5))
    mesh=bpy.data.meshes.new('Natural cardiac marking');mesh.from_pydata(mv,[],mf);mesh.update();o=bpy.data.objects.new('SPIDER dorsal marking',mesh);c.objects.link(o);o.parent=abdomen;mesh.materials.append(mark)
    for parent,center,radii,count in [(abdomen,Vector((0,.34,.03)),Vector((.31,.42,.29)),150),(prosoma,Vector((0,0,0)),Vector((.23,.28,.14)),55)]:
        for i in range(count):
            zz=rng.uniform(-.95,.95);a=rng.random()*math.tau;v=Vector((math.sqrt(1-zz*zz)*math.cos(a),math.sqrt(1-zz*zz)*math.sin(a),zz))
            p=center+Vector((v.x*radii.x,v.y*radii.y,v.z*radii.z));normal=Vector((v.x/radii.x,v.y/radii.y,v.z/radii.z)).normalized()
            R('SPIDER body seta',p,p+normal*rng.uniform(.014,.024),.0012,hair,parent,.00025)
    fangs=[];palps=[];spinnerets=[]
    for side in [-1,1]:
        jaw=empty('SPIDER chelicera '+str(side),(side*.061,-.248,-.085),prosoma);fangs.append((side,jaw))
        E('SPIDER chelicera base',(0,-.018,-.012),(.055,.073,.060),cuticle,jaw)
        points=[Vector((0,-.058,-.025)),Vector((-side*.009,-.093,-.064)),Vector((-side*.020,-.102,-.106)),Vector((-side*.026,-.085,-.125))]
        for k,(a,b) in enumerate(zip(points,points[1:])):R('SPIDER curved fang',a,b,[.014,.010,.005][k],fang_mat,jaw,[.010,.005,.0005][k])
        palp=empty('SPIDER pedipalp '+str(side),(side*.16,-.205,-.040),prosoma);palps.append((side,palp))
        R('SPIDER palp femur',(0,0,0),(side*.045,-.095,-.025),.022,cuticle,palp,.016)
        R('SPIDER palp tibia',(side*.045,-.095,-.025),(side*.020,-.175,-.075),.015,cuticle,palp,.010)
        E('SPIDER palp tip',(side*.020,-.175,-.075),(.016,.022,.018),joints_mat,palp)
        spin=empty('SPIDER spinneret '+str(side),(side*.055,.69,-.09),abdomen);spinnerets.append((side,spin))
        R('SPIDER spinneret base',(0,0,0),(0,.055,-.005),.020,cuticle,spin,.015)
        R('SPIDER spinneret nozzle',(0,.055,-.005),(0,.10,-.015),.014,joints_mat,spin,.006)
    def tube(name,radius,profile,mat):
        verts=[];faces=[];n=16
        for j,mul in enumerate(profile):
            for i in range(n):a=math.tau*i/n;verts.append((radius*mul*math.cos(a),radius*.88*mul*math.sin(a),j/(len(profile)-1)))
        faces.append(tuple(reversed(range(n))))
        for j in range(len(profile)-1):
            for i in range(n):a=j*n+i;b=j*n+(i+1)%n;faces.append((a,b,b+n,a+n))
        faces.append(tuple(range((len(profile)-1)*n,len(profile)*n)))
        mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();mesh.materials.append(mat)
        for p in mesh.polygons:p.use_smooth=True
        o=bpy.data.objects.new(name,mesh);c.objects.link(o);o.parent=root;controlled.append(o);return o
    legs=[]
    for side in [-1,1]:
        for row in range(4):
            segments=[]
            for k,(radius,profile) in enumerate([(.040,[.7,1,1,.7]),(.038,[.70,.95,1,.88,.60]),(.025,[1,.88,.68,.60]),(.014,[1,.85,.65,.50]),(.007,[1,.8,.5,.15])]):
                o=tube('SPIDER leg %s %s segment %s'%(side,row,k),radius,profile,cuticle);segments.append(o)
                if k in [1,2]:
                    for j in range(4):
                        a=j*2.4;z=.18+j*.19;p=Vector((radius*math.cos(a),radius*.88*math.sin(a),z));normal=Vector((math.cos(a),math.sin(a),0))
                        R('SPIDER leg seta',p,p+normal*.024,.0012,hair,o,.0003)
            knobs=[]
            for k in range(2):
                o=E('SPIDER leg %s %s joint %s'%(side,row,k),(0,0,0),(.030,.030,.030),joints_mat);knobs.append(o);controlled.append(o)
            legs.append(dict(side=side,row=row,segments=segments,knobs=knobs))
    threads=[]
    for strand in range(3):
        line=[tube('SPIDER emitted silk %s %s'%(strand,k),.0028,[1,.85],silk) for k in range(14)]
        threads.append(line)
    clips=clips_for(task,frames={'walk':12,'run':12,'death':12,'attack':10,'web':20},fps={'run':14,'attack':12,'web':12})
    s['animal_design']=json.dumps(dict(species='ground spider',legs=8,leg_segments=7,facing='-Y',palette='earth umber; no luminous eyes or magic venom',gait='alternating tetrapods',web='temporary threads from raised spinnerets; ground web separate'))
    def segment(o,a,b):
        d=b-a;o.location=a;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();o.scale=(1,1,d.length)
    def leg_path(side,row,toe,pm,death):
        anchor=pm@Vector((side*.16,[-.15,-.05,.055,.14][row],-.012))
        hip=pm@Vector((side*.25,[-.15,-.05,.055,.14][row],-.005))
        direction=toe-hip;distance=max(.185,min(1.13,direction.length));axis=direction.normalized();upper=.48;lower=.66
        pole=Vector((side*.18,0,1));pole=(pole-axis*pole.dot(axis)).normalized();along=(upper*upper-lower*lower+distance*distance)/(2*distance)
        knee=hip+axis*along+pole*math.sqrt(max(0,upper*upper-along*along))
        lowerdir=(toe-knee).normalized();femurdir=(knee-hip).normalized()
        if death:
            femurdir=femurdir.lerp(Vector((side*.75,(row-1.5)*.18,.66)).normalized(),death).normalized()
            lowerdir=lowerdir.lerp(Vector((-side*.65,-(row-1.5)*.12,-.76)).normalized(),death).normalized()
        knee=hip+femurdir*upper;ankle=knee+lowerdir*(lower*.65)
        meta_dir=lowerdir.lerp(Vector((-side*.60,(row-1.5)*.10,.80)).normalized(),death).normalized()
        tip=ankle+meta_dir*(lower*.35)
        tarsusdir=Vector((side*.18,-.35,-.92)).normalized().lerp(Vector((side*.10,(row-1.5)*.22,.95)).normalized(),death).normalized()
        claw=tip+tarsusdir*.065
        return [anchor,hip,knee,ankle,tip,claw]
    for name,cfg in clips.items():
        span=cfg['frames'] if cfg['loop'] else cfg['frames']-1
        for j in range(span*4+1):
            frame=cfg['start']+j*.25;t=j/(span*4);p=math.tau*t
            s.frame_set(math.floor(frame),subframe=frame%1);root.location=(0,0,0);root.rotation_euler=(0,0,0)
            death=smooth((t-.10)/.80) if name=='death' else 0
            strike=curve(t,[(0,0),(.25,0),(.48,1),(.68,1),(1,0)]) if name=='attack' else 0
            windup=curve(t,[(0,0),(.25,1),(.45,0),(1,0)]) if name=='attack' else 0
            web=curve(t,[(0,0),(.25,1),(.70,1),(1,0)]) if name=='web' else 0
            root.location.y=-.18*strike;root.location.z=-.14*death
            prosoma.location=(0,-.28,.38+(.012*math.cos(2*p) if name=='run' else 0)-.035*strike)
            prosoma.rotation_euler=(.04*windup-.10*strike,0,0)
            abdomen.location=(0,.02,.40);abdomen.rotation_euler=(.65*web,0,0);abdomen.scale=(1,1,1+.005*math.sin(p) if name=='idle' else 1)
            pm=Matrix.Translation(prosoma.location)@prosoma.rotation_euler.to_matrix().to_4x4()
            for side,jaw in fangs:jaw.rotation_euler=(0,side*(.32*windup-.12*strike),0)
            for side,palp in palps:palp.rotation_euler=(.07*math.sin(p+side) if name=='idle' else -.20*windup,0,side*.08*strike)
            for side,spin in spinnerets:spin.rotation_euler=(1.5*web,0,0)
            for leg in legs:
                side,row=leg['side'],leg['row'];base=Vector((side*[.76,.94,.94,.78][row],[-.84,-.40,.16,.61][row],.078))
                if name in ['walk','run']:
                    ph=(t+(.5 if (row+(side==1))%2 else 0))%1;stance=.56 if name=='run' else .65;stride=.19 if name=='run' else .11
                    if ph<stance:base.y+=-stride+2*stride*ph/stance
                    else:
                        u=(ph-stance)/(1-stance);base.y+=stride-2*stride*smooth(u);base.z+=(.15 if name=='run' else .085)*math.sin(math.pi*u);base.x-=side*.025*math.sin(math.pi*u)
                elif name=='attack':
                    if row==0:base.y-=.14*strike;base.z+=.20*windup+.045*strike
                    else:base.y-=root.location.y
                elif name=='web' and row==3:base.y+=.08*web
                points=leg_path(side,row,base,pm,death)
                for o,a,b in zip(leg['segments'],points,points[1:]):segment(o,a,b)
                for o,point in zip(leg['knobs'],[points[2],points[3]]):o.location=point
            # A brief arc of silk leaves the raised spinnerets, then disappears.
            ab=Matrix.Translation(abdomen.location)@abdomen.rotation_euler.to_matrix().to_4x4()
            for strand,line in enumerate(threads):
                spin=spinnerets[strand%2][1];start=ab@Matrix.Translation(spin.location)@spin.rotation_euler.to_matrix().to_4x4()@Vector((0,.10,-.015))
                cp=[start,start+Vector(((strand-1)*.035,.015,.29)),Vector(((strand-1)*.055,-.12,1.20)),Vector(((strand-1)*.11,-1.12,.65))]
                for k,o in enumerate(line):
                    def bez(u):return cp[0]*(1-u)**3+cp[1]*(3*u*(1-u)**2)+cp[2]*(3*u*u*(1-u))+cp[3]*(u**3)
                    segment(o,bez(k/14),bez((k+1)/14));hidden=not(name=='web' and .46<=t<=.68)
                    o.hide_render=hidden;o.hide_viewport=hidden;o.keyframe_insert('hide_render',frame=frame);o.keyframe_insert('hide_viewport',frame=frame)
            for o in controlled:
                for prop in ['location','rotation_euler','scale']:o.keyframe_insert(prop,frame=frame)
            if name=='death':
                bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();low=100.
                for o in c.objects:
                    if o.type=='MESH' and not o.hide_render:
                        ev=o.evaluated_get(dg);mesh=ev.to_mesh();low=min(low,min((ev.matrix_world@v.co).z for v in mesh.vertices));ev.to_mesh_clear()
                root.location.z+=max(0,.002-low)
            root.keyframe_insert('location',frame=frame);root.keyframe_insert('rotation_euler',frame=frame)
    finish(ns,'cave_spider',clips,source_files=['validate_spider.py'],target=.46)

if __name__ in ['__main__','character_build']:build()
