"""Fixed-canvas modular architecture. Export components, never a flattened building."""
import bpy, bmesh, math, json, hashlib, tempfile
from pathlib import Path
from mathutils import Vector
from environment_studio import begin
from animal_studio import ROOT, DENSITY
from render_8_directions import process_tile
from sprite_pipeline import png_bytes

class Studio:
    def __init__(self,asset,size=480,depth=21,width=12.6):
        self.ns,self.task=begin(asset);self.asset=asset;self.size=size;self.layer='walls'
        self.s=self.ns['s'];self.objects=[];self.width=width;self.depth=depth
        self.s.world.node_tree.nodes['Background'].inputs[1].default_value=.28
        self.s.render.engine='CYCLES';self.s.cycles.samples=48;self.s.cycles.transparent_max_bounces=64
        self.s.render.resolution_x=self.s.render.resolution_y=size*2;self.s.render.resolution_percentage=100;self.s.render.film_transparent=True
        self.s.render.image_settings.file_format='PNG';self.s.render.image_settings.color_mode='RGBA';self.s.view_settings.view_transform='AgX'
        self.camera(size/DENSITY,80/(DENSITY*math.cos(math.pi/6)))
    def camera(self,extent,target):
        cam=self.s.camera;cam.data.type='ORTHO';cam.data.ortho_scale=extent
        cam.location=(0,-60,60*math.tan(math.pi/6)+target);cam.rotation_euler=(Vector((0,0,target))-cam.location).to_track_quat('-Z','Y').to_euler()
    def material(self,name,color,texture=8,metal=0):return self.ns['material'](name,color,texture=texture,metal=metal)
    def tag(self,o):o['building_component']=self.layer;self.objects.append(o);return o
    def box(self,name,loc,scale,mat,bevel=.015):
        verts=[(x*scale[0]/2,y*scale[1]/2,z*scale[2]/2) for x,y,z in [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]]
        o=self.mesh(name,verts,[(2,6,4,0),(5,7,3,1),(4,5,1,0),(3,7,6,2),(1,3,2,0),(6,7,5,4)],mat);o.location=loc
        if bevel:
            mod=o.modifiers.new('Worn bevel','BEVEL');mod.width=bevel;mod.segments=2
            o.modifiers.new('Weighted face normals','WEIGHTED_NORMAL')
        return o
    def rod(self,name,a,b,r,mat):return self.tag(self.ns['rod'](name,a,b,r,mat))
    def mesh(self,name,verts,faces,mat):
        mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();orient_mesh(mesh,self.layer,self.asset);o=bpy.data.objects.new(name,mesh);self.ns['c'].objects.link(o);o.parent=self.ns['root'];mesh.materials.append(mat);return self.tag(o)
    def save(self):
        self.ns['root'].rotation_euler=(0,0,0)
        for key in self.task['components']:
            name='COMPONENT • '+key;group=bpy.data.objects.get(name)
            if group is None:
                group=bpy.data.objects.new(name,None);self.ns['c'].objects.link(group);group.parent=self.ns['root'];group.empty_display_size=.12
            for o in self.objects:
                if o['building_component']==key:
                    if o.parent==self.ns['root']:o.parent=group
                    o.hide_set(self.asset=='door' and key!='closed')
        for o in self.objects:o.hide_render=False;o.is_holdout=False
        self.s['component_frame_is_crop_mask']=self.asset=='door'
        self.s['sprite_asset']=self.asset;self.s['sprite_pixels_per_unit']=self.size/self.s.camera.data.ortho_scale;self.s['building_contract_version']=1
        self.s['sprite_export_json']=json.dumps(dict(asset=self.asset,kind='components',outputSize=self.size,crop=False,components=list(self.task['components'])))
        folder=ROOT/'3d'/self.asset;folder.mkdir(exist_ok=True)
        for file in [Path(__file__),ROOT/'3d/_shared/building_architecture.py',folder/'build.py']:
            block=bpy.data.texts.get(file.name) or bpy.data.texts.new(file.name);block.clear();block.write(file.read_text())
        bpy.ops.outliner.orphans_purge(do_local_ids=True,do_linked_ids=False,do_recursive=True)
        bpy.context.preferences.filepaths.save_version=0
        bpy.ops.wm.save_as_mainfile(filepath=str(folder/(self.asset+'.blend')),compress=True)
    def export(self,publish=True,components=None):
        fields=['spriteReady','frameWidth','frameHeight','frames','directions','anchor','hash']
        results={k:{f:c[f] for f in fields} for k,c in self.task['components'].items() if c.get('spriteReady')}
        with tempfile.TemporaryDirectory(prefix=self.asset+'_components_') as tmp:
            for key,cfg in self.task['components'].items():
                if components is not None and key not in components:continue
                for o in self.objects:
                    o.is_holdout=False;o.hide_render=o['building_component']!=key
                    # Tall tower walls must remain in front of the roof in 2D assembly.
                    if key=='roof' and self.asset in ['building_castle','building_cathedral'] and o['building_component'] in ['walls','facade']:
                        o.hide_render=False;o.is_holdout=True
                self.s.render.filepath=str(Path(tmp)/'render.png');bpy.ops.render.render(write_still=True,scene=self.s.name)
                im=bpy.data.images.load(self.s.render.filepath,check_existing=False);rgba=process_tile(im,self.size,True);bpy.data.images.remove(im)
                assert rgba[:,:,3].max()>0,(self.asset,key,'empty layer')
                if self.asset!='door':assert not (rgba[0,:,3].any() or rgba[:,0,3].any() or rgba[:,-1,3].any()),(self.asset,key,'clipped top or side')
                if self.asset=='door':
                    # The outer masonry frame intentionally meets the engine cutout boundary.
                    assert rgba[0,:,3].all() and rgba[:,0,3].all(),(key,'incomplete portal border')
                    if key=='open' or key.endswith('_open'):assert not rgba[130:250,140:240,3].any(),'open passage obstructed'
                data=png_bytes(rgba);path=ROOT/'sprites'/cfg['file'];path.parent.mkdir(parents=True,exist_ok=True);staging=path.with_suffix('.png.tmp');staging.write_bytes(data);staging.replace(path)
                results[key]=dict(spriteReady=True,frameWidth=self.size,frameHeight=self.size,frames=1,directions=1,anchor=[0,0],hash=hashlib.sha256(data).hexdigest()[:16])
        self.s['pending_building_exports']=json.dumps(results)
        if not publish:
            self.save();return {'asset':self.asset,'parts':results}
        return self.commit()
    def commit(self):
        results=json.loads(self.s['pending_building_exports'])
        # Reread immediately before the checkpoint: preserve concurrent engine edits.
        path=ROOT/'sprites/manifest.json';manifest=json.loads(path.read_text());entry=next(e for e in manifest['catalog'] if e['id']==self.asset)
        for key,values in results.items():entry['components'][key].update(values)
        entry['spriteReady']=all(c.get('spriteReady') for c in entry['components'].values())
        staging=path.with_suffix('.json.tmp');staging.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');staging.replace(path)
        self.s['building_export_hashes']=json.dumps({k:v['hash'] for k,v in results.items()});self.save()
        return {'asset':self.asset,'parts':results}

