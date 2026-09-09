# 📋 Blender Scripts - Ultra Quick Cheat Sheet

## ⚡ 30-Second Quick Start

```bash
1. Open Blender
2. File → Import → glTF 2.0 → Select your .glb
3. Click "Scripting" tab (top)
4. Click "+ New"
5. Paste script
6. Click "▶ Run Script"
7. Render → Render Animation (Ctrl+F12)
```

**Done!** 🎉

---

## 🎯 Find Everything Fast

### Tabs (Top of Blender):
```
[Layout] [Modeling] [Sculpting] ... [Scripting] ← Click this!
```

### After Clicking "Scripting":
```
Left Panel = 3D View (see your bike)
Middle Panel = Text Editor (paste scripts here)
Right Panel = Python Console (messages)
```

### Run Button:
```
Top of Text Editor: [▶ Run Script]
OR press: Alt+P
```

### Render Menu:
```
Top menu bar: Render → Render Animation
OR press: Ctrl+F12
```

---

## 🔧 Fix Common Issues in 10 Seconds

### "Script error!"
```python
# Line 15: Change 'BBQ_Bike' to YOUR object name
bike = bpy.data.objects.get('BBQ_Bike')  # Change this!
```

**OR** - Click your bike first, then run script!

### "Nothing happens"
- Select your bike (click it in 3D view)
- Run script again

### "Too dark"
- Run Script 2 (Lighting) first
- Then run your animation script

### "Too slow"
```python
# Find this line and change 128 to 64:
scene.cycles.samples = 64  # Lower = faster
```

---

## 📐 Instagram Settings

### Resolution (Square):
```
X: 1080
Y: 1080
%: 100
```

### Resolution (Portrait):
```
X: 1080
Y: 1350
%: 100
```

### File Format:
```
Format: FFmpeg video
Container: MPEG-4
Codec: H.264
```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Alt+P** | Run script |
| **Ctrl+F12** | Render animation |
| **F12** | Render single image |
| **Spacebar** | Play/pause animation |
| **Ctrl+S** | Save file |
| **Scroll wheel** | Zoom in 3D view |

---

## 🎬 Which Script to Use?

| Want to... | Use Script... |
|------------|---------------|
| 360° rotation video | **Script 1** (Turntable) |
| Better lighting | **Script 2** (Lighting) |
| Shiny materials | **Script 3** (Materials) |
| Dynamic camera | **Script 4** (Camera) |
| 8 different angles | **Script 5** (Batch) |
| Realistic motion | **Script 6** (Physics) |

---

## 📍 Where to Find Your Object Name

```
Top-right panel:
📋 Outliner
  ▼ Scene Collection
    ├─ 📷 Camera
    └─ 🚴 BBQ_Bike ← This name!
```

Copy that exact name into the script!

---

## 🎯 Complete First Project (5 Steps)

```
Step 1: Import .glb
  File → Import → glTF 2.0

Step 2: Scripting tab
  Click "Scripting" at top

Step 3: Paste script
  + New → Ctrl+V

Step 4: Run
  ▶ Run Script (or Alt+P)

Step 5: Render
  Render → Render Animation (Ctrl+F12)
```

**Wait for render → Video saved! 🎉**

---

## 💡 Pro Tips

### Before Rendering:
- ✅ Select your bike
- ✅ Run lighting script (Script 2)
- ✅ Save your work (Ctrl+S)
- ✅ Test with 1 frame first (F12)

### During Rendering:
- ☕ Go make coffee
- ⏰ Expect 20-60 minutes
- 🚫 Don't close Blender!

### After Rendering:
- 📁 Find video in output folder
- 👀 Watch to verify
- 📱 Post to Instagram!

---

## 🆘 Emergency Help

**Completely lost?**
→ Read: [BLENDER_TUTORIAL_FOR_BEGINNERS.md](BLENDER_TUTORIAL_FOR_BEGINNERS.md)

**Need to see what it looks like?**
→ Read: [VISUAL_GUIDE.md](VISUAL_GUIDE.md)

**Want all the details?**
→ Read: [BLENDER_SCRIPTS.md](BLENDER_SCRIPTS.md)

**Prefer the easy way?**
→ Use web viewer: `npm run dev`

---

## 🎊 Remember

- **First time**: Takes 30 minutes to learn
- **Second time**: Takes 10 minutes
- **Third time**: Takes 5 minutes
- **After that**: You're a pro! 🏆

---

**You've got this!** 💪

**Now go create something amazing!** 🚴🔥✨
