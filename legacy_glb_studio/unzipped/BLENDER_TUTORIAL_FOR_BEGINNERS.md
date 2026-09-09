# 🎓 Blender Scripts Tutorial - Complete Beginner's Guide

## 📋 What You'll Learn

By the end of this guide, you'll know how to:
- ✅ Open your BBQ Bike model in Blender
- ✅ Run Python scripts in Blender
- ✅ Create a 360° turntable animation
- ✅ Render your first video for Instagram

**No Blender experience needed!** I'll explain every single step.

---

## 📥 Step 1: Get Blender (If You Don't Have It)

### Download Blender (Free):
1. Go to: **https://www.blender.org/download/**
2. Click the big **"Download Blender"** button
3. Install it on your computer (just like any other program)
4. Open Blender

**Time**: 5 minutes

---

## 📂 Step 2: Open Your BBQ Bike Model

### Option A: If you have a .blend file
1. Open Blender
2. Click **File** → **Open**
3. Find your BBQ Bike .blend file
4. Click **Open**
5. Your model appears!

### Option B: If you have a .glb file
1. Open Blender
2. Click **File** → **Import** → **glTF 2.0 (.glb/.gltf)**
3. Find your BBQ Bike .glb file (the one from Google Drive)
4. Click **Import**
5. Your model appears!

**💡 Tip**: You might need to zoom in/out to see your model:
- **Scroll mouse wheel** to zoom
- **Middle mouse button + drag** to rotate view
- **Shift + middle mouse + drag** to pan

---

## 🎬 Step 3: Open the Scripting Workspace

This is where the magic happens!

### Steps:
1. Look at the **top of your Blender window**
2. You'll see tabs: **Layout**, **Modeling**, **Sculpting**, **Shading**, etc.
3. Click on **"Scripting"** tab (near the end)

**What you'll see now**:
- Left side: 3D view of your model
- Middle: Text editor (currently empty)
- Right: Python console

**You're now ready to run scripts!** 🎉

---

## 📝 Step 4: Create a New Script

### Steps:
1. In the **middle panel** (Text Editor), click **"+ New"** button
2. A blank text file appears
3. It might say "Text" at the top - that's fine

**Now you have a blank script ready to paste into!**

---

## 🎯 Step 5: Run Your First Script (Turntable Animation)

Let's create a 360° rotation video!

### Steps:

#### A. Copy the Script:
1. Open **BLENDER_SCRIPTS.md** file (in this project)
2. Scroll to **"Script 1: Turntable Animation"**
3. Copy **everything** inside the code block (from `import bpy` to the end)

#### B. Paste into Blender:
1. Go back to Blender
2. Click in the **Text Editor** panel (middle)
3. Press **Ctrl+A** (select all) then **Delete** (clear it)
4. Press **Ctrl+V** to paste the script
5. You should see Python code now!

#### C. IMPORTANT - Update Object Name:
1. Look at line 10 in the script:
   ```python
   bike = bpy.data.objects.get('BBQ_Bike') or bpy.context.active_object
   ```
2. If your bike object has a different name, you need to change `'BBQ_Bike'`

**How to find your object name:**
- Look at the **Outliner** panel (top-right corner)
- You'll see a list of objects
- Find your bike object (might be called "Bike", "Model", or something else)
- Remember that exact name!

**Update the script:**
- Change `'BBQ_Bike'` to your object name
- Example: If it's called "Bike", change to `'Bike'`

**OR** - Easier method:
- Just **select your bike** in the 3D view (click on it)
- The script will use `bpy.context.active_object` (currently selected)

#### D. Run the Script:
1. Click anywhere in the Text Editor
2. Click the **"▶ Run Script"** button (or press **Alt+P**)
3. Watch the Python Console (right panel) for messages
4. You should see: **"✅ Turntable animation setup complete!"**

**🎉 Success! Your animation is now set up!**

---

## 🎥 Step 6: Preview Your Animation

Before rendering, let's see what it looks like:

### Steps:
1. Look at the **timeline** at the bottom of the screen
2. You'll see a **play button** (▶)
3. Click the **play button**
4. **Your bike should start rotating!** 🎉

**Controls**:
- **Spacebar**: Play/Pause
- **Left/Right arrow keys**: Step through frames
- **Scroll on timeline**: Jump to any frame

**If it's rotating:** Great! Continue to rendering.
**If nothing happens:** Check that you selected the right object.

---

## 🎬 Step 7: Set Up Render Settings

Let's make it Instagram-ready!

### Steps:

#### A. Open Render Properties:
1. Look at the **right side panel**
2. Click the **camera icon** 📷 (Render Properties)

#### B. Set Resolution:
1. Find **"Resolution"** section
2. Set **X: 1080**
3. Set **Y: 1080** (for Instagram square)
4. Set **%: 100**

