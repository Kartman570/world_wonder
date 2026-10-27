"""Authored medieval architecture profiles; shared construction, distinct silhouettes."""
import math,random
from building_studio import Studio

# Roof, construction and architectural features are deliberately different per trade.
PROFILES={
'building_house':('timber','shingle',2.8,1.65,'cottage'),
'building_inn':('timber','clay',4.0,1.35,'dormers'),
'building_warehouse':('boards','slate',3.4,1.5,'loading'),
'building_apothecary':('plaster','green',3.0,1.7,'bay'),
'building_castle':('ashlar','flat',3.8,0,'fortress'),
'building_cathedral':('limestone','slate',3.8,1.45,'gothic'),
'building_library':('limestone','green',3.8,1.25,'scholarly'),
'building_training':('boards','shingle',2.8,1.4,'hall'),
'building_wizard_hall':('ashlar','blue',3.2,1.5,'cupola'),
'building_tailor':('plaster','clay',3.2,1.35,'dormers'),
'building_townhall':('timber','green',4.0,1.3,'belfry'),
'building_barracks':('ashlar','clay',3.5,1.4,'military'),
'building_farmshop':('daub','thatch',2.5,1.6,'rustic'),
'building_armory':('ashlar','slate',3.1,1.35,'fortified'),
'building_bowshop':('boards','green',2.9,1.4,'longhall'),
'building_leatherworks':('timber','shingle',2.9,1.2,'vented'),
'building_provisions':('daub','clay',2.8,1.45,'canopy'),
'building_stable':('boards','thatch',2.9,1.45,'stable'),
'building_prison_large':('ashlar','flat',3.6,0,'prison'),
'building_prison_small':('ashlar','slate',2.9,1.4,'prison'),
'building_chapel':('boards','shingle',3.0,1.55,'chapel'),
}
ROOFS={'slate':(.075,.095,.115),'shingle':(.17,.125,.075),'clay':(.29,.12,.067),'green':(.10,.16,.12),'blue':(.075,.11,.18),'thatch':(.29,.235,.13),'flat':(.20,.21,.20)}
WALLS={'timber':(.42,.36,.26),'boards':(.22,.15,.085),'plaster':(.48,.43,.33),'ashlar':(.29,.30,.28),'limestone':(.43,.42,.35),'daub':(.34,.29,.20)}

def tiles(a,mat,h,rise,half=6.6,end=10.75):
    def z(x):return h+rise*(1-abs(x)/half)
    verts=[];faces=[]
    for side in [-1,1]:
        a.mesh('Continuous roof sheathing',[(0,-end,z(0)),(side*half,-end,z(half)),(side*half,end,z(half)),(0,end,z(0))],[(0,1,2,3)],mat)
        for row in range(15):
            x0=side*(row/15)*half;x1=side*((row+1)/15)*half
            for col in range(42):
                y0=-end+col*(2*end/42);y1=y0+2*end/42-.022
                i=len(verts);verts.extend([(x0,y0,z(x0)+.025),(x1,y0,z(x1)+.025),(x1,y1,z(x1)+.025),(x0,y1,z(x0)+.025)]);faces.append((i,i+1,i+2,i+3))
    return a.mesh('Individually laid roof courses',verts,faces,mat)

def floor(a,mat,wood=False):
    a.layer='floor';a.box('Continuous floor bed',(0,0,-.065),(12.6,21,.08),mat)
    if wood:
        for col in range(34):
            x=-6.3+(col+.5)*12.6/34
            for row in range(7):a.box('Laid oak floor plank',(x,-10.5+(row+.5)*3,-.015),(12.6/34-.018,2.98,.03),mat,.005)
    else:
        for row in range(24):
            for col in range(14):a.box('Jointed stone paving',(-6.3+(col+.5)*.9,-10.5+(row+.5)*.875,-.015),(.88,.855,.03),mat,.007)

