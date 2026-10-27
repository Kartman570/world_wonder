"""Lathed stoneware, bent iron and household craft props."""
import bpy,math,random
from pathlib import Path
from mathutils import Vector
from environment_studio import begin,fit_finish

def build(asset):
 ns,task=begin(asset);c=ns['c'];root=ns['root'];M=ns['material'];B=ns['box'];R=ns['rod'];E=ns['ell'];r=random.Random(211);wood=M('Worn timber',(.16,.10,.047),texture=95);iron=M('Dark forged iron',(.045,.052,.055),metal=.65,rough=.5,texture=120);stone=M('Worn grey limestone',(.26,.255,.23),texture=75);linen=M('Coarse flax sacking',(.25,.20,.13),texture=165);dark=M('Dark interior',(.025,.022,.016));cord=M('Twisted flax cord',(.22,.18,.11),texture=160)
 def curve(name,points,rad,mat):
  cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.bevel_depth=rad;cu.bevel_resolution=3;sp=cu.splines.new('POLY');sp.points.add(len(points)-1)
  for p,v in zip(sp.points,points):p.co=(*v,1)
  o=bpy.data.objects.new(name,cu);c.objects.link(o);o.parent=root;cu.materials.append(mat);return o
 def lathe(name,profile,mat,center=(0,0,0),N=96):
  V=[];F=[]
  for z,rr in profile:
   for j in range(N):t=j*math.tau/N;V.append((center[0]+rr*math.cos(t),center[1]+rr*math.sin(t),center[2]+z))
  for k in range(len(profile)-1):
   for j in range(N):F.append((k*N+j,k*N+(j+1)%N,(k+1)*N+(j+1)%N,(k+1)*N+j))
  m=bpy.data.meshes.new(name);m.from_pydata(V,[],F);o=bpy.data.objects.new(name,m);c.objects.link(o);o.parent=root;m.materials.append(mat)
  for p in m.polygons:p.use_smooth=True
  return o
 def ring(name,z,rr,mat,th=.007,cx=0,cy=0):return curve(name,[(cx+rr*math.cos(j*math.tau/80),cy+rr*math.sin(j*math.tau/80),z) for j in range(81)],th,mat)
 if asset=='herb_rack':
  herbm=[M('Dried medicinal herb %d'%j,(.11+j*.015,.12+j*.012,.035+j*.007),texture=120) for j in range(3)]
  for x in [-.64,.64]:
   B('Drying rack upright',(x,0,.84),(.065,.065,1.68),wood,bevel=.005);B('Drying rack foot',(x,0,.04),(.13,.61,.08),wood,bevel=.006)
  for z in [.79,1.56]:R('Drying rack horizontal beam',(-.69,0,z),(.69,0,z),.027,wood)
  V=[];F=[];indices=[]
  for row in range(2):
   for col in range(5):
    cx=-.48+col*.24;top=.75+row*.77
    curve('Herb bundle tie',[(cx-.025,0,top),(cx,-.025,top+.055),(cx+.025,0,top)],.003,cord)
    for j in range(18):
     x=cx+r.uniform(-.07,.07);y=r.uniform(-.06,.06);z=top-r.uniform(.26,.45);curve('Dried herb stalk',[(cx,0,top),(x,y,z)],.0015,herbm[j%3])
     for k in range(4):
      q=.3+k*.17;xx=cx*(1-q)+x*q;yy=y*q;zz=top*(1-q)+z*q;t=r.random()*math.tau;dx=.065*math.cos(t);dy=.065*math.sin(t);idx=len(V);V.extend([(xx,yy,zz),(xx+dx*.5-dy*.14,yy+dy*.5+dx*.14,zz-.018),(xx+dx,yy+dy,zz-.04),(xx+dx*.5+dy*.14,yy+dy*.5-dx*.14,zz-.025)]);F.append((idx,idx+1,idx+2,idx+3));indices.append(j%3)
  m=bpy.data.meshes.new('Dry folded herb leaves');m.from_pydata(V,[],F);o=bpy.data.objects.new('Drying herbs',m);c.objects.link(o);o.parent=root
  for mat in herbm:m.materials.append(mat)
  for face,i in zip(m.polygons,indices):face.material_index=i
 elif asset=='mortar':
  lathe('Carved stone mortar',[(.005,0),(.005,.075),(.025,.085),(.045,.10),(.14,.125),(.165,.133),(.18,.13),(.18,.112),(.15,.106),(.07,.065),(.045,0)],stone)
  R('Wooden pestle shaft',(.025,.015,.06),(.13,.03,.28),.015,wood,r2=.021);E('Pestle rounded head',(.025,.015,.063),(.028,.024,.035),wood)
 elif asset=='urn':
  lathe('Stone funerary urn',[(.005,0),(.005,.11),(.04,.12),(.075,.075),(.12,.12),(.24,.17),(.34,.14),(.37,.09),(.40,.085),(.415,.10),(.43,.10),(.43,.075),(.40,.07),(.35,.075),(.31,.11),(.23,.14),(.13,.085),(.10,0)],stone)
  lathe('Loose stone urn cover',[(.43,0),(.43,.105),(.45,.105),(.47,.075),(.48,.035),(.51,.025),(.515,0)],stone)
 elif asset in ['fishing_bucket','brew_vat']:
  vat=asset=='brew_vat';h=.85 if vat else .28;rr=.64 if vat else .15
  lathe('Open coopered vessel',[(.01,0),(.01,rr*.80),(.05,rr*.83),(h,rr),(h+.012,rr),(h+.012,rr-.018),(.055,rr*.80-.018),(.05,0)],wood)
  for j in range(24 if vat else 18):
   t=j*math.tau/(24 if vat else 18);curve('Separate stave joint',[(rr*.83*math.cos(t),rr*.83*math.sin(t),.05),(rr*math.cos(t),rr*math.sin(t),h)],.0015 if not vat else .0025,dark)
  for q in [.16,.76,.94]:ring('Iron vessel hoop',q*h,rr*(.82+.18*q)+.003,iron,.009 if vat else .004)
  if vat:
   foam=M('Still brown ale',(.08,.045,.015),rough=.22);lathe('Ale surface',[(h-.13,0),(h-.13,rr*.95)],foam)
   R('Vat tap',(0,-rr*.85,.20),(0,-rr-.13,.20),.025,wood);R('Tap stopcock',(0,-rr-.09,.19),(0,-rr-.09,.29),.015,iron)
   R('Mash stirring paddle',(.20,.15,.24),(.44,.20,1.24),.018,wood);B('Paddle blade',(.24,.16,.36),(.14,.025,.26),wood,bevel=.018)
  else:
   curve('Bowed iron bucket handle',[(rr*math.cos(t*math.pi/48),0,h+.20*math.sin(t*math.pi/48)) for t in range(49)],.004,iron)
   fish=M('Silver grey fish scales',(.20,.23,.23),metal=.25,rough=.45,texture=160)
   for j in range(3):
    x=-.06+j*.06;E('Fish in bucket',(x,-.025,.20+j*.008),(.022,.085,.017),fish);E('Fish eye',(x,-.096,.209+j*.008),(.004,.004,.003),dark)
 elif asset=='millstone':
  lathe('Stationary lower millstone',[(.01,0),(.01,.53),(.08,.56),(.17,.56),(.19,.51),(.19,0)],stone)
  lathe('Rotating upper millstone',[(.20,.10),(.20,.49),(.23,.52),(.34,.52),(.37,.47),(.37,.10),(.20,.10)],stone)
  for j in range(12):
   t=j*math.tau/12;points=[]
   for k in range(16):q=k/15;rr=.13+.35*q;ang=t+.20*q;points.append((rr*math.cos(ang),rr*math.sin(ang),.372))
   curve('Radial millstone dressing furrow',points,.003,dark)
  R('Wooden turning handle',(.35,0,.30),(.35,0,.63),.022,wood)
 elif asset=='grain_sack':
  # Irregular cloth volume, open rolled rim and a few individual kernels.
  o=lathe('Bulging grain sack',[(.01,0),(.01,.17),(.07,.24),(.24,.26),(.43,.22),(.54,.18),(.56,.18),(.56,.16),(.52,.15),(.48,.17),(.46,0)],linen)
  for v in o.data.vertices:
   t=math.atan2(v.co.y,v.co.x);f=1+.025*math.sin(t*13+v.co.z*9);v.co.x*=f;v.co.y*=f
  wheat=M('Dry wheat grain',(.39,.28,.11),texture=140);E('Mounded grain',(0,0,.49),(.155,.155,.07),wheat)
  for j in range(160):
   t=r.random()*math.tau;rr=.15*math.sqrt(r.random());x,y=rr*math.cos(t),rr*math.sin(t);z=.49+.06*math.sqrt(max(0,1-(rr/.155)**2));o=E('Loose wheat kernel',(x,y,z),(.007,.004,.004),wheat);o.rotation_euler[2]=r.random()*math.tau
 elif asset=='beehive':
  straw=M('Weathered rye straw',(.25,.18,.075),texture=140)
  for j in range(17):
   z=.035+j*.031;rr=.29*math.sqrt(max(.02,1-(z/.61)**2));ring('Coiled straw skep',z,rr,straw,.024)
  lathe('Skep dark internal weave',[(.02,0),(.02,.27),(.30,.25),(.48,.15),(.55,0)],straw)
  E('Small dark hive entrance',(0,-.316,.09),(.043,.012,.026),dark);B('Bee landing board',(0,-.35,.04),(.19,.12,.025),wood,bevel=.004)
  for j in range(8):
   t=j*math.tau/8;curve('Skep binding',[((.29*math.sqrt(max(.02,1-(z/.61)**2))+.025)*math.cos(t),(.29*math.sqrt(max(.02,1-(z/.61)**2))+.025)*math.sin(t),z) for z in [k*.03+.02 for k in range(18)]],.0025,cord)
 elif asset=='fishing_rod':
  points=[(-.69+j*.06,0,.055+.05*(j/24)**2) for j in range(25)];curve('Split willow fishing rod',points,.007,wood);curve('Fine fishing line',[(.75,0,.105),(.88,-.03,.035),(.50,-.15,.012),(.21,-.19,.01)],.0007,linen);R('Bound grip',(-.69,0,.055),(-.40,0,.057),.012,cord)
  E('Cork fishing float',(.50,-.15,.015),(.014,.024,.013),wood)
 elif asset=='notice_board':
  for x in [-.62,.62]:B('Notice board post',(x,0,.93),(.09,.10,1.86),wood,bevel=.008)
  for j in range(7):B('Board backing',(-.55+j*.183,0,1.20),(.175,.055,.91),wood,bevel=.004)
  for z in [.73,1.67]:B('Notice frame rail',(0,-.01,z),(1.36,.08,.07),wood,bevel=.006)
  parchment=M('Weathered parchment',(.43,.37,.24),texture=170)
  for j,(x,z,w,h,angle) in enumerate([(-.31,1.34,.32,.36,-.08),(.19,1.31,.36,.40,.06),(-.23,.94,.28,.22,.10),(.35,.96,.20,.23,-.06)]):
   o=B('Pinned blank notice',(x,-.045,z),(w,.002,h),parchment,bevel=.002);o.rotation_euler[1]=angle
   for dx in [-w*.38,w*.38]:E('Iron notice nail',(x+dx,-.052,z+h*.37),(.005,.004,.005),iron)
 fit_finish(ns,asset,sources=[str(Path(__file__))],alpha_levels=32 if asset=='fishing_rod' else 8)
