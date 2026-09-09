# 🎯 How to Add Scenes and Scripts - Direct Answer to Your Question

You asked: **"How do I add scenes and scripts as I don't know how to do it"**

Here's the **complete answer** with two options:

---

## 🌐 Option 1: Easy Way (No Blender Needed) - 10 Minutes

Use the web viewer I built for you!

### Steps:

1. **Open terminal/command prompt** where you downloaded this project
   
   **❓ Don't know what terminal is?** → Read [WHERE_TO_RUN_COMMANDS.md](WHERE_TO_RUN_COMMANDS.md) first!

2. **Run these commands**:
   ```bash
   npm install
   npm run dev
   ```
   
   (Type each line and press Enter)

3. **Browser opens automatically** showing the 3D viewer

4. **Download your BBQ bike model** from Google Drive:
   - Click: https://drive.google.com/file/d/1La14vaehZp2v-HFm_xSbra0jNrg4swtH/view?usp=drivesdk
   - Click the download button
   - Save the .glb file

5. **Upload to viewer**:
   - Click the orange "Choose GLB File" button
   - Select your downloaded .glb file
   - Your bike appears in 3D! 🎉

6. **Create content**:
   - Try different "Environment" presets (right panel):
     - studio (clean professional)
     - sunset (warm golden)
     - warehouse (industrial)
   - Click "▶️ Auto Rotate" button (top right) for turntable video
   - Adjust lighting using the controls
   - Screen record and post to Instagram!

**That's it!** No Blender, no scripts, just upload and create! ✅

---

## 🎬 Option 2: Pro Way (Using Blender) - For High Quality

### If You've Never Used Blender:

**📖 READ THIS FIRST**: [BLENDER_TUTORIAL_FOR_BEGINNERS.md](BLENDER_TUTORIAL_FOR_BEGINNERS.md)

It has **complete step-by-step instructions** with screenshots descriptions.

### Quick Version (If You Want to Try Now):

#### Part 1: Get Blender
1. Download Blender (free): https://www.blender.org/download/
2. Install it
3. Open Blender

#### Part 2: Import Your Model
1. Click **File** menu (top left)
2. Click **Import**
3. Click **glTF 2.0 (.glb/.gltf)**
4. Find your downloaded .glb file
5. Click **Import**
6. Your bike appears!

#### Part 3: Open Scripting Area
1. Look at the **top tabs**: Layout, Modeling, Sculpting, etc.
2. Click **"Scripting"** tab (near the end)
3. You'll see 3 panels:
   - Left: 3D view (your bike)
   - Middle: Text Editor (empty)
   - Right: Python Console

#### Part 4: Add a Script
1. In the **middle panel** (Text Editor)
2. Click **"+ New"** button
3. A blank text editor appears

#### Part 5: Paste the Script
1. Open the file **BLENDER_SCRIPTS.md** (in this project folder)
2. Scroll to **"Script 1: Turntable Animation"**
3. Copy the entire code (from `import bpy` to the end)
4. Go back to Blender
5. Click in the Text Editor
6. Press **Ctrl+V** to paste
7. The code appears!

#### Part 6: Update Object Name
1. Look at the top-right corner of Blender
2. Find the **"Outliner"** panel
3. Look for your bike object (might be called "BBQ_Bike", "Bike", "Model", etc.)
4. In the script, find this line:
   ```python
   bike = bpy.data.objects.get('BBQ_Bike')
   ```
5. Change `'BBQ_Bike'` to YOUR object name
6. OR just click your bike in the 3D view first (easier!)

#### Part 7: Run the Script
1. Click the **"▶ Run Script"** button (top of Text Editor)
2. OR press **Alt+P**
3. Look at the Python Console (right panel)
4. You should see: **"✅ Turntable animation setup complete!"**

#### Part 8: Render Your Video
1. Click **Render** menu (top)
2. Click **Render Animation**
3. OR press **Ctrl+F12**
4. Blender starts creating your video!
5. Wait 20-60 minutes (go do something else)
6. Video is saved to your output folder!

**Done!** You have a professional 360° turntable video! 🎉

---

## 📊 Which Option Should You Use?

### Use **Option 1 (Web Viewer)** if:
- ✅ You want quick results (10 minutes)
- ✅ You're new to 3D software
- ✅ You need content today
- ✅ You want to test ideas quickly
- ✅ You're creating daily Instagram posts

