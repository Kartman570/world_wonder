"""Check fixed attachment and restrained cloth strain at intermediate frames."""
import bpy,math

def validate():
    s=bpy.context.scene;old=(s.frame_current,s.frame_subframe);o=bpy.data.objects['FLAG cloth'];base=[v.co.copy() for v in o.data.shape_keys.key_blocks['Basis'].data];pinned=0.;strain=0.;amplitude=0.
    try:
        for j in range(65):
            frame=1+j*.25;s.frame_set(int(frame),subframe=frame%1);bpy.context.view_layer.update();ev=o.evaluated_get(bpy.context.evaluated_depsgraph_get());m=ev.to_mesh();points=[v.co.copy() for v in m.vertices[:len(base)]];ev.to_mesh_clear()
            # Solidify duplicates vertices after the original grid.
            for row in range(33):pinned=max(pinned,(points[row*57]-base[row*57]).length)
            for row in range(33):
                for col in range(57):
                    i=row*57+col;amplitude=max(amplitude,abs(points[i].y))
                    for n in ([i+1] if col<56 else [])+([i+57] if row<32 else []):strain=max(strain,abs((points[n]-points[i]).length/(base[n]-base[i]).length-1))
        assert pinned<.002,('hoist moves',pinned)
        assert strain<.15,('cloth stretches excessively',strain)
        assert amplitude>.035,('no visible wind folds',amplitude)
        return dict(status='passed',max_attachment_motion=pinned,max_edge_strain=strain,max_wave_depth=amplitude)
    finally:s.frame_set(old[0],subframe=old[1])
