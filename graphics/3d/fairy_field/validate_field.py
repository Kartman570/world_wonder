"""A small one-shot must vanish and retain a stationary engine attachment."""
import bpy,json

def validate():
    s=bpy.context.scene;old=(s.frame_current,s.frame_subframe);c=json.loads(s['sprite_export_json'])['clips']['loop'];assert not c['loop'];maximum=0.;ends=[]
    try:
        mat=bpy.data.objects['FIELD core branch 0'].data.materials[0];fade=next(n for n in mat.node_tree.nodes if n.label=='Effect opacity')
        for j in range((c['frames']-1)*4+1):
            f=c['start']+j*.25;s.frame_set(int(f),subframe=f%1);value=fade.outputs[0].default_value;maximum=max(maximum,value)
            if j in [0,(c['frames']-1)*4]:ends.append(value)
        assert max(ends)<1e-7 and maximum>.7,('bad effect envelope',ends,maximum)
        root=bpy.data.objects['CHARACTER_ROOT'];assert root.location.length<1e-7
        return dict(status='passed',endpoint_opacity=ends,max_opacity=maximum)
    finally:s.frame_set(old[0],subframe=old[1])