def smith():
    a=Studio('building_smith');stone=a.material('Lime mortar',(.24,.22,.18));brick=a.material('Fired weathered brick',(.29,.14,.085));wood=a.material('Blackened structural oak',(.085,.052,.028));slate=a.material('Uneven charcoal slate',(.075,.09,.105));iron=a.material('Forged iron',(.075,.085,.09),metal=.65);glass=a.material('Unlit window recess',(.025,.033,.032));floor=a.material('Soot stained flagstones',(.21,.20,.18));soot=a.material('Chimney soot',(.035,.03,.025))
    a.layer='floor';a.box('Continuous floor mortar bed',(0,0,-.09),(12.6,21,.10),floor)
    for row in range(28):
        for col in range(16):
            x=-6.3+(col+.5)*12.6/16;y=-10.5+(row+.5)*21/28
            a.box('Worn limestone floor',(x,y,-.04),(12.6/16-.018,21/28-.018,.08),floor,.012)
    # Separate three-sided shell: front wall is never baked into walls.
    a.layer='walls';a.box('North loadbearing wall',(0,10.25,1.4),(12.6,.5,2.8),stone)
    for x in [-6.05,6.05]:a.box('Side loadbearing wall',(x,0,1.4),(.5,20,2.8),stone)
    a.layer='facade';a.box('South masonry',(0,-10.25,1.4),(12.6,.5,2.8),stone)
    for row in range(9):
        y=-10.535;z=.16+row*.30
        for col in range(25):
            x=-6.04+col*.50+(row%2)*.24
            if x>6.15:continue
            a.box('Hand laid facade brick',(x,y,z),(.465,.10,.265),brick,.018)
    for x in [-6.03,-3.7,0,3.7,6.03]:a.box('Oak wall post',(x,-10.63,1.4),(.18,.22,2.8),wood)
    for z in [.20,2.7]:a.box('Oak wall plate',(0,-10.65,z),(12.6,.24,.20),wood)
    for x in [-4.7,4.7]:
        a.box('Recessed forge vent',(x,-10.67,1.65),(1.2,.10,.85),glass)
        for dx in [-.44,-.22,0,.22,.44]:a.rod('Vent wrought bar',(x+dx,-10.76,1.24),(x+dx,-10.76,2.06),.025,iron)
        a.box('Vent stone sill',(x,-10.76,1.19),(1.45,.32,.12),stone)
    # South gable belongs to facade; roof can be hidden independently.
    a.mesh('Oak boarded south gable',[(-6.3,-10.52,2.8),(6.3,-10.52,2.8),(0,-10.52,4.7)],[(0,1,2)],wood)
    for x in [-5,-4,-3,-2,-1,0,1,2,3,4,5]:
        top=4.7-abs(x)*1.9/6.3
        a.box('Gable oak board',(x,-10.56,(2.8+top)/2),(.075,.10,top-2.8),wood)
    a.layer='roof'
    def z(x):return 4.7-abs(x)*1.9/6.3
    for side in [-1,1]:
        a.mesh('Continuous weatherproof slate backing',[(0,-10.8,4.7),(side*6.6,-10.8,z(side*6.6)),(side*6.6,10.8,z(side*6.6)),(0,10.8,4.7)],[(0,1,2,3)],slate)
    # Individual overlapping slabs, in one editable mesh instead of hundreds of objects.
    verts=[];faces=[]
    for side in [-1,1]:
        for row in range(14):
            x0=side*row*6.6/14;x1=side*(row+1)*6.6/14
            for col in range(39):
                y0=-10.8+col*.555+(row%2)*.12;y1=min(10.8,y0+.54)
                if y0>=10.8:continue
                i=len(verts);verts += [(x0,y0,z(x0)+.045),(x1,y0,z(x1)+.045),(x1,y1,z(x1)+.045),(x0,y1,z(x0)+.045)];faces.append((i,i+1,i+2,i+3))
    a.mesh('Individual overlapping slate shingles',verts,faces,slate)
    for side in [-1,1]:a.rod('Oak eaves fascia',(side*6.6,-10.8,z(side*6.6)),(side*6.6,10.8,z(side*6.6)),.09,wood)
    a.rod('Lead ridge cap',(0,-10.8,4.76),(0,10.8,4.76),.12,iron)
    # Two masonry flues and a capped forge chimney. No smoke or flame baked in.
    for x,y in [(-3.6,1.8),(3.7,5.8)]:
        base=z(x)-.3;a.box('Brick chimney core',(x,y,(base+5.25)/2),(1.05,1.1,5.25-base),brick)
        for h in range(7):a.box('Chimney mortar course',(x,y,3.55+h*.23),(1.08,1.13,.035),stone)
        a.box('Chimney crown',(x,y,5.2),(1.30,1.35,.14),stone);a.box('Dark chimney opening',(x,y,5.28),(.74,.80,.025),soot)
    a.save();return a

