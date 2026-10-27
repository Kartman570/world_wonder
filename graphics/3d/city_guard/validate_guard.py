"""Pose preflight in Blender. Geometry only: never invokes a renderer or exporter."""
import bpy, math
from mathutils import Vector

def validate(scene=None):
    scene=scene or bpy.data.scenes['SPRITE_TEMPLATE']
    original=(scene.frame_current,scene.frame_subframe)
    errors=[]; floor=1.; bend_min=math.pi; bend_max=0.; count=0
    try:
        for sample in range(49):
            f=2+sample*.25; scene.frame_set(int(f),subframe=f%1); bpy.context.view_layer.update()
            for side in [-1,1]:
                hip,knee,ankle=[bpy.data.objects[name+str(side)] for name in ['RIG_hip','RIG_knee','RIG_ankle']]
                h,k,a=[obj.matrix_world.translation.copy() for obj in [hip,knee,ankle]]
                chord=h.lerp(a,(h.z-k.z)/(h.z-a.z))
                if chord.y-k.y<=0: errors.append(f'Frame {f}, leg {side}: knee bends backward')
                if abs(a.x-side*.145)>.001: errors.append(f'Frame {f}, leg {side}: lateral foot drift')
                toe=ankle.matrix_world.to_3x3()@Vector((0,-1,0))
                if toe.dot(Vector((0,-1,0)))<.99: errors.append(f'Frame {f}, leg {side}: foot twists')
                bend_min=min(bend_min,knee.rotation_euler.x); bend_max=max(bend_max,knee.rotation_euler.x)
                dg=bpy.context.evaluated_depsgraph_get()
                for obj in ankle.children:
                    if obj.name.startswith('Boot sole'):
                        ev=obj.evaluated_get(dg); mesh=ev.to_mesh()
                        low=min((ev.matrix_world@v.co).z for v in mesh.vertices);ev.to_mesh_clear();floor=min(floor,low)
                        if low<-.0001: errors.append(f'Frame {f}, leg {side}: sole below ground {low}')
                count+=1
        def geometry(frame):
            scene.frame_set(frame);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();points=[]
            for obj in bpy.data.collections['ASSET • replace with your character'].objects:
                if obj.type=='MESH':
                    ev=obj.evaluated_get(dg); mesh=ev.to_mesh();points.extend(ev.matrix_world@v.co for v in mesh.vertices);ev.to_mesh_clear()
            return points
        a,b=geometry(2),geometry(14)
        loop_error=max((p-q).length for p,q in zip(a,b))
        if loop_error>.00001: errors.append('Loop seam does not match')
        if errors: raise AssertionError('\n'.join(errors[:20]))
        return dict(status='passed',quarter_frame_samples=49,leg_poses=count,
                    min_sole_z=round(floor,6),knee_degrees=[round(math.degrees(bend_min),2),round(math.degrees(bend_max),2)],loop_error=loop_error,rendered=False)
    finally: scene.frame_set(original[0],subframe=original[1])

if __name__=='__main__': print(validate())
