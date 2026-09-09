# BBQ Bike Blender Scripts & Animation Guide

This document contains high-quality Blender Python scripts for creating professional renders and animations of your BBQ bike model for Instagram content.

## 🎬 Script 1: Turntable Animation (360° Rotation)

```python
import bpy
import math

# Configuration
output_path = "//renders/turntable/"  # Output folder
frame_count = 120  # 120 frames = 5 seconds at 24fps
rotation_speed = 360  # Full 360-degree rotation

# Set up scene
scene = bpy.context.scene
scene.frame_start = 1
scene.frame_end = frame_count

# Get the bike object (change 'BBQ_Bike' to your actual object name)
bike = bpy.data.objects.get('BBQ_Bike') or bpy.context.active_object

if bike:
    # Clear existing keyframes
    bike.animation_data_clear()
    
    # Set initial rotation
    bike.rotation_euler = (0, 0, 0)
    bike.keyframe_insert(data_path="rotation_euler", frame=1)
    
    # Set final rotation
    bike.rotation_euler = (0, 0, math.radians(rotation_speed))
    bike.keyframe_insert(data_path="rotation_euler", frame=frame_count)
    
    # Make interpolation linear for smooth rotation
    if bike.animation_data:
        for fcurve in bike.animation_data.action.fcurves:
            for keyframe in fcurve.keyframe_points:
                keyframe.interpolation = 'LINEAR'

# Set up camera for optimal view
camera = bpy.data.objects['Camera']
camera.location = (8, -8, 5)
camera.rotation_euler = (math.radians(65), 0, math.radians(45))

# Render settings for high quality
scene.render.resolution_x = 1080
scene.render.resolution_y = 1080  # Square for Instagram
scene.render.resolution_percentage = 100
scene.render.fps = 24

# Use Cycles for realistic rendering
scene.render.engine = 'CYCLES'
scene.cycles.samples = 128  # Increase for better quality (256-512)
scene.cycles.use_denoising = True

# Output settings
scene.render.image_settings.file_format = 'FFMPEG'
scene.render.ffmpeg.format = 'MPEG4'
scene.render.ffmpeg.codec = 'H264'
scene.render.ffmpeg.constant_rate_factor = 'HIGH'
scene.render.filepath = output_path + "turntable_animation.mp4"

print("✅ Turntable animation setup complete!")
print(f"Output: {scene.render.filepath}")
print("Press 'Render Animation' (Ctrl+F12) to start rendering")
```

## 🎨 Script 2: Studio Lighting Setup

```python
import bpy
import math

# Remove existing lights
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.object.select_by_type(type='LIGHT')
bpy.ops.object.delete()

# Key Light (Main light)
bpy.ops.object.light_add(type='AREA', location=(5, -5, 8))
key_light = bpy.context.active_object
key_light.name = "Key_Light"
key_light.data.energy = 500
key_light.data.size = 5
key_light.rotation_euler = (math.radians(45), 0, math.radians(45))

# Fill Light (Soften shadows)
bpy.ops.object.light_add(type='AREA', location=(-3, -3, 5))
fill_light = bpy.context.active_object
fill_light.name = "Fill_Light"
fill_light.data.energy = 200
fill_light.data.size = 4
fill_light.rotation_euler = (math.radians(60), 0, math.radians(-45))

# Rim Light (Separation from background)
bpy.ops.object.light_add(type='AREA', location=(-5, 5, 6))
rim_light = bpy.context.active_object
rim_light.name = "Rim_Light"
rim_light.data.energy = 300
rim_light.data.size = 3
rim_light.rotation_euler = (math.radians(45), 0, math.radians(-135))

# Top Light (Overall illumination)
bpy.ops.object.light_add(type='AREA', location=(0, 0, 10))
top_light = bpy.context.active_object
top_light.name = "Top_Light"
top_light.data.energy = 150
top_light.data.size = 8
top_light.rotation_euler = (0, 0, 0)

# Add HDRI environment for realistic reflections
world = bpy.context.scene.world
world.use_nodes = True
nodes = world.node_tree.nodes
nodes.clear()

# Background node
bg_node = nodes.new('ShaderNodeBackground')
bg_node.inputs[0].default_value = (0.05, 0.05, 0.05, 1)  # Dark gray
bg_node.inputs[1].default_value = 0.3  # Strength

# Environment texture (you can add your own HDRI here)
env_node = nodes.new('ShaderNodeTexEnvironment')
# env_node.image = bpy.data.images.load("//path/to/your/hdri.hdr")

# World output
output_node = nodes.new('ShaderNodeOutputWorld')

# Connect nodes
links = world.node_tree.links
links.new(bg_node.outputs[0], output_node.inputs[0])

print("✅ Studio lighting setup complete!")
print("4 professional lights added: Key, Fill, Rim, and Top")
```