def door():
    a=Studio('door',384);a.camera(3.3,1.70)
    oak=a.material('Weathered door oak',(.20,.11,.048),texture=28);end=a.material('Exposed splintered oak',(.37,.24,.12),texture=40);iron=a.material('Blackened door iron',(.07,.075,.08),metal=.65);stone=a.material('Worn threshold limestone',(.30,.28,.23));dark=a.material('Keyway',(.013,.012,.009))
    for state in ['closed','open','locked','broken']:
        a.layer=state
        a.box('Stone threshold '+state,(0,0,.035),(2.9,.45,.07),stone)
        for x in [-1.30,1.30]:a.box('Oak jamb '+state,(x,.07,1.22),(.18,.22,2.44),oak)
        a.box('Oak lintel '+state,(0,.07,2.46),(2.8,.24,.20),oak)
        if state=='open':
            # Folded leaf against jamb; central passage remains completely transparent.
            for i in range(7):a.box('Open leaf plank',(1.19,.20+i*.27,1.15),(.09,.255,2.28),oak)
            continue
        for i in range(9):
            x=-1.17+i*.29;height=2.28;center=1.17
            if state=='broken' and i in [3,4,5]:height=.4+(i%2)*.18;center=height/2+.03
            a.box('Vertical door plank '+state,(x,-.04,center),(.277,.12,height),end if state=='broken' else oak)
        for z in [.50,1.88]:
            if state=='broken':a.box('Broken hinge strap',(-.87,-.13,z),(.55,.08,.13),iron)
            else:
                a.box('Forged hinge strap',(0,-.13,z),(2.35,.075,.13),iron)
                for x in [-1.04,-.56,.56,1.04]:a.rod('Hinge rivet',(x,-.18,z),(x,-.12,z),.035,iron)
        if state!='broken':
            a.rod('Iron pull handle',(.77,-.22,1.03),(.77,-.22,1.36),.04,iron)
            a.box('Lock plate',(.76,-.15,.92),(.23,.05,.28),iron)
            a.box('Keyhole',(.76,-.184,.94),(.04,.015,.08),dark)
        if state=='locked':
            a.box('Heavy locking crossbar',(0,-.24,1.20),(2.6,.17,.22),oak)
            a.box('Padlock body',(.12,-.37,1.03),(.24,.09,.25),iron)
    # Extend the physical portal surround to the exact engine cutout rectangle.
    # The wood leaf is tall enough for a human, after the engine's 1:1.5 draw ratio.
    for o in a.objects:
        if o.type=='MESH':o.location.z*=1.35;o.scale.z*=1.35
    for state in ['closed','open','locked','broken']:
        a.layer=state
        for x0,y0,x1,y1 in [(-1,25,46,360),(338,25,385,360),(-1,-1,385,25),(-1,360,385,385)]:
            def point(x,y):
                xx=(x-192)*3.3/384;v=(192-y)*3.3/384+1.70*math.cos(math.pi/6);return (xx,-.40,(v+.20)/math.cos(math.pi/6))
            a.mesh('Portal masonry aligned to cutout',[point(x0,y0),point(x1,y0),point(x1,y1),point(x0,y1)],[(0,1,2,3)],stone)
    a.s['component_frame_is_crop_mask']=True
    _door_variants(a)
    a.save();return a

