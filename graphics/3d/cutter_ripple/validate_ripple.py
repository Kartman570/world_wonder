"""One-shot fade and divergence of the displaced contour pair."""
import bpy,json

def validate():
    s=bpy.context.scene;old=(s.frame_current,s.frame_subframe);cfg=json.loads(s['sprite_export_json'])['clips']['loop'];o=bpy.data.objects['CUTTER spatial ripple'];fade=next(n for n in o.data.materials[0].node_tree.nodes if n.label=='Effect opacity');values=[]
    try:
        assert not cfg['loop']
        for f in [cfg['start'],cfg['start']+(cfg['frames']-1)*.5,cfg['start']+cfg['frames']-1]:s.frame_set(int(f),subframe=f%1);values.append(fade.outputs[0].default_value)
        assert values[0]==0 and values[-1]==0 and values[1]>.9,('fade envelope',values)
        assert o.parent.location.length<1e-7,'engine owns position'
        return dict(status='passed',opacity_start_peak_end=values)
    finally:s.frame_set(old[0],subframe=old[1])