#### C. Set Output:
1. Scroll down to **"Output"** section
2. Click the **folder icon** next to the file path
3. Choose where to save (like Desktop or Documents)
4. Name it: **"bbq_bike_turntable"**
5. Set **File Format**: **FFmpeg video**
   - Click the dropdown
   - Select **FFmpeg video**
6. In **Encoding** section:
   - **Container**: MPEG-4
   - **Video Codec**: H.264

---

## 🚀 Step 8: Render Your Animation!

This is it - creating your video!

### Steps:

1. Click **Render** menu at the top
2. Click **Render Animation** (or press **Ctrl+F12**)
3. **Blender starts rendering!**

**What happens**:
- A window opens showing each frame being rendered
- Frame 1/120, 2/120, 3/120, etc.
- This can take **10-60 minutes** depending on your computer
- **Don't close Blender!** Let it finish

**💡 Tips**:
- Go make some coffee ☕
- Do other work
- Let it run overnight for highest quality

**When it's done**:
- The window closes
- Your video is saved to the location you chose!
- Look in your output folder for **bbq_bike_turntable.mp4**

---

## 📱 Step 9: Post to Instagram!

### Steps:
1. Find your rendered video file
2. Open Instagram on your phone or computer
3. Create new post
4. Upload your video
5. Add caption:
   ```
   Check out the BBQ Bike from every angle! 🔥🚴
   
   360° of pure innovation.
   What do you think?
   
   #BBQBike #ProductDesign #3DAnimation
   ```
6. **Post!** 🎉

---

## 🎨 Try Other Scripts

Now that you know the basics, try the other scripts!

### Script 2: Studio Lighting
**What it does**: Adds professional 4-point lighting to your scene

**Steps**:
1. Click **"+ New"** in Text Editor
2. Copy **Script 2** from BLENDER_SCRIPTS.md
3. Paste into Blender
4. Click **▶ Run Script**
5. Done! Your scene now has professional lighting

**You'll see**: 4 new lights appear in your scene (Key, Fill, Rim, Top)

### Script 3: Material Enhancement
**What it does**: Creates realistic materials (chrome, metal, paint)

**Steps**:
1. Create new script
2. Copy **Script 3** from BLENDER_SCRIPTS.md
3. Paste and run
4. **Select the parts** of your bike you want to apply materials to
5. Run the script
6. Materials are applied!

### Script 5: Batch Render (8 Angles)
**What it does**: Renders 8 different camera angles automatically

**Steps**:
1. Create new script
2. Copy **Script 5** from BLENDER_SCRIPTS.md
3. Update the output path (line 8)
4. Run script
5. Blender renders all 8 angles for you!

**Result**: 8 images you can use in an Instagram carousel! 📸

---

## 🔧 Troubleshooting

### "Script error!" or red text in console
**Problem**: Usually an object name mismatch

**Fix**:
1. Find this line: `bike = bpy.data.objects.get('BBQ_Bike')`
2. Change `'BBQ_Bike'` to your actual object name
3. OR just select your bike first, then run script

### "Nothing happens when I run script"
**Problem**: Bike might not be selected

**Fix**:
1. Click on your bike in the 3D view
2. Make sure it's highlighted (orange outline)
3. Run script again

### "Can't find Scripting tab"
**Problem**: Using old Blender version

**Fix**:
1. Update to Blender 2.8 or newer
2. Download from blender.org
3. Install and try again

### "Render is too dark"
**Problem**: Not enough lighting

**Fix**:
1. Run **Script 2** (Studio Lighting Setup)
2. Or increase light intensity in the script:
   - Find: `light.data.energy = 500`
   - Change to: `light.data.energy = 1000`

### "Render takes forever"
**Problem**: Too many samples (high quality = slow)

**Fix**:
1. In the script, find: `scene.cycles.samples = 128`
2. Change to: `scene.cycles.samples = 64` (faster, less quality)
3. Or: `scene.cycles.samples = 256` (slower, more quality)

**For quick previews**: Use 32 samples
**For Instagram posts**: Use 128 samples
**For portfolio**: Use 256+ samples

### "Video file is huge!"
**Problem**: Uncompressed or high bitrate

**Fix**:
1. In Render Settings → Output → Encoding
2. Set **Output Quality**: Medium or High (not Perceptually Lossless)
3. Re-render

---

## 🎓 Quick Reference

### How to Run a Script:
```
1. Scripting workspace (top tab)
2. + New
3. Ctrl+V (paste script)
4. Update object names if needed
5. ▶ Run Script (or Alt+P)
```

### How to Render:
```
1. Render menu → Render Animation
2. OR press Ctrl+F12
3. Wait for completion
4. Find video in output folder
```