def window(a,x,z,w,h,wood,glass,iron,bars=False,pointed=False):
    y=-10.58
    a.box('Deep unlit window recess',(x,y,z),(w,.10,h),glass)
    for dx in [-w/2,w/2]:a.box('Window jamb',(x+dx,y-.06,z),(.10,.15,h+.14),wood)
    for dz in [-h/2,h/2]:a.box('Window head and sill',(x,y-.09,z+dz),(w+.18,.22,.10),wood)
    if bars:
        for i in range(1,6):a.rod('Iron security bar',(x-w/2+i*w/6,y-.15,z-h/2),(x-w/2+i*w/6,y-.15,z+h/2),.023,iron)
    else:
        a.box('Window mullion',(x,y-.15,z),(.055,.08,h),wood)
        a.box('Window transom',(x,y-.15,z),(w,.08,.055),wood)
        if pointed:a.mesh('Pointed window hood',[(x-w/2-.1,y-.2,z+h/2),(x,y-.2,z+h/2+.55),(x+w/2+.1,y-.2,z+h/2)],[(0,1,2)],wood)

def cylinder(a,name,x,y,z,r,h,mat,n=16,r2=None):
    r2=r if r2 is None else r2;v=[]
    for zz,rr in [(z,r),(z+h,r2)]:
        for i in range(n):t=i*math.tau/n;v.append((x+rr*math.cos(t),y+rr*math.sin(t),zz))
    f=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return a.mesh(name,v,f,mat)

