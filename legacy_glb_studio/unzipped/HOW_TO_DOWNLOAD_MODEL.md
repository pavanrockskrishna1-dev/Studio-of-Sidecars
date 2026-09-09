# 📥 How to Download Your BBQ Bike Model from Google Drive

## Step-by-Step Guide

Since you shared your .glb file via Google Drive, here's how to download it for use with the 3D viewer:

### Method 1: Direct Download (If you have access)

1. **Open the Google Drive link** in your browser:
   ```
   https://drive.google.com/file/d/1La14vaehZp2v-HFm_xSbra0jNrg4swtH/view?usp=drivesdk
   ```

2. **Click the Download button** (down arrow icon) in the top right corner

3. **Save the file** to your computer (it should be a `.glb` file)

4. **Open the BBQ Bike 3D Viewer** in your browser

5. **Click "Choose GLB File"** and select the downloaded model

6. **Start creating content!** 🎉

### Method 2: If Download is Restricted

If the file is view-only and download is disabled:

1. Click on the three dots menu (⋮) in the top right
2. Select "Make a copy" or "Add to My Drive"
3. Open it from your own Google Drive
4. Download from your copy

### Method 3: Using Google Drive Desktop App

1. Install Google Drive for Desktop
2. Sync the shared file
3. Access it from your local drive
4. Upload to the web viewer

## 🎯 Quick Start After Download

Once you have the .glb file:

1. **Open the web viewer**: 
   - Development: `npm run dev` then open http://localhost:5173
   - Production: Open the built `index.html` from the `dist/` folder

2. **Upload your model**: Click "Choose GLB File" button

3. **Explore the viewer**:
   - Rotate with left mouse button
   - Zoom with scroll wheel
   - Pan with right mouse button

4. **Adjust settings**:
   - Try different environment presets (studio, sunset, etc.)
   - Toggle auto-rotate for turntable effect
   - Adjust lighting for the perfect look

5. **Capture content**:
   - Use screen recording for videos
   - Take screenshots for images
   - Perfect for Instagram posts! 📸

## 🚀 Alternative: Use Blender Scripts Directly

If you prefer to work directly in Blender for the highest quality:

1. **Open your BBQ bike model in Blender**
2. **Go to the Scripting workspace**
3. **Open BLENDER_SCRIPTS.md** from this project
4. **Copy any script** (turntable animation, lighting setup, etc.)
5. **Paste into Blender's text editor**
6. **Click "Run Script"** ▶️
7. **Render your animation** (Ctrl + F12)

This will give you production-quality renders and animations!

## 💡 Tips

- **File size**: .glb files can be large. The web viewer works best with models under 100MB
- **Optimization**: If your model is slow to load, consider optimizing it in Blender:
  - Reduce polygon count
  - Compress textures
  - Remove unnecessary details
- **Formats**: The viewer supports both .glb and .gltf formats

## 🎬 Content Creation Workflow

```
Download .glb → Upload to viewer → Adjust settings → Record screen → Edit video → Post to Instagram! 📱
```

**OR**

```
Open in Blender → Run scripts → Render animation → Edit video → Post to Instagram! 🎬
```

## 🆘 Troubleshooting

### "Can't download the file"
- Check if you have permission to view/download
- Try making a copy to your own Drive
- Contact the file owner if needed

### "Model doesn't load in viewer"
- Ensure file is .glb or .gltf format
- Check file size (under 100MB recommended)
- Try re-exporting from Blender with standard settings

### "Model looks weird/materials are wrong"
- Blender export settings matter! Use:
  - Format: glTF 2.0 (.glb)
  - Include: Materials, Textures
  - Transform: +Y Up
- Check that materials use Principled BSDF

## 📞 Need the File?

If you need access to the BBQ bike .glb file and don't have it, make sure:
1. You have the correct Google Drive link
2. The file owner has given you access
3. You're logged into the correct Google account

---

**Ready to create amazing BBQ Bike content!** 🚴🔥✨