### Keyboard Shortcuts:
- **Alt+P**: Run script
- **Ctrl+F12**: Render animation
- **Spacebar**: Play/Pause animation preview
- **Scroll wheel**: Zoom in 3D view
- **Middle mouse + drag**: Rotate 3D view

---

## 📚 Script Summary

| Script | What It Does | Difficulty | Time |
|--------|--------------|------------|------|
| **1. Turntable** | 360° rotation | ⭐ Easy | 5 min setup |
| **2. Lighting** | Pro lighting | ⭐ Easy | 2 min |
| **3. Materials** | Realistic surfaces | ⭐⭐ Medium | 5 min |
| **4. Camera** | Dynamic shots | ⭐⭐ Medium | 5 min |
| **5. Batch** | 8 angles auto | ⭐⭐ Medium | 10 min setup |
| **6. Physics** | Motion effects | ⭐⭐⭐ Advanced | 10 min |

---

## 🎯 Your First Project (Complete Walkthrough)

Let's create a turntable video from start to finish!

### Total Time: 15 minutes setup + render time

#### Minute 1-5: Setup
1. Open Blender
2. Import your .glb model (File → Import → glTF)
3. Click "Scripting" tab
4. Click "+ New"

#### Minute 6-10: Script
1. Open BLENDER_SCRIPTS.md
2. Copy Script 1 (Turntable Animation)
3. Paste into Blender
4. Select your bike in 3D view
5. Click ▶ Run Script
6. See success message!

#### Minute 11-15: Render Setup
1. Right panel → Camera icon
2. Resolution: 1080 x 1080
3. Output folder: Desktop/BBQ_Bike/
4. File Format: FFmpeg video
5. Container: MPEG-4

#### Render:
1. Render → Render Animation (Ctrl+F12)
2. Wait (20-60 minutes)
3. Video saved to Desktop/BBQ_Bike/

#### Post:
1. Open Instagram
2. Upload video
3. Add caption and hashtags
4. Post! 🎉

**Congratulations! You just created professional 3D content!** 🏆

---

## 💡 Pro Tips

### Tip 1: Save Your Work
- **File → Save** (or Ctrl+S) after running each script
- Save as: **bbq_bike_turntable.blend**
- Blender remembers everything!

### Tip 2: Test Renders
- Render just **one frame** first to check quality:
  - Render → Render Image (F12)
  - If it looks good, render full animation

### Tip 3: Render While Sleeping
- Set up render before bed
- Let it run overnight
- Wake up to finished video!

### Tip 4: Multiple Versions
- Run script with different environments
- Render 3 versions: studio, sunset, warehouse
- Post different versions throughout the week

### Tip 5: Combine Scripts
1. Run Script 2 (Lighting) first
2. Then Script 3 (Materials)
3. Then Script 1 (Turntable)
4. Render = Perfect result!

---

## 🎓 Next Steps

### After Your First Render:
1. ✅ Try Script 2 (Lighting)
2. ✅ Try Script 3 (Materials)
3. ✅ Combine them!
4. ✅ Try different camera angles
5. ✅ Experiment with colors

### Advanced (Later):
1. Modify scripts for custom effects
2. Create your own camera paths
3. Add text overlays in Blender
4. Composite multiple renders

---

## 🆘 Still Stuck?

### Option 1: Use the Web Viewer Instead
If Blender is too complex right now:
1. ```npm run dev```
2. Upload your .glb
3. Create content in 10 minutes!
4. Come back to Blender when ready

### Option 2: Start Simple
- Use just Script 1 (Turntable)
- Master that first
- Then try others one at a time

### Option 3: Watch Video Tutorials
Search YouTube for:
- "Blender scripting for beginners"
- "How to run Python scripts in Blender"
- "Blender turntable animation tutorial"

---

## 🎊 You're Ready!

You now know:
- ✅ How to open models in Blender
- ✅ How to access the Scripting workspace
- ✅ How to paste and run scripts
- ✅ How to set up renders
- ✅ How to create Instagram videos

**Go create something amazing!** 🚴🔥

---

## 📞 Quick Help

**Can't find Scripting tab?**
→ Top of window, between Shading and Scripting

**Script won't run?**
→ Select your bike first, then run

**Render too dark?**
→ Run Script 2 (Lighting) first

**Takes too long?**
→ Reduce samples in script (line with `samples =`)

**Video too big?**
→ Use H.264 codec and Medium quality

---

**Remember**: Everyone starts as a beginner. You've got this! 💪

---

**Need the scripts?** → Open **BLENDER_SCRIPTS.md**
**Need quick content?** → Use web viewer: `npm run dev`

**Happy rendering!** 🎬✨