def building(asset):
    construction,roof,h,rise,feature=PROFILES[asset];a=Studio(asset);rng=random.Random(asset)
    wall=a.material('Weathered '+construction,WALLS[construction],texture=11);oak=a.material('Aged structural oak',(.105,.065,.034),texture=20);edge=a.material('Cut limestone trim',(.36,.35,.30),texture=18);iron=a.material('Blackened architectural iron',(.065,.075,.08),metal=.65);glass=a.material('Unlit leaded glass',(.035,.052,.055));roofmat=a.material('Weathered '+roof,ROOFS[roof],texture=30 if roof=='thatch' else 10);paving=a.material('Interior worn '+('oak' if construction in ['boards','timber'] else 'flagstone'),(.20,.145,.085) if construction in ['boards','timber'] else (.26,.25,.22),texture=22)
    floor(a,paving,construction in ['boards','timber'])
    a.layer='walls';a.box('North wall',(0,10.25,h/2),(12.6,.5,h),wall)
    for x in [-6.05,6.05]:a.box('Side wall',(x,0,h/2),(.5,20,h),wall)
    a.layer='facade';a.box('South wall',(0,-10.25,h/2),(12.6,.5,h),wall)
    a.box('Stone foundation course',(0,-10.58,.17),(12.6,.22,.34),edge)
    if construction in ['ashlar','limestone']:
        for row in range(int(h/.38)):
            for col in range(16):
                x=-5.92+col*.78+(row%2)*.36
                if x<6.2:a.box('Coursed facade stone',(x,-10.54,.22+row*.38),(.73,.08,.34),wall,.025)
        for x in [-6.08,6.08]:
            for row in range(int(h/.42)):a.box('Dressed corner quoin',(x,-10.64,.22+row*.42),(.42 if row%2 else .68,.25,.39),edge)
    else:
        # Exposed mortise-and-tenon framing with diagonal braces.
        for x in [-6.05,-3.15,0,3.15,6.05]:a.box('Structural oak upright',(x,-10.61,h/2),(.15,.20,h),oak)
        for z in [.30,h-.10]+([h*.52] if h>3.6 else []):a.box('Oak horizontal wall plate',(0,-10.64,z),(12.6,.20,.17),oak)
        if construction=='boards':
            for i in range(53):a.box('Vertical weathered siding',(-6.12+i*.235,-10.56,h/2),(.216,.08,h-.34),wall,.004)
        for x in [-4.7,4.7]:a.rod('Diagonal oak wall brace',(x-.65,-10.69,.4),(x+.65,-10.69,1.45),.075,oak)
    rows=[h*.56] if h<3.6 else [1.1,2.9]
    for z in rows:
        for x in [-4.6,-1.8,1.8,4.6]:window(a,x,z,1.05,.78 if feature in ['prison','fortified','military'] else 1.0,edge if construction in ['ashlar','limestone'] else oak,glass,iron,bars=feature in ['prison','fortified','military'],pointed=feature in ['gothic','scholarly'])
    if rise:
        a.mesh('Front gable masonry',[(-6.3,-10.50,h),(6.3,-10.50,h),(0,-10.50,h+rise)],[(0,1,2)],wall)
        for side in [-1,1]:a.rod('Gable rake trim',(0,-10.59,h+rise),(side*6.4,-10.59,h),.075,oak)
    a.layer='roof'
    if roof=='flat':
        a.box('Lead drained flat roof',(0,0,h+.05),(12.5,20.9,.15),roofmat)
        for y in [-10.15,10.15]:
            for x in range(-6,7):a.box('Battlement merlon',(x,y,h+.42),(.55,.55,.68),wall)
        for x in [-6.0,6.0]:
            for i in range(19):a.box('Side battlement merlon',(x,-9+i,h+.42),(.55,.55,.68),wall)
    else:
        if roof=='thatch':thatch(a,roofmat,h,rise)
        else:tiles(a,roofmat,h,rise)
        a.rod('Ridge cap',(0,-10.8,h+rise+.06),(0,10.8,h+rise+.06),.08,iron if roof!='thatch' else oak)
        for x in [-6.6,6.6]:a.rod('Eaves fascia',(x,-10.8,h),(x,10.8,h),.075,oak)
    if feature in ['cottage','dormers','bay','canopy','rustic','scholarly','vented']:
        x=-3.2;y=5.8;base=h+rise*(1-abs(x)/6.6)
        a.box('Masonry domestic chimney',(x,y,(base+5.25)/2),(.8,.9,5.25-base),edge)
        a.box('Chimney rain cap',(x,y,5.25),(1.05,1.15,.12),edge)
        a.box('Dark flue',(x,y,5.32),(.52,.63,.02),iron)
    if feature in ['dormers','bay','scholarly']:
        for x,y in [(-3.2,-2.8),(3.2,3.5)]:
            z=h+rise*(1-abs(x)/6.6);a.box('Roof dormer body',(x,y,z+.37),(1.55,1.45,.8),wall)
            a.box('Dormer recessed glazing',(x,y-.74,z+.40),(.98,.06,.48),glass)
            a.mesh('Dormer pitched cap',[(x-.95,y-.9,z+.82),(x+.95,y-.9,z+.82),(x,y-.9,z+1.25),(x-.95,y+.9,z+.82),(x+.95,y+.9,z+.82),(x,y+.9,z+1.25)],[(0,2,5,3),(2,1,4,5)],roofmat)
    if feature in ['fortress','prison'] and (roof=='flat'):
        for x in [-5.1,5.1]:
            for y in [-8.5,8.5]:
                a.layer='walls' if y>0 else 'facade'
                cylinder(a,'Round masonry corner tower',x,y,0,1.1,5.0,wall)
                cylinder(a,'Tower upper stone band',x,y,4.7,1.2,.22,edge)
                a.layer='roof'
                for i in range(8):
                    t=i*math.tau/8;a.box('Tower crenellation',(x+1.02*math.cos(t),y+1.02*math.sin(t),5.22),(.42,.42,.5),wall)
    if feature=='gothic':
        for x in [-4.85,4.85]:
            a.layer='facade'
            a.box('West front bell tower',(x,-7.9,2.8),(2.25,2.4,5.6),wall)
            for z in [1.4,3.5,5.45]:a.box('Bell tower string course',(x,-7.9,z),(2.4,2.55,.14),edge)
            a.layer='roof'
            cylinder(a,'Lead covered pointed spire',x,-7.9,5.6,1.65,2.6,roofmat,n=8,r2=.03)
            a.rod('Spire iron finial',(x,-7.9,8.2),(x,-7.9,8.7),.025,iron)
        # Buttresses are walls, so remain when the roof is hidden.
        a.layer='walls'
        for x in [-6.05,6.05]:
            for y in [-6,-1,4,8.5]:a.box('Masonry buttress',(x,y,1.45),(.65,.7,2.9),edge)
    if feature in ['cupola','belfry']:
        cylinder(a,'Octagonal lantern drum',0,1.4,h+rise-.2,1.35,1.1,wall,n=8)
        cylinder(a,'Octagonal cupola roof',0,1.4,h+rise+.9,1.8,1.4,roofmat,n=8,r2=.08)
        a.rod('Cupola finial',(0,1.4,h+rise+2.3),(0,1.4,h+rise+2.75),.035,iron)
    if feature in ['hall','longhall','military','stable','loading','vented']:
        # A long raised ridge vent distinguishes utilitarian buildings.
        a.box('Louvered ridge ventilator',(0,0,h+rise+.2),(1.05,9,.42),oak)
        a.box('Ridge vent weather cap',(0,0,h+rise+.48),(1.5,9.5,.12),roofmat)
        for y in range(-4,5):a.box('Vent opening',(0,y-.25,h+rise+.21),(1.08,.19,.18),glass)
    if feature in ['canopy','loading','stable']:
        a.layer='facade'
        for x in [-5.9,-3,3,5.9]:a.box('Front porch oak post',(x,-10.85,1.15),(.15,.15,2.3),oak)
        a.layer='roof';a.mesh('Sloping porch roof',[(-6.4,-10.1,h-.35),(6.4,-10.1,h-.35),(6.4,-11.3,2.2),(-6.4,-11.3,2.2)],[(0,1,2,3)],roofmat)
    if feature=='chapel':
        a.layer='roof';a.box('Timber bellcote',(0,-7.5,h+rise+.48),(1.1,1.2,1.0),oak)
        cylinder(a,'Small bellcote cap',0,-7.5,h+rise+.98,.95,.7,roofmat,n=4,r2=.02)
        a.rod('Chapel cross upright',(0,-7.5,h+rise+1.6),(0,-7.5,h+rise+2.25),.045,oak)
        a.rod('Chapel cross arm',(-.25,-7.5,h+rise+2.02),(.25,-7.5,h+rise+2.02),.045,oak)
    a.save();return a

