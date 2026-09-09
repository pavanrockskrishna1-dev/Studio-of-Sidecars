# 🎨 Visual Guide - Blender Interface for BBQ Bike Scripts

## 📱 What You'll See (Step-by-Step Visual Guide)

This guide shows you EXACTLY what your screen will look like at each step.

---

## 🖥️ Step 1: Opening Blender

### What You See When Blender Opens:

```
┌─────────────────────────────────────────────────────────┐
│  Blender                                          ☐ ☐ ✕ │
├─────────────────────────────────────────────────────────┤
│ File  Edit  Render  Window  Help                        │
├─────────────────────────────────────────────────────────┤
│ [Layout] [Modeling] [Sculpting] [Shading] [Animation]  │
│                                           [Rendering]   │
├────────────────────────────────┬────────────────────────┤
│                                │    📋 Outliner        │
│                                │    ├─ 📷 Camera       │
│         3D Viewport            │    ├─ 💡 Light        │
│                                │    └─ 📦 Cube         │
│      (Shows default cube)      │                        │
│                                ├────────────────────────┤
│                                │    ⚙️ Properties      │
│                                │                        │
├────────────────────────────────┴────────────────────────┤
│ Timeline (animation frames)                             │
└─────────────────────────────────────────────────────────┘
```

**You'll see**:
- A gray 3D cube in the center
- Tabs at the top (Layout, Modeling, etc.)
- Right panel with Outliner (list of objects)
- Bottom timeline

---

## 📂 Step 2: Importing Your Model

### Click: File → Import → glTF 2.0

```
File  Edit  Render
 │
 ├─ New                    Ctrl+N
 ├─ Open...                Ctrl+O
 ├─ Open Recent            ▶
 ├─ Revert                 
 ├─ Recover                ▶
 ├─ Save                   Ctrl+S
 ├─ Save As...             Ctrl+Shift+S
 ├─ Save Copy...           
 ├─────────────────────────
 ├─ Import                 ▶  ┌─────────────────────┐
 │                            │ Collada (.dae)      │
 │                            │ Alembic (.abc)      │
 │                            │ ✓ glTF 2.0 (.glb/.gltf) ◄─ Click this!
 │                            │ SVG (.svg)          │
 │                            └─────────────────────┘
```

### File Browser Opens:

```
┌─────────────────────────────────────────────────────────┐
│  Import glTF 2.0                                  ☐ ☐ ✕ │
├─────────────────────────────────────────────────────────┤
│  📁 Path: C:\Users\YourName\Downloads                   │
├────────────────────────────────┬────────────────────────┤
│  📁 Documents                  │  Preview               │
│  📁 Downloads                  │                        │
│  📁 Desktop                    │  [Your bike model      │
│  📄 bbq_bike.glb  ◄─ Select!  │   preview shows here]  │
│  📄 other_file.pdf             │                        │
│                                │                        │
│                                │                        │
├────────────────────────────────┴────────────────────────┤
│  [Cancel]                      [Import glTF 2.0] ◄─Click│
└─────────────────────────────────────────────────────────┘
```

**After Import**:
- Your BBQ Bike appears in the 3D viewport!
- Default cube is gone
- Bike is visible

---

## 🎬 Step 3: Opening Scripting Workspace

### Look at Top Tabs:

```
┌─────────────────────────────────────────────────────────┐
│ [Layout] [Modeling] [Sculpting] [UV Editing] [Texture Painting]
│ [Shading] [Animation] [Rendering] [Compositing] [Geometry Nodes]
│                                                         │
│ ┌─────────────────────────────────────────────┐        │
│ │ [Scripting] ◄─── Click this tab!            │        │
│ └─────────────────────────────────────────────┘        │
```

### After Clicking "Scripting":

