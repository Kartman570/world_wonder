"""A rigid wheeled support, grounded tires and visible nonliving damage state."""
import bpy,json,math
from mathutils import Vector

def validate():
    s=bpy.context.scene;clips=json.loads(s['sprite_export_json'])['clips'];old=(s.frame_current,s.frame_subframe);floor_error=base_motion=0.;wheel_error=0.;head_heights=[];torso_heights=[];arm_heights=[]
    try:
        wheels=[o for o in s.objects if o.type=='EMPTY' and o.name.startswith('DUMMY wheel ')];assert len(wheels)==4
        for name,cfg in clips.items():
            span=cfg['frames'] if cfg['loop'] else cfg['frames']-1
            for j in range(span*4+1):
                t=j/(span*4);f=cfg['start']+j*.25;s.frame_set(int(f),subframe=f%1);bpy.context.view_layer.update();root=bpy.data.objects['CHARACTER_ROOT'];base=bpy.data.objects['DUMMY cart'];base_motion=max(base_motion,root.location.length,root.rotation_euler.to_quaternion().angle,base.location.length)
                for wheel in wheels:
                    tire=next(o for o in wheel.children if o.name.startswith('DUMMY iron wheel tire'));low=min((tire.matrix_world@v.co).z for v in tire.data.vertices);floor_error=max(floor_error,abs(low-.002))
                    if name=='walk':wheel_error=max(wheel_error,abs(wheel.rotation_euler.x-math.tau*t))
                if name=='death':
                    head_heights.append(bpy.data.objects['DUMMY blank head sack'].matrix_world.translation.z);torso_heights.append(bpy.data.objects['DUMMY upper support'].matrix_world.translation.z);arm=bpy.data.objects['DUMMY arm hinge 1'];arm_heights.append((arm.matrix_world@Vector((.45,0,0))).z)
        assert base_motion<1e-6,('support slides or tilts',base_motion)
        assert floor_error<.001,('wheels leave ground',floor_error)
        assert wheel_error<1e-5,('wheels do not roll',wheel_error)
        head_drop=head_heights[0]-head_heights[-1];body_drop=torso_heights[0]-torso_heights[-1];arm_drop=arm_heights[0]-arm_heights[-1]
        assert head_drop>.20 and body_drop>.15 and arm_drop>.25,('damage state does not slump',head_drop,body_drop,arm_drop)
        cfg=clips['death'];s.frame_set(cfg['start']+cfg['frames']-1);splinters=[o for o in s.objects if o.name.startswith('DUMMY broken crossbar splinter')];assert splinters and all(not o.hide_render for o in splinters)
        for name in ['idle','walk']:
            s.frame_set(clips[name]['start']);assert all(o.hide_render for o in splinters),('damage visible before hit',name)
        return dict(status='passed',wheel_count=len(wheels),max_tire_floor_error=floor_error,max_base_motion=base_motion,max_wheel_roll_error=wheel_error,damaged_head_drop=head_drop,damaged_support_drop=body_drop,damaged_arm_drop=arm_drop)
    finally:s.frame_set(old[0],subframe=old[1])