## 🌟 Script 3: Material Enhancement (Realistic Metals & Paint)

```python
import bpy

def create_metallic_material(name, base_color, metallic=1.0, roughness=0.2):
    """Create a realistic metallic material"""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    
    # Principled BSDF
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = base_color
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Specular'].default_value = 0.5
    
    # Output
    output = nodes.new('ShaderNodeOutputMaterial')
    mat.node_tree.links.new(bsdf.outputs[0], output.inputs[0])
    
    return mat

def create_paint_material(name, base_color, clearcoat=1.0):
    """Create a realistic paint material with clearcoat"""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    
    # Principled BSDF
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = base_color
    bsdf.inputs['Metallic'].default_value = 0.0
    bsdf.inputs['Roughness'].default_value = 0.3
    bsdf.inputs['Clearcoat'].default_value = clearcoat
    bsdf.inputs['Clearcoat Roughness'].default_value = 0.1
    
    # Output
    output = nodes.new('ShaderNodeOutputMaterial')
    mat.node_tree.links.new(bsdf.outputs[0], output.inputs[0])
    
    return mat

# Create materials
chrome_mat = create_metallic_material("BBQ_Chrome", (0.8, 0.8, 0.8, 1.0), metallic=1.0, roughness=0.1)
black_mat = create_metallic_material("BBQ_Black_Metal", (0.02, 0.02, 0.02, 1.0), metallic=0.5, roughness=0.4)
red_paint = create_paint_material("BBQ_Red_Paint", (0.8, 0.05, 0.05, 1.0), clearcoat=1.0)
yellow_paint = create_paint_material("BBQ_Yellow_Paint", (1.0, 0.8, 0.0, 1.0), clearcoat=1.0)

# Apply materials to selected objects
# Select objects in your scene and run this to assign materials
for obj in bpy.context.selected_objects:
    if obj.type == 'MESH':
        if len(obj.data.materials) == 0:
            obj.data.materials.append(red_paint)
        else:
            obj.data.materials[0] = red_paint

print("✅ Materials created!")
print("Materials: Chrome, Black Metal, Red Paint, Yellow Paint")
```

## 🎯 Script 4: Camera Animation (Dynamic Shots)

