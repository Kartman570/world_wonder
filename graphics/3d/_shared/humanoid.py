"""Shared earth-humanoid construction/rig. Per-character designs live beside each .blend."""
import bpy,math,json,sys,importlib
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parents[2]
DENSITY=128/4.2

def build(asset,design):
    sys.path.insert(0,str(ROOT/'3d'/asset))
    if bpy.context.object and bpy.context.object.mode!='OBJECT':bpy.ops.object.mode_set(mode='OBJECT')
    task=next(x for x in json.loads((ROOT/'sprites/manifest.json').read_text())['catalog'] if x['id']==asset)
    source=ROOT/'3d/city_guard/build_guard.py'
    ns={'__name__':'anatomical_base','__file__':str(source)}
    exec(compile(source.read_text().split('# Pose controls:')[0],str(source),'exec'),ns)
    s=ns['s'];c=ns['c'];root=ns['root'];material=ns['material'];ell=ns['ell'];rod=ns['rod'];box=ns['box'];rings=ns['rings']
    for key in list(s.keys()):
        if key.endswith('_validation') or key=='last_export_hash':del s[key]
    remove=['Fitted leather jack','Jack rivet','Leather stitch','Jack front placket','City insignia','Badge vertical','Badge horizontal','Steel helmet crown','Kettle brim','Helmet band','Helmet rivet','Chin strap','Linen collar','Sword grip','Grip winding','Sword pommel','Crossguard','Sword blade','Wool tunic skirt','Waist belt','Belt buckle','Belt pouch','Pouch flap','Bracer strap','Boot cuff','Boot side seam']
    if design.get('armor'):
        keep_prefixes=['Fitted leather jack','Leather stitch','Jack front placket']
        if design.get('armor')=='jack':keep_prefixes.append('Jack rivet')
        if design.get('city_badge'):keep_prefixes+=['City insignia','Badge vertical','Badge horizontal']
        remove=[x for x in remove if x not in keep_prefixes]
    if design.get('female') or design.get('rolled_sleeves'):remove.append('Leather bracer')
    for o in list(c.objects):
        if any(o.name==x or o.name.startswith(x+'.') for x in remove):bpy.data.objects.remove(o,do_unlink=True)
    cloth=material(asset+' coarse cloth',design['cloth'],rough=.93,texture=135)
    linen=material(asset+' shirt',design.get('shirt',(.25,.22,.17)),rough=.94,texture=170)
    dark=material(asset+' dark leather',(.042,.029,.018),rough=.85,texture=100)
    iron=material(asset+' iron',(.065,.073,.075),rough=.7,metal=.65)
    skin=ns['skin']
    if design.get('skin'):
        old=skin;skin=material(asset+' skin',design['skin'],rough=.72,texture=65)
        for o in c.objects:
            if o.type=='MESH':
                for i,m in enumerate(o.data.materials):
                    if m==old:o.data.materials[i]=skin
    hair=material(asset+' hair',design.get('hair',(.046,.026,.016)),rough=.95,texture=110)
    leather=material(asset+' worn leather',design.get('leather',(.13,.078,.035)),rough=.84,texture=95)
    if design.get('gloves'):
        for o in c.objects:
            if o.type=='MESH' and o.name.startswith(('Wrist','Hand','Knuckle','Curled finger','Thumb','HAND')):
                o.data.materials.clear();o.data.materials.append(leather)
    for o in c.objects:
        if o.type!='MESH':continue
        if any(o.name.startswith(x) for x in ['Continuous wool sleeve','Forearm sleeve','Leather bracer']):o.data.materials.clear();o.data.materials.append(linen)
        if o.name.startswith(('Tailored trouser thigh','Trouser knee')):o.data.materials.clear();o.data.materials.append(dark if not design.get('ragged') else cloth)
        if design.get('ragged') and o.name.startswith('Shaped boot calf'):o.data.materials.clear();o.data.materials.append(cloth)
    if design.get('armor'):
        for o in c.objects:
            if o.name.startswith(('Fitted leather jack','Leather bracer')):o.data.materials.clear();o.data.materials.append(leather)
    if design.get('rolled_sleeves'):
        for o in c.objects:
            if o.name.startswith('Continuous wool sleeve'):
                o.data.materials.append(skin)
                for face in o.data.polygons:
                    if face.index>=193:face.material_index=1
        for side in [-1,1]:
            a=Vector((side*.31,0,1.80));b=Vector((side*.455,-.10,1.115));center=a.lerp(b,.68);axis=(b-a).normalized()
            rod('COSTUME rolled cuff',center-axis*.026,center+axis*.026,.080,linen)
    belly=design.get('belly',0)
    sections=[(1.07,.32+belly,.26),(1.13,.31+belly,.23),(1.30,.235+belly,.155+belly),(1.48,.255+belly,.16+belly),(1.67,.278,.146),(1.77,.23,.115),(1.83,.09,.078)]
    if design.get('short_tunic'):sections=[(1.23,.25+belly,.18),(1.27,.24+belly,.17)]+sections[2:]
    tunic=rings('COSTUME tunic',sections,cloth,fold=.012)
    if design.get('armor'):
        for v in tunic.data.vertices:
            if v.co.z>1.29:v.co.x*=.87;v.co.y*=.87
    if design.get('female'):
        for v in tunic.data.vertices:
            if v.co.y<0:v.co.y-=.02*math.exp(-((v.co.z-1.62)/.12)**2)
            v.co.x*=1-.075*math.exp(-((v.co.z-1.32)/.15)**2)
    if design.get('female') or design.get('robe'):
        skirt=rings('COSTUME long skirt',[(z,.345-.10*((z-.16)/1.12)**1.8,.28-.10*((z-.16)/1.12)) for z in [.16+i*1.12/16 for i in range(17)]],cloth,fold=.014)
        skirt.modifiers.new('Smooth cloth folds','SUBSURF').levels=1
    if design.get('ragged'):
        for v in tunic.data.vertices:
            if v.co.z<1.08:v.co.z+=.025*math.sin(v.index*2.7)
        for cx,cz,w,h in [(-.16,1.42,.10,.13),(.17,1.18,.10,.08)]:
            verts=[];faces=[];n=5
            for j in range(n):
                z=cz+(j/(n-1)-.5)*h;rx,ry=(.25,.16) if z>1.30 else (.30,.22)
                for i in range(n):
                    x=cx+(i/(n-1)-.5)*w;verts.append((x,-ry*math.sqrt(max(.05,1-(x/rx)**2))-.010,z))
            for j in range(n-1):
                for i in range(n-1):a=j*n+i;faces.append((a,a+1,a+n+1,a+n))
            mesh=bpy.data.meshes.new('Mended cloth');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('COSTUME cloth patch',mesh);c.objects.link(o);o.parent=root;mesh.materials.append(linen);o.modifiers.new('Patch thickness','SOLIDIFY').thickness=.003

    if design.get('belt',True):
        rings('COSTUME belt',[(1.255,.248+belly,.17+belly),(1.29,.248+belly,.17+belly)],dark)
        box('COSTUME belt buckle',(.04,-.178-belly,1.272),(.045,.012,.035),iron,bevel=.004)
    else:
        # A simple rope tie, not a fantasy prison uniform.
        rings('COSTUME rope belt',[(1.25,.249,.169),(1.267,.249,.169)],leather)
        rod('COSTUME rope end',(.03,-.172,1.26),(.05,-.18,1.12),.007,leather)
    if design.get('apron'):
        apron_mat=material(asset+' apron',design['apron'],rough=.91,texture=125)
        if design.get('apron_stains'):
            nodes=apron_mat.node_tree.nodes;links=apron_mat.node_tree.links;noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=8;noise.inputs['Detail'].default_value=2
            ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.28;ramp.color_ramp.elements[0].color=(.09,.055,.025,1);ramp.color_ramp.elements[1].position=.43;ramp.color_ramp.elements[1].color=(*design['apron'],1);links.new(noise.outputs['Fac'],ramp.inputs['Fac']);links.new(ramp.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color'])
        verts=[];faces=[];n=13
        for j,(z,width,basew,depth) in enumerate([(1.66,.17,.278,.146),(1.46,.20,.26,.16),(1.28,.21,.245,.17),(1.11,.22,.28,.20),(.96,.225,.29,.23)]):
            for i in range(n):
                x=(i/(n-1)*2-1)*width;y=-depth*math.sqrt(max(.06,1-(x/basew)**2))-.014-.005*math.cos(i*math.pi/2)
                verts.append((x,y-belly,z))
        for j in range(4):
            for i in range(n-1):a=j*n+i;faces.append((a,a+n,a+n+1,a+1))
        mesh=bpy.data.meshes.new('Apron cloth');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('COSTUME apron',mesh);c.objects.link(o);o.parent=root;mesh.materials.append(apron_mat)
        for poly in mesh.polygons:poly.use_smooth=True
        sub=o.modifiers.new('Draped apron','SUBSURF');sub.levels=1;m=o.modifiers.new('Apron thickness','SOLIDIFY');m.thickness=.005
        rod('COSTUME apron neck tie',(-.15,-.13,1.67),(-.07,.02,1.83),.010,dark);rod('COSTUME apron neck tie',(.15,-.13,1.67),(.07,.02,1.83),.010,dark)
    if design.get('tabard'):
        livery=material(asset+' livery',design['tabard'],rough=.90,texture=140)
        for side in [-1,1]:
            verts=[];faces=[];n=13
            for z,w,d in [(1.78,.20,.14),(1.65,.24,.163),(1.35,.21,.174),(1.10,.23,.225),(.91,.23,.23)]:
                for i in range(n):
                    x=(i/(n-1)*2-1)*w;verts.append((x,side*(d*math.sqrt(max(.1,1-(x/(w+.07))**2))+.016),z))
            for j in range(4):
                for i in range(n-1):a=j*n+i;faces.append((a,a+1,a+n+1,a+n))
            mesh=bpy.data.meshes.new('Livery tabard');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('COSTUME livery tabard',mesh);c.objects.link(o);o.parent=root;mesh.materials.append(livery)
            for poly in mesh.polygons:poly.use_smooth=True
            o.modifiers.new('Tabard drape','SUBSURF').levels=1;o.modifiers.new('Tabard thickness','SOLIDIFY').thickness=.005
        for z,w in [(1.59,.10),(1.53,.08),(1.47,.06)]:box('COSTUME herald town bars',(0,-.185,z),(w,.009,.012),dark,bevel=.002)
    if design.get('collar'):
        rings('COSTUME linen stand collar',[(1.81,.098,.087),(1.855,.092,.080)],linen)
    if design.get('buttons'):
        for z in [1.40,1.48,1.56,1.64,1.72]:
            for (za,wa,da),(zb,wb,db) in zip(sections,sections[1:]):
                if za<=z<=zb:d=da+(db-da)*(z-za)/(zb-za);break
            ell('COSTUME coat button',(0,-d-.008,z),(.007,.004,.007),iron)
    if design.get('face_wrap'):
        rings('COSTUME face cloth',[(1.97,.09,.10),(2.02,.113,.148),(2.06,.116,.148)],cloth)
    if design.get('hair_style')=='tonsure':
        rings('HAIR tonsure rim',[(2.145,.125,.123),(2.18,.122,.119),(2.18,.108,.104),(2.145,.107,.105)],hair)
    elif design.get('hair_style')=='bald':
        # Very short scalp follows the skull without a cap silhouette.
        ell('HAIR close cropped',(0,.024,2.186),(.113,.104,.049),hair)
    else:
        rings('HAIR cap',[(2.145,.125,.123),(2.19,.126,.123),(2.23,.095,.09),(2.25,.055,.05),(2.255,.008,.008)],hair)
        ell('HAIR nape',(0,.12,2.12),(.105,.034,.074),hair)
    if design.get('hair_style')=='bun':ell('HAIR gathered bun',(0,.15,2.14),(.075,.06,.065),hair)
    if design.get('hair_style')=='long':
        ell('HAIR long nape',(0,.115,2.075),(.108,.04,.13),hair)
        for side in [-1,1]:ell('HAIR temple',(side*.113,.035,2.095),(.018,.065,.085),hair)
    if design.get('purse'):
        ell('COSTUME coin purse',(.27,-.02,1.18),(.07,.05,.10),leather)
        rod('COSTUME purse drawstring',(.24,-.02,1.28),(.27,-.02,1.24),.006,dark)
    if design.get('chapel_keeper'):
        wood=material(asset+' plain wooden pendant',(.19,.13,.06),rough=.87,texture=110)
        for o in c.objects:
            if o.name.startswith('Jack front placket'):o.data.materials.clear();o.data.materials.append(leather)
        box('COSTUME wooden cross upright',(0,-.183,1.60),(.016,.009,.11),wood,bevel=.002)
        box('COSTUME wooden cross bar',(0,-.184,1.62),(.064,.009,.015),wood,bevel=.002)
        for side in [-1,1]:rod('COSTUME pendant cord',(side*.07,-.11,1.82),(0,-.18,1.655),.003,dark)
        bpy.ops.mesh.primitive_torus_add(major_radius=.032,minor_radius=.004,major_segments=24,minor_segments=8,location=(-.245,-.13,1.22),rotation=(math.pi/2,0,0));o=bpy.context.object;o.name='COSTUME chapel key ring'
        for col in list(o.users_collection):col.objects.unlink(o)
        c.objects.link(o);o.parent=root;o.data.materials.append(iron)
        rod('COSTUME key loop',(-.235,-.045,1.27),(-.245,-.13,1.25),.008,leather)
        for i in range(3):
            x=-.245+(i-1)*.018;end=1.07-.012*(i%2)
            bpy.ops.mesh.primitive_torus_add(major_radius=.010,minor_radius=.0025,major_segments=16,minor_segments=6,location=(x,-.133,1.192),rotation=(math.pi/2,0,.25*(i-1)));o=bpy.context.object;o.name='COSTUME key bow'
            for col in list(o.users_collection):col.objects.unlink(o)
            c.objects.link(o);o.parent=root;o.data.materials.append(iron)
            rod('COSTUME iron key shaft',(x,-.133,1.183),(x,-.133,end),.004,iron)
            for z in [end,end+.015]:box('COSTUME iron key bit',(x+.008,-.133,z),(.020,.008,.008),iron,bevel=.001)
    if design.get('grooming'):
        rope=material(asset+' hemp lead rope',(.24,.17,.085),rough=.96,texture=160)
        for i in range(3):
            bpy.ops.mesh.primitive_torus_add(major_radius=.060,minor_radius=.005,major_segments=32,minor_segments=8,location=(-.25+i*.004,-.09-i*.007,1.14-i*.003),rotation=(math.pi/2,.05*i,0));o=bpy.context.object;o.name='COSTUME coiled horse lead'
            for col in list(o.users_collection):col.objects.unlink(o)
            c.objects.link(o);o.parent=root;o.data.materials.append(rope)
        rod('COSTUME lead rope belt loop',(-.245,-.06,1.27),(-.25,-.09,1.20),.009,leather)
    if design.get('herb_pouches'):
        for side in [-1,1]:
            ell('COSTUME herb pouch',(side*.28,-.035,1.18),(.06,.05,.09),leather)
            rod('COSTUME herb pouch tie',(side*.23,-.02,1.27),(side*.28,-.035,1.24),.006,dark)
    if design.get('bait_pouch'):
        ell('COSTUME bait pouch',(-.25,-.035,1.20),(.085,.06,.10),leather)
        rod('COSTUME bait pouch tie',(-.25,-.04,1.30),(-.25,-.04,1.24),.024,dark,r2=.012)
    if design.get('satchel'):
        box('COSTUME shoulder satchel',(.30,.015,1.14),(.19,.14,.25),leather,bevel=.025)
        box('COSTUME satchel flap',(.30,-.065,1.22),(.205,.02,.12),dark,bevel=.012)
        for side in [-1,1]:
            points=[]
            for i in range(13):
                x=-.20+.50*i/12;z=1.76-.51*i/12
                for (za,wa,da),(zb,wb,db) in zip(sections,sections[1:]):
                    if za<=z<=zb:
                        u=(z-za)/(zb-za);w=wa+(wb-wa)*u;d=da+(db-da)*u;break
                points.append((x,side*(d*math.sqrt(max(.05,1-(x/w)**2))+.012),z))
            for a,b in zip(points,points[1:]):rod('COSTUME fitted shoulder strap',a,b,.012,leather)
    if design.get('tool_belt'):

        for side in [-1,1]:
            box('COSTUME tool pouch',(side*.22,-.11,1.20),(.10,.065,.14),leather,bevel=.015)
            rod('COSTUME belt awl',(side*.24,-.14,1.34),(side*.24,-.14,1.17),.010,iron)
    if design.get('staves'):
        for i in range(3):
            rod('COSTUME bow stave bundle',(-.10+i*.08,.26,1.00),(-.15+i*.08,.29,1.84),.020,leather)
        for z in [1.12,1.60]:box('COSTUME stave tie',(-.045,.275,z),(.27,.045,.03),dark,bevel=.003)
    if design.get('beard')=='trimmed':
        verts=[];n=17
        for row in [0,1]:
            for i in range(n):
                t=i*math.pi/(n-1)
                verts.append(((.093 if row==0 else .073)*math.cos(t),-(.102 if row==0 else .087)*math.sin(t), (1.997+.025*abs(math.cos(t))) if row==0 else (1.935+.043*abs(math.cos(t)))))
        mesh=bpy.data.meshes.new('Trimmed beard');mesh.from_pydata(verts,[],[(i,i+1,i+1+n,i+n) for i in range(n-1)]);mesh.update();o=bpy.data.objects.new('FACE trimmed beard',mesh);c.objects.link(o);o.parent=root;mesh.materials.append(hair)
        for poly in mesh.polygons:poly.use_smooth=True
        sub=o.modifiers.new('Beard contour','SUBSURF');sub.levels=1
    elif design.get('beard')=='long':
        verts=[];faces=[];n=17
        for z,w,d in [(2.02,.09,.09),(1.96,.08,.11),(1.86,.06,.14),(1.77,.012,.15)]:
            for i in range(n):
                a=i*math.pi/(n-1);verts.append((w*math.cos(a),-.025-d*math.sin(a),z+.02*abs(math.cos(a))))
        for j in range(3):
            for i in range(n-1):a=j*n+i;faces.append((a,a+1,a+n+1,a+n))
        mesh=bpy.data.meshes.new('Long beard');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('FACE long beard',mesh);c.objects.link(o);o.parent=root;mesh.materials.append(hair)
        for poly in mesh.polygons:poly.use_smooth=True
        o.modifiers.new('Beard contour','SUBSURF').levels=1
    elif design.get('beard'):
        ell('FACE beard',(0,-.064,1.975),(.083,.054,.055),hair)
        for side in [-1,1]:ell('FACE beard jaw',(side*.078,-.033,1.995),(.025,.062,.053),hair)
    if design.get('moustache'):
        for side in [-1,1]:ell('FACE moustache',(side*.022,-.108,2.008),(.029,.012,.010),hair)
    hat=design.get('hat')
    if hat=='cap':
        cap=material(asset+' wool cap',design.get('cap_color',(.25,.073,.037)),rough=.98,texture=150)
        rings('COSTUME soft cap',[(2.15,.13,.123),(2.19,.145,.136),(2.26,.12,.12),(2.28,.02,.025)],cap)
        rings('COSTUME cap band',[(2.145,.133,.126),(2.17,.133,.126)],cap)
    if hat=='hood':
        hood=material(asset+' hood',design.get('cape',design['cloth']),rough=.96,texture=150)
        verts=[];faces=[];n=37
        for z,w,d in [(1.94,.09,.10),(2.02,.14,.14),(2.15,.145,.14),(2.24,.115,.115),(2.29,.04,.045),(2.30,.001,.001)]:
            for i in range(n):
                a=math.radians(-45+270*i/(n-1));verts.append((w*math.cos(a),d*math.sin(a)+.012,z))
        for j in range(5):
            for i in range(n-1):a=j*n+i;faces.append((a,a+1,a+n+1,a+n))
        mesh=bpy.data.meshes.new('Open travel hood');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('COSTUME open travel hood',mesh);c.objects.link(o);o.parent=root;mesh.materials.append(hood)
        for f in mesh.polygons:f.use_smooth=True
        o.modifiers.new('Hood folds','SUBSURF').levels=1;o.modifiers.new('Hood thickness','SOLIDIFY').thickness=.006
        rings('COSTUME hood shoulder cowl',[(1.76,.275,.18),(1.83,.18,.14),(1.94,.095,.105)],hood)
    if hat=='scholar':
        cap=material(asset+' scholar cap',(.07,.10,.16),rough=.94,texture=150)
        o=rings('COSTUME scholar cap',[(2.14,.14,.133),(2.18,.142,.135),(2.29,.105,.10),(2.40,.055,.05),(2.46,.012,.012)],cap,fold=.012)
        for v in o.data.vertices:
            if v.co.z>2.22:v.co.y+=(v.co.z-2.22)*.32
        rings('COSTUME scholar cap edge',[(2.14,.146,.14),(2.16,.146,.14)],leather)
    if hat=='headwrap':
        wrap=material(asset+' head cloth',(.35,.31,.23),rough=.98,texture=190)
        rings('COSTUME head cloth band',[(2.13,.13,.125),(2.17,.132,.127),(2.205,.125,.12)],wrap)
        ell('COSTUME head cloth knot',(0,.14,2.15),(.035,.025,.025),wrap)
        box('COSTUME head cloth tail',(0,.15,2.05),(.055,.008,.18),wrap,bevel=.01)
    if hat=='coif':
        coif=material(asset+' linen coif',(.38,.34,.26),rough=.98,texture=180)
        rings('COSTUME linen coif',[(2.135,.13,.125),(2.20,.132,.126),(2.25,.10,.09),(2.28,.01,.01)],coif)
        ell('COSTUME coif hair bun',(0,.14,2.13),(.078,.065,.075),coif)
    if hat=='livery':
        cap=material(asset+' livery cap',design.get('cap_color',(.10,.12,.14)),rough=.95,texture=130)
        rings('COSTUME flat livery cap',[(2.15,.13,.126),(2.18,.17,.16),(2.23,.16,.15),(2.26,.07,.06),(2.265,.008,.008)],cap)
        rings('COSTUME cap piping',[(2.151,.135,.13),(2.166,.14,.135)],leather)
    if hat in ['iron','nasal','leather']:
        rings('COSTUME work skullcap',[(2.145,.13,.123),(2.19,.132,.123),(2.26,.10,.09),(2.28,.015,.015)],leather if hat=='leather' else iron)
        rings('COSTUME cap leather edge',[(2.14,.133,.126),(2.165,.133,.126)],leather)
        if hat=='nasal':box('COSTUME helmet nasal',(0,-.14,2.075),(.020,.014,.15),iron,bevel=.003)
    if hat=='felt':
        felt=material(asset+' felt hat',(.12,.085,.055),rough=.97,texture=145)
        rings('COSTUME felt hat brim',[(2.145,.23,.21),(2.165,.23,.21),(2.19,.14,.135)],felt,fold=.015)
        rings('COSTUME felt hat crown',[(2.17,.141,.136),(2.29,.125,.12),(2.32,.08,.075),(2.325,.01,.01)],felt)
        rings('COSTUME felt hat ribbon',[(2.18,.145,.140),(2.205,.142,.137)],leather)
    if hat=='straw':
        straw=material(asset+' straw',(.34,.25,.11),rough=.95,texture=100)
        rings('COSTUME straw brim',[(2.15,.29,.27),(2.17,.29,.27),(2.19,.13,.13)],straw)
        rings('COSTUME straw crown',[(2.17,.132,.132),(2.27,.115,.115),(2.29,.02,.02)],straw)
        rings('COSTUME hat ribbon',[(2.18,.134,.134),(2.205,.131,.131)],leather)
    if design.get('irons'):
        for side in [-1,1]:
            rod('ANKLE iron cuff',(side*.145,0,.26),(side*.145,0,.31),.082,iron)
            wrist=Vector((side*.455,-.10,1.115));rod('HAND iron cuff',wrist+Vector((0,0,-.015)),wrist+Vector((0,0,.020)),.055,iron)
    if design.get('basket'):
        for z,r in [(1.06,.14),(1.20,.15),(1.35,.16)]:
            for i in range(12):
                t=i*math.tau/12;u=(i+1)*math.tau/12
                rod('COSTUME basket weave',(.14*math.cos(t),.27+.09*math.sin(t),z),(.14*math.cos(u),.27+.09*math.sin(u),z),.010,leather)
        for i in range(12):
            t=i*math.tau/12;rod('COSTUME basket upright',(.14*math.cos(t),.27+.09*math.sin(t),1.04),(.16*math.cos(t),.27+.10*math.sin(t),1.36),.011,leather)
        for side in [-1,1]:rod('COSTUME basket strap',(side*.18,.21,1.30),(side*.17,-.11,1.73),.012,dark)
    if design.get('cape'):
        cloak=material(asset+' travel cloak',design['cape'],rough=.94,texture=140)
        verts=[];faces=[];n=25
        for z,w,d in [(1.79,.24,.15),(1.68,.33,.20),(1.35,.34,.23),(.95,.35,.24)]:
            for i in range(n):
                a=math.pi*i/(n-1);verts.append((w*math.cos(a),d*math.sin(a)+.02+.009*math.cos(i*1.8),z))
        for j in range(3):
            for i in range(n-1):a=j*n+i;faces.append((a,a+1,a+n+1,a+n))
        mesh=bpy.data.meshes.new('Short travel cloak');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('COSTUME short travel cloak',mesh);c.objects.link(o);o.parent=root;mesh.materials.append(cloak)
        for f in mesh.polygons:f.use_smooth=True
        o.modifiers.new('Cloak folds','SUBSURF').levels=1;o.modifiers.new('Cloak thickness','SOLIDIFY').thickness=.007
    if design.get('civic_chain'):
        gold=material(asset+' civic gold',(.30,.21,.08),rough=.50,metal=.7)
        path=[Vector((-.14+.28*i/200,-.18-.02*math.sin(math.pi*i/200),1.50+.29*(2*i/200-1)**2)) for i in range(201)]
        distances=[0.]
        for a,b in zip(path,path[1:]):distances.append(distances[-1]+(b-a).length)
        for i in range(33):
            d=distances[-1]*i/32;k=next((j for j in range(1,len(path)) if distances[j]>=d),200);u=(d-distances[k-1])/max(1e-8,distances[k]-distances[k-1]);point=path[k-1].lerp(path[k],u)
            bpy.ops.mesh.primitive_torus_add(major_radius=.008,minor_radius=.002,major_segments=12,minor_segments=6,location=point,rotation=(math.pi/2,0,0));o=bpy.context.object;o.name='COSTUME civic chain link'
            for col in list(o.users_collection):col.objects.unlink(o)
            c.objects.link(o);o.parent=root;o.data.materials.append(gold)
            if i%2:o.rotation_euler=(Matrix.Rotation(math.pi/2,4,(path[k]-path[k-1]).normalized())@o.rotation_euler.to_matrix().to_4x4()).to_euler()
        ell('COSTUME civic seal',(0,-.215,1.47),(.035,.010,.04),gold)
    if design.get('fur_collar'):
        fur=material(asset+' rough fur',design['fur_collar'],rough=.99,texture=210)
        rings('COSTUME fur shoulder collar',[(1.74,.30,.20),(1.82,.24,.17),(1.88,.11,.09)],fur,fold=.035)
    if design.get('quiver'):
        o=rings('COSTUME arrow quiver',[(1.11,.060,.055),(1.65,.082,.075),(1.70,.083,.076),(1.70,.070,.063),(1.16,.048,.043)],leather);o.location=(.27,.23,0)
        o=rings('COSTUME quiver rim',[(1.66,.086,.079),(1.69,.086,.079)],dark);o.location=(.27,.23,0)
        feather=material(asset+' arrow fletching',(.38,.35,.28),rough=.98)
        for i in range(7):
            a=i*2.4;x=.27+.045*math.cos(a);y=.23+.04*math.sin(a);z=2.03+.035*math.sin(i)
            rod('COSTUME arrow shaft',(x,y,1.42),(x,y,z),.004,leather)
            for j in range(3):
                a=j*math.tau/3;verts=[(x,y,z-.01),(x,y,z-.12),(x+.022*math.cos(a),y+.022*math.sin(a),z-.055)]
                mesh=bpy.data.meshes.new('Arrow feather');mesh.from_pydata(verts,[],[(0,1,2)]);mesh.update();o=bpy.data.objects.new('COSTUME arrow feather',mesh);c.objects.link(o);o.parent=root;mesh.materials.append(feather);o.modifiers.new('Fletching thickness','SOLIDIFY').thickness=.001
        for side in [-1,1]:
            points=[(-.20+.45*i/12,side*(.15+.055*math.sin(math.pi*i/12)),1.77-.52*i/12) for i in range(13)]
            for a,b in zip(points,points[1:]):rod('COSTUME quiver strap',a,b,.012,leather)
    if design.get('royal'):
        gold=material(asset+' old gold',(.34,.225,.065),rough=.37,metal=.75)
        fur=material(asset+' ermine',(.48,.44,.35),rough=.99,texture=210)
        rings('COSTUME royal fur collar',[(1.735,.29,.18),(1.79,.29,.17),(1.84,.12,.10)],fur)
        rings('COSTUME gold circlet',[(2.185,.141,.134),(2.235,.141,.134)],gold)
        for i in range(8):
            angle=i*math.tau/8;da=.19
            verts=[(.142*math.cos(angle-da),.135*math.sin(angle-da),2.22),(.142*math.cos(angle+da),.135*math.sin(angle+da),2.22),(.143*math.cos(angle),.136*math.sin(angle),2.30)]
            mesh=bpy.data.meshes.new('Crown leaf');mesh.from_pydata(verts,[],[(0,1,2)]);mesh.update();o=bpy.data.objects.new('COSTUME crown leaf',mesh);c.objects.link(o);o.parent=root;mesh.materials.append(gold);o.modifiers.new('Forged crown leaf','SOLIDIFY').thickness=.009
        mantle=material(asset+' mantle',(.21,.025,.025),rough=.82,texture=135)
        verts=[];faces=[];n=25
        for z,w,d in [(1.80,.29,.17),(1.70,.37,.22),(1.35,.36,.24),(.95,.37,.25),(.58,.39,.26)]:
            for i in range(n):
                a=math.pi*i/(n-1);verts.append((w*math.cos(a),d*math.sin(a)+.025+.008*math.cos(i*1.8),z))
        for j in range(4):
            for i in range(n-1):a=j*n+i;faces.append((a,a+1,a+n+1,a+n))
        mesh=bpy.data.meshes.new('Royal mantle');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('COSTUME royal mantle',mesh);c.objects.link(o);o.parent=root;mesh.materials.append(mantle)
        for f in mesh.polygons:f.use_smooth=True
        o.modifiers.new('Mantle drape','SUBSURF').levels=1;o.modifiers.new('Mantle thickness','SOLIDIFY').thickness=.008
        for side in [-1,1]:
            ell('COSTUME mantle clasp',(side*.15,-.13,1.76),(.026,.012,.026),gold)
            rod('COSTUME gold seam',(side*.13,-.17,1.70),(side*.14,-.19,1.32),.006,gold)
    if design.get('arctarian'):
        import arctarian,importlib;importlib.reload(arctarian)
        arctarian.anatomy(ns,skin,iron,leather,design)
    if design.get('emralaani'):
        maskmat=material(asset+' breathing mask',(.075,.085,.083),rough=.65,metal=.2)
        ell('FACE breathing cup',(0,-.150,2.035),(.072,.045,.047),maskmat)
        for side in [-1,1]:
            rod('FACE mask strap',(side*.061,-.15,2.045),(side*.13,.07,2.055),.009,dark)
            for i in range(3):rod('FACE filter slit',(side*.028,-.192,2.020+i*.012),(side*.052,-.189,2.020+i*.012),.003,iron)
        # No wings on the adult caste: two healed removal scars on the back.
        scar=material(asset+' old wing scar',(.28,.23,.19),rough=.9)
        for side in ([] if design.get('flying') else [-1,1]):
            rod('COSTUME healed wing scar',(side*.14,.161,1.70),(side*.19,.17,1.48),.008,scar)
        for o in c.objects:
            if o.name.startswith(('Nose','Brow','Lower lip')):o.scale.y*=.65
    face=design.get('face_width',1)
    for o in c.objects:
        if o.name.startswith(('Anatomical head','Nose','Ear','Eye','Iris','Upper eyelid','Brow','Nostril','Mouth line','Lower lip','HAIR','FACE')):
            o.location.x*=face;o.scale.x*=face
            if o.name.startswith(('Brow','Mouth line')):o.data.materials.clear();o.data.materials.append(hair)
    leg_scale=design.get('leg_scale',1.0);upper_offset=1.16*(1-leg_scale)
    if leg_scale!=1:
        bpy.context.view_layer.update()
        for o in c.objects:
            if o.type!='MESH':continue
            matrix=o.matrix_world.copy()
            for v in o.data.vertices:
                point=matrix@v.co
                is_leg=o.name.startswith(('Tailored trouser','Trouser knee','Shaped boot','Boot upper','Boot sole','ANKLE'));point.z=point.z*leg_scale if is_leg and point.z<=1.16 else point.z-upper_offset
                if o.name.startswith(('Tailored trouser','Trouser knee','Shaped boot','Boot upper','Boot sole','ANKLE')):
                    side=-1 if point.x<0 else 1;point.x=side*.145+(point.x-side*.145)*.60;point.y*=.65
                v.co=point
            o.data.update();o.matrix_world=Matrix.Identity(4)
    controls,bindings,body=rig(c,root,leg_scale=leg_scale)
    if design.get('head_work_pitch') or design.get('head_control'):
        head=empty(c,'RIG_head',(0,0,1.88-upper_offset),body)
        prefixes=('Anatomical head','Nose','Ear','Eye','Iris','Upper eyelid','Brow','Nostril','Mouth line','Lower lip','HAIR','FACE','Neck','COSTUME face cloth','COSTUME soft cap','COSTUME cap ','COSTUME linen coif','COSTUME coif hair bun','COSTUME scholar cap','COSTUME head cloth','COSTUME flat livery cap','COSTUME work skullcap','COSTUME helmet nasal','COSTUME straw','COSTUME felt hat','COSTUME hat ribbon','COSTUME open travel hood','COSTUME crown','COSTUME gold circlet')
        for o in list(c.objects):
            if o.type in {'MESH','CURVE'} and o.name.startswith(prefixes):keep(o,head)
    tools={};hand=controls[1][5]
    if design.get('sword'):
        steel=material(asset+' sword steel',(.30,.32,.33),rough=.35,metal=.8)
        pivot=empty(c,'PROP sword',(0,-.012,-.07),controls[1][5]);tools['sword']=pivot
        for a,b,r,mat in [((0,0,.09),(0,0,-.035),.018,dark),((-.105,0,-.04),(.105,0,-.04),.012,iron)]:
            o=rod('TOOL sword hilt',a,b,r,mat);o.parent=pivot
        o=ell('TOOL sword pommel',(0,0,.105),(.028,.024,.028),iron);o.parent=pivot
        verts=[];faces=[]
        for z,w,t in [(-.05,.030,.006),(-.18,.029,.006),(-.58,.021,.004),(-.78,.001,.001)]:verts.extend([(w,0,z),(0,-t,z),(-w,0,z),(0,t,z)])
        for j in range(3):
            for i in range(4):a=j*4+i;b=j*4+(i+1)%4;faces.append((a,b,b+4,a+4))
        faces.extend([(3,2,1,0),(12,13,14,15)])
        mesh=bpy.data.meshes.new('Sword blade');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('TOOL sword blade',mesh);c.objects.link(o);o.parent=pivot;mesh.materials.append(steel)
    if design.get('shield'):
        pivot=empty(c,'PROP round shield',(0,-.10,-.08),controls[-1][5]);tools['shield']=pivot
        wood=material(asset+' shield wood',(.16,.10,.05),rough=.85,texture=80)
        verts=[(0,-.055,0)];faces=[];n=48
        for radius in [.12,.24]:
            for i in range(n):
                a=i*math.tau/n;verts.append((radius*math.cos(a),-.055*math.sqrt(max(0,1-(radius/.24)**2)),radius*math.sin(a)))
        for i in range(n):faces.append((0,1+i,1+(i+1)%n));faces.append((1+i,1+n+i,1+n+(i+1)%n,1+(i+1)%n))
        mesh=bpy.data.meshes.new('Domed round shield');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('TOOL wooden round shield',mesh);c.objects.link(o);o.parent=pivot;mesh.materials.append(wood);o.modifiers.new('Shield board thickness','SOLIDIFY').thickness=.016
        o=ell('TOOL shield boss',(0,-.067,0),(.065,.035,.065),iron);o.parent=pivot
        bpy.ops.mesh.primitive_torus_add(major_radius=.24,minor_radius=.009,major_segments=48,minor_segments=8,location=(0,0,0),rotation=(math.pi/2,0,0));o=bpy.context.object;o.name='TOOL shield iron rim'
        for col in list(o.users_collection):col.objects.unlink(o)
        c.objects.link(o);o.parent=pivot;o.data.materials.append(iron)
    if design.get('maul') or design.get('axe') or design.get('pickaxe'):
        axe=bool(design.get('axe'));pick=bool(design.get('pickaxe'))
        pivot=empty(c,'PROP mining pick' if pick else ('PROP felling axe' if axe else 'PROP heavy maul'),(0,-.012,-.06),controls[1][5]);tools['two_hand']=pivot;pivot['second_hand_grip']=(0,.012,.27);pivot['shaft_limits']=(-.16,.87)
        if axe or pick:pivot.rotation_euler.z=-.35
        shaft=rod('TOOL ash weapon handle',(0,0,-.16),(0,0,.87),.023,leather,r2=.027);shaft.parent=pivot
        if pick:
            steel=material(asset+' pick steel',(.19,.21,.21),rough=.50,metal=.8)
            verts=[];faces=[];n=12
            for i in range(25):
                y=-.30+.56*i/24;z=.83-.13*(abs(y)/.30)**1.5;r=.023*max(.08,1-abs(y)/.31)
                for j in range(n):
                    a=j*math.tau/n;verts.append((r*math.cos(a),y,z+r*math.sin(a)))
            for i in range(24):
                for j in range(n):a=i*n+j;b=i*n+(j+1)%n;faces.append((a,b,b+n,a+n))
            mesh=bpy.data.meshes.new('Curved pick head');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('TOOL forged mining pick',mesh);c.objects.link(o);o.parent=pivot;mesh.materials.append(steel)
            for poly in mesh.polygons:poly.use_smooth=True
            o=box('TOOL pick socket',(0,0,.83),(.060,.075,.11),iron,bevel=.008);o.parent=pivot
        elif axe:
            steel=material(asset+' axe steel',(.25,.27,.27),rough=.43,metal=.8)
            outline=[(.045,.75),(-.07,.73),(-.23,.68),(-.26,.70),(-.26,.89),(-.22,.91),(-.08,.86),(.045,.86)]
            verts=[];faces=[]
            for side in [-1,1]:
                for y,z in outline:verts.append((side*(.001 if y<-.22 else .012),y,z))
            faces.extend([tuple(reversed(range(8))),tuple(range(8,16))])
            for i in range(8):j=(i+1)%8;faces.append((i,j,j+8,i+8))
            mesh=bpy.data.meshes.new('Forged axe blade');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('TOOL broad axe blade',mesh);c.objects.link(o);o.parent=pivot;mesh.materials.append(steel)
            o=box('TOOL axe socket',(0,.018,.80),(.055,.065,.14),iron,bevel=.008);o.parent=pivot
        else:
            head=box('TOOL heavy hammer head',(0,0,.83),(.16,.25,.13),iron,bevel=.012);head.parent=pivot
            for y in [-.127,.127]:
                o=box('TOOL hammer striking face',(0,y,.83),(.17,.012,.14),iron,bevel=.007);o.parent=pivot
        for z in [-.10,-.06,-.02,.02,.06]:
            o=rings('TOOL weapon grip binding',[(z,.026,.026),(z+.009,.026,.026)],dark);o.parent=pivot
    if design.get('mug'):
        pivot=empty(c,'PROP mug',(0,-.01,-.135),hand);tools['mug']=pivot
        # Hollow wooden tankard, rim and curved handle.
        cup=rings('TOOL tankard',[(0,.058,.058),(.13,.068,.068),(.14,.068,.068),(.14,.052,.052),(.025,.045,.045)],leather)
        cup.parent=pivot;cup.matrix_parent_inverse=Matrix.Identity(4);cup.location=(0,-.04,0)
        for z in [.018,.12]:
            band=rings('TOOL tankard hoop',[(z,.068,.068),(z+.012,.068,.068)],iron);band.parent=pivot;band.location=(0,-.04,0)
        bpy.ops.mesh.primitive_torus_add(major_radius=.043,minor_radius=.009,major_segments=20,minor_segments=8,location=(.075,-.04,.075),rotation=(math.pi/2,0,0))
        o=bpy.context.object;o.name='TOOL tankard handle'
        for col in list(o.users_collection):col.objects.unlink(o)
        c.objects.link(o);o.parent=pivot;o.data.materials.append(iron)
    if design.get('sack'):
        pivot=empty(c,'PROP grain sack',(0,-.38,1.30),root);tools['sack']=pivot
        burlap=material(asset+' burlap',(.26,.20,.12),rough=.98,texture=190)
        sack=ell('TOOL grain sack',(0,0,0),(.21,.14,.24),burlap);sack.parent=pivot;sack.location=(0,0,0)
        tie=rod('TOOL sack tied neck',(0,0,.20),(0,0,.28),.055,burlap,r2=.027);tie.parent=pivot;tie.location=(0,0,.24)
    if design.get('mallet'):
        pivot=empty(c,'PROP mallet',(0,-.012,-.06),controls[1][5]);tools['mallet']=pivot
        pivot['shaft_limits']=(-.34,.08)
        if design.get('smithing'):pivot.rotation_euler.z=math.pi/2
        shaft=rod('TOOL mallet handle',(0,0,.08),(0,0,-.34),.018,leather);shaft.parent=pivot
        head=box('TOOL mallet head',(0,0,-.30),(.15,.065,.07),iron,bevel=.008);head.parent=pivot
    if design.get('cargo'):
        pivot=empty(c,'PROP wrapped cargo',(-.18,-.43,1.34),root);tools['cargo']=pivot
        burlap=material(asset+' wrapped cargo cloth',(.30,.26,.18),rough=.97,texture=180)
        o=box('TOOL trade parcel',(0,0,0),(.26,.20,.18),burlap,bevel=.025);o.parent=pivot
        for a,b in [((-.13,0,.095),(.13,0,.095)),((0,-.10,.095),(0,.10,.095)),((0,-.10,-.09),(0,.10,-.09)),((0,-.10,-.09),(0,-.10,.095)),((0,.10,-.09),(0,.10,.095))]:
            o=rod('TOOL parcel cord',a,b,.005,dark);o.parent=pivot
    if design.get('warehouse'):
        pivot=empty(c,'PROP warehouse crate',(.36,-.35,1.44),root);tools['crate']=pivot
        wood=material(asset+' crate wood',(.18,.115,.055),rough=.9,texture=80)
        o=box('TOOL crate floor',(0,0,-.12),(.36,.25,.02),wood,bevel=.003);o.parent=pivot
        for x in [-.1675,.1675]:
            for y in [-.1075,.1075]:
                o=box('TOOL crate corner',(x,y,0),(.025,.025,.26),wood,bevel=.003);o.parent=pivot
        for z in [-.075,0,.075]:
            for side in [-1,1]:
                o=box('TOOL crate front board',(0,side*.12,z),(.36,.018,.05),wood,bevel=.003);o.parent=pivot
                o=box('TOOL crate side board',(side*.17,0,z),(.02,.25,.05),wood,bevel=.003);o.parent=pivot
        for x in [-.09,.09]:
            for side in [-1,1]:
                o=box('TOOL crate iron strap',(x,side*.132,0),(.015,.004,.25),iron,bevel=.001);o.parent=pivot
    if design.get('ledger'):
        pivot=empty(c,'PROP open ledger',(0,-.50,1.34),root);tools['ledger']=pivot
        paper=material(asset+' parchment pages',(.52,.45,.30),rough=.96,texture=150);ink=material(asset+' writing ink',(.04,.03,.02),rough=.95)
        o=box('TOOL ledger binding',(0,0,-.025),(.34,.24,.020),leather,bevel=.005);o.parent=pivot
        for side in [-1,1]:
            verts=[(0,-.11,.035),(side*.16,-.11,0),(side*.16,.11,0),(0,.11,.035)]
            mesh=bpy.data.meshes.new('Ledger paper');mesh.from_pydata(verts,[],[(3,2,1,0) if side<0 else (0,1,2,3)]);mesh.update();o=bpy.data.objects.new('TOOL ledger page',mesh);c.objects.link(o);o.parent=pivot;mesh.materials.append(paper);o.modifiers.new('Page block','SOLIDIFY').thickness=.018
            for j in range(9):
                x=side*.08;z=.035*(1-abs(x)/.16)+.002;o=box('TOOL handwritten ledger lines',(x,-.085+j*.021,z),(.115-(j%3)*.01,.002,.001),ink,bevel=.0003);o.parent=pivot;o.rotation_euler.y=side*math.atan(.035/.16)
        pivot=empty(c,'PROP quill',(0,-.012,-.06),controls[1][5]);tools['quill']=pivot
        feather=material(asset+' quill feather',(.48,.44,.35),rough=.9)
        o=rod('TOOL quill shaft',(0,0,.25),(0,0,-.16),.003,feather,r2=.0007);o.parent=pivot
        verts=[];faces=[]
        for i in range(13):
            t=i/12;w=.028*math.sin(math.pi*t);z=.04+.21*t
            verts.extend([(-w,0,z),(w,0,z)])
        for i in range(12):a=i*2;faces.append((a,a+1,a+3,a+2))
        mesh=bpy.data.meshes.new('Quill feather');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('TOOL quill feather',mesh);c.objects.link(o);o.parent=pivot;mesh.materials.append(feather);o.modifiers.new('Feather thickness','SOLIDIFY').thickness=.001
    if design.get('warehouse'):
        tools['ledger'].parent=tools['crate'];tools['ledger'].location=(0,0,.165)
    if design.get('herbalism'):
        pivot=empty(c,'PROP herb mortar',(.10,-.03,-.12),controls[-1][5]);tools['mortar']=pivot
        stone=material(asset+' mortar stone',(.24,.21,.17),rough=.95,texture=60)
        o=rings('TOOL stone mortar',[(0,.08,.08),(.12,.115,.115),(.14,.115,.115),(.14,.09,.09),(.04,.05,.05)],stone);o.parent=pivot
        herbs=material(asset+' crushed herbs',(.08,.14,.04),rough=.95)
        for i in range(6):
            a=i*2.4;o=ell('TOOL crushed herb leaves',(.04*math.cos(a),.04*math.sin(a),.075),(.028,.018,.009),herbs);o.parent=pivot
        pivot=empty(c,'PROP herb pestle',(0,-.012,-.07),controls[1][5]);tools['pestle']=pivot
        wood=material(asset+' pestle wood',(.16,.10,.04),rough=.85,texture=90)
        o=rod('TOOL pestle handle',(0,0,.10),(0,0,-.18),.018,wood);o.parent=pivot
        o=ell('TOOL pestle foot',(0,0,-.20),(.035,.035,.05),wood);o.parent=pivot
    if design.get('stirring'):
        pivot=empty(c,'PROP wooden stirring spoon',(0,-.012,-.07),controls[1][5]);tools['spoon']=pivot
        wood=material(asset+' spoon wood',(.20,.12,.055),rough=.86,texture=90)
        o=rod('TOOL stirring spoon handle',(0,0,.12),(0,0,-.43),.012,wood);o.parent=pivot
        o=ell('TOOL stirring spoon bowl',(0,0,-.48),(.045,.018,.075),wood);o.parent=pivot
    if design.get('smithing'):
        pivot=empty(c,'PROP smith tongs',(0,-.012,-.07),controls[-1][5]);tools['tongs']=pivot
        for side in [-1,1]:
            for a,b in [((side*.028,0,.055),(0,.020,-.18)),((0,.020,-.18),(side*.024,.07,-.35))]:
                o=rod('TOOL forged tongs',a,b,.008,iron);o.parent=pivot
        pivot=empty(c,'PROP forged blank',(-.02,-.77,1.29),root);tools['blank']=pivot
        o=box('TOOL iron workpiece',(0,0,0),(.30,.06,.02),iron,bevel=.003);o.parent=pivot
    if design.get('plate'):
        pivot=empty(c,'PROP work plate',(0,0,-.06),controls[-1][5]);tools['plate']=pivot
        plate=ell('TOOL armor plate',(0,0,0),(.16,.105,.016),iron);plate.parent=pivot
    if design.get('bow'):
        pivot=empty(c,'PROP bow',(0,-.012,.07),controls[-1][5]);tools['bow']=pivot
        half=design.get('bow_length',.84)/2
        points=[(0,-half+i*2*half/16,-.13*math.sin(math.pi*i/16)+.025*math.sin(3*math.pi*i/16)) for i in range(17)]
        verts=[];faces=[];n=12
        for x,y,z in points:
            for j in range(n):
                a=j*math.tau/n;verts.append((x+.013*math.cos(a),y,z+.013*math.sin(a)))
        for i in range(16):
            for j in range(n):a=i*n+j;b=i*n+(j+1)%n;faces.append((a,b,b+n,a+n))
        mesh=bpy.data.meshes.new('Flexible bow limbs');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('TOOL bow limbs',mesh);c.objects.link(o);o.parent=pivot;mesh.materials.append(leather);tools['bow_limb']=o
        for poly in mesh.polygons:poly.use_smooth=True
        o.shape_key_add(name='Basis');bend=o.shape_key_add(name='Draw')
        for i,v in enumerate(bend.data):
            u=(i//n)/16;v.co.y*=.93;v.co.z+=.07*abs(2*u-1)**2

        grip=rod('TOOL bow grip',(0,-.05,-.13),(0,.05,-.13),.022,dark);grip.parent=pivot
        verts=[]
        for y,z in [(-half,0),(0,.025),(half,0)]:verts.extend([(-.002,y,z),(.002,y,z)])
        mesh=bpy.data.meshes.new('Bowstring');mesh.from_pydata(verts,[],[(0,1,3,2),(2,3,5,4)]);mesh.update();o=bpy.data.objects.new('TOOL bowstring',mesh);c.objects.link(o);o.parent=pivot;mesh.materials.append(linen);tools['bow_string']=o
        o.shape_key_add(name='Basis');draw=o.shape_key_add(name='Draw');draw.data[2].co.z=.40;draw.data[3].co.z=.40
        for i in [0,1,4,5]:draw.data[i].co.y*=.93;draw.data[i].co.z=.07
    if design.get('knife'):
        pivot=empty(c,'PROP knife',(0,-.012,-.09),controls[1][5]);tools['knife']=pivot
        grip=rod('TOOL knife grip',(0,0,.08),(0,0,-.035),.017,leather);grip.parent=pivot
        blade=box('TOOL knife blade',(0,0,-.15),(.035,.008,.22),iron,bevel=.003);blade.parent=pivot
    if design.get('leatherwork'):
        pivot=empty(c,'PROP leather workpiece',(0,-.53,1.21),root);tools['leatherwork']=pivot
        verts=[(-.22,-.14,0),(.17,-.13,0),(.23,.02,0),(.15,.14,0),(-.19,.12,0),(-.25,.02,0)]
        mesh=bpy.data.meshes.new('Leather offcut');mesh.from_pydata(verts,[],[tuple(range(6))]);mesh.update();o=bpy.data.objects.new('TOOL leather offcut',mesh);c.objects.link(o);o.parent=pivot;mesh.materials.append(linen if design.get('weaving') else leather);o.modifiers.new('Hide thickness','SOLIDIFY').thickness=.009
        pivot=empty(c,'PROP sewing needle',(0,-.012,-.08),controls[1][5]);tools['needle']=pivot
        o=rod('TOOL sewing needle',(0,0,.01),(0,0,-.10),.003,iron);o.parent=pivot
        o=rod('TOOL sewing thread',(0,0,0),(0,0,1),.002,linen);o.parent=root;tools['thread']=o
    if design.get('provisions'):
        pivot=empty(c,'PROP provisions parcel',(.16,-.53,1.20),root);tools['parcel']=pivot
        o=box('TOOL wrapped provisions',(0,0,0),(.28,.23,.14),linen,bevel=.035);o.parent=pivot
        for a,b in [((-.15,0,.08),(.15,0,.08)),((0,-.12,.08),(0,.12,.08))]:
            o=rod('TOOL parcel cord',a,b,.006,dark);o.parent=pivot
        o=ell('TOOL parcel knot',(0,0,.09),(.016,.016,.012),dark);o.parent=pivot
        pivot=empty(c,'PROP weighing balance',(-.22,-.53,1.65),root);tools['balance']=pivot
        o=rod('TOOL balance handle',(0,0,0),(0,0,-.14),.008,iron);o.parent=pivot
        o=rod('TOOL balance beam',(-.18,0,-.14),(.18,0,-.14),.009,iron);o.parent=pivot
        for side in [-1,1]:
            for dy in [-.06,.06]:
                o=rod('TOOL scale chain',(side*.18,0,-.14),(side*.18,dy,-.32),.003,iron);o.parent=pivot
            o=ell('TOOL balance pan',(side*.18,0,-.33),(.08,.08,.012),iron);o.parent=pivot
            o=ell('TOOL scale contents',(side*.18,0,-.315),(.045,.04,.022),leather);o.parent=pivot
    if design.get('seize'):
        pivot=empty(c,'PROP concealed object',(0,-.60,1.43),root);tools['concealed']=pivot
        wrap=material(asset+' object wrapping',(.12,.115,.095),rough=.95,texture=150)
        o=box('TOOL concealed wrapped object',(0,0,0),(.23,.12,.12),wrap,bevel=.023);o.parent=pivot
        for x in [-.06,.06]:
            o=rod('TOOL object tie',(x,-.065,0),(x,.065,0),.005,dark);o.parent=pivot
    if design.get('flax') or design.get('grain'):
        pivot=empty(c,'PROP sickle',(0,-.012,-.06),controls[1][5]);tools['sickle']=pivot
        if design.get('grain'):pivot.rotation_euler.z=math.pi
        o=rod('TOOL sickle handle',(0,0,.07),(0,0,-.22),.019,leather);o.parent=pivot
        verts=[];faces=[]
        for i in range(25):
            a=math.radians(210+i*195/24)
            for r in [.14,.118+.021*(i/24)**3]:verts.append((.10+r*math.cos(a),0,-.16+r*math.sin(a)))
        for i in range(24):a=i*2;faces.append((a,a+1,a+3,a+2))
        mesh=bpy.data.meshes.new('Forged sickle');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('TOOL sickle blade',mesh);c.objects.link(o);o.parent=pivot;mesh.materials.append(iron);o.modifiers.new('Blade thickness','SOLIDIFY').thickness=.004
        grain=design.get('grain',False);pivot=empty(c,'PROP grain sheaf' if grain else 'PROP flax sheaf',(.02,-.82,.50),root);tools['flax']=pivot
        stalk=material(asset+' grain straw' if grain else asset+' flax stalk',(.25,.19,.07) if grain else (.17,.20,.07),rough=.94)
        flower=material(asset+' ripe grain' if grain else asset+' flax flower',(.30,.23,.10) if grain else (.12,.18,.30),rough=.9);seed_data=None;count=9 if grain else 13
        for i in range(count):
            a=i*2.4;r=(.035 if grain else .022)*math.sqrt(i/(count-1));x=r*math.cos(a);y=r*math.sin(a);top=(.42 if grain else .29)+.035*math.sin(i*3)
            o=rod('TOOL grain stalk' if grain else 'TOOL flax stalk',(x,y,-.20 if grain else -.27),(x*2,y*2,top),.0035,stalk);o.parent=pivot
            if grain:
                for k in range(5):
                    for side in [-1,1]:
                        loc=(x*2+side*.006,y*2,top+k*.014)
                        if seed_data is None:o=ell('TOOL wheat kernel',loc,(.006,.008,.014),flower);o.parent=pivot;seed_data=o.data
                        else:
                            o=bpy.data.objects.new('TOOL wheat kernel',seed_data);c.objects.link(o);o.parent=pivot;o.location=loc;o.scale=(.006,.008,.014)
                        o.rotation_euler.y=side*.5
                        if k%2==0:
                            o=rod('TOOL wheat awn',(x*2+side*.008,y*2,top+k*.014),(x*2+side*.021,y*2,top+k*.014+.045),.001,stalk,r2=.0005);o.parent=pivot
            elif i%2==0:o=ell('TOOL flax flower',(x*2,y*2,top),(.013,.012,.007),flower);o.parent=pivot
    if design.get('gathering'):
        pivot=empty(c,'PROP picked herbs',(0,-.012,-.075),controls[1][5]);tools['picked_herbs']=pivot
        green=material(asset+' gathered leaves',(.075,.12,.035),rough=.95)
        for i in range(5):
            x=(i-2)*.012
            o=rod('TOOL herb stem',(x,0,-.045),(x*1.6,0,.10),.0028,green);o.parent=pivot
            for z,side in [(.025,-1),(.065,1)]:
                o=ell('TOOL herb leaf',(x+side*.018,0,z),(.026,.008,.013),green);o.parent=pivot
    if design.get('weaving'):
        pivot=empty(c,'PROP weaving shuttle',(0,-.012,-.09),controls[1][5]);tools['shuttle']=pivot
        o=ell('TOOL weaving shuttle',(0,0,0),(.105,.027,.022),leather);o.parent=pivot
        o=rod('TOOL shuttle thread',(-.03,0,0),(.03,0,0),.030,linen);o.parent=pivot
        for side in [-1,1]:
            o=rod('COSTUME belt bobbin',(side*.19,-.17,1.29),(side*.19,-.17,1.15),.016,leather)
            # Already rigged: attach belt accessories directly to the torso.
            keep(o,body)
    if design.get('scroll'):
        parchment=material(asset+' parchment',(.52,.43,.27),rough=.96,texture=180)
        pivot=empty(c,'PROP rolled proclamation',(0,-.02,-.09),controls[-1][5]);tools['scroll_roll']=pivot
        o=rod('TOOL rolled parchment',(-.14,0,0),(.14,0,0),.025,parchment);o.parent=pivot
        o=rod('TOOL scroll ribbon',(0,0,-.028),(0,0,.028),.007,leather);o.parent=pivot
        pivot=empty(c,'PROP open proclamation',(0,-.045,0),controls[-1][5]);tools['scroll']=pivot
        o=box('TOOL proclamation sheet',(.13,0,-.08),(.30,.004,.30),parchment,bevel=.002);o.parent=pivot
        for z in [-.23,.07]:
            o=rod('TOOL parchment rolled edge',(-.02,0,z),(.28,0,z),.013,parchment);o.parent=pivot
        ink=material(asset+' ink',(.04,.035,.025),rough=.95)
        for i in range(8):
            o=box('TOOL proclamation writing',(.12,-.004,.025-i*.027),(.20-(i%3)*.025,.002,.0025),ink,bevel=.0005);o.parent=pivot
        seal=material(asset+' wax seal',(.20,.025,.018),rough=.65)
        o=ell('TOOL wax seal',(.22,-.01,-.19),(.022,.006,.022),seal);o.parent=pivot
    if design.get('grooming'):
        brush=empty(c,'PROP horse brush',(0,-.04,-.09),controls[1][5]);tools['horse_brush']=brush
        wood=material(asset+' brush wood',(.17,.10,.04),rough=.84,texture=100);bristles=material(asset+' brush bristles',(.065,.05,.025),rough=.97)
        o=box('TOOL horse brush back',(0,-.025,0),(.11,.045,.075),wood,bevel=.012);o.parent=brush
        o=rod('TOOL horse brush hand strap',(-.042,.025,0),(.042,.025,0),.012,leather);o.parent=brush
        for i in range(5):
            for j in range(4):
                x=-.040+i*.020;z=-.025+j*.017;o=rod('TOOL brush bristle tuft',(x,-.045,z),(x,-.092,z),.0035,bristles,r2=.005);o.parent=brush
    if design.get('arct_rescue'):
        import arct_rescue,importlib;importlib.reload(arct_rescue)
        tools.update(arct_rescue.create(ns,root,controls))
    if design.get('milling'):
        import mill_work,importlib;importlib.reload(mill_work)
        tools.update(mill_work.create(ns,root,controls))
    if design.get('baking'):
        import bake_work,importlib;importlib.reload(bake_work)
        tools.update(bake_work.create(ns,root,controls))
    if design.get('brewing'):
        import brew_work,importlib;importlib.reload(brew_work)
        tools.update(brew_work.create(ns,root,controls))
    if design.get('beekeeping'):
        import hive_work,importlib;importlib.reload(hive_work)
        tools.update(hive_work.create(ns,root,controls))
    if design.get('tanning'):
        import tan_work,importlib;importlib.reload(tan_work)
        tools.update(tan_work.create(ns,root,controls))
    if design.get('healing'):
        import heal_work,importlib;importlib.reload(heal_work)
        tools.update(heal_work.create(ns,root,body,controls))
    if design.get('carpentry'):
        import wood_work,importlib;importlib.reload(wood_work)
        tools.update(wood_work.create(ns,root,body,controls))
    if design.get('arct_workshop'):
        import arct_workshop,importlib;importlib.reload(arct_workshop)
        tools.update(arct_workshop.create(ns,root,body,controls))
    if design.get('arct_probe'):
        casing=material(asset+' probe casing',(.095,.11,.095),rough=.64,metal=.55)
        ceramic=material(asset+' probe ceramic',(.24,.23,.15),rough=.73)
        pivot=empty(c,'PROP arctarian mining probe',(0,-.28,1.42),root);tools['arct_probe']=pivot
        o=rod('TOOL ribbed probe body',(0,-.38,0),(0,.04,0),.11,casing,r2=.10);o.parent=pivot
        for j in range(6):
            y=-.36+j*.047;r=.13+.017*math.sin(j*math.pi/5);n=32;verts=[];faces=[]
            for yy,rr in [(y-.009,r),(y+.009,r),(y+.009,r*.68),(y-.009,r*.68)]:
                for i in range(n):a=i*math.tau/n;verts.append((rr*math.cos(a),yy,rr*math.sin(a)))
            for k in range(4):
                for i in range(n):faces.append((k*n+i,k*n+(i+1)%n,((k+1)%4)*n+(i+1)%n,((k+1)%4)*n+i))
            mesh=bpy.data.meshes.new('Probe annular rib');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('TOOL probe induction rib',mesh);c.objects.link(o);o.parent=pivot;mesh.materials.append(ceramic if j%2 else iron)
        for x,y,z in [(.18,.008,-.12),(-.18,-.262,-.08)]:
            o=rod('TOOL probe handgrip',(x,y,z+.06),(x,y,z-.06),.021,dark);o.parent=pivot
            o=rod('TOOL probe grip bracket',(x,y,z+.06),(x*.5,y,0),.012,casing);o.parent=pivot
        o=ell('TOOL probe recessed aperture',(0,-.391,0),(.095,.012,.095),dark);o.parent=pivot
        o=box('TOOL probe control ridge',(.07,.02,.085),(.055,.075,.025),ceramic,bevel=.006);o.parent=pivot
    if design.get('flying'):
        membrane=material(asset+' wing membrane',(.19,.19,.13),rough=.64)
        shader=membrane.node_tree.nodes.get('Principled BSDF');shader.inputs['Alpha'].default_value=.78;shader.inputs['Transmission Weight'].default_value=.12
        veins=material(asset+' wing veins',(.23,.22,.15),rough=.82)
        outline=[(0,0,0),(.20,.04,.18),(.55,.16,.28),(.95,.35,.20),(1.12,.52,.04),(.96,.57,-.06),(.82,.51,-.12),(.65,.42,-.09),(.50,.35,-.19),(.32,.22,-.13),(.18,.12,-.17),(.05,.04,-.08)]
        for side in [-1,1]:
            pivot=empty(c,'PROP flight wing '+str(side),(side*.12,.125,1.58-upper_offset),body);tools['wing'+str(side)]=pivot
            verts=[(side*.40,.22,.02)]+[(side*x,y,z) for x,y,z in outline];faces=[(0,i+1,(i+1)%len(outline)+1) for i in range(len(outline))]
            if side<0:faces=[tuple(reversed(f)) for f in faces]
            mesh=bpy.data.meshes.new('Veined flight membrane');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('WING continuous membrane',mesh);c.objects.link(o);o.parent=pivot;mesh.materials.append(membrane);o.modifiers.new('Membrane thickness','SOLIDIFY').thickness=.002
            for index in [2,3,4,6,8,10]:
                end=Vector(outline[index]);start=Vector((.02,0,0));middle=start.lerp(end,.45)+Vector((0,-.01,.025))
                for a,b,r1,r2 in [(start,middle,.008,.005),(middle,end,.005,.0025)]:
                    a=a.copy();b=b.copy();a.x*=side;b.x*=side;o=rod('WING supporting vein',a,b,r1,veins,r2=r2);o.parent=pivot
            for a,b in zip(outline[:4],outline[1:5]):
                a=Vector(a);b=Vector(b);a.x*=side;b.x*=side;o=rod('WING leading edge',a,b,.006,veins,r2=.004);o.parent=pivot
        pivot=empty(c,'PROP servant strap',(0,-.012,-.06),controls[-1][5]);tools['servant_strap']=pivot
        o=box('TOOL leather repair strap',(.11,0,0),(.22,.025,.009),leather,bevel=.003);o.parent=pivot
        pivot=empty(c,'PROP servant awl',(0,-.012,-.06),controls[1][5]);tools['servant_awl']=pivot
        o=rod('TOOL awl grip',(0,0,.025),(0,0,-.045),.012,leather);o.parent=pivot
        o=rod('TOOL awl point',(0,0,-.045),(0,0,-.10),.004,iron,r2=.001);o.parent=pivot
    mount=None
    if design.get('mounted'):
        import equine,importlib;importlib.reload(equine)
        mount_root=empty(c,'MOUNT_ROOT',(0,0,0),None)
        mount=equine.make(ns,mount_root,unicorn=True,tack=True)
    animate(s,c,root,body,controls,bindings,tools,task,design,mount=mount)
    s['sprite_asset']=asset;s['character_design']=json.dumps(design,ensure_ascii=False);s['sprite_pixels_per_unit']=DENSITY
    clips=json.loads(s['sprite_export_json'])['clips'];s.frame_set(clips['idle']['start']);bpy.context.view_layer.update()
    # Embed only shared tools and the one per-object source.
    for name in ['render_8_directions.py','sprite_pipeline.py','humanoid.py','arctarian.py','arct_workshop.py','arct_rescue.py','mill_work.py','bake_work.py','brew_work.py','hive_work.py','tan_work.py','heal_work.py','wood_work.py','equine.py','validate_equine.py','validate_mounted.py','validate_flight.py','validate_arctarian.py','validate_workshop.py','validate_rescue.py','death_drape.py','validate_humanoid.py','validate_cloth.py','validate_grips.py']:
        path=ROOT/'3d/_shared'/name
        if not path.exists():path=ROOT/'3d'/asset/name
        if path.exists():
            text=bpy.data.texts.get(name) or bpy.data.texts.new(name);text.clear();text.write(path.read_text())
    bpy.ops.outliner.orphans_purge(do_local_ids=True,do_linked_ids=False,do_recursive=True)
    folder=ROOT/'3d'/asset;folder.mkdir(exist_ok=True)
    text=bpy.data.texts.get('build.py') or bpy.data.texts.new('build.py');text.clear();text.write((folder/'build.py').read_text())
    bpy.ops.wm.save_as_mainfile(filepath=str(folder/(asset+'.blend')),compress=True)
    return s

def empty(c,name,loc,parent):
    o=bpy.data.objects.new(name,None);c.objects.link(o);o.parent=parent;o.location=loc;o.empty_display_size=.06;return o

def keep(o,parent):
    bpy.context.view_layer.update();m=o.matrix_world.copy();o.parent=parent;o.matrix_world=m

def rig(c,root,leg_scale=1.0):
    off=1.16*(1-leg_scale)
    body=empty(c,'RIG_body',(0,0,0),root);objects=[o for o in c.objects if o.type in {'MESH','CURVE'}];body['pelvis_z']=1.16*leg_scale
    for o in objects:keep(o,body)
    chains={};bindings=[]
    for side in [-1,1]:
        hip=empty(c,'RIG_hip'+str(side),(side*.145,0,1.16*leg_scale),root);hip['leg_scale']=leg_scale;knee=empty(c,'RIG_knee'+str(side),(0,0,-.48*leg_scale),hip);ankle=empty(c,'RIG_ankle'+str(side),(0,0,-.49*leg_scale),knee)
        shoulder=empty(c,'RIG_shoulder'+str(side),(side*.335,0,1.745-off),body);elbow=empty(c,'RIG_elbow'+str(side),(side*.072,-.005,-.34),shoulder);hand=empty(c,'RIG_hand'+str(side),(side*.048,-.095,-.29),elbow)
        chains[side]=(hip,knee,ankle,shoulder,elbow,hand)
        for o in objects:
            if o.type!='MESH':continue
            p=[o.matrix_world@v.co for v in o.data.vertices];center=sum(v.x for v in p)/len(p)
            if (center<0)!=(side<0):continue
            if o.name.startswith(('Tailored trouser thigh','Trouser knee')):prox,dist,centerz,width,ra,rb=hip,knee,.68*leg_scale,.17*leg_scale,Vector((side*.145,0,1.16*leg_scale)),Vector((side*.145,0,.68*leg_scale))
            elif o.name.startswith('Continuous wool sleeve'):prox,dist,centerz,width,ra,rb=shoulder,elbow,1.405-off,.18,Vector((side*.335,0,1.745-off)),Vector((side*.407,-.005,1.405-off))
            else:
                if o.name.startswith(('Shaped boot calf','ANKLE')):keep(o,knee)
                elif o.name.startswith(('Boot upper','Boot sole')):keep(o,ankle)
                elif o.name.startswith(('Leather bracer','COSTUME rolled cuff','ARCT arm implant')):keep(o,elbow)
                elif o.name.startswith(('Wrist','Hand','Knuckle','Curled finger','Thumb','HAND')):keep(o,hand)
                continue
            keep(o,root);o.matrix_world=Matrix.Identity(4)
            for v,point in zip(o.data.vertices,p):v.co=point
            o.shape_key_add(name='Basis');w=[max(0,min(1,(centerz+width*.5-point.z)/width)) for point in p];w=[x*x*(3-2*x) for x in w]
            bindings.append((o,p,w,prox,dist,Matrix.Translation(-ra),Matrix.Translation(-rb)))
    return chains,bindings,body

def smooth(x):x=max(0,min(1,x));return x*x*(3-2*x)
def phase_curve(t,keys):
    for (a,va),(b,vb) in zip(keys,keys[1:]):
        if t<=b:return va+(vb-va)*smooth((t-a)/(b-a))
    return keys[-1][1]

def vector_curve(t,keys):
    for (a,va),(b,vb) in zip(keys,keys[1:]):
        if t<=b:return Vector(va).lerp(Vector(vb),smooth((t-a)/(b-a)))
    return Vector(keys[-1][1])

def ik(ch,y,z,hipz,side,hip_y=0):
    hip,knee,ankle,*_=ch;ls=hip.get('leg_scale',1.0);hipz*=ls;y*=ls;z*=ls;hip_y*=ls;hip.location=(side*.145,hip_y,hipz);y-=hip_y;down=hipz-z;dist=math.hypot(y,down);a,b=.48*ls,.49*ls
    if not .011*ls<dist<.97*ls:raise ValueError(('unreachable foot',side,y,z,hipz,dist))
    bend=math.pi-math.acos(max(-1,min(1,(a*a+b*b-dist*dist)/(2*a*b))));off=math.acos(max(-1,min(1,(a*a+dist*dist-b*b)/(2*a*dist))));h=math.atan2(y,down)-off
    hip.rotation_euler=(h,0,0);knee.rotation_euler=(bend,0,0);ankle.rotation_euler=(-h-bend,0,0)

def seated_leg(ch,side):
    hip,knee,ankle,*_=ch;a=Vector((side*.145,0,1.135));tip=Vector((side*.46,-.13,.43));u=(tip-a).normalized();d=(tip-a).length;L1=.48;L2=.49;along=(L1*L1-L2*L2+d*d)/(2*d)
    pole=Vector((side*.75,-.65,0));pole=(pole-u*pole.dot(u)).normalized();joint=a+u*along+pole*math.sqrt(max(0,L1*L1-along*along))
    hip.location=a;hq=Vector((0,0,-L1)).rotation_difference(joint-a);hip.rotation_euler=hq.to_euler();kq=Vector((0,0,-L2)).rotation_difference(hq.inverted()@(tip-joint));knee.rotation_euler=kq.to_euler();ankle.rotation_euler=(hq@kq).inverted().to_euler()

def torso_pivot(body):
    p=Vector((0,0,body.get('pelvis_z',1.16)));return p-body.rotation_euler.to_matrix()@p

def reach(ch,side,target,q=None):
    # Solve in root coordinates so body proportions never change grip contact.
    body=ch[3].parent;original=body.location.copy()
    if not body.get('_pose_pivoted',False):body.location+=torso_pivot(body)
    shoulder,elbow,hand=ch[3:];bpy.context.view_layer.update();root=ch[0].parent;invroot=root.matrix_world.inverted();target=Vector(target)
    origin=invroot@shoulder.matrix_world.translation;delta=target-origin
    u=Vector((side*.072,-.005,-.34));v=Vector((side*.048,-.095,-.29));a,b=u.length,v.length;d=min(delta.length,a+b-.005);direction=delta.normalized();target=origin+direction*d
    pole=Vector((side*.28,-.3,.03));pole=(pole-direction*pole.dot(direction)).normalized();along=(a*a-b*b+d*d)/(2*d);joint=origin+direction*along+pole*math.sqrt(max(0,a*a-along*along))
    parentq=(invroot@body.matrix_world).to_quaternion();shoulder.rotation_euler=u.rotation_difference(parentq.inverted()@(joint-origin)).to_euler();bpy.context.view_layer.update()
    elbow.rotation_euler=v.rotation_difference((invroot@shoulder.matrix_world).to_quaternion().inverted()@(target-joint)).to_euler();bpy.context.view_layer.update()
    if q is not None:hand.rotation_euler=((invroot@elbow.matrix_world).to_quaternion().inverted()@q).to_euler()
    body.location=original

def hold_second_hand(ch,tool,point):
    body=ch[-1][3].parent;original=body.location.copy()
    if not body.get('_pose_pivoted',False):body.location+=torso_pivot(body)
    bpy.context.view_layer.update();root=ch[-1][0].parent;matrix=root.matrix_world.inverted()@tool.matrix_world
    target=matrix@Vector(point);q=matrix.to_quaternion();body.location=original
    reach(ch[-1],-1,target,q)

def animate(s,c,root,body,ch,bindings,tools,task,design,mount=None):
    clips={};cursor=10
    for name,entry in task['animations'].items():
        if entry.get('optional'):continue
        clips[name]=dict(start=cursor,frames=design.get('clip_frames',{}).get(name,entry.get('suggestedFrames',8)),fps=design.get('clip_fps',{}).get(name,16 if design.get('mounted') and name=='run' else entry.get('fps',10)),loop=entry['loop']);cursor+=clips[name]['frames']+5
    fingers=[o for side in [-1,1] for o in ch[side][5].children if o.name.startswith(('Curled finger','Knuckle'))] if design.get('royal') or design.get('scroll') or design.get('seize') or design.get('butchering') or design.get('stirring') or design.get('ledger') or design.get('arct_rescue') or design.get('grooming') else []
    rest_fingers={o:(o.location.copy(),o.scale.copy()) for o in fingers}
    index_fingers=set()
    if design.get('warehouse') or design.get('arct_rescue'):
        for prefix in ['Curled finger','Knuckle']:
            options=[o for o in fingers if o.parent==ch[1][5] and o.name.startswith(prefix)]
            if options:index_fingers.add(min(options,key=lambda o:o.location.x))
    sew_clip='sewing' if design.get('weaving') else 'work'
    skirts=[o for o in c.objects if o.name=='COSTUME long skirt']
    aprons=[o for o in c.objects if o.name=='COSTUME apron']
    apron_points={}
    for o in aprons:o.shape_key_add(name='Basis');apron_points[o]=[v.co.copy() for v in o.data.vertices]
    skirt_points={}
    for o in skirts:o.shape_key_add(name='Basis');skirt_points[o]=[v.co.copy() for v in o.data.vertices]
    capes=[o for o in c.objects if o.name in ['COSTUME royal mantle','COSTUME short travel cloak']]
    head=bpy.data.objects.get('RIG_head')
    animated=([head] if head else [])+capes+fingers+[root,body]+[o for chain in ch.values() for o in chain]+list(tools.values())
    for name,cfg in clips.items():
        span=cfg['frames'] if cfg['loop'] else cfg['frames']-1
        for j in range(span*4+1):
            frame=cfg['start']+j*.25;t=j/(span*4);p=t*math.tau;root.location=(0,0,0);root.rotation_euler=(0,0,0);root.scale=(design.get('width',1),1,design.get('height',1));body.location=(0,0,-.02);body.rotation_euler=(design.get('stoop',0),0,0);body.scale=(1,1,1)
            if head:head.rotation_euler=(0,0,0)
            body['_pose_pivoted']=False
            for o in capes:o.scale=(1,1,1)
            for o,(loc,scale) in rest_fingers.items():o.location=loc;o.scale=scale
            for side,chain in ch.items():
                for o in chain:o.rotation_euler=(0,0,0)
                ik(chain,0,.174,1.135,side);chain[4].rotation_euler.x=-.06
            if name=='idle':
                body.scale.z=1+.003*math.sin(p)
                if design.get('drunk'):body.rotation_euler=(.045*math.sin(p),.07*math.cos(p),.045*math.sin(p))
                if design.get('exhausted'):
                    body.rotation_euler=(.20+.008*math.sin(p),0,0);body.location.z=-.055
                    for side,chain in ch.items():
                        ik(chain,-.015 if side==-1 else .025,.174,1.10,side)
                        reach(chain,side,(side*.18,-.30,1.18+.004*math.sin(p)),Matrix.Identity(4).to_quaternion())
            elif name in ['walk','run']:
                run=name=='run';bob=-.035+.024*math.cos(2*p) if run else -.014+.010*math.cos(2*p);flight=.055*max(0,math.cos(2*p)) if run else 0;body.location.z=bob;body.rotation_euler.x=design.get('stoop',0)+(.12 if run else .015);body.rotation_euler.z=.025*math.sin(p)
                if design.get('drunk'):body.rotation_euler.y=.075*math.sin(p);body.rotation_euler.z+=.05*math.cos(p)
                for side,chain in ch.items():
                    ph=(t+(0 if side==-1 else .5))%1
                    if run:
                        stride=.21 if design.get('female') or design.get('robe') else .27
                        if ph<.36:y=-stride+2*stride*ph/.36;lift=0
                        else:u=(ph-.36)/.64;y=stride-2*stride*u;lift=(.13 if design.get('female') or design.get('robe') else .24)*math.sin(math.pi*u)**1.25
                    else:y=-.205*math.sin(ph*math.tau);lift=.105*max(0,math.cos(ph*math.tau))**1.5
                    ik(chain,y,.174+lift+flight,(1.08 if run else 1.135)+bob+flight,side);chain[3].rotation_euler.x=side*(.42 if run else .20)*math.sin(p);chain[4].rotation_euler.x=-.42 if run else -.07
            elif name=='attack':
                strike=phase_curve(t,[(0,0),(.27,0),(.55,1),(.72,1),(1,0)]);body.rotation_euler.z=.18*(1-2*strike);body.rotation_euler.x=.04;body.location.z=-.035
                for side,chain in ch.items():ik(chain,-.08 if side==-1 else .06,.174,1.11,side)
                q=Matrix.Rotation(-math.pi/2,4,'X').to_quaternion();reach(ch[-1],-1,(-.23,-.26,1.52),q);reach(ch[1],1,Vector((.42,-.15,1.48)).lerp(Vector((.08,-.61,1.60)),strike),q)
            elif name=='death':
                collapse=smooth(t/.55);fall=smooth((t-.22)/.65);
                for o in capes:o.scale.y=1-.4*fall
                root.rotation_euler.x=-math.pi/2*fall;root.location.y=-.65*fall;body.location.z=-.02-.10*collapse
                for side,chain in ch.items():ik(chain,(.03 if side==-1 else -.035)*collapse,.174,1.135-.18*collapse*(1-fall),side);chain[3].rotation_euler.x=-.24*collapse*(1-fall);chain[3].rotation_euler.y=-side*.32*fall;chain[4].rotation_euler.x=-.25*collapse*(1-fall)
            elif name=='drink':
                sip=phase_curve(t,[(0,0),(.35,1),(.70,1),(1,0)]);body.rotation_euler.y=.025*math.sin(math.pi*t);reach(ch[1],1,Vector((.455,-.10,1.115)).lerp(Vector((.08,-.21,1.97)),sip));tools['mug'].rotation_euler.x=-.85*sip
            elif name=='work':
                if 'sack' in tools:
                    lower=.5-.5*math.cos(p);body.rotation_euler.x=.10+.14*lower;body.location.z=-.02-.12*lower
                    for side,chain in ch.items():ik(chain,0,.174,1.11-.12*lower,side)
                    tools['sack'].location=(0,-.66-.08*lower,1.30-.38*lower)
                    for side in [-1,1]:reach(ch[side],side,(side*.18,-.65-.08*lower,1.45-.38*lower),Matrix.Identity(4).to_quaternion())
                else:
                    body.rotation_euler.x=.16+.04*math.sin(p)
                    for side in [-1,1]:reach(ch[side],side,(side*.18,-.45,1.25+.06*math.sin(p+side)))
            if 'ledger' in tools:
                if name=='work':
                    gesture=phase_curve(t,[(0,0),(.50,0),(.65,1),(.85,1),(1,0)]);body.rotation_euler.x=.035
                    reach(ch[-1],-1,(-.18,-.44,1.26),Matrix.Rotation(-math.pi/2,4,'X').to_quaternion())
                    x=.06+.045*math.sin(2*p);z=1.34+.035*(1-abs(x)/.16)+.22
                    reach(ch[1],1,Vector((x,-.50+.05*math.sin(p),z)).lerp(Vector((.29,-.25,1.62)),gesture),Matrix.Identity(4).to_quaternion())
                    for o,(loc,scale) in rest_fingers.items():
                        if o.parent==ch[-1][5]:
                            target=loc.copy();target.y=-.012;target.z=-.125 if o.name.startswith('Curled') else -.09;o.location=loc.lerp(target,.75);o.scale.z=scale.z*1.375
                for key in ['ledger','quill']:
                    for o in tools[key].children:
                        o.hide_render=name!='work';o.hide_viewport=name!='work';o.keyframe_insert('hide_render',frame=frame);o.keyframe_insert('hide_viewport',frame=frame)
            if 'cargo' in tools:
                if name=='work':
                    loc=vector_curve(t,[(0,(-.18,-.43,1.34)),(.22,(0,-.35,1.50)),(.30,(0,-.35,1.50)),(.50,(.18,-.43,1.34)),(.72,(0,-.35,1.50)),(.80,(0,-.35,1.50)),(1,(-.18,-.43,1.34))]);tools['cargo'].location=loc;body.rotation_euler.x=.035
                    for side in [-1,1]:reach(ch[side],side,loc+Vector((side*.14,0,.06)),Matrix.Rotation(-side*math.pi/2,4,'Z').to_quaternion())
                for o in tools['cargo'].children:
                    o.hide_render=name!='work';o.hide_viewport=name!='work';o.keyframe_insert('hide_render',frame=frame);o.keyframe_insert('hide_viewport',frame=frame)
            if 'crate' in tools:
                if name=='work':
                    box=vector_curve(t,[(0,(0,-.62,1.48)),(.18,(0,-.46,1.48)),(.92,(0,-.46,1.48)),(1,(0,-.62,1.48))]);tools['crate'].location=box
                    body.location=(0,0,-.02);body.rotation_euler=(.035,0,0)
                    left_carry=box+Vector((-.205,0,.04));right_carry=box+Vector((.205,0,.04));support=box+Vector((-.02,.06,-.18));outside=box+Vector((-.23,0,-.18));high=box+Vector((.205,0,.36))
                    if t<=.26:left=left_carry
                    elif t<.40:left=vector_curve(t,[(.26,tuple(left_carry)),(.32,tuple(outside)),(.40,tuple(support))])
                    elif t<=.92:left=support
                    else:left=vector_curve(t,[(.92,tuple(support)),(.96,tuple(outside)),(1,tuple(left_carry))])
                    point=phase_curve(t,[(0,0),(.58,0),(.70,1),(.79,1),(.82,0),(1,0)])
                    x=box.x+.087+.02*math.sin(p);z=box.z+.165+.035*(1-abs(x-.027-box.x)/.16)+.155;reading=Vector((x,box.y+.04*math.sin(2*p),z));record=reading.lerp(Vector((.55,-.25,1.61)),point)
                    if t<=.40 or t>=.92:right=right_carry
                    elif t<.48:right=vector_curve(t,[(.40,tuple(right_carry)),(.44,tuple(high)),(.48,tuple(record))])
                    elif t<=.82:right=record
                    else:right=vector_curve(t,[(.82,tuple(record)),(.86,tuple(high)),(.92,tuple(right_carry))])
                    palm=phase_curve(t,[(0,0),(.26,0),(.32,1),(.96,1),(1,0)]);index=phase_curve(t,[(0,0),(.40,0),(.48,1),(.82,1),(.92,0),(1,0)])
                    lq=Matrix.Rotation(math.pi/2,4,'Z').to_quaternion().slerp(Matrix.Rotation(-math.pi/2,4,'X').to_quaternion(),palm)
                    rq=Matrix.Rotation(-math.pi/2,4,'Z').to_quaternion().slerp(Matrix.Identity(4).to_quaternion().slerp(Matrix.Rotation(-math.pi/2,4,'Y').to_quaternion(),point),index)
                    reach(ch[-1],-1,left,lq);reach(ch[1],1,right,rq)
                    for o,(loc,scale) in rest_fingers.items():
                        amount=(.75*palm) if o.parent==ch[-1][5] else (index if o in index_fingers else 0)
                        target=loc.copy();target.y=-.012;target.z=-.125 if o.name.startswith('Curled') else -.09;o.location=loc.lerp(target,amount);o.scale=scale;o.scale.z=scale.z*(1+.5*amount)
                for o in tools['crate'].children:
                    if o.type not in {'MESH','CURVE'}:continue
                    o.hide_render=name!='work';o.hide_viewport=name!='work';o.keyframe_insert('hide_render',frame=frame);o.keyframe_insert('hide_viewport',frame=frame)
                for o in tools['quill'].children:
                    o.hide_render=True;o.hide_viewport=True;o.keyframe_insert('hide_render',frame=frame);o.keyframe_insert('hide_viewport',frame=frame)
            if 'mortar' in tools:
                if name=='work':
                    body.rotation_euler.x=.03
                    reach(ch[-1],-1,(-.15,-.43,1.25),Matrix.Identity(4).to_quaternion())
                    reach(ch[1],1,(-.05+.025*math.sin(p),-.46+.025*math.cos(p),1.49+.06*(.5-.5*math.cos(p))),Matrix.Identity(4).to_quaternion())
                for key in ['mortar','pestle']:
                    for o in tools[key].children:
                        o.hide_render=name!='work';o.hide_viewport=name!='work';o.keyframe_insert('hide_render',frame=frame);o.keyframe_insert('hide_viewport',frame=frame)
            if 'spoon' in tools:
                if name=='work':
                    body.rotation_euler=(.04,0,.02*math.sin(p))
                    reach(ch[1],1,(.11+.10*math.cos(p),-.50+.07*math.sin(p),1.50),Matrix.Identity(4).to_quaternion())
                    reach(ch[-1],-1,(-.24,-.55,1.22),Matrix.Rotation(math.pi/2,4,'X').to_quaternion())
                    for o,(loc,scale) in rest_fingers.items():
                        if o.parent==ch[-1][5]:
                            target=loc.copy();target.y=-.012;target.z=-.125 if o.name.startswith('Curled') else -.09;o.location=loc.lerp(target,.7);o.scale.z=scale.z*1.35
                for o in tools['spoon'].children:
                    o.hide_render=name!='work';o.hide_viewport=name!='work';o.keyframe_insert('hide_render',frame=frame);o.keyframe_insert('hide_viewport',frame=frame)
            if design.get('butchering') and name=='work':
                angle=1.15;body.rotation_euler=(angle,0,0);pivot=Vector((0,0,1.28));body.location=pivot-Matrix.Rotation(angle,4,'X')@pivot+Vector((0,.36,-.65));body['_pose_pivoted']=True
                for side,chain in ch.items():ik(chain,0,.174,.60,side,hip_y=.36)
                reach(ch[-1],-1,(-.12,-.57,.45),Matrix.Rotation(math.pi/2,4,'X').to_quaternion())
                reach(ch[1],1,(.16+.04*math.sin(p),-.60,.60+.025*math.sin(p)),Matrix.Identity(4).to_quaternion())
                for o,(loc,scale) in rest_fingers.items():
                    if o.parent==ch[-1][5]:
                        target=loc.copy();target.y=-.012;target.z=-.125 if o.name.startswith('Curled') else -.09;o.location=loc.lerp(target,.8);o.scale.z=scale.z*1.4
            if design.get('gathering'):
                if name=='work':
                    crouch=phase_curve(t,[(0,0),(.20,1),(.42,1),(.68,0),(1,0)])
                    angle=1.15*crouch;pivot=Vector((0,0,1.28));body.rotation_euler=(angle,0,0);body.location=pivot-Matrix.Rotation(angle,4,'X')@pivot+Vector((0,.36*crouch,-.02-.63*crouch));body['_pose_pivoted']=True
                    for side,chain in ch.items():ik(chain,0,.174,1.135-.535*crouch,side,hip_y=.36*crouch)
                    left=Vector((-.30,-.20,1.20)).lerp(Vector((-.15,-.30,.67)),crouch)
                    right=vector_curve(t,[(0,(.27,-.15,1.22)),(.22,(.16,-.65,.29)),(.34,(.16,-.65,.29)),(.43,(.16,-.65,.40)),(.68,(.28,-.22,1.32)),(.81,(.28,-.12,1.24)),(.88,(.28,-.12,1.24)),(1,(.27,-.15,1.22))])
                    reach(ch[-1],-1,left,Matrix.Identity(4).to_quaternion());reach(ch[1],1,right,Matrix.Identity(4).to_quaternion())
                for o in tools['picked_herbs'].children:
                    hidden=name!='work' or t<.34 or t>.81;o.hide_render=hidden;o.hide_viewport=hidden;o.keyframe_insert('hide_render',frame=frame);o.keyframe_insert('hide_viewport',frame=frame)
            if design.get('fishing') and name=='work':
                pull=phase_curve(t,[(0,0),(.34,0),(.65,1),(.80,1),(1,0)])
                body.rotation_euler.x=-.06*pull
                reach(ch[1],1,Vector((.11,-.48,1.25)).lerp(Vector((.20,-.20,1.62)),pull),Matrix.Identity(4).to_quaternion())
                reach(ch[-1],-1,Vector((-.13,-.40,1.30)).lerp(Vector((-.10,-.57,1.55)),pull),Matrix.Identity(4).to_quaternion())
            if 'two_hand' in tools and name!='death':
                chopping=name=='work' and bool(design.get('woodcutting') or design.get('mining'))
                if name=='attack' or chopping:
                    keys=[(0,(.06,-.38,1.22),-.08),(.32,(.21,-.28,1.80),-.28),(.47,(.21,-.28,1.80),-.28),(.70,(.03,-.25,1.48),1.50),(.80,(.03,-.25,1.48),1.50),(1,(.06,-.38,1.22),-.08)]
                    if chopping:
                        keys=[(0,(.06,-.30,1.20),-.08),(.28,(.21,-.28,1.65),-.28),(.40,(.21,-.28,1.65),-.28),(.62,(0,-.20,1.10),1.10),(.75,(0,-.20,1.10),1.10),(1,(.06,-.30,1.20),-.08)]
                        if design.get('mining'):keys=[(0,(.06,-.30,1.20),-.08),(.24,(.18,-.30,1.65),.08),(.42,(.18,-.30,1.65),.08),(.63,(0,-.20,1.18),1.05),(.75,(0,-.20,1.16),1.10),(1,(.06,-.30,1.20),-.08)]
                        body.location=(0,.10,-.14)
                        for side,chain in ch.items():ik(chain,0,.174,1.0,side,hip_y=.10)
                    for (a,pa,ra),(b,pb,rb) in zip(keys,keys[1:]):
                        if t<=b:
                            u=smooth((t-a)/(b-a));q=Matrix.Rotation(ra,4,'X').to_quaternion().slerp(Matrix.Rotation(rb,4,'X').to_quaternion(),u);body.rotation_euler.x=(.18 if chopping else .08)+.08*math.sin(math.pi*t);reach(ch[1],1,Vector(pa).lerp(Vector(pb),u),q);break
                else:
                    right=(.06,-.38,1.31) if name=='run' else (.06,-.38,1.22)
                    q=(Matrix.Rotation(-.30,4,'Y')@Matrix.Rotation(-.08,4,'X')).to_quaternion();reach(ch[1],1,right,q)
                hold_second_hand(ch,tools['two_hand'],(0,.012,.27))
            if 'sword' in tools and name=='attack':
                keys=[(0,(.36,-.18,1.28),-.25),(.26,(.25,-.06,1.94),2.5),(.59,(.08,-.56,1.46),-1.3),(.72,(.08,-.56,1.46),-1.3),(1,(.36,-.18,1.28),-.25)]
                for (a,pa,ra),(b,pb,rb) in zip(keys,keys[1:]):
                    if t<=b:
                        u=smooth((t-a)/(b-a));q=Matrix.Rotation(ra,4,'X').to_quaternion().slerp(Matrix.Rotation(rb,4,'X').to_quaternion(),u);reach(ch[1],1,Vector(pa).lerp(Vector(pb),u),q);break
            if 'shield' in tools and name!='death':
                target=(-.27,-.38,1.50) if name=='attack' else ((-.28,-.25,1.43) if name=='run' else (-.30,-.20,1.36))
                reach(ch[-1],-1,target,Matrix.Identity(4).to_quaternion())
            if 'bow' in tools:
                if name in ['attack','work']:
                    tools['bow'].location=(0,-.012,.07);tools['bow'].rotation_euler=(0,0,0)
                else:
                    tools['bow'].location=(0,-.142,-.06);tools['bow'].rotation_euler=(math.pi/2,0,0)
                draw=0
                if name=='attack':
                    draw=phase_curve(t,[(0,0),(.55,1),(.68,1),(.76,0),(1,0)]);q=Matrix.Rotation(-math.pi/2,4,'X').to_quaternion()
                    body.rotation_euler=(0,0,.12);reach(ch[-1],-1,(-.08,-.64,1.90),q);reach(ch[1],1,(-.035,-.503+.40*draw,1.90),q)
                if name=='work' and not design.get('butchering'):
                    body.rotation_euler.x=.10;reach(ch[-1],-1,(-.18,-.45,1.39),Matrix.Rotation(-math.pi/2,4,'X').to_quaternion())
                    reach(ch[1],1,(.13,-.54,1.49+.13*math.sin(p)),Matrix.Rotation(math.pi/2,4,'Y').to_quaternion())
                for part in tools['bow'].children:
                    if part!=tools['bow_string']:
                        hidden=name=='work' and bool(design.get('butchering'));part.hide_render=hidden;part.hide_viewport=hidden;part.keyframe_insert('hide_render',frame=frame);part.keyframe_insert('hide_viewport',frame=frame)
                bend=tools['bow_limb'].data.shape_keys.key_blocks['Draw'];bend.value=draw;bend.keyframe_insert('value',frame=frame)
                drawkey=tools['bow_string'].data.shape_keys.key_blocks['Draw'];drawkey.value=draw;drawkey.keyframe_insert('value',frame=frame)
                string=tools['bow_string'];string.hide_render=name=='work';string.hide_viewport=name=='work';string.keyframe_insert('hide_render',frame=frame);string.keyframe_insert('hide_viewport',frame=frame)
            if name=='work' and design.get('royal'):
                gesture=phase_curve(t,[(0,0),(.22,0),(.48,1),(.65,1),(1,0)])
                body.location.z=-.455;body.rotation_euler=(.01,0,.025*math.sin(p))
                for side,chain in ch.items():ik(chain,-.44,.174,.70,side)
                reach(ch[-1],-1,(-.29,-.15,1.00),Matrix.Identity(4).to_quaternion())
                reach(ch[1],1,Vector((.29,-.15,1.00)).lerp(Vector((.22,-.47,1.36)),gesture),Matrix.Rotation(-math.pi/2*gesture,4,'X').to_quaternion())
                for o,(loc,scale) in rest_fingers.items():
                    amount=gesture if o.parent==ch[1][5] else .6;target=loc.copy();target.y=-.012;target.z=-.125 if o.name.startswith('Curled') else -.09;o.location=loc.lerp(target,amount);o.scale.z=scale.z*(1+.5*amount)
            if 'scroll' in tools:
                if name=='work':
                    call=phase_curve(t,[(0,0),(.15,0),(.38,1),(.64,1),(1,0)])
                    body.rotation_euler.x=-.02;body.rotation_euler.z=.025*math.sin(p)
                    reach(ch[-1],-1,(-.23,-.40,1.63),Matrix.Identity(4).to_quaternion())
                    reach(ch[1],1,Vector((.32,-.22,1.40)).lerp(Vector((.10,-.23,2.055)),call),Matrix.Identity(4).to_quaternion())
                    for o,(loc,scale) in rest_fingers.items():
                        amount=.75*call if o.parent==ch[1][5] else 0;target=loc.copy();target.y=-.012;target.z=-.125 if o.name.startswith('Curled') else -.09;o.location=loc.lerp(target,amount);o.scale.z=scale.z*(1+.5*amount)
                for key in ['scroll','scroll_roll']:
                    for o in tools[key].children:
                        hidden=(name!='work') if key=='scroll' else (name=='work');o.hide_render=hidden;o.hide_viewport=hidden;o.keyframe_insert('hide_render',frame=frame);o.keyframe_insert('hide_viewport',frame=frame)
            if 'balance' in tools:
                if name=='work':
                    put=phase_curve(t,[(0,0),(.32,0),(.48,1),(.82,1),(1,0)])
                    b=Vector((-.22,-.53,1.65)).lerp(Vector((-.30,-.53,1.41)),put);tools['balance'].location=b;tools['balance'].rotation_euler.y=.06*math.sin(p)*(1-put)
                    tie=phase_curve(t,[(0,0),(.43,0),(.58,1),(.80,1),(1,0)])
                    body.rotation_euler.x=.08+.10*tie
                    left=b.lerp(Vector((.06,-.53,1.34+.025*math.sin(2*p))),tie)
                    reach(ch[-1],-1,left,Matrix.Identity(4).to_quaternion())
                    reach(ch[1],1,(.20,-.53,1.40-.06*tie+.025*math.sin(2*p)),Matrix.Identity(4).to_quaternion())
                for key in ['balance','parcel']:
                    for o in tools[key].children:
                        o.hide_render=name!='work';o.hide_viewport=name!='work';o.keyframe_insert('hide_render',frame=frame);o.keyframe_insert('hide_viewport',frame=frame)
            if 'concealed' in tools:
                opened=0
                if name=='attack':
                    take=phase_curve(t,[(0,0),(.20,0),(.42,1),(.62,1),(.82,.15),(1,0)])
                    body.rotation_euler.x=.08*take
                    for side in [-1,1]:reach(ch[side],side,(side*.14,-.25-.38*take,1.32+.20*take),Matrix.Rotation(-math.pi/2,4,'X').to_quaternion())
                    opened=phase_curve(t,[(0,.25),(.20,.8),(.42,.8),(.65,0),(1,.25)])
                elif name=='work':
                    body.rotation_euler.x=.03
                    take=phase_curve(t,[(0,0),(.25,0),(.55,1),(.80,1),(1,0)])
                    loc=Vector((0,-.60,1.43)).lerp(Vector((0,-.25,1.19)),take);tools['concealed'].location=loc
                    for side in [-1,1]:reach(ch[side],side,(side*.14,loc.y+.02,loc.z+.07),Matrix.Identity(4).to_quaternion())
                    opened=.25
                for o,(loc,scale) in rest_fingers.items():
                    target=loc.copy();target.y=-.012;target.z=-.125 if o.name.startswith('Curled') else -.09;o.location=loc.lerp(target,opened);o.scale.z=scale.z*(1+.5*opened)
                for o in tools['concealed'].children:
                    hidden=name!='work' or .65<t<.93;o.hide_render=hidden;o.hide_viewport=hidden;o.keyframe_insert('hide_render',frame=frame);o.keyframe_insert('hide_viewport',frame=frame)
            if 'flax' in tools:
                if name=='work':
                    if design.get('grain'):
                        lift=phase_curve(t,[(0,0),(.35,0),(.65,1),(.80,1),(1,0)]);cut=phase_curve(t,[(0,0),(.10,0),(.35,1),(.80,1),(1,0)])
                        body.rotation_euler=(.90-.78*lift,0,0);body.location=(0,.24*(1-lift),-.02-.30*(1-lift))
                        for side,chain in ch.items():ik(chain,-.08 if side==-1 else -.02,.174,1.135-.30*(1-lift),side,hip_y=.24*(1-lift))
                        left=Vector((-.08,-.64,1.05)).lerp(Vector((-.16,-.39,1.40)),lift);tools['flax'].location=left+Vector((0,-.012,-.09));reach(ch[-1],-1,left,Matrix.Identity(4).to_quaternion())
                        right=Vector((.27-.24*cut,-.48,.75)).lerp(Vector((.25,-.25,1.13)),lift);q=Matrix.Rotation(-math.pi/2*(1-lift),4,'X').to_quaternion();reach(ch[1],1,right,q)
                    else:
                        lift=phase_curve(t,[(0,0),(.32,0),(.65,1),(.78,1),(1,0)])
                        angle=1.0-.88*lift;body.rotation_euler=(angle,0,0)
                        pivot=Vector((0,0,1.28));body.location=pivot-Matrix.Rotation(angle,4,'X')@pivot+Vector((0,0,-.65*(1-lift)));body['_pose_pivoted']=True
                        for side,chain in ch.items():ik(chain,0,.174,.60+.535*lift,side)
                        tools['flax'].location=Vector((.02,-.82,.50)).lerp(Vector((-.10,-.43,1.23)),lift)
                        reach(ch[-1],-1,Vector((.02,-.82,.65)).lerp(Vector((-.10,-.43,1.40)),lift),Matrix.Identity(4).to_quaternion())
                        right=Vector((.06+.06*math.sin(p),-.67,.37)).lerp(Vector((.23,-.24,1.13)),lift)
                        q=Matrix.Rotation(-math.pi/2*(1-lift),4,'X').to_quaternion();reach(ch[1],1,right,q)
                for o in tools['flax'].children:
                    o.hide_render=name!='work';o.hide_viewport=name!='work';o.keyframe_insert('hide_render',frame=frame);o.keyframe_insert('hide_viewport',frame=frame)
            if name=='attack' and 'sickle' in tools:
                swing=phase_curve(t,[(0,0),(.30,0),(.60,1),(.78,1),(1,0)])
                reach(ch[1],1,Vector((.35,-.25,1.48)).lerp(Vector((.07,-.58,1.41)),swing),Matrix.Rotation(-math.pi/2,4,'X').to_quaternion())
            if 'shuttle' in tools:
                if name=='work':
                    body.rotation_euler.x=.07
                    reach(ch[1],1,(.09+.19*math.cos(p),-.39,1.48),Matrix.Identity(4).to_quaternion())
                    reach(ch[-1],-1,(-.22,-.43+.055*math.sin(p),1.37),Matrix.Identity(4).to_quaternion())
                for o in tools['shuttle'].children:
                    o.hide_render=name!='work';o.hide_viewport=name!='work';o.keyframe_insert('hide_render',frame=frame);o.keyframe_insert('hide_viewport',frame=frame)
            if 'leatherwork' in tools and name==sew_clip:
                body.rotation_euler.x=.16
                reach(ch[-1],-1,(-.15,-.51,1.25),Matrix.Identity(4).to_quaternion())
                # Cut an edge, then sew it and pull the thread upwards.
                sewing=.4<=t<.92
                u=(t*2)%1
                handz=phase_curve(t,[(0,1.56),(.35,1.56),(.45,1.40),(.62,1.60),(.78,1.40),(.88,1.40),(.98,1.56),(1,1.56)])
                handx=.07+.09*math.sin(u*math.tau)
                if design.get('weaving'):handx=.07+.04*math.sin(p);handz=1.40+.20*(.5-.5*math.cos(p))
                reach(ch[1],1,(handx,-.52,handz),Matrix.Identity(4).to_quaternion())
                a=Vector((.05,-.52,1.22));b=Vector((handx,-.52,handz-.18));thread=tools['thread'];thread.location=(a+b)/2;thread.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();thread.scale=(1,1,max(.002,(b-a).length))
            if 'thread' in tools:
                o=tools['thread'];hidden=not(name==sew_clip and (design.get('weaving') or .45<=t<.88));o.hide_render=hidden;o.hide_viewport=hidden;o.keyframe_insert('hide_render',frame=frame);o.keyframe_insert('hide_viewport',frame=frame)
            if 'needle' in tools:
                for o in tools['needle'].children:
                    hidden=not(name==sew_clip and (design.get('weaving') or .4<=t<.92));o.hide_render=hidden;o.hide_viewport=hidden;o.keyframe_insert('hide_render',frame=frame);o.keyframe_insert('hide_viewport',frame=frame)
            if 'leatherwork' in tools:
                for o in tools['leatherwork'].children:
                    o.hide_render=name!=sew_clip;o.hide_viewport=name!=sew_clip;o.keyframe_insert('hide_render',frame=frame);o.keyframe_insert('hide_viewport',frame=frame)
            if 'knife' in tools:
                for o in tools['knife'].children:
                    hidden=name!='work' or ('leatherwork' in tools and .4<=t<.92);o.hide_render=hidden;o.hide_viewport=hidden;o.keyframe_insert('hide_render',frame=frame);o.keyframe_insert('hide_viewport',frame=frame)
            if name=='attack' and 'mallet' in tools:
                a=phase_curve(t,[(0,0),(.30,1),(.45,1),(.64,-.25),(1,0)])
                ch[1][3].rotation_euler.x=-.2-2.1*max(a,0)-.9*max(-a,0);ch[1][4].rotation_euler.x=-.18-.4*max(a,0)-.8*max(-a,0)
            if name=='work' and 'mallet' in tools:
                body.rotation_euler.x=.10;body.location.z=-.03
                reach(ch[-1],-1,(-.15,-.43,1.31),Matrix.Identity(4).to_quaternion())
                reach(ch[1],1,(-.025,-.44,1.65+.20*(.5-.5*math.cos(p))),Matrix.Identity(4).to_quaternion())
            if design.get('smithing') and name in ['work','attack']:
                keys=[(0,(.08,-.41,1.37),-math.pi/2),(.28,(.20,-.24,1.68),2.5),(.45,(.20,-.24,1.68),2.5),(.62,(.08,-.41,1.37),-math.pi/2),(.76,(.08,-.41,1.37),-math.pi/2),(1,(.08,-.41,1.37),-math.pi/2)]
                for (a,pa,ra),(b,pb,rb) in zip(keys,keys[1:]):
                    if t<=b:
                        u=smooth((t-a)/(b-a));q=Matrix.Rotation(ra,4,'X').to_quaternion().slerp(Matrix.Rotation(rb,4,'X').to_quaternion(),u);body.rotation_euler.x=.08;body.location.z=-.02;reach(ch[1],1,Vector(pa).lerp(Vector(pb),u),q);break
                if name=='work':reach(ch[-1],-1,(-.14,-.35,1.36),Matrix.Rotation(-math.pi/2,4,'X').to_quaternion())
            if 'blank' in tools:
                for o in tools['blank'].children:
                    o.hide_render=name!='work';o.hide_viewport=name!='work';o.keyframe_insert('hide_render',frame=frame);o.keyframe_insert('hide_viewport',frame=frame)
            if 'plate' in tools:
                for o in tools['plate'].children:
                    o.hide_render=name!='work';o.hide_viewport=name!='work';o.keyframe_insert('hide_render',frame=frame);o.keyframe_insert('hide_viewport',frame=frame)
            if 'mug' in tools and name!='drink':tools['mug'].rotation_euler=(0,0,0)
            if 'sack' in tools:
                for o in tools['sack'].children:
                    o.hide_render=name!='work';o.hide_viewport=name!='work';o.keyframe_insert('hide_render',frame=frame);o.keyframe_insert('hide_viewport',frame=frame)
            if 'horse_brush' in tools:
                if name=='work':
                    body.rotation_euler=(.26,0,0);body.location=(0,0,-.075)
                    for side,chain in ch.items():ik(chain,-.03 if side==-1 else .04,.174,1.08,side)
                    reach(ch[-1],-1,(-.18,-.49,1.56),Matrix.Rotation(-math.pi/2,4,'X').to_quaternion())
                    right=vector_curve(t,[(0,(.20,-.55,1.50)),(.15,(.20,-.55,1.50)),(.55,(.04,-.55,1.26)),(.65,(.04,-.43,1.26)),(.85,(.20,-.43,1.50)),(1,(.20,-.55,1.50))]);reach(ch[1],1,right,Matrix.Identity(4).to_quaternion())
                    for o,(loc,scale) in rest_fingers.items():
                        if o.parent==ch[-1][5]:
                            target=loc.copy();target.y=-.012;target.z=-.125 if o.name.startswith('Curled') else -.09;o.location=loc.lerp(target,.65);o.scale=scale;o.scale.z=scale.z*1.3
                for o in tools['horse_brush'].children:
                    hidden=name!='work';o.hide_render=hidden;o.hide_viewport=hidden;o.keyframe_insert('hide_render',frame=frame);o.keyframe_insert('hide_viewport',frame=frame)
            if design.get('hammer_fight') and name=='attack':
                keys=[(0,(.36,-.18,1.28),0),(.28,(.32,-.26,1.90),2.5),(.43,(.32,-.26,1.90),2.5),(.67,(.20,-.50,1.40),-1.5),(.76,(.20,-.50,1.40),-1.5),(1,(.36,-.18,1.28),0)]
                for (a,pa,ra),(b,pb,rb) in zip(keys,keys[1:]):
                    if t<=b:
                        u=smooth((t-a)/(b-a));q=Matrix.Rotation(ra,4,'X').to_quaternion().slerp(Matrix.Rotation(rb,4,'X').to_quaternion(),u);reach(ch[1],1,Vector(pa).lerp(Vector(pb),u),q);break
            if design.get('arct_rescue'):
                import arct_rescue
                arct_rescue.pose(tools,ch,body,root,name,t,rest_fingers,index_fingers)
            if design.get('milling'):
                import mill_work
                mill_work.pose(tools,ch,body,root,name,t,frame)
            if design.get('baking'):
                import bake_work
                bake_work.pose(tools,ch,body,root,name,t,frame)
            if design.get('brewing'):
                import brew_work
                brew_work.pose(tools,ch,body,root,name,t,frame)
            if design.get('beekeeping'):
                import hive_work
                hive_work.pose(tools,ch,body,root,name,t,frame)
            if design.get('tanning'):
                import tan_work
                tan_work.pose(tools,ch,body,root,name,t,frame)
            if design.get('healing'):
                import heal_work
                heal_work.pose(tools,ch,body,root,name,t,frame)
            if design.get('carpentry'):
                import wood_work
                wood_work.pose(tools,ch,body,root,name,t,frame)
            if design.get('arct_workshop'):
                import arct_workshop
                arct_workshop.pose(tools,ch,body,root,name,t)
                for key in ['living_bowl','tuning_ring','tuning_notch','old_attached','new_attached','old_carried','new_carried']:
                    for o in tools[key].children:
                        if o.type in {'MESH','CURVE'}:o.keyframe_insert('hide_render',frame=frame);o.keyframe_insert('hide_viewport',frame=frame)
            if 'arct_probe' in tools:
                tool=tools['arct_probe'];tool.location=(0,-.28,1.42);tool.rotation_euler=(.10,0,0)
                if name=='work':body.rotation_euler.x=.05;tool.location=(0,-.31,1.50+.015*math.sin(p));tool.rotation_euler.x=-.06+.01*math.sin(p)
                elif name=='attack':
                    lift=phase_curve(t,[(0,0),(.32,1),(.75,1),(1,0)]);body.rotation_euler.x=.04;tool.location=(0,-.28-.07*lift,1.42+.21*lift);tool.rotation_euler.x=.10-.30*lift
                elif name in ['walk','run']:tool.location=(0,-.31 if name=='run' else -.28,1.52 if name=='run' else 1.43);tool.rotation_euler.x=.12+.02*math.sin(p)
                elif name=='death':
                    drop=smooth(t/.85);tool.location=Vector((0,-.28,1.42)).lerp(Vector((.35,-.10,.70)),drop);tool.rotation_euler=(.10,.2*drop,0)
                if name!='death':
                    transform=Matrix.Translation(tool.location)@tool.rotation_euler.to_matrix().to_4x4();q=tool.rotation_euler.to_quaternion()
                    reach(ch[1],1,transform@Vector((.18,.02,-.03)),q);reach(ch[-1],-1,transform@Vector((-.18,-.25,.01)),q)
            if design.get('flying'):
                fall=smooth(t/.88) if name=='death' else 0
                root.location=(0,0,.55*(1-fall)+.014*math.cos(2*p)*(1-fall));root.rotation_euler=(0,-math.pi/2*fall,0)
                body.location=(0,0,-.02-.08*fall);body.rotation_euler=(.10 if name=='run' else .025,0,0)
                for side,chain in ch.items():
                    chain[0].location=(side*.145,0,1.135*chain[0].get('leg_scale',1)-.08*fall)
                    chain[0].rotation_euler=(.20-.45*fall,0,0);chain[1].rotation_euler=(.85+.45*fall,0,0);chain[2].rotation_euler=(-.80-.20*fall,0,0)
                if name in ['idle','walk','run']:
                    for side in [-1,1]:reach(ch[side],side,(side*.23,-.18,.83),Matrix.Identity(4).to_quaternion())
                if name=='attack':
                    defend=phase_curve(t,[(0,0),(.22,1),(.80,1),(1,0)])
                    for side in [-1,1]:reach(ch[side],side,(side*(.23+.12*defend),-.18-.15*defend,.83+.22*defend),Matrix.Rotation(-math.pi/2,4,'X').to_quaternion())
                if name=='work':
                    reach(ch[-1],-1,(-.12,-.35,.97),Matrix.Identity(4).to_quaternion());reach(ch[1],1,(.08,-.35,1.07+.03*(.5-.5*math.cos(p))),Matrix.Identity(4).to_quaternion())
                for side in [-1,1]:
                    wing=tools['wing'+str(side)];cycles=3 if name=='run' else 2;amp=.72 if name=='run' else .57;angle=.12+amp*math.sin(cycles*p)
                    if name=='attack':angle=phase_curve(t,[(0,.12),(.22,-.40),(.80,-.40),(1,.12)])
                    wing.rotation_euler=(.12*math.cos(cycles*p)*(1-fall),side*(angle*(1-fall)+1.70*fall),0)
                for key in ['servant_strap','servant_awl']:
                    for o in tools[key].children:
                        hidden=name!='work';o.hide_render=hidden;o.hide_viewport=hidden;o.keyframe_insert('hide_render',frame=frame);o.keyframe_insert('hide_viewport',frame=frame)
            if mount:
                import equine
                mount['parent'].location=(0,0,0);mount['parent'].rotation_euler=(0,0,0)
                equine.pose(mount,name,t,frame)
                # Seat the rider over the same saddle coordinate in every direction.
                bob=.018*math.sin(2*p) if name=='walk' else (.065*math.cos(p) if name=='run' else .005*math.sin(p))
                root.location=(0,.05,.63+bob)
                if name!='death':
                    body.location=(0,0,-.02);body.rotation_euler.x=.06 if name=='run' else .01;root.rotation_euler.x=(.025 if name=='run' else .006)*math.sin(p)
                    for side,chain in ch.items():
                        seated_leg(chain,side)
                    if name in ['idle','walk','run']:
                        reach(ch[-1],-1,(-.1875,-.20,1.39),Matrix.Identity(4).to_quaternion())
                        if 'bow' in tools:
                            tools['bow'].rotation_euler=(math.pi/2,0,0);tools['bow'].location=(0,-.142,-.06);reach(ch[-1],-1,(-.55,-.10,1.40),Matrix.Identity(4).to_quaternion());reach(ch[1],1,(.1875,-.20,1.39),Matrix.Identity(4).to_quaternion())
                        if 'bow' not in tools:reach(ch[1],1,(.60,-.10,1.45),Matrix.Identity(4).to_quaternion())
                    if name=='attack' and 'sword' in tools:
                        reach(ch[-1],-1,(-.1875,-.20,1.39),Matrix.Identity(4).to_quaternion())
                        keys=[(0,(.60,-.10,1.45),0),(.26,(.40,-.10,1.94),2.5),(.59,(.60,-.35,1.55),-1.3),(.72,(.60,-.35,1.55),-1.3),(1,(.60,-.10,1.45),0)]
                        for (a,pa,ra),(b,pb,rb) in zip(keys,keys[1:]):
                            if t<=b:
                                u=smooth((t-a)/(b-a));q=Matrix.Rotation(ra,4,'X').to_quaternion().slerp(Matrix.Rotation(rb,4,'X').to_quaternion(),u);reach(ch[1],1,Vector(pa).lerp(Vector(pb),u),q);break
                    if name=='attack' and 'bow' in tools:
                        q=Matrix.Rotation(-math.pi/2,4,'X').to_quaternion();reach(ch[-1],-1,(-.08,-.64,1.99),q)
                        original=body.location.copy();body.location+=torso_pivot(body);bpy.context.view_layer.update();point=root.matrix_world.inverted()@tools['bow'].matrix_world@Vector((0,0,.025+.375*draw));body.location=original
                        reach(ch[1],1,point-q@Vector((0,-.012,-.09)),q)
                    if name=='work':
                        check=phase_curve(t,[(0,0),(.24,1),(.50,1),(.72,0),(1,0)])
                        reach(ch[-1],-1,(-.16,-.45,1.31),Matrix.Identity(4).to_quaternion())
                        if 'bow' not in tools:reach(ch[1],1,Vector((.60,-.10,1.45)).lerp(Vector((.72,-.12,1.61)),check),Matrix.Identity(4).to_quaternion())
                        if 'bow' in tools:
                            tools['bow'].rotation_euler=(math.pi/2,0,0);tools['bow'].location=(0,-.142,-.06);reach(ch[-1],-1,(-.55,-.10,1.40),Matrix.Identity(4).to_quaternion())
                            reach(ch[1],1,Vector((.1875,-.20,1.39)).lerp(Vector((.28,.12,1.80)),check),Matrix.Identity(4).to_quaternion())
                else:
                    fall=smooth((t-.15)/.75);root.rotation_euler=(0,-math.pi/2*fall,0);root.location.x=-.35*fall;root.location.z=.63*(1-fall)
                    mount['parent'].rotation_euler=(0,-math.pi/2*fall,0);mount['parent'].location=(-.35*fall,0,0)
                    mount['parent'].keyframe_insert('rotation_euler',frame=frame);mount['parent'].keyframe_insert('location',frame=frame)
            if mount:
                mount['parent'].keyframe_insert('location',frame=frame);mount['parent'].keyframe_insert('rotation_euler',frame=frame)
            if head:
                if name=='work':
                    head.rotation_euler.x=phase_curve(t,design.get('head_work_curve',[(0,design.get('head_work_pitch',0)),(1,design.get('head_work_pitch',0))]));head.rotation_euler.z=phase_curve(t,design.get('head_work_yaw',[(0,0),(1,0)]))
                elif name=='idle':head.rotation_euler.z=.02*math.sin(p);head.rotation_euler.x=design.get('head_idle_pitch',0)
                elif name in ['walk','run']:head.rotation_euler.x=-.5*body.rotation_euler.x
            if not body.get('_pose_pivoted',False):body.location+=torso_pivot(body);body['_pose_pivoted']=True
            for o in animated:
                for prop in ['location','rotation_euler','scale']:o.keyframe_insert(prop,frame=frame)
            s.frame_set(math.floor(frame),subframe=frame%1);bpy.context.view_layer.update();invroot=root.matrix_world.inverted()
            for o,points,w,a,b,ia,ib in bindings:
                key=o.shape_key_add(name=f'Pose_{frame:.2f}');ma=invroot@a.matrix_world@ia;mb=invroot@b.matrix_world@ib
                for v,point,weight in zip(key.data,points,w):v.co=(ma@point)*(1-weight)+(mb@point)*weight
                for f,value in [(frame-.25,0),(frame,1),(frame+.25,0)]:key.value=value;key.keyframe_insert('value',frame=f)
                key.value=0
            envelope=[]
            if skirts or aprons:
                s.frame_set(math.floor(frame),subframe=frame%1);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();invbody=body.matrix_world.inverted()
                for part in c.objects:
                    if part.type=='MESH' and part.name.startswith(('Tailored trouser thigh','Trouser knee','Shaped boot calf','Boot upper')):
                        ev=part.evaluated_get(dg);mesh=ev.to_mesh();m=invbody@ev.matrix_world;envelope.extend(m@v.co for v in mesh.vertices);ev.to_mesh_clear()
            for o,points in apron_points.items():
                key=o.shape_key_add(name=f'Apron_{frame:.2f}')
                for v,point in zip(key.data,points):
                    q=point.copy()
                    if name=='death':q.y*=1-.35*smooth((t-.22)/.65)
                    if q.z<1.30:
                        section=[p for p in envelope if abs(p.z-q.z)<.14 and abs(p.x-q.x)<.12]
                        if section:q.y=min(q.y,min(p.y for p in section)-.030)
                    v.co=q
                for f,value in [(frame-.25,0),(frame,1),(frame+.25,0)]:key.value=value;key.keyframe_insert('value',frame=f)
                key.value=0
            for o,points in skirt_points.items():
                key=o.shape_key_add(name=f'Drape_{frame:.2f}')
                death_points=None
                if name=='death':
                    import death_drape
                    death_points=death_drape.fit(points,envelope,t)
                for index,(v,point) in enumerate(zip(key.data,points)):
                    if death_points is not None:v.co=death_points[index];continue
                    q=point.copy();u=max(0,min(1,(1.28-q.z)/1.12))
                    if name in ['walk','run']:
                        amount=.90 if name=='run' else .38
                        q.y*=1+amount*math.exp(-((q.z-.70)/.35)**2)
                        q.y+=.045*math.sin(p)*(q.x/.34)*u
                        q.z+=(.08 if name=='run' else .025)*u*u+.035*(1-math.cos(p+(0 if q.x<0 else math.pi)))*u*u
                    # Fit each cloth ring around the actual evaluated leg envelope.
                    if q.z<1.22:
                        section=[p for p in envelope if abs(p.z-q.z)<.12]
                        if section:
                            rx=max(.345-.10*max(0,(point.z-.16)/1.12)**1.8,max(abs(p.x) for p in section)+.045)
                            ry=max(.28-.10*((point.z-.16)/1.12),max(abs(p.y) for p in section)*1.23+.035)
                            angle=math.atan2(point.y/(.28-.10*((point.z-.16)/1.12)),point.x/(.345-.10*max(0,(point.z-.16)/1.12)**1.8))
                            q.x=rx*math.cos(angle);q.y=ry*math.sin(angle)
                    v.co=q
                for f,value in [(frame-.25,0),(frame,1),(frame+.25,0)]:key.value=value;key.keyframe_insert('value',frame=f)
                key.value=0
            s.frame_set(math.floor(frame),subframe=frame%1);bpy.context.view_layer.update()
            if name=='death':
                dg=bpy.context.evaluated_depsgraph_get();low=10
                for o in c.objects:
                    ancestor=o
                    while ancestor.parent and ancestor!=root:ancestor=ancestor.parent
                    if o.type in {'MESH','CURVE'} and not o.hide_render and (not mount or ancestor==root):
                        ev=o.evaluated_get(dg);m=ev.to_mesh();low=min(low,min((ev.matrix_world@v.co).z for v in m.vertices));ev.to_mesh_clear()
                root.location.z+=.002-low;root.keyframe_insert('location',frame=frame)
                if mount:
                    dg=bpy.context.evaluated_depsgraph_get();low_mount=100.
                    for o in c.objects:
                        ancestor=o.parent
                        while ancestor and ancestor!=mount['parent']:ancestor=ancestor.parent
                        if ancestor and o.type=='MESH':
                            ev=o.evaluated_get(dg);mesh=ev.to_mesh();low_mount=min(low_mount,min((ev.matrix_world@v.co).z for v in mesh.vertices));ev.to_mesh_clear()
                    mount['parent'].location.z+=.002-low_mount;mount['parent'].keyframe_insert('location',frame=frame)
    if mount:
        animated += [o for o in c.objects if o not in animated]
        animated += [o.data.shape_keys for o in c.objects if o.type=='MESH' and o.data.shape_keys and o not in [v[0] for v in bindings]]
    for data in animated+[o.data.shape_keys for o in skirts+aprons]+[o.data.shape_keys for o,*_ in bindings]+[o for pivot in tools.values() for o in pivot.children]+[o.data.shape_keys for o in tools.values() if o.type=='MESH' and o.data.shape_keys]:
        action=data.animation_data.action if data.animation_data else None
        if action:
            for layer in action.layers:
                for strip in layer.strips:
                    for slot in action.slots:
                        bag=strip.channelbag(slot)
                        if bag:
                            for fc in bag.fcurves:
                                for key in fc.keyframe_points:key.interpolation='CONSTANT' if fc.data_path in ['hide_render','hide_viewport'] else 'LINEAR'
    s['sprite_postprocess']=True
    for light,power in [('Key',350),('Fill',100),('Rim',200)]:
        if bpy.data.objects.get(light):bpy.data.objects[light].data.energy=power
    s.world.node_tree.nodes['Background'].inputs[1].default_value=.28
    s.render.resolution_x=s.render.resolution_y=256;s.render.resolution_percentage=100;s.render.engine='CYCLES';s.cycles.samples=48;s.view_settings.view_transform='AgX'
    s.camera.data.ortho_scale=4.2;s.camera.location=(0,-10,10*math.tan(math.radians(30))+1.08);s.camera.rotation_euler=(Vector((0,0,1.08))-s.camera.location).to_track_quat('-Z','Y').to_euler()
    s['sprite_export_json']=json.dumps(dict(asset=task['id'],outputSize=128,fps=12,scale=4.2/3.25,crop=True,publish=False,maxDecodedBytes=67108864,maxWorkingBytes=134217728,maxAtlasSide=16384,output=str(ROOT/'sprites'),clips=clips),indent=2)
    if design.get('output_size'):
        size=design['output_size'];ortho=size/DENSITY;target=design.get('camera_target',1.4)
        s.render.resolution_x=s.render.resolution_y=size*2;s.camera.data.ortho_scale=ortho
        s.camera.location=(0,-10,10*math.tan(math.radians(30))+target);s.camera.rotation_euler=(Vector((0,0,target))-s.camera.location).to_track_quat('-Z','Y').to_euler()
        config=json.loads(s['sprite_export_json']);config.update(outputSize=size,maxDecodedBytes=134217728,maxWorkingBytes=268435456);s['sprite_export_json']=json.dumps(config,indent=2)
    if mount:
        s.render.resolution_x=s.render.resolution_y=512;s.camera.data.ortho_scale=8.4
        s.camera.location=(0,-10,10*math.tan(math.radians(30))+1.65);s.camera.rotation_euler=(Vector((0,0,1.65))-s.camera.location).to_track_quat('-Z','Y').to_euler()
        config=json.loads(s['sprite_export_json']);config.update(outputSize=256,maxDecodedBytes=268435456,maxWorkingBytes=536870912);s['sprite_export_json']=json.dumps(config,indent=2)
    s.timeline_markers.clear()
    for name,clip in clips.items():s.timeline_markers.new('CLIP_'+name,frame=clip['start'])
    s.frame_start=1;s.frame_end=cursor;s.render.fps=12