def special(asset):
    a=Studio(asset);wood=a.material('Weathered oak',(.18,.12,.064),texture=24);stone=a.material('Aged limestone',(.29,.28,.24),texture=12);rock=a.material('Natural fractured rock',(.20,.21,.19),texture=9);iron=a.material('Oxidized iron bars',(.075,.082,.078),metal=.65);floor_mat=a.material('Worn earth and gravel',(.19,.16,.115),texture=30)
    if asset=='building_ark_vault':
        metal=a.material('Muted violet alloy shell',(.19,.17,.23),texture=18,metal=.55);seam=a.material('Dark structural alloy',(.075,.085,.10),metal=.7);pale=a.material('Service panel alloy',(.28,.29,.30),metal=.5)
        a.layer='floor';n=96;verts=[(0,0,0)]+[(6.3*math.cos(i*math.tau/n),10.5*math.sin(i*math.tau/n),0) for i in range(n)];a.mesh('Elliptical interior deck',verts,[(0,i+1,(i+1)%n+1) for i in range(n)],pale)
        for i in range(64):
            t=i*math.tau/64;t2=(i+1)*math.tau/64;a.layer='walls' if math.sin((t+t2)/2)>=0 else 'facade'
            a.mesh('Curved pressure shell wall',[(6.3*math.cos(t),10.5*math.sin(t),0),(6.3*math.cos(t2),10.5*math.sin(t2),0),(6.3*math.cos(t2),10.5*math.sin(t2),2.65),(6.3*math.cos(t),10.5*math.sin(t),2.65)],[(0,1,2,3)],metal)
            a.rod('Shell vertical seam',(6.32*math.cos(t),10.52*math.sin(t),.12),(6.32*math.cos(t),10.52*math.sin(t),2.65),.025,seam)
        a.layer='roof';verts=[];faces=[];n=64;rows=20
        for j in range(rows+1):
            phi=(j/rows)*math.pi/2
            for i in range(n):t=i*math.tau/n;verts.append((6.4*math.cos(phi)*math.cos(t),10.6*math.cos(phi)*math.sin(t),2.65+2.8*math.sin(phi)))
        for j in range(rows):
            for i in range(n):faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
        o=a.mesh('Segmented elliptical metal dome',verts,faces,metal)
        for p in o.data.polygons:p.use_smooth=True
        for i in range(16):
            t=i*math.tau/16
            for j in range(14):
                p=j/14*math.pi/2;q=(j+1)/14*math.pi/2
                a.rod('Dome radial structural rib',(6.42*math.cos(p)*math.cos(t),10.62*math.cos(p)*math.sin(t),2.67+2.8*math.sin(p)),(6.42*math.cos(q)*math.cos(t),10.62*math.cos(q)*math.sin(t),2.67+2.8*math.sin(q)),.024,seam)
        for x in [-3.8,3.8]:
            cylinder(a,'Sealed industrial service stack',x,0,4.85,.33,.5,pale,n=16)
            cylinder(a,'Pressure vent crown',x,0,5.35,.45,.09,seam,n=16)
    elif asset=='building_cage':
        floor(a,stone)
        for y in [-10.3,10.3]:
            a.layer='facade' if y<0 else 'walls'
            for i in range(43):a.rod('Riveted iron cage bar',(-6.1+i*12.2/42,y,.1),(-6.1+i*12.2/42,y,3.0),.035,iron)
            for z in [.10,1.45,2.9]:a.box('Iron cage crossrail',(0,y,z),(12.4,.14,.12),iron)
        a.layer='walls'
        for x in [-6.1,6.1]:
            for i in range(69):a.rod('Side cage iron bar',(x,-10.2+i*.3,.1),(x,-10.2+i*.3,3.0),.035,iron)
            for z in [.10,1.45,2.9]:a.box('Side iron crossrail',(x,0,z),(.14,20.6,.12),iron)
        a.layer='roof'
        for i in range(43):a.rod('Cage roof crossbar',(-6.1+i*12.2/42,-10.3,3),(-6.1+i*12.2/42,10.3,3),.035,iron)
        for y in range(-10,11,2):a.box('Cage roof crossrail',(0,y,3.04),(12.3,.10,.10),iron)
    elif asset in ['building_nomad_tent','building_bandit_tent']:
        bandit=asset=='building_bandit_tent';cloth=a.material('Patched hide' if bandit else 'Weathered wool felt',(.16,.14,.10) if bandit else (.38,.32,.23),texture=45);patch=a.material('Repaired canvas patches',(.25,.21,.15),texture=45);rope=a.material('Hemp ropes',(.22,.17,.10),texture=35)
        ground_floor(a,floor_mat);h=1.4;rise=3.2
        a.layer='walls';a.box('North felt wall',(0,10.3,h/2),(12.6,.12,h),cloth)
        for x in [-6.25,6.25]:a.box('Low felt sidewall',(x,0,h/2),(.12,20.5,h),cloth)
        a.layer='facade';a.box('Tent end wall',(0,-10.3,h/2),(12.6,.12,h),cloth);a.mesh('Tent triangular end',[(-6.3,-10.4,h),(6.3,-10.4,h),(0,-10.4,h+rise)],[(0,1,2)],cloth)
        for x in [-6,0,6]:a.rod('Tent front support',(x,-10.5,0),(x,-10.5,h+rise*(1-abs(x)/6.3)),.08,wood)
        a.layer='roof'
        for side in [-1,1]:
            a.mesh('Taut felt roof',[(0,-10.6,h+rise),(side*6.5,-10.6,h),(side*6.5,10.6,h),(0,10.6,h+rise)],[(0,1,2,3)],cloth)
            for y in [-9,-6,-3,0,3,6,9]:
                a.rod('Sewn felt seam',(0,y,h+rise+.025),(side*6.5,y,h+.025),.022,rope)
                if bandit:
                    x=side*3.5;z=h+rise*(1-abs(x)/6.5)+.03;a.mesh('Hand sewn hide patch',[(x-.7,y-.5,z+side*.34),(x+.7,y-.5,z-side*.34),(x+.7,y+.5,z-side*.34),(x-.7,y+.5,z+side*.34)],[(0,1,2,3)],patch)
        a.rod('Tent ridgepole',(0,-10.7,h+rise),(0,10.7,h+rise),.08,wood)
    else:
        # Entrances are masonry/rock shells; the engine cuts their actual passage.
        ruin=asset=='building_ruins_entrance';cave=asset=='building_cave_entrance';under=asset=='building_underwater_entrance'
        if under:rock=a.material('Algae stained ancient masonry',(.15,.21,.16),texture=20)
        
        if cave:ground_floor(a,floor_mat)
        else:floor(a,stone)
        h=2.3 if ruin else 2.9
        a.layer='walls';a.box('North retaining wall',(0,10.2,h/2),(12.6,.6,h),rock if cave or under else stone)
        for x in [-6.0,6.0]:a.box('Side retaining wall',(x,0,h/2),(.6,19.8,h),rock if cave or under else stone)
        a.layer='facade';a.box('Entrance supporting front wall',(0,-10.2,h/2),(12.6,.6,h),rock if cave or under else stone)
        if not cave:
            for x in [-5.8,-3.3,3.3,5.8]:
                a.box('Dressed stone entrance pier',(x,-10.65,h/2),(.65,.55,h+.3),stone)
                a.box('Carved pier capital',(x,-10.65,h+.2),(.9,.75,.24),stone)
            for i in range(21):a.box('Heavy lintel masonry',(-6+i*.6,-10.6,h+.42),(.56,.45,.45),stone)
        else:
            for i in range(17):
                x=-6+i*.75;a.box('Fractured rock entrance face',(x,-10.56,1.3),(.85,.6,2.6+(i%3)*.13),rock,.13)
        a.layer='roof';rng=random.Random(asset)
        if cave:
            # Deterministic rough rock mound, not a generic house roof.
            nx,ny=21,33;v=[];f=[]
            for j in range(ny):
                y=-10.7+j*21.4/(ny-1)
                for i in range(nx):
                    x=-6.5+i*13/(nx-1);z=2.9+1.9*(1-(abs(x)/6.5)**1.2)+rng.uniform(-.16,.16);v.append((x,y,z))
            for j in range(ny-1):
                for i in range(nx-1):k=j*nx+i;f.append((k,k+1,k+1+nx,k+nx))
            a.mesh('Fractured limestone rock overhang',v,f,rock)
            a.layer='facade';front=[];frontfaces=[]
            for i in range(nx-1):
                p,q=v[i],v[i+1];k=len(front);front.extend([(p[0],-10.72,h-.03),(q[0],-10.72,h-.03),(q[0],-10.72,q[2]),(p[0],-10.72,p[2])]);frontfaces.append((k,k+1,k+2,k+3))
            a.mesh('Solid fractured rock entrance pediment',front,frontfaces,rock)
        elif ruin:
            for x in [-5.5,5.5]:a.box('Broken stone cornice',(x,1,2.7),(.9,17,.35),stone)
            for y in [6,8.5]:a.box('Surviving vault rib',(0,y,2.95),(10.5,.6,.35),stone)
            a.mesh('Collapsed remnant of vault',[(-5.8,3.5,2.9),(5.8,3.5,2.9),(3,10.6,3.3),(-4.8,10.6,3.7)],[(0,1,2,3)],rock)
            for i in range(22):a.box('Dislodged roof block',(rng.uniform(-5.7,5.7),rng.uniform(3,9.5),3.15),(rng.uniform(.4,1.1),rng.uniform(.5,1.2),rng.uniform(.2,.5)),stone,.05)
        else:
            tiles(a,rock,h,1.25)
            for y in [-9,-5,-1,3,7]:
                for side in [-1,1]:a.rod('Stone vault exterior rib',(0,y,h+1.3),(side*6.5,y,h+.04),.10,stone)
            if under:
                for x in [-4.2,4.2]:cylinder(a,'Barnacle encrusted roof finial',x,-5,3.1,.3,.65,rock,n=8,r2=.12)
    a.save();return a