```python
import bpy
import math

# Configuration
frame_count = 180  # 7.5 seconds at 24fps

# Set up scene
scene = bpy.context.scene
scene.frame_start = 1
scene.frame_end = frame_count

# Get or create camera
if 'Camera' in bpy.data.objects:
    camera = bpy.data.objects['Camera']
else:
    bpy.ops.object.camera_add()
    camera = bpy.context.active_object

# Clear existing animation
camera.animation_data_clear()

# Define camera positions (orbit around the bike)
radius = 8
height_start = 6
height_end = 4

# Keyframe 1: Start position (front right, high)
frame = 1
angle = math.radians(45)
camera.location = (radius * math.cos(angle), radius * math.sin(angle), height_start)
camera.rotation_euler = (math.radians(70), 0, angle + math.radians(90))
camera.keyframe_insert(data_path="location", frame=frame)
camera.keyframe_insert(data_path="rotation_euler", frame=frame)

# Keyframe 2: Side view (90°)
frame = 60
angle = math.radians(135)
camera.location = (radius * math.cos(angle), radius * math.sin(angle), 5)
camera.rotation_euler = (math.radians(65), 0, angle + math.radians(90))
camera.keyframe_insert(data_path="location", frame=frame)
camera.keyframe_insert(data_path="rotation_euler", frame=frame)

# Keyframe 3: Back view (180°)
frame = 120
angle = math.radians(225)
camera.location = (radius * math.cos(angle), radius * math.sin(angle), 5)
camera.rotation_euler = (math.radians(65), 0, angle + math.radians(90))
camera.keyframe_insert(data_path="location", frame=frame)
camera.keyframe_insert(data_path="rotation_euler", frame=frame)

# Keyframe 4: Complete orbit
frame = 180
angle = math.radians(405)  # 360 + 45 to complete circle
camera.location = (radius * math.cos(angle), radius * math.sin(angle), height_end)
camera.rotation_euler = (math.radians(60), 0, angle + math.radians(90))
camera.keyframe_insert(data_path="location", frame=frame)
camera.keyframe_insert(data_path="rotation_euler", frame=frame)

# Smooth interpolation
if camera.animation_data:
    for fcurve in camera.animation_data.action.fcurves:
        for keyframe in fcurve.keyframe_points:
            keyframe.interpolation = 'BEZIER'
            keyframe.handle_left_type = 'AUTO'
            keyframe.handle_right_type = 'AUTO'

# Set camera as active
scene.camera = camera

print("✅ Dynamic camera animation setup complete!")
print(f"Animation: {frame_count} frames, orbiting camera shot")
```

## 📸 Script 5: Batch Render Multiple Angles

```python
import bpy
import math
import os

# Configuration
output_dir = "//renders/angles/"
bike = bpy.context.active_object
camera = bpy.data.objects['Camera']
radius = 8
height = 5

# Render settings
scene = bpy.context.scene
scene.render.resolution_x = 1080
scene.render.resolution_y = 1080
scene.render.resolution_percentage = 100
scene.render.engine = 'CYCLES'
scene.cycles.samples = 256
scene.cycles.use_denoising = True
scene.render.image_settings.file_format = 'PNG'

# Camera angles to render
angles = [
    ("front", 0),
    ("front_right", 45),
    ("right", 90),
    ("back_right", 135),
    ("back", 180),
    ("back_left", 225),
    ("left", 270),
    ("front_left", 315),
]

# Create output directory
os.makedirs(bpy.path.abspath(output_dir), exist_ok=True)

# Render each angle
for name, degrees in angles:
    angle = math.radians(degrees)
    
    # Position camera
    camera.location = (
        radius * math.cos(angle),
        radius * math.sin(angle),
        height
    )
    
    # Point camera at origin (bike)
    camera.rotation_euler = (
        math.radians(65),
        0,
        angle + math.radians(90)
    )
    
    # Set output path
    scene.render.filepath = output_dir + f"bike_{name}_{degrees:03d}.png"
    
    # Render
    bpy.ops.render.render(write_still=True)
    print(f"✅ Rendered: {name} ({degrees}°)")

print("✅ All angles rendered successfully!")
print(f"Output location: {output_dir}")
```

## 🎭 Script 6: Physics Simulation Setup (Sandbox/Realistic)