def load():
    a=Studio.__new__(Studio);a.s=bpy.context.scene;a.asset=a.s['sprite_asset'];a.size=json.loads(a.s['sprite_export_json'])['outputSize'];a.task=next(e for e in json.loads((ROOT/'sprites/manifest.json').read_text())['catalog'] if e['id']==a.asset);a.ns={'s':a.s,'root':bpy.data.objects['CHARACTER_ROOT'],'c':bpy.data.collections['ASSET • replace with your character']};a.objects=[o for o in a.ns['c'].objects if 'building_component' in o];return a

def assembly_preview(a):
    """Use the engine v1 rectangles and door cutout, not a flattened 3D render."""
    import numpy as np
    def read(path):
        im=bpy.data.images.load(str(path),check_existing=False);im.colorspace_settings.name='Non-Color';w,h=im.size;p=np.empty(w*h*4,np.float32);im.pixels.foreach_get(p);bpy.data.images.remove(im);return np.rint(p.reshape(h,w,4)[::-1]*255).astype(np.uint8)
    def resize(p,w,h):return p[np.floor(np.arange(h)*len(p)/h).astype(int)[:,None],np.floor(np.arange(w)*p.shape[1]/w).astype(int)[None,:]]
    def over(canvas,p,x=0,y=0):
        alpha=p[:,:,3:4]/255;dst=canvas[y:y+len(p),x:x+p.shape[1]];dst[:,:,:3]=np.rint(p[:,:,:3]*alpha+dst[:,:,:3]*(1-alpha));dst[:,:,3]=255
    if a.asset.startswith('building_'):
        panels=[]
        for inside in [False,True]:
            out=np.zeros((720,480,4),np.uint8);out[:]=[44,49,40,255]
            for key in (['floor','walls'] if inside else ['walls','facade','roof']):
                p=resize(read(ROOT/'sprites'/a.task['components'][key]['file']),480,720)
                if key in ['walls','facade']:p[648:720,240:288]=0
                over(out,p)
            variant=next(iter(a.task['assembly']['variants'].values()));doorpart=next(p for p in variant['parts'] if p.get('origin')=='door');ref=doorpart['states']['open' if inside else 'closed'];owner,key=ref.split('#');entry=next(e for e in json.loads((ROOT/'sprites/manifest.json').read_text())['catalog'] if e['id']==owner)
            door=read(ROOT/'sprites'/entry['components'][key]['file']);over(out,resize(door,48,72),240,648);panels.append(out)
        path=Path(tempfile.gettempdir())/('ww_'+a.asset+'_assembly.png');path.write_bytes(png_bytes(np.concatenate(panels,axis=1)));return str(path)
    return None

