"""Static player style study. No animation, export, or manifest changes."""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
BASE=Path(__file__).resolve().parents[2]
# Reuse anatomical construction helpers, not the guard's rig or animations.
source=(BASE/'3d/city_guard/build_guard.py').read_text().split('# Pose controls:')[0]
exec(compile(source,str(BASE/'3d/city_guard/build_guard.py'),'exec'))
# Strip the uniform, military headgear and handheld sword.
remove=['Fitted leather jack','Jack rivet','Leather stitch','Jack front placket','City insignia','Badge vertical','Badge horizontal','Steel helmet crown','Kettle brim','Helmet band','Helmet rivet','Chin strap','Linen collar','Sword grip','Grip winding','Sword pommel','Crossguard','Sword blade','Wool tunic skirt','Waist belt','Belt buckle','Belt pouch','Pouch flap','Bracer strap','Boot cuff','Boot side seam']
for obj in list(c.objects):
    if any(obj.name==name or obj.name.startswith(name+'.') for name in remove):bpy.data.objects.remove(obj,do_unlink=True)
red=material('Player • faded madder linen',(.23,.065,.035),rough=.92,texture=145)
green=material('Player • weathered moss cloak',(.055,.08,.042),rough=.97,texture=115)
thread=material('Player • quilt seams',(.11,.035,.019),rough=.95)
lining=material('Player • hood lining',(.095,.105,.067),rough=.95,texture=120)
pants=material('Player • charcoal trousers',(.065,.062,.052),rough=.95,texture=120)
for obj in c.objects:
    if obj.type!='MESH':continue
    if obj.name.startswith(('Continuous wool sleeve','Forearm sleeve')):obj.data.materials.clear();obj.data.materials.append(red)
    elif obj.name.startswith(('Tailored trouser','Trouser knee')):obj.data.materials.clear();obj.data.materials.append(pants)
    elif obj.name.startswith('Leather bracer'):obj.data.materials.clear();obj.data.materials.append(boots)
# Long fitted padded doublet, no shiny breastplate or city emblem.
rings('Player • quilted doublet',[(1.06,.292,.183),(1.11,.285,.178),(1.23,.245,.155),(1.35,.23,.15),(1.53,.27,.163),(1.69,.279,.143),(1.76,.245,.12),(1.81,.16,.095),(1.83,.087,.076)],red,fold=.009)
# Geometry seams follow the cloth cross section and remain legible in closeups.
def cord(name,points,r,m):
    cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.resolution_u=2;cu.bevel_depth=r;cu.bevel_resolution=2
    sp=cu.splines.new('POLY');sp.points.add(len(points)-1)
    for v,p in zip(sp.points,points):v.co=(*p,1)
    ob=bpy.data.objects.new(name,cu);c.objects.link(ob);ob.parent=root;cu.materials.append(m);return ob
for x in [-.18,-.12,-.06,.06,.12,.18]:
    points=[]
    for j in range(13):
        z=1.32+j*.032;w=.23+.05*math.sin((z-1.32)/.45*math.pi*.7);d=.15+.013*math.sin((z-1.32)/.45*math.pi)
        yy=-d*math.sqrt(max(.05,1-(x/w)**2))-.003;points.append((x,yy,z))
    cord('Padded vertical quilting',points,.0028,thread)
for z in [1.36,1.46,1.56,1.66]:
    pts=[(x,-.165*math.sqrt(max(.05,1-(x/.28)**2))-.003,z) for x in [i*.02 for i in range(-11,12)]]
    cord('Quilt cross seam',pts,.002,thread)
box('Doublet front opening',(0,-.165,1.54),(.022,.013,.40),leather,bevel=.003)
for z in [1.36,1.44,1.52,1.60,1.68,1.74]:
    rod('Doublet toggle',(-.016,-.176,z),(.016,-.176,z),.004,trim)
rings('Player belt',[(1.255,.245,.163),(1.30,.245,.163)],boots)
box('Iron belt buckle',(.075,-.167,1.278),(.055,.015,.044),steel,bevel=.006)
# Asymmetric road mantle: left shoulder covered, right sword arm free.
verts=[];faces=[];n=25
for j,(z,w,d) in enumerate([(1.83,.12,.095),(1.77,.25,.14),(1.69,.35,.17),(1.48,.32,.205),(1.24,.29,.22),(1.00,.30,.23),(.92,.28,.22)]):
    for i in range(n):
        theta=-.30+i/(n-1)*(math.pi+1.15)
        # Around the back and left shoulder; front opening keeps the tunic readable.
        xx=w*math.cos(theta);yy=d*math.sin(theta)+.035
        zz=z+.015*math.sin(i*.8+j*.5)
        verts.append((xx,yy,zz))
for j in range(6):
    for i in range(n-1):a=j*n+i;faces.append((a,a+1,a+1+n,a+n))
