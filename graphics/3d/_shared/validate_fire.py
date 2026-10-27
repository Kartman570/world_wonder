"""Looped fire must deform, retain live embers and hide resetting sparks."""
import bpy,json

def validate():
    s=bpy.context.scene;old=(s.frame_current,s.frame_subframe);cfg=json.loads(s['sprite_export_json'])['clips']['loop'];last={};max_reset_alpha=0.;movement=0.;values=[]
    try:
        flames=[o for o in s.objects if o.name.startswith('FIRE outer tongue')];sparks=[o for o in s.objects if o.name.startswith('FIRE rising spark')];assert flames,'no flame geometry'
        base=[v.co.copy() for v in flames[0].data.shape_keys.key_blocks['Basis'].data]
        for j in range(cfg['frames']*4+1):
            frame=cfg['start']+j*.25;s.frame_set(int(frame),subframe=frame%1);dg=bpy.context.evaluated_depsgraph_get();ev=flames[0].evaluated_get(dg);m=ev.to_mesh();movement=max(movement,max((v.co-p).length for v,p in zip(m.vertices,base)));ev.to_mesh_clear()
            for o in sparks:
                mat=o.data.materials[0];opacity=next(n for n in mat.node_tree.nodes if n.label=='Effect opacity').outputs[0].default_value;assert -.00001<=opacity<=1.00001
                if o.name in last and o.location.z-last[o.name][0]<-.3: max_reset_alpha=max(max_reset_alpha,opacity,last[o.name][1])
                last[o.name]=(o.location.z,opacity)
            snapshot=[]
            for mat in bpy.data.materials:
                if not mat.use_nodes:continue
                for n in mat.node_tree.nodes:
                    if n.bl_idname=='ShaderNodeValue':snapshot.append(n.outputs[0].default_value)
                    if n.bl_idname=='ShaderNodeEmission':snapshot.append(n.inputs['Strength'].default_value)
                    if n.bl_idname=='ShaderNodeTexNoise' and n.noise_dimensions=='4D':snapshot.append(n.inputs['W'].default_value)
                    if n.bl_idname=='ShaderNodeVectorMath' and n.operation=='ADD':snapshot.extend(n.inputs[1].default_value)
            if j in [0,cfg['frames']*4]:values.append(snapshot)
        assert movement>.015,('stationary flame',movement)
        assert max_reset_alpha<.025,('visible spark teleport',max_reset_alpha)
        assert len(values[0])==len(values[1]) and max(abs(a-b) for a,b in zip(*values))<1e-5,'material loop does not close'
        return dict(status='passed',flame_tongues=len(flames),sparks=len(sparks),max_flame_deformation=movement,max_reset_spark_opacity=max_reset_alpha,material_loop_error=max(abs(a-b) for a,b in zip(*values)))
    finally:s.frame_set(old[0],subframe=old[1])