### Use **Option 2 (Blender)** if:
- ✅ You want highest quality
- ✅ You have time to learn (30 min first time)
- ✅ You're creating hero content
- ✅ You want full control
- ✅ You're building a portfolio

### Use **Both** (Recommended):
- 70% of content: Web viewer (quick daily posts)
- 30% of content: Blender (weekly hero shots)

---

## 🎯 Your Next 5 Minutes (Choose One):

### Path A: Web Viewer (Easiest)
```bash
1. npm install        # In terminal (1 min)
2. npm run dev        # Start viewer (30 sec)
3. Upload .glb file   # Choose GLB File button (30 sec)
4. Click Auto Rotate  # Top-right button (10 sec)
5. Screen record      # Win+G or Cmd+Shift+5 (2 min)
```
**Result**: Instagram-ready video in 5 minutes! 🎉

### Path B: Blender (Best Quality)
```
1. Read: BLENDER_TUTORIAL_FOR_BEGINNERS.md  # (5 min)
2. Then follow the steps above
```
**Result**: Learn Blender, create pro content! 🏆

---

## 🆘 Still Confused? Here's What to Do:

### If you don't know coding or 3D software:
→ **Use Option 1** (Web Viewer)
→ Run: `npm run dev`
→ Upload your model
→ Start creating!

### If you want to learn Blender:
→ **Read**: [BLENDER_TUTORIAL_FOR_BEGINNERS.md](BLENDER_TUTORIAL_FOR_BEGINNERS.md)
→ Follow it step-by-step
→ It explains EVERYTHING

### If you just want a cheat sheet:
→ **Read**: [BLENDER_CHEAT_SHEET.md](BLENDER_CHEAT_SHEET.md)
→ Quick reference for all steps

### If you want to see what it looks like:
→ **Read**: [VISUAL_GUIDE.md](VISUAL_GUIDE.md)
→ Has diagrams of the interface

---

## 💡 What "Scenes" and "Scripts" Mean

### In the Web Viewer:
- **"Scenes"** = Environment presets (studio, sunset, etc.)
  - Just select from dropdown in right panel
  - No setup needed!
- **"Scripts"** = Already built into the app
  - Everything works automatically
  - Just upload and use!

### In Blender:
- **"Scenes"** = Your 3D environment with lights, camera, objects
  - Created automatically by the scripts
  - Scripts set everything up for you!
- **"Scripts"** = Python code that automates tasks
  - You copy and paste them
  - They do the work for you!

**Bottom line**: Both tools make it easy - no manual setup required! ✅

---

## 🎊 Summary

### Question: "How do I add scenes and scripts?"

### Answer:

**Easy Way (Web Viewer)**:
```bash
npm run dev
```
Then upload .glb file. Everything is automatic! ✨

**Pro Way (Blender)**:
1. Read: [BLENDER_TUTORIAL_FOR_BEGINNERS.md](BLENDER_TUTORIAL_FOR_BEGINNERS.md)
2. Follow the step-by-step guide
3. Copy-paste scripts from BLENDER_SCRIPTS.md
4. Click "Run Script"

**Both ways**: I've done all the hard work. You just:
- Upload your model (web viewer)
- OR paste the script (Blender)

**No complex setup needed!** 🎉

---

## 🚀 Start Right Now

### Fastest way to create content (literally 2 commands):

```bash
npm install
npm run dev
```

1. Browser opens with 3D viewer
2. Click "Choose GLB File"
3. Select your .glb model
4. Your bike appears in 3D
5. Click "Auto Rotate"
6. Screen record
7. Post to Instagram!

**Total time**: Under 10 minutes! ⚡

---

## 📞 Quick Links

- **Never used Blender?** → [BLENDER_TUTORIAL_FOR_BEGINNERS.md](BLENDER_TUTORIAL_FOR_BEGINNERS.md)
- **Need visual guide?** → [VISUAL_GUIDE.md](VISUAL_GUIDE.md)
- **Want cheat sheet?** → [BLENDER_CHEAT_SHEET.md](BLENDER_CHEAT_SHEET.md)
- **All the scripts** → [BLENDER_SCRIPTS.md](BLENDER_SCRIPTS.md)
- **Start here** → [START_HERE.md](START_HERE.md)

---

**You've got everything you need!** 💪

**Choose your path and start creating!** 🚴🔥✨