mesh=bpy.data.meshes.new('Road cloak cloth');mesh.from_pydata(verts,[],faces);mesh.update();cloak=bpy.data.objects.new('Player • asymmetric road mantle',mesh);c.objects.link(cloak);cloak.parent=root;mesh.materials.append(green)
for p in mesh.polygons:p.use_smooth=True
sub=cloak.modifiers.new('Soft cloth','SUBSURF');sub.levels=2
solid=cloak.modifiers.new('Wool thickness','SOLIDIFY');solid.thickness=.008
# Lowered hood sits behind the neck: recognisable traveller silhouette.
ell('Lowered hood',(0,.115,1.79),(.155,.10,.105),green)
ell('Hood opening',(0,.166,1.81),(.105,.031,.060),lining)
cord('Mantle clasp cord',[(-.14,-.11,1.75),(0,-.13,1.71),(.14,-.11,1.75)],.008,leather)
ell('Iron cloak clasp',(.14,-.115,1.75),(.021,.010,.021),steel)
def band(name,points,width,m):
    verts=[]
    for i,p in enumerate(points):
        p=Vector(p); tangent=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])
        across=Vector((tangent.z,0,-tangent.x)).normalized()*width*.5
        verts.extend([tuple(p-across),tuple(p+across)])
    faces=[(2*i,2*i+1,2*i+3,2*i+2) for i in range(len(points)-1)]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);c.objects.link(o);o.parent=root;mesh.materials.append(m)
    thick=o.modifiers.new('Leather thickness','SOLIDIFY');thick.thickness=.006
    bevel=o.modifiers.new('Strap edges','BEVEL');bevel.width=.002;bevel.segments=2
    return o
# Diagonal baldric plus a compact satchel, not the guard's belt purse.
band('Chest baldric',[(.205,-.116,1.76),(.14,-.163,1.64),(.05,-.177,1.49),(-.05,-.170,1.34),(-.18,-.14,1.19)],.042,leather)
band('Back baldric',[(.205,.13,1.76),(.09,.25,1.53),(-.09,.26,1.30),(-.22,.15,1.15)],.040,leather)
box('Baldric buckle',(.11,-.185,1.58),(.048,.014,.061),steel,bevel=.004)
box('Player • traveller satchel',(-.28,.11,1.14),(.18,.14,.23),leather,bevel=.024)
box('Satchel flap',(-.28,.031,1.20),(.19,.025,.11),trim,bevel=.016)
rod('Satchel strap',(-.28,.01,1.23),(-.28,.01,1.08),.008,boots)
ell('Satchel stud',(-.28,-.003,1.10),(.008,.008,.008),steel)
# Sword is sheathed on the left hip: both hands remain free in the style study.
a=Vector((-.30,-.01,1.20));b=Vector((-.49,.07,.40));axis=(b-a).normalized()
rod('Player • sword scabbard',a,b,.034,boots,r2=.025)
rod('Scabbard throat',a-axis*.015,a+axis*.055,.039,steel)
rod('Scabbard chape',b-axis*.055,b,.028,steel,r2=.018)
rod('Sheathed sword grip',a-axis*.16,a-axis*.025,.021,boots)
for j in range(6):
    pt=a-axis*(.04+j*.018);rod('Sword grip wrapping',pt-axis*.002,pt+axis*.002,.022,trim)
rod('Sword guard',a+Vector((-.105,0,0))-axis*.025,a+Vector((.105,0,0))-axis*.025,.012,steel)
ell('Sword pommel',a-axis*.19,(.028,.020,.028),steel)
# Uncovered, shorter dark hair with a swept part; helmet silhouette is removed entirely.
hairmat=material('Player • dark chestnut hair',(.032,.019,.011),rough=.92,texture=110)
rings('Swept hair cap',[(2.145,.125,.123),(2.19,.126,.123),(2.23,.095,.09),(2.25,.055,.05),(2.255,.008,.008)],hairmat)
for i in range(8):
    x=-.09+i*.025
    cord('Combed hair strand',[(x,-.096,2.155),(x-.009,-.075,2.192),(x-.02,-.023,2.231)],.0018,hair)
for side in [-1,1]:
    ell('Hair temple',(side*.111,.025,2.115),(.018,.075,.058),hairmat)
    ell('Sideburn',(side*.108,-.008,2.071),(.010,.026,.033),hairmat)
ell('Hair nape',(0,.12,2.125),(.108,.035,.072),hairmat)
# Leather ties and fabric wraps break up the polished-uniform appearance.
for side in [-1,1]:
    for z in [.25,.28,.31]:
        rod('Boot wrap',(side*.145,0,z-.008),(side*.145,0,z+.008),.075,trim)
# Ensure this is genuinely a static source: no actions, NLA, or pose keys.
for obj in c.objects:
    obj.animation_data_clear()
    if obj.type=='MESH' and obj.data.shape_keys:obj.shape_key_clear()
for key in list(s.keys()):
    if key.startswith(('pose_validation','clip_pose_validation','sprite_animation')):del s[key]
s['sprite_asset']='player';s['style_stage']='Static style review; no animations or exported atlas'
s['sprite_export_json']=json.dumps(dict(asset='player',id='player',outputSize=128,fps=12,scale=1,crop=True,publish=False,clips={}),indent=2)
s.timeline_markers.clear();s.frame_start=1;s.frame_end=1;s.frame_set(1)
s.camera.data.ortho_scale=3.25
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        sp=area.spaces.active;sp.shading.type='SOLID';sp.shading.color_type='MATERIAL';sp.shading.show_cavity=True;sp.overlay.show_overlays=False
        r=sp.region_3d;r.view_perspective='ORTHO';r.view_location=(0,0,1.2);r.view_distance=3.25;r.view_rotation=Vector((.45,-1,.14)).to_track_quat('Z','Y')
t=bpy.data.texts.get('build_player.py') or bpy.data.texts.new('build_player.py');t.clear();t.write((BASE/'3d/player/build_player.py').read_text())
bpy.ops.wm.save_as_mainfile(filepath=str(BASE/'3d/player/player.blend'),compress=True)
