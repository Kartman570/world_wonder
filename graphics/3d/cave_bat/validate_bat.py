"""Wing joints and membranes, real exported wing motion, hovering and final ground contact."""
import bpy,json,math
from mathutils import Vector

def validate():
    s=bpy.context.scene;clips=json.loads(s['sprite_export_json'])['clips'];old=(s.frame_current,s.frame_subframe)
    length_error=gap=membrane_gap=0.;ranges={};minimum_body=99.
    lengths=[.17,.20,.15,.13,.10,.14,.11,.08,.12,.10,.08,.045,math.sqrt(.007**2+.014**2+.010**2)]
    try:
        for name,clip in clips.items():
            span=clip['frames'] if clip['loop'] else clip['frames']-1;tips=[]
            for j in range(span*4+1):
                f=clip['start']+j*.25;s.frame_set(int(f),subframe=f%1);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get()
                for side in [-1,1]:
                    bones=[bpy.data.objects['BAT wing %s bone %s'%(side,k)] for k in range(13)]
                    for bone,length in zip(bones,lengths):length_error=max(length_error,abs(bone.scale.z-length))
                    for a,b in [(0,1),(1,2),(1,5),(1,8),(1,11),(2,3),(3,4),(5,6),(6,7),(8,9),(9,10),(11,12)]:gap=max(gap,(bones[a].matrix_world@Vector((0,0,1))-bones[b].matrix_world.translation).length)
                    if j%4==0:tips.append((bones[4].matrix_world@Vector((0,0,1))).z)
                    membrane=bpy.data.objects['BAT membrane '+str(side)];ev=membrane.evaluated_get(dg);m=ev.to_mesh();verts=[membrane.matrix_world@v.co for v in m.vertices]
                    for k in [0,1,2,3,4,5,6,7,8,9,10]:
                        point=bones[k].matrix_world@Vector((0,0,1));membrane_gap=max(membrane_gap,min((point-v).length for v in verts))
                    ev.to_mesh_clear()
                if clip['loop']:
                    root=bpy.data.objects['CHARACTER_ROOT'];assert root.location.xy.length<1e-6,('flight root moves',name,f)
                    o=bpy.data.objects['BAT furred body'];minimum_body=min(minimum_body,min((o.matrix_world@v.co).z for v in o.data.vertices))
            if clip['loop']:ranges[name]=max(tips)-min(tips);assert ranges[name]>.40,('wings static in exported frames',name,ranges[name])
        assert length_error<1e-5,('wing bones change length',length_error)
        assert gap<1e-5,('wing joints disconnected',gap)
        assert membrane_gap<.002,('membrane detached from fingers',membrane_gap)
        assert minimum_body>.40,('living bat stands on ground',minimum_body)
        c=clips['death'];s.frame_set(c['start']+c['frames']-1);o=bpy.data.objects['BAT furred body'];low=min((o.matrix_world@v.co).z for v in o.data.vertices)
        assert low<.04,('corpse propped on wings',low)
        return dict(status='passed',max_bone_length_error=length_error,max_joint_gap=gap,max_membrane_gap=membrane_gap,exported_wingtip_z_ranges=ranges,minimum_living_body_height=minimum_body,corpse_body_floor=low)
    finally:s.frame_set(old[0],subframe=old[1])
