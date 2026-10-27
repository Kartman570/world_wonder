"""A periodic shader and directional lighting form a stationary seamless water tile."""
import bpy,json

def validate():
    s=bpy.context.scene;cfg=json.loads(s['sprite_export_json']);assert cfg['tileable'] and not cfg['crop'];assert tuple(s.camera.rotation_euler)==(0,0,0);assert abs(s.camera.data.ortho_scale-2.1)<1e-6;assert all(l.data.type=='SUN' for l in s.objects if l.type=='LIGHT' and not l.hide_render)
    o=bpy.data.objects['WATER stationary lake surface'];assert o.location.length<1e-7 and o.parent.location.length<1e-7;mat=o.data.materials[0];values=[];old=(s.frame_current,s.frame_subframe)
    try:
        for f in [1,25]:
            s.frame_set(f);values.append([n.outputs[0].default_value for n in mat.node_tree.nodes if n.label in ['Temporal sine','Temporal cosine']])
        assert values[0]==values[1],('temporal seam',values)
        return dict(status='passed',spatial_period=2.1,temporal_endpoint_parameters=values,root_motion=0,directional_lighting=True)
    finally:s.frame_set(old[0],subframe=old[1])
