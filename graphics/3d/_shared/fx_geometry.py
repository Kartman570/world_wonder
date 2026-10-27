"""Reusable transparent emissive mesh helpers for authored Blender effects."""
import bpy,bmesh

def material(name,strength=1):
    m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes;l=m.node_tree.links;n.clear();out=n.new('ShaderNodeOutputMaterial');transparent=n.new('ShaderNodeBsdfTransparent');emission=n.new('ShaderNodeEmission');emission.inputs['Strength'].default_value=strength;attr=n.new('ShaderNodeVertexColor');attr.layer_name='FX';fade=n.new('ShaderNodeValue');fade.label='Effect opacity';fade.outputs[0].default_value=1;alpha=n.new('ShaderNodeMath');alpha.operation='MULTIPLY';l.new(attr.outputs['Alpha'],alpha.inputs[0]);l.new(fade.outputs[0],alpha.inputs[1]);mix=n.new('ShaderNodeMixShader');l.new(alpha.outputs[0],mix.inputs[0]);l.new(transparent.outputs[0],mix.inputs[1]);l.new(emission.outputs[0],mix.inputs[2]);l.new(attr.outputs['Color'],emission.inputs['Color']);l.new(mix.outputs[0],out.inputs['Surface']);return m,fade,emission

def mesh(ns,name,points,faces,colors,mat,parent=None):
    m=bpy.data.meshes.new(name);m.from_pydata(points,[],faces);m.update();m.materials.append(mat);color=m.color_attributes.new(name='FX',type='FLOAT_COLOR',domain='POINT');color.data.foreach_set('color',[v for rgba in colors for v in rgba]);o=bpy.data.objects.new(name,m);ns['c'].objects.link(o);o.parent=parent or ns['root']
    for p in m.polygons:p.use_smooth=True
    o.shape_key_add(name='Basis');return o

def key_pose(o,frame,points):
    key=o.shape_key_add(name='Pose_%.2f'%frame)
    for v,p in zip(key.data,points):v.co=p
    for f,value in [(frame-.25,0),(frame,1),(frame+.25,0)]:key.value=value;key.keyframe_insert('value',frame=f)
    key.value=0

def linearize_materials():
    for mat in bpy.data.materials:
        data=mat.node_tree if mat.use_nodes else None
        action=data.animation_data.action if data and data.animation_data else None
        if not action:continue
        for layer in action.layers:
            for strip in layer.strips:
                for slot in action.slots:
                    bag=strip.channelbag(slot)
                    if bag:
                        for fc in bag.fcurves:
                            for key in fc.keyframe_points:key.interpolation='LINEAR'
