"""Medieval wheeled training target: timber cart, stuffed canvas and hinged support."""
from pathlib import Path
import sys,math,json,random
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
import bpy,bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from animal_studio import begin,clips_for,finish

def smooth(x):
    x=max(0,min(1,x));return x*x*(3-2*x)

def build():
    ns,task=begin('moving_dummy');s=ns['s'];c=ns['c'];root=ns['root'];ell=ns['ell'];rod=ns['rod'];box=ns['box'];material=ns['material']
    wood=material('Dummy weathered oak',(.13,.075,.033),rough=.92,texture=80)
    endgrain=material('Dummy pale broken wood',(.23,.16,.078),rough=.95,texture=130)
    iron=material('Dummy worn dark iron',(.055,.055,.049),metal=.55,rough=.70,texture=135)
    cloth=material('Dummy coarse linen canvas',(.29,.235,.145),rough=.99,texture=190)
    seam=material('Dummy waxed linen thread',(.10,.067,.034),rough=.97,texture=160)
    straw=material('Dummy exposed straw',(.27,.20,.095),rough=.98,texture=160)
    leather=material('Dummy leather bindings',(.075,.042,.022),rough=.93,texture=140)
    red=material('Dummy faded red target paint',(.20,.036,.020),rough=.98,texture=160)
    controlled=[]
    def empty(n,p=(0,0,0),parent=root):
        o=bpy.data.objects.new(n,None);c.objects.link(o);o.parent=parent;o.location=p;controlled.append(o);return o
    def E(n,p,size,mat,parent):o=ell(n,p,size,mat);o.parent=parent;return o
    def R(n,a,b,r,mat,parent,r2=None):o=rod(n,a,b,r,mat,r2=r2);o.parent=parent;return o
    def B(n,p,size,mat,parent):o=box(n,p,size,mat);o.parent=parent;return o
    def mesh(n,v,f,mat,parent):
        m=bpy.data.meshes.new(n);m.from_pydata(v,[],f);m.update();m.materials.append(mat);bm=bmesh.new();bm.from_mesh(m);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(m);bm.free();o=bpy.data.objects.new(n,m);c.objects.link(o);o.parent=parent
        for poly in m.polygons:poly.use_smooth=True
        return o
    def ring(n,p,major,minor,mat,parent,axis='Z'):
        v=[];f=[];cols=48;rows=10
        for j in range(cols):
            a=j*math.tau/cols
            for k in range(rows):
                b=k*math.tau/rows;rad=major+minor*math.cos(b);point=Vector((rad*math.cos(a),rad*math.sin(a),minor*math.sin(b)))
                if axis=='X':point=Vector((point.z,point.x,point.y))
                v.append(Vector(p)+point)
        for j in range(cols):
            for k in range(rows):a=j*rows+k;b=j*rows+(k+1)%rows;d=((j+1)%cols)*rows+k;e=((j+1)%cols)*rows+(k+1)%rows;f.append((a,b,e,d))
        return mesh(n,v,f,mat,parent)
    # The support is a cart, with no human legs or walking skeleton.
    base=empty('DUMMY cart')
    for x in [-.20,0,.20]:B('DUMMY deck plank',(x,0,.252),(.19,.62,.055),wood,base)
    for x in [-.22,.22]:B('DUMMY underframe',(x,0,.205),(.075,.64,.065),wood,base)
    wheels=[]
    for y in [-.23,.23]:
        R('DUMMY axle',(-.39,y,.128),(.39,y,.128),.024,iron,base)
        for side in [-1,1]:
            wheel=empty('DUMMY wheel %s %s'%(side,y),(side*.36,y,.128),base);wheels.append(wheel)
            ring('DUMMY oak wheel rim',(0,0,0),.105,.015,wood,wheel,'X');ring('DUMMY iron wheel tire',(0,0,0),.116,.010,iron,wheel,'X')
            R('DUMMY wheel hub',(-.036,0,0),(.036,0,0),.030,wood,wheel)
            for k in range(6):a=k*math.tau/6;R('DUMMY wooden spoke',(0,.025*math.cos(a),.025*math.sin(a)),(0,.104*math.cos(a),.104*math.sin(a)),.010,wood,wheel,.012)
            E('DUMMY axle pin',(side*.040,0,0),(.008,.016,.016),iron,wheel)
    for x in [-.26,.26]:
        for y in [-.26,.26]:B('DUMMY deck iron strap',(x,y,.284),(.060,.055,.008),iron,base);E('DUMMY deck nail',(x,y,.290),(.008,.008,.003),iron,base)
    ring('DUMMY towing eye',(0,-.345,.24),.026,.005,iron,base,'X');R('DUMMY towing eye mount',(0,-.30,.24),(0,-.34,.24),.012,iron,base)
    R('DUMMY fixed lower stake',(0,0,.275),(0,0,.78),.044,wood,base)
    for side in [-1,1]:R('DUMMY diagonal brace',(side*.24,0,.285),(0,0,.62),.025,wood,base)
    upper=empty('DUMMY upper support',(0,0,.75),base)
    R('DUMMY upper wooden stake',(0,0,-.08),(0,0,.87),.043,wood,upper)
    R('DUMMY sliding sleeve',(0,0,-.065),(0,0,.085),.057,iron,upper)
    bodysections=[(.15,.12,.10),(.20,.21,.135),(.37,.225,.15),(.55,.265,.155),(.68,.26,.145),(.76,.11,.08)]
    v=[];f=[];cols=48
    for z,w,d in bodysections:
        for k in range(cols):a=k*math.tau/cols;v.append((w*math.cos(a),d*math.sin(a),z))
    f=[tuple(reversed(range(cols)))]
    for j in range(len(bodysections)-1):
        for k in range(cols):a=j*cols+k;b=j*cols+(k+1)%cols;f.append((a,b,b+cols,a+cols))
    f.append(tuple(range((len(bodysections)-1)*cols,len(bodysections)*cols)));body=mesh('DUMMY stuffed torso',v,f,cloth,upper);body.modifiers.new('Soft stuffed canvas','SUBSURF').levels=2
    bpy.context.view_layer.update();ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get());m=ev.to_mesh();tree=BVHTree.FromPolygons([v.co.copy() for v in m.vertices],[tuple(p.vertices) for p in m.polygons]);ev.to_mesh_clear()
    def surface(z,a,offset=.001):
        p,normal,index,distance=tree.ray_cast(Vector((.5*math.cos(a),.5*math.sin(a),z)),Vector((-math.cos(a),-math.sin(a),0)));assert p is not None
        return p+normal*offset
    # Canvas stitching, bindings and a worn circular target are model details.
    for z,w,d in bodysections[1:-1]:
        for k in range(22):
            a=k*math.tau/22;b=a+.045;R('DUMMY torso stitches',surface(z,a),surface(z+.006,b),.0013,seam,upper)
    for z in [.25,.62]:
        for k in range(48):a=k*math.tau/48;b=(k+1)*math.tau/48;R('DUMMY leather torso binding',surface(z,a),surface(z,b),.007,leather,upper)
    E('DUMMY leather target patch',(0,-.153,.47),(.105,.012,.115),leather,upper)
    E('DUMMY faded target paint',(0,-.164,.47),(.077,.003,.083),red,upper)
    E('DUMMY target center',(0,-.168,.47),(.030,.002,.032),cloth,upper)
    arms=[]
    for side in [-1,1]:
        arm=empty('DUMMY arm hinge '+str(side),(side*.10,0,.64),upper);arms.append((side,arm));R('DUMMY wooden crossbar',(0,0,0),(side*.45,0,0),.035,wood,arm);E('DUMMY padded arm',(side*.24,0,0),(.20,.087,.095),cloth,arm)
        for x in [.10,.36]:
            factor=math.sqrt(1-((x-.24)/.20)**2);ry=.087*factor+.001;rz=.095*factor+.001
            for k in range(20):a=k*math.tau/20;b=(k+1)*math.tau/20;R('DUMMY arm binding',(side*x,ry*math.cos(a),rz*math.sin(a)),(side*x,ry*math.cos(b),rz*math.sin(b)),.004,leather,arm)
        E('DUMMY hinge pin',(0,-.05,0),(.016,.014,.016),iron,arm)
    neck=empty('DUMMY head hinge',(0,0,.83),upper);R('DUMMY head peg',(0,0,-.04),(0,0,.20),.033,wood,neck);E('DUMMY blank head sack',(0,0,.145),(.12,.105,.155),cloth,neck)
    for k in range(17):
        a=-1.25+k*.15;b=a+.045;R('DUMMY head seam',(0,.106*math.cos(a),.145+.155*math.sin(a)),(0,.106*math.cos(b),.145+.155*math.sin(b)),.0014,seam,neck)
    ring('DUMMY head lashing',(0,0,.025),.066,.004,leather,neck)
    rng=random.Random(621)
    for k in range(36):
        side=rng.choice([-1,1]);x=side*rng.uniform(.14,.24);p=Vector((x,rng.uniform(-.055,.055),rng.uniform(.69,.75)));R('DUMMY loose straw',p,p+Vector((side*rng.uniform(.005,.025),rng.uniform(-.01,.01),rng.uniform(.015,.04))),.0009,straw,upper,.00025)
    splinters=[]
    for k in range(5):splinters.append(R('DUMMY broken crossbar splinter',(0,.015*(k-2),0),(.065,.018*(k-2),.035*(k%2)),.005,endgrain,arms[1][1],.0003))
    clips=clips_for(task,frames={'idle':8,'walk':16,'death':14},fps={'idle':6,'walk':12})
    s['character_design']=json.dumps(dict(kind='nonliving training target',materials='weathered oak, stuffed linen, straw, leather and dark iron',movement='four rolling wheels and restrained upper support sway; no human legs',damage='support slides down, head sags and right crossbar hinge breaks; no blood'))
    for name,cfg in clips.items():
        span=cfg['frames'] if cfg['loop'] else cfg['frames']-1
        for j in range(span*4+1):
            frame=cfg['start']+j*.25;t=j/(span*4);p=math.tau*t;s.frame_set(int(frame),subframe=frame%1);fall=smooth((t-.16)/.68) if name=='death' else 0;recoil=.08*math.sin(math.pi*min(1,t/.35)) if name=='death' and t<.35 else 0
            root.location=(0,0,0);root.rotation_euler=(0,0,0);upper.location=(0,0,.75-.18*fall);upper.rotation_euler=(.25*fall-recoil+(.025*math.sin(p) if name=='walk' else .003*math.sin(p) if name=='idle' else 0),.018*math.sin(2*p) if name=='walk' else 0,0)
            neck.rotation_euler=(.65*fall,0,.008*math.sin(p) if name=='walk' else 0)
            for side,arm in arms:arm.rotation_euler=(0,(.55 if side==1 else -.12)*fall,0)
            for wheel in wheels:wheel.rotation_euler=(p if name=='walk' else .16*smooth(t/.35) if name=='death' else 0,0,0)
            for o in splinters:o.hide_render=o.hide_viewport=fall<.4;o.keyframe_insert('hide_render',frame=frame);o.keyframe_insert('hide_viewport',frame=frame)
            for o in controlled+[root]:
                for prop in ['location','rotation_euler']:o.keyframe_insert(prop,frame=frame)
    finish(ns,'moving_dummy',clips,source_files=['validate_dummy.py'],target=.94)

if __name__ in ['__main__','character_build']:build()