def generic(asset):
    a=Studio(asset,384);stone=a.material('Weathered lime mortar',(.31,.30,.25),texture=14);wood=a.material('Weathered oak',(.15,.10,.055),texture=22);roofmat=a.material('Slate roof',(.09,.11,.13),texture=12)
    a.layer='default';a.camera(384/(128/4.2),64/((128/4.2)*math.cos(math.pi/6)))
    if asset=='roof':tiles(a,roofmat,2.4,1.2,half=5.28,end=8.6);a.rod('Lead ridge cap',(0,-8.6,3.65),(0,8.6,3.65),.064,roofmat)
    else:
        a.box('Interior north wall',(0,8.2,1.2),(10.08,.4,2.4),stone)
        for x in [-4.84,4.84]:a.box('Interior side wall',(x,-.2,1.2),(.4,16.4,2.4),stone)
        for y in [-8,-4,0,4,8]:
            for x in [-4.60,4.60]:a.box('Exposed wall framing',(x,y,1.17),(.16,.16,2.34),wood)
        a.box('Interior wall oak plate',(0,7.97,2.25),(10.08,.16,.18),wood)
    a.save();return a

def thatch(a,mat,h,rise):
    """Dense reed bundles running down the slope, rather than a tiled straw roof."""
    from mathutils import Vector
    for side in [-1,1]:
        a.mesh('Felt beneath reed thatch',[(0,-10.8,h+rise),(side*6.6,-10.8,h),(side*6.6,10.8,h),(0,10.8,h+rise)],[(0,1,2,3)],mat)
        v=[];f=[];rng=random.Random(a.asset+str(side))
        for j in range(190):
            y=-10.8+(j+.5)*21.6/190;p=Vector((side*.025,y,h+rise+.035));q=Vector((side*(6.63+rng.uniform(-.035,.035)),y,h+.035));axis=(q-p).normalized();u=Vector((0,1,0));up=axis.cross(u).normalized();r=rng.uniform(.045,.065);k=len(v);n=8
            for center,radius in [(p,r),(q,r*.78)]:
                for i in range(n):t=i*math.tau/n;v.append(tuple(center+radius*(u*math.cos(t)+up*math.sin(t))))
            for i in range(n):f.append((k+i,k+(i+1)%n,k+(i+1)%n+n,k+i+n))
            f.append(tuple(k+i for i in reversed(range(n))));f.append(tuple(k+n+i for i in range(n)))
        o=a.mesh('Individual densely packed reed bundles',v,f,mat)
        for poly in o.data.polygons:poly.use_smooth=True

def ground_floor(a,mat):
    a.layer='floor';a.mesh('Unpaved compacted earth floor',[(-6.3,-10.5,0),(6.3,-10.5,0),(6.3,10.5,0),(-6.3,10.5,0)],[(0,1,2,3)],mat)
    rng=random.Random(a.asset+'floor')
    for i in range(28):cylinder(a,'Embedded floor pebble',rng.uniform(-6.0,6.0),rng.uniform(-10.2,10.2),-.025,rng.uniform(.06,.16),rng.uniform(.045,.09),mat,n=7,r2=.035)
