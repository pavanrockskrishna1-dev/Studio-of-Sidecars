# 🎬 Ready-to-Use Blender Scripts for Instagram Content

## 🎯 You Have Your .glb Files - Let's Create Instagram Content!

Here are **copy-paste ready** Blender scripts. Just copy and paste into Blender!

---

## 🔥 **SCRIPT 1: 360° Turntable Video (Most Popular for Instagram)**

### What It Does:
Creates a smooth 360-degree rotation of your bike - **perfect for Instagram Reels!**

### Copy This Entire Script:

```python
import bpy
import math

# Configuration - CHANGE THESE IF NEEDED
output_path = "C:/Users/YourName/Desktop/bike_turntable.mp4"  # Change to your path
frame_count = 120  # 120 frames = 4 seconds at 30fps
rotation_speed = 360  # Full 360-degree rotation

# Set up scene
scene = bpy.context.scene
scene.frame_start = 1
scene.frame_end = frame_count

# Get the bike object (uses whatever you have selected)
bike = bpy.context.active_object

if bike:
    print(f"✅ Animating: {bike.name}")
    
    # Clear existing keyframes
    bike.animation_data_clear()
    
    # Set initial rotation
    bike.rotation_euler = (0, 0, 0)
    bike.keyframe_insert(data_path="rotation_euler", frame=1)
    
    # Set final rotation (360 degrees on Z axis)
    bike.rotation_euler = (0, 0, math.radians(rotation_speed))
    bike.keyframe_insert(data_path="rotation_euler", frame=frame_count)
    
    # Make interpolation linear for smooth rotation
    if bike.animation_data:
        for fcurve in bike.animation_data.action.fcurves:
            for keyframe in fcurve.keyframe_points:
                keyframe.interpolation = 'LINEAR'
    
    # Set up camera for good view
    camera = bpy.data.objects.get('Camera')
    if camera:
        camera.location = (6, -6, 4)
        camera.rotation_euler = (math.radians(65), 0, math.radians(45))
    
    # INSTAGRAM-OPTIMIZED RENDER SETTINGS
    scene.render.resolution_x = 1080
    scene.render.resolution_y = 1080  # Square for Instagram
    scene.render.resolution_percentage = 100
    scene.render.fps = 30  # Instagram standard
    
    # Use Cycles for quality (or Eevee for speed)
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 128  # Good balance (lower = faster, higher = better)
    scene.cycles.use_denoising = True
    
    # Video output settings
    scene.render.image_settings.file_format = 'FFMPEG'
    scene.render.ffmpeg.format = 'MPEG4'
    scene.render.ffmpeg.codec = 'H264'
    scene.render.ffmpeg.constant_rate_factor = 'HIGH'
    scene.render.filepath = output_path
    
    print("✅ Turntable animation setup complete!")
    print(f"📁 Output: {scene.render.filepath}")
    print("🎬 Press Render → Render Animation (Ctrl+F12) to create video")
    print(f"⏱️ Duration: {frame_count / scene.render.fps} seconds at {scene.render.fps}fps")
else:
    print("❌ No object selected! Click your bike model first, then run this script.")
```

### How to Use:
1. **Open Blender**
2. **Import your .glb**: File → Import → glTF 2.0
3. **Click your bike** to select it (it glows orange)
4. **Switch to Scripting tab** (top of Blender)
5. **Click "+ New"**
6. **Paste this script**
7. **Change line 4**: Update path to where you want to save
   - Example: `"C:/Users/YourName/Desktop/bbq_bike.mp4"`
8. **Click ▶ Run Script** (or press Alt+P)
9. **Render**: Click Render → Render Animation (Ctrl+F12)
10. **Wait** (20-60 minutes depending on your computer)
11. **Post to Instagram!** 🎉

---

## 💡 **SCRIPT 2: Professional Lighting Setup**

### What It Does:
Adds 4 professional lights to make your bike look amazing!

### Copy This Script:

```python
import bpy
import math

# Remove existing lights
for obj in bpy.data.objects:
    if obj.type == 'LIGHT':
        bpy.data.objects.remove(obj, do_unlink=True)

# Key Light (Main light from front-right)
bpy.ops.object.light_add(type='AREA', location=(5, -5, 8))
key_light = bpy.context.active_object
key_light.name = "Key_Light"
key_light.data.energy = 500
key_light.data.size = 5
key_light.rotation_euler = (math.radians(45), 0, math.radians(45))
print("✅ Added Key Light")

# Fill Light (Soften shadows from left)
bpy.ops.object.light_add(type='AREA', location=(-3, -3, 5))
fill_light = bpy.context.active_object
fill_light.name = "Fill_Light"
fill_light.data.energy = 200
fill_light.data.size = 4
fill_light.rotation_euler = (math.radians(60), 0, math.radians(-45))
print("✅ Added Fill Light")

# Rim Light (Separation from background)
bpy.ops.object.light_add(type='AREA', location=(-5, 5, 6))
rim_light = bpy.context.active_object
rim_light.name = "Rim_Light"
rim_light.data.energy = 300
rim_light.data.size = 3
rim_light.rotation_euler = (math.radians(45), 0, math.radians(-135))
print("✅ Added Rim Light")

# Top Light (Overall illumination)
bpy.ops.object.light_add(type='AREA', location=(0, 0, 10))
top_light = bpy.context.active_object
top_light.name = "Top_Light"
top_light.data.energy = 150
top_light.data.size = 8
top_light.rotation_euler = (0, 0, 0)
print("✅ Added Top Light")

# Set background to dark gray
bpy.context.scene.world.use_nodes = True
bg_node = bpy.context.scene.world.node_tree.nodes.get('Background')
if bg_node:
    bg_node.inputs[0].default_value = (0.05, 0.05, 0.05, 1)  # Dark gray

print("✅ Professional lighting setup complete!")
print("🎨 Your bike now has studio-quality lighting!")
```

### How to Use:
1. **Import your bike** (if not already)
2. **Scripting tab**
3. **+ New**
4. **Paste this script**
5. **Run Script**
6. **Done!** Your scene now has pro lighting! ✨

---

## 🎨 **SCRIPT 3: Shiny Chrome & Metal Materials**

### What It Does:
Makes your bike look realistic with shiny chrome and metallic finishes!

### Copy This Script:

```python
import bpy

def create_chrome_material():
    """Create shiny chrome material"""
    mat = bpy.data.materials.new(name="Chrome_Material")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    
    # Principled BSDF
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (0.9, 0.9, 0.9, 1.0)  # Bright silver
    bsdf.inputs['Metallic'].default_value = 1.0  # Full metal
    bsdf.inputs['Roughness'].default_value = 0.1  # Very shiny
    bsdf.inputs['Specular'].default_value = 0.5
    
    # Output
    output = nodes.new('ShaderNodeOutputMaterial')
    mat.node_tree.links.new(bsdf.outputs[0], output.inputs[0])
    
    return mat

def create_painted_metal():
    """Create painted metal with clearcoat"""
    mat = bpy.data.materials.new(name="Painted_Metal")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    
    # Principled BSDF
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (0.8, 0.1, 0.05, 1.0)  # Red
    bsdf.inputs['Metallic'].default_value = 0.0
    bsdf.inputs['Roughness'].default_value = 0.3
    bsdf.inputs['Clearcoat'].default_value = 1.0  # Glossy finish
    bsdf.inputs['Clearcoat Roughness'].default_value = 0.1
    
    # Output
    output = nodes.new('ShaderNodeOutputMaterial')
    mat.node_tree.links.new(bsdf.outputs[0], output.inputs[0])
    
    return mat

# Create materials
chrome = create_chrome_material()
painted = create_painted_metal()

print("✅ Materials created!")
print("📌 Chrome_Material - For shiny parts")
print("📌 Painted_Metal - For painted body")
print("")
print("💡 To apply:")
print("   1. Select a part of your bike")
print("   2. Go to Material Properties (right panel)")
print("   3. Click '+' and assign a material")
```

### How to Use:
1. **Run this script** first
2. **Select parts** of your bike (click them in 3D view)
3. **Material Properties** panel (right side, sphere icon)
4. **Click "+"** to add material slot
5. **Select** "Chrome_Material" or "Painted_Metal"
6. **Assign** to that part
7. **Repeat** for different parts!

---

## 📸 **SCRIPT 4: Render Single Image (High Quality)**

### What It Does:
Renders one perfect image for Instagram posts!

### Copy This Script:

```python
import bpy

# Instagram-optimized settings for single image
scene = bpy.context.scene

# Resolution (Square Instagram post)
scene.render.resolution_x = 1080
scene.render.resolution_y = 1080
scene.render.resolution_percentage = 100

# High quality settings
scene.render.engine = 'CYCLES'
scene.cycles.samples = 256  # High quality (takes longer but looks amazing)
scene.cycles.use_denoising = True

# Output
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = "C:/Users/YourName/Desktop/bike_render.png"  # CHANGE THIS

print("✅ Render settings configured!")
print("📐 Resolution: 1080x1080 (Instagram square)")
print("💎 Quality: High (256 samples)")
print("📁 Output: " + scene.render.filepath)
print("")
print("🎬 Press F12 to render single image")
print("⏱️ This will take 2-10 minutes depending on your computer")
```