```python
import bpy

# Get the bike object
bike = bpy.context.active_object

if bike:
    # Add rigid body physics
    bpy.ops.rigidbody.object_add()
    bike.rigid_body.type = 'ACTIVE'
    bike.rigid_body.mass = 15  # 15kg for bike
    bike.rigid_body.friction = 0.8
    bike.rigid_body.restitution = 0.3  # Bounce factor
    
    # Set collision shape
    bike.rigid_body.collision_shape = 'CONVEX_HULL'
    
    # Create ground plane
    bpy.ops.mesh.primitive_plane_add(size=50, location=(0, 0, -2))
    ground = bpy.context.active_object
    ground.name = "Ground"
    
    # Add rigid body to ground
    bpy.ops.rigidbody.object_add()
    ground.rigid_body.type = 'PASSIVE'
    ground.rigid_body.friction = 1.0
    
    # Set up scene for physics
    scene = bpy.context.scene
    scene.frame_end = 250
    scene.rigidbody_world.point_cache.frame_end = 250
    
    print("✅ Physics simulation setup complete!")
    print("Bike weight: 15kg")
    print("Press Play (Spacebar) to see physics simulation")
    print("Adjust initial height/rotation for different effects")

```

## 🎬 Instagram-Optimized Render Settings

```python
import bpy

scene = bpy.context.scene

# Resolution for Instagram
scene.render.resolution_x = 1080
scene.render.resolution_y = 1080  # Square post
# OR
# scene.render.resolution_x = 1080
# scene.render.resolution_y = 1350  # Portrait (4:5)
# OR
# scene.render.resolution_x = 1920
# scene.render.resolution_y = 1080  # Landscape (16:9)

scene.render.resolution_percentage = 100

# High-quality rendering
scene.render.engine = 'CYCLES'
scene.cycles.samples = 256  # Good balance
scene.cycles.use_denoising = True
scene.cycles.denoiser = 'OPENIMAGEDENOISE'

# GPU rendering (if available)
scene.cycles.device = 'GPU'

# Color management for vibrant colors
scene.view_settings.view_transform = 'Filmic'
scene.view_settings.look = 'High Contrast'
scene.sequencer_colorspace_settings.name = 'sRGB'

# Animation settings (for video)
scene.render.fps = 30  # Instagram supports 30fps
scene.frame_start = 1
scene.frame_end = 150  # 5 seconds at 30fps

# Output format
scene.render.image_settings.file_format = 'FFMPEG'
scene.render.ffmpeg.format = 'MPEG4'
scene.render.ffmpeg.codec = 'H264'
scene.render.ffmpeg.constant_rate_factor = 'HIGH'
scene.render.ffmpeg.ffmpeg_preset = 'BEST'

# Filepath
scene.render.filepath = "//renders/instagram_ready.mp4"

print("✅ Instagram-optimized render settings applied!")
print(f"Resolution: {scene.render.resolution_x}x{scene.render.resolution_y}")
print(f"Format: {scene.render.image_settings.file_format}")
```

## 💡 Quick Tips for Best Results

### 1. **Lighting**
- Use 3-point lighting (Key, Fill, Rim) for professional look
- Add HDRI environment for realistic reflections on chrome/metal
- Adjust light intensity based on your model's scale

### 2. **Materials**
- Use Principled BSDF for all materials
- Chrome: Metallic=1.0, Roughness=0.1-0.2
- Paint: Metallic=0.0, Roughness=0.3, Clearcoat=1.0
- Add slight texture/noise to roughness for realism

### 3. **Camera**
- Use realistic focal length (35mm-50mm)
- Enable Depth of Field for cinematic look
- Position camera at viewer's eye level for natural perspective

### 4. **Rendering**
- Start with 128 samples for preview
- Use 256-512 samples for final render
- Enable denoising to reduce render time
- Use Filmic color management for better dynamic range

### 5. **Animation**
- Keep Instagram videos under 60 seconds
- Use smooth, slow movements
- Add anticipation and easing to keyframes
- Export at 30fps for Instagram

## 🚀 Workflow for Instagram Content

1. **Setup**: Run lighting and material scripts
2. **Animation**: Choose turntable or dynamic camera
3. **Render**: Use Instagram-optimized settings
4. **Post**: Add text/music in video editor
5. **Upload**: Share on Instagram!

---

**Note**: Replace `'BBQ_Bike'` with your actual object name in all scripts. Run scripts in Blender's Scripting workspace (Text Editor → New → Paste → Run Script).

Enjoy creating stunning BBQ Bike content! 🚴🔥