```
┌─────────────────────────────────────────────────────────┐
│  Blender - Scripting                              ☐ ☐ ✕ │
├─────────────────────────────────────────────────────────┤
│ [Scripting] tab (active)                                │
├──────────────┬──────────────────────┬──────────────────┤
│              │                      │                  │
│   3D View    │    Text Editor       │  Python Console  │
│              │                      │                  │
│  (Your bike) │  [+ New] [📄 Open]  │  >>>            │
│              │  [Templates ▼]       │                  │
│              │                      │                  │
│              │  (Empty - ready for  │                  │
│              │   your script!)      │                  │
│              │                      │                  │
│              │                      │                  │
├──────────────┴──────────────────────┴──────────────────┤
│ Timeline                                                │
└─────────────────────────────────────────────────────────┘
```

**Three panels**:
- **Left**: 3D view (see your bike)
- **Middle**: Text Editor (where you paste scripts)
- **Right**: Python Console (shows messages)

---

## 📝 Step 4: Creating New Script

### Click "+ New" Button:

```
┌────────────────────────────────────┐
│  Text Editor                       │
├────────────────────────────────────┤
│  [+ New] [📄 Open] [💾 Save]      │  ◄─ Click [+ New]
│  [Templates ▼]                     │
├────────────────────────────────────┤
│                                    │
│  1                                 │  ◄─ New blank script appears!
│  2                                 │     Line numbers on left
│  3                                 │     Ready to paste!
│  4                                 │
│  ...                               │
```

**After clicking "+ New"**:
- Blank text editor appears
- Line numbers show (1, 2, 3...)
- Cursor blinking
- Ready for your script!

---

## 📋 Step 5: Pasting Script

### What the Script Looks Like:

```python
┌────────────────────────────────────────────────────────┐
│  Text (Text.001)                              ▶ Run    │  ◄─ Run button!
├────────────────────────────────────────────────────────┤
│  1  import bpy                                         │
│  2  import math                                        │
│  3                                                     │
│  4  # Configuration                                    │
│  5  output_path = "//renders/turntable/"              │
│  6  frame_count = 120  # 120 frames = 5 seconds       │
│  7  rotation_speed = 360  # Full 360-degree rotation  │
│  8                                                     │
│  9  # Set up scene                                     │
│ 10  scene = bpy.context.scene                         │
│ 11  scene.frame_start = 1                             │
│ 12  scene.frame_end = frame_count                     │
│ 13                                                     │
│ 14  # Get the bike object                             │
│ 15  bike = bpy.data.objects.get('BBQ_Bike') or \      │
│ 16         bpy.context.active_object                  │
│ 17                                                     │
│ 18  if bike:                                          │
│ 19      # Clear existing keyframes                    │
│ 20      bike.animation_data_clear()                   │
│     ... (script continues)                            │
└────────────────────────────────────────────────────────┘
```