### How to Use:
1. **Position camera** where you want (drag around in 3D view)
2. **Change line 14** to your save location
3. **Run script**
4. **Press F12** to render
5. **Wait** a few minutes
6. **Image saved!** Ready for Instagram! 📸

---

## ⚡ **QUICK START WORKFLOW**

### For Your First Instagram Video:

```
Step 1: Import your .glb
   File → Import → glTF 2.0 → Select your bike

Step 2: Click your bike to select it (orange outline)

Step 3: Run Script 2 (Lighting)
   Copy-paste → Run

Step 4: Run Script 1 (Turntable)
   Copy-paste → Update output path → Run

Step 5: Render
   Render → Render Animation (Ctrl+F12)
   
Step 6: Wait (go make coffee ☕)

Step 7: Post to Instagram! 🎉
```

**Total active time: 10 minutes**
**Render time: 30-60 minutes**

---

## 🎯 **Instagram Specs You Need to Know**

### Video (Reels/Feed):
- **Resolution**: 1080 x 1080 (square) or 1080 x 1350 (portrait)
- **Frame Rate**: 30fps
- **Length**: 15-60 seconds
- **Format**: MP4 (H.264)

### Image (Feed):
- **Resolution**: 1080 x 1080 (square) or 1080 x 1350 (portrait)
- **Format**: PNG or JPG

**All scripts above are already optimized for Instagram!** ✅

---

## 💡 **Pro Tips for Best Results**

### Lighting:
1. **Always run Script 2 (Lighting) first**
2. Makes HUGE difference in quality
3. Your bike will look professional!

### Rendering Speed:
- **Fast preview**: Change `samples = 128` to `samples = 64`
- **Best quality**: Change to `samples = 256` or `samples = 512`
- Lower samples = faster render, slightly noisier
- Higher samples = slower render, cleaner image

### Camera Angles:
- **Front-right at 45°**: Most popular for product shots
- **Slightly above**: Shows more of the bike
- **Eye level**: More natural/relatable

### File Naming:
- Be specific: `bbq_bike_turntable.mp4`, `coffee_bike_hero.png`
- Easy to organize and find later!

---

## 🎬 **Different Content Types**

### 1. Turntable Video (Script 1):
- **Use for**: Product showcase
- **Duration**: 4-5 seconds
- **Caption**: "360° view of the [BBQ/Coffee] Bike 🚴🔥"

### 2. Hero Image (Script 4):
- **Use for**: Main product shots
- **Best angle**: Front-right at 45°
- **Caption**: Feature highlights and specs

### 3. Detail Shots:
- **Zoom in** to specific features
- **Render multiple angles** (front, side, back, top)
- **Create carousel post** with 5-10 images

---

## 🆘 **Troubleshooting**

### "No module named 'bpy'"
- ✅ You're trying to run this outside Blender
- ✅ These scripts ONLY work inside Blender
- ✅ Open Blender first, then paste scripts there!

### "No object selected"
- ✅ Click your bike model in 3D view first
- ✅ Should see orange outline
- ✅ Then run script

### "Render is too dark"
- ✅ Run Script 2 (Lighting) first
- ✅ Or increase light energy values in script

### "Takes too long"
- ✅ Reduce samples (change `128` to `64`)
- ✅ Close other programs
- ✅ Let it run overnight

### "Video file is huge"
- ✅ Normal! 1080p video is large
- ✅ Instagram compresses it when you upload
- ✅ Or use video editing software to compress

---

## 🎊 **You're Ready to Create!**

### What You Have Now:
✅ Script 1: 360° turntable video
✅ Script 2: Professional lighting
✅ Script 3: Shiny materials
✅ Script 4: High-quality renders

### What You Can Do:
✅ Create unlimited Instagram content
✅ BBQ bike videos
✅ Coffee bike videos
✅ Professional quality
✅ Post daily!

---

## 📞 **Quick Reference**

| Want to... | Use Script... | Render Time |
|------------|---------------|-------------|
| 360° video | Script 1 | 30-60 min |
| Better lighting | Script 2 | 2 seconds |
| Shiny chrome | Script 3 | 2 seconds |
| Single image | Script 4 | 5-10 min |

---

**Now go create amazing content!** 🚴☕🔥✨

**Post to Instagram and tag your brand!** 📱