def _door_variants(a):
    """Material-appropriate entrances using the same component/state contract."""
    cloth=a.material('Weathered entrance canvas',(.32,.27,.18),texture=48);rope=a.material('Hemp entrance ties',(.16,.12,.065),texture=50);iron=a.material('Wrought gate iron',(.09,.10,.105),texture=18,metal=.7);alloy=a.material('Pressure hatch muted alloy',(.22,.22,.26),texture=20,metal=.65);seam=a.material('Hatch seam dark metal',(.065,.075,.085),metal=.7)
    def point(x,y,depth=-.40):
        xx=(x-192)*3.3/384;v=(192-y)*3.3/384+1.70*math.cos(math.pi/6);return (xx,depth,(v-depth*.5)/math.cos(math.pi/6))
    def quad(name,x0,y0,x1,y1,mat,depth=-.40):return a.mesh(name,[point(x0,y0,depth),point(x1,y0,depth),point(x1,y1,depth),point(x0,y1,depth)],[(0,1,2,3)],mat)
    def line(name,x0,y0,x1,y1,r,mat,depth=-.45):return a.rod(name,point(x0,y0,depth),point(x1,y1,depth),r,mat)
    for style in ['canvas','iron','alloy']:
        for state in ['closed','open','locked','broken']:
            key=style+'_'+state
            if key not in a.task['components']:continue
            a.layer=key;mat=cloth if style=='canvas' else iron if style=='iron' else alloy
            for x0,y0,x1,y1 in [(-1,25,46,360),(338,25,385,360),(-1,-1,385,25),(-1,360,385,385)]:quad('Entrance surround '+key,x0,y0,x1,y1,mat)
            if state=='open':
                if style=='canvas':
                    for x0,x1 in [(46,80),(304,338)]:
                        for i in range(7):
                            x=x0+(x1-x0)*i/7;quad('Gathered canvas curtain',x,25,x+(x1-x0)/7+.4,360,cloth,-.42-(i%2)*.025)
                    line('Curtain binding',46,180,80,185,.025,rope);line('Curtain binding',304,185,338,180,.025,rope)
                else:quad('Retracted gate or hatch leaf',320,25,338,360,mat,-.45)
                continue
            if style=='iron':
                for i in range(13):
                    x=58+i*22
                    if state=='broken' and 4<=i<=8:
                        line('Broken lower gate bar',x,315+(i%2)*18,x+8,360,.036,iron)
                        line('Bent upper gate bar',x,25,x-10,92+(i%3)*17,.036,iron)
                    else:line('Vertical gate bar',x,25,x,360,.036,iron)
                for y in [88,286]:
                    if state=='broken':quad('Broken gate strap',46,y,110,y+12,iron,-.48);quad('Broken gate strap',277,y,338,y+12,iron,-.48)
                    else:quad('Gate cross strap',46,y,338,y+12,iron,-.48)
            elif state=='broken':
                # Torn cloth or buckled pressure sheet, leaving a clear irregular breach.
                a.mesh('Torn entrance edge',[point(46,25),point(338,25),point(338,360),point(274,360),point(290,245),point(257,213),point(269,98),point(183,132),point(132,84),point(116,248),point(97,277),point(115,360),point(46,360)],[tuple(range(13))],mat)
            else:
                if style=='canvas':
                    verts=[];faces=[]
                    for i in range(49):
                        x=46+i*292/48;depth=-.40-.018*math.cos(i*math.pi/3)
                        verts.extend([point(x,25,depth),point(x,360,depth)])
                    for i in range(48):faces.append((i*2,i*2+1,i*2+3,i*2+2))
                    curtain=a.mesh('Continuous folded canvas curtain',verts,faces,cloth)
                    for poly in curtain.data.polygons:poly.use_smooth=True
                else:
                    quad('Solid pressure hatch leaf',46,25,338,360,alloy)
                    for x0,x1 in [(60,179),(205,324)]:
                        for y0,y1 in [(43,165),(219,342)]:quad('Raised stamped hatch panel',x0,y0,x1,y1,alloy,-.45)
                line('Central entrance seam',192,25,192,360,.018,rope if style=='canvas' else seam)
                if style=='alloy':
                    for y in [82,298]:line('Reinforced hatch rib',56,y,328,y,.035,seam)
                    for x in [67,317]:
                        for y in [48,335]:line('Hatch fastening stud',x,y,x+.5,y,.032,seam,-.49)
                    quad('Hatch pull handle',282,165,290,212,seam,-.50)
            if state=='locked':
                if style=='canvas':
                    line('Tied canvas flap',172,155,210,224,.026,rope);line('Tied canvas flap',210,155,172,224,.026,rope)
                else:
                    line('Locking gate chain',134,151,249,229,.035,seam);line('Locking gate chain',134,229,249,151,.035,seam);quad('Mechanical lock housing',179,181,205,211,iron,-.55)


def orient_mesh(mesh,layer,asset):
    """Closed volumes face out; open roof/floor/portal surfaces face their exterior."""
    bm=bmesh.new();bm.from_mesh(mesh);bm.normal_update();changed=0
    if bm.faces and all(e.is_manifold for e in bm.edges):
        negative=bm.calc_volume(signed=True)<-1e-10
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.normal_update()
        if bm.calc_volume(signed=True)<-1e-10:bmesh.ops.reverse_faces(bm,faces=list(bm.faces))
        changed=int(negative)
    else:
        bad=[f for f in bm.faces if ((layer in ['floor','roof','default'] and asset!='door' and f.normal.z<-.00001) or (asset=='door' and f.normal.y>.00001))]
        if bad:bmesh.ops.reverse_faces(bm,faces=bad)
        changed=int(bool(bad))
    bm.to_mesh(mesh);bm.free();mesh.update();return changed