**You see**:
- Python code with syntax highlighting
- Comments (lines starting with #)
- Numbers on the left
- **▶ Run Script** button at top

---

## ⚠️ Step 6: Important - Object Name

### Finding Your Object Name:

Look at the **Outliner** (top-right panel):

```
┌────────────────────────┐
│  📋 Outliner          │
├────────────────────────┤
│  🔍 Search             │
├────────────────────────┤
│  ▼ 🎬 Scene Collection │
│    ├─ 📷 Camera        │
│    ├─ 💡 Light         │
│    └─ 🚴 BBQ_Bike  ◄───┼─ This is your object name!
│         ├─ Mesh        │
│         └─ Material    │
│                        │
└────────────────────────┘
```

**Your object might be named**:
- `BBQ_Bike` ✓
- `Bike`
- `Model`
- `Object`
- Or something else!

### Update Script with Correct Name:

If your bike is called "Bike" instead of "BBQ_Bike":

```python
# Line 15 - BEFORE:
bike = bpy.data.objects.get('BBQ_Bike') or bpy.context.active_object

# Line 15 - AFTER (if your bike is named "Bike"):
bike = bpy.data.objects.get('Bike') or bpy.context.active_object
```

**OR** - Easier: Just click your bike in the 3D view first (it glows orange)!

---

## ▶️ Step 7: Running the Script

### Click "Run Script" Button:

```
┌────────────────────────────────────────────────────────┐
│  Text.001                    [▶ Run Script] ◄─ Click!  │
├────────────────────────────────────────────────────────┤
│  1  import bpy                                         │
│  2  import math                                        │
│  ... (your script)                                     │
```

### Watch the Python Console (right panel):

```
┌─────────────────────────────────────┐
│  Python Console                     │
├─────────────────────────────────────┤
│  >>> running script...              │
│  ✅ Turntable animation setup       │
│     complete!                       │
│  Output: //renders/turntable/       │
│         turntable_animation.mp4     │
│  Press 'Render Animation'           │
│         (Ctrl+F12) to start         │
│         rendering                   │
│  >>>                                │
└─────────────────────────────────────┘
```

**Success messages**:
- ✅ Green checkmark
- "Setup complete!"
- Instructions for next steps

**Error messages** (if any):
- ❌ Red text
- Usually means object name mismatch
- Fix object name and try again

---

## 🎥 Step 8: Preview Animation

### Click Play Button:

```
┌─────────────────────────────────────────────────────────┐
│  Timeline                                               │
├─────────────────────────────────────────────────────────┤
│  [|◄] [◄] [▶] [►|]     Frame: 1 / 120                  │
│         ▲                                               │
│         └── Click Play button!                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │   │
│  │ 1      30      60      90      120               │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**What happens**:
- Bike starts rotating in 3D view
- Timeline cursor moves (green line)
- Frame number increases (1, 2, 3...)
- Bike completes 360° rotation!

**Controls**:
- **▶ Play**: Start/stop animation
- **Spacebar**: Also starts/stops
- **Arrow keys**: Step one frame at a time
- Drag timeline: Jump to any frame

---

## ⚙️ Step 9: Render Settings

### Right Panel - Camera Icon:

```
┌────────────────────────────────┐
│  Properties                    │
├────────────────────────────────┤
│  [🔧] [⚙️] [📊] [📷] [💡] [🎨]│
│                  ▲             │
│                  └─ Click Camera icon
│                                │
├────────────────────────────────┤
│  📷 Render Properties          │
├────────────────────────────────┤
│  ▼ Render Engine               │
│     ⚪ Eevee                   │
│     ⚫ Cycles  ◄─ Select this!│
│                                │
│  ▼ Sampling                    │
│     Render:   [128]            │
│     Viewport: [32 ]            │
│                                │
│  ▼ Output                      │
│     Resolution X: [1080]       │
│     Resolution Y: [1080]       │
│               %: [100]         │
│                                │
│  ▼ Output                      │
│     📁 /tmp/                   │
│     📄 File Format: [FFmpeg]   │
│        Container: [MPEG-4]     │
│        Video Codec: [H.264]    │
└────────────────────────────────┘
```

**Settings to check**:
1. **Render Engine**: Cycles (for quality)
2. **Resolution**: 1080 x 1080 (Instagram square)
3. **File Format**: FFmpeg video
4. **Container**: MPEG-4
5. **Codec**: H.264

---

## 🚀 Step 10: Rendering!

### Click: Render → Render Animation

```
 Render  Window  Help
   │
   ├─ Render Image              F12
   ├─ Render Animation    ◄─ Click this! (or Ctrl+F12)
   ├─ Render Audio
   ├───────────────────
   ├─ View Render
   ├─ View Animation
   ├───────────────────
   ├─ Lock Interface
```

### Render Window Opens:

```
┌─────────────────────────────────────────────────────────┐
│  Blender Render [Frame 1/120]                     ☐ ☐ ✕ │
├─────────────────────────────────────────────────────────┤
│  Render Progress:                                       │
│  ▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  23%         │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │                                                   │ │
│  │         [Rendering your bike frame by frame]     │ │
│  │                                                   │ │
│  │              🚴 ← Your bike being rendered       │ │
│  │                                                   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  Frame: 28 / 120                                        │
│  Time: 00:02:34 | Remaining: 00:08:45                  │
│                                                         │
│  [Cancel Render]                                        │
└─────────────────────────────────────────────────────────┘
```

**What you see**:
- Progress bar (percentage complete)
- Current frame number (1/120, 2/120, etc.)
- Estimated time remaining
- Preview of current frame

**Status messages**:
- "Rendering..." - Working
- "Saved: /path/to/video.mp4" - Done!

**Time**:
- Each frame: 10-60 seconds
- 120 frames total
- Total: 20-120 minutes (depending on computer)

---

## ✅ Step 11: Finding Your Video

### When Rendering Completes:

```
┌─────────────────────────────────────────────────────────┐
│  Info                                                   │
├─────────────────────────────────────────────────────────┤
│  Saved: /Users/YourName/Desktop/BBQ_Bike/               │
│         turntable_animation.mp4                         │
│                                                         │
│  ✅ Render complete!                                    │
│  Time: 00:45:32                                         │
└─────────────────────────────────────────────────────────┘
```

### Go to Your Output Folder:

```
📁 Desktop
  └─ 📁 BBQ_Bike
      └─ 🎬 turntable_animation.mp4  ◄─ Your video!
```

**Double-click to watch!**
- Your bike rotating 360°
- Smooth animation
- Ready for Instagram!

---

## 🎊 Success! What Your Final Video Shows:

```
Frame 1:      Frame 30:     Frame 60:     Frame 90:     Frame 120:
  🚴─→         🚴           ←─🚴           🚴            🚴─→
(front)      (right)       (back)        (left)      (front again)
```

**Perfect loop** - Seamless 360° rotation! 🎉

---

## 🎯 Quick Visual Checklist

```
Step 1:  Blender open                          ✓
Step 2:  Model imported                        ✓
Step 3:  "Scripting" tab clicked               ✓
Step 4:  "+ New" script created                ✓
Step 5:  Script pasted (Ctrl+V)                ✓
Step 6:  Object name correct                   ✓
Step 7:  "▶ Run Script" clicked                ✓
Step 8:  Animation previews (▶ Play)           ✓
Step 9:  Render settings configured            ✓
Step 10: Render → Render Animation clicked     ✓
Step 11: Video file found and works!           ✓
```

**All checked?** You're a Blender pro! 🏆

---

## 🎨 Visual Tips

### Finding Things:

**Can't find Scripting tab?**
```
Look here: [Layout] [Modeling] [Sculpting] ... [Scripting] ← Far right!
```

**Can't find Run button?**
```
Look here: Top of Text Editor panel
           [Text.001]          [▶ Run Script] ← Top right!
```

**Can't find Render menu?**
```
Look here: Top menu bar
           File  Edit  Render ← Click here!  Window  Help
```

**Can't find object name?**
```
Look here: Top-right corner panel
           📋 Outliner
           ▼ Scene Collection
             ├─ 📷 Camera
             └─ 🚴 [Your bike name]
```

---

## 🎬 What Each Panel Does

```
┌──────────────┬──────────────────────┬──────────────────┐
│              │                      │                  │
│ 3D VIEWPORT  │   TEXT EDITOR        │ PYTHON CONSOLE   │
│              │                      │                  │
│ Shows your   │ Where you paste      │ Shows messages   │
│ bike in 3D   │ scripts              │ and errors       │
│              │                      │                  │
│ • Rotate view│ • Paste script       │ • Success ✓      │
│ • Select     │ • Edit code          │ • Errors ✗       │
│ • Preview    │ • Run script         │ • Information    │
│              │                      │                  │
└──────────────┴──────────────────────┴──────────────────┘
```

---

## 💡 Color Codes in Blender

**Orange outline** = Selected object (active)
**Blue line** = Timeline cursor (current frame)
**Green checkmark** = Success message
**Red text** = Error message
**Yellow text** = Warning message

---

## 🎯 Common Screens You'll See

### Success Screen:
```
Python Console:
  ✅ Turntable animation setup complete!
  Output: //renders/turntable/turntable_animation.mp4
  Press 'Render Animation' (Ctrl+F12) to start rendering
```

### Error Screen:
```
Python Console:
  ❌ Error: Object 'BBQ_Bike' not found
  
Solution: Update object name in script or select your bike first!
```

### Render Complete Screen:
```
Info:
  Saved: /Users/You/Desktop/BBQ_Bike/turntable_animation.mp4
  ✅ Render complete!
  Time: 00:45:32
```

---

**Now you know exactly what to look for at each step!** 🎓

**Happy rendering!** 🎬✨
