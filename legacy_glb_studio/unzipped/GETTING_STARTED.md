# 🚀 Getting Started with BBQ Bike 3D Showcase

Welcome! This guide will help you start creating high-quality 3D renders and animations for your BBQ Bike Instagram content.

## 🎯 What You Have

This project includes **TWO powerful tools** for creating content:

### 1. 🌐 Web-Based 3D Viewer
- **Interactive browser viewer** for your .glb model
- **Real-time** camera controls and adjustments
- **Quick content creation** - upload and start capturing immediately
- **Perfect for**: Quick social media posts, exploring different angles, testing ideas

### 2. 🎬 Blender Python Scripts
- **Professional-grade** rendering scripts
- **Automated workflows** for turntables, lighting, materials
- **Production-quality** output for high-end content
- **Perfect for**: Final product videos, hero shots, portfolio pieces

## ⚡ Quick Start (5 Minutes)

### Step 1: Download Your Model
Your BBQ bike .glb file is here:
```
https://drive.google.com/file/d/1La14vaehZp2v-HFm_xSbra0jNrg4swtH/view?usp=drivesdk
```

📖 [Detailed download instructions](HOW_TO_DOWNLOAD_MODEL.md)

### Step 2: Choose Your Tool

#### Option A: Web Viewer (Easiest)
```bash
npm install
npm run dev
```
Then open http://localhost:5173 and upload your .glb file!

#### Option B: Blender Scripts (Highest Quality)
1. Open your model in Blender
2. Go to Scripting workspace
3. Open [BLENDER_SCRIPTS.md](BLENDER_SCRIPTS.md)
4. Copy and run any script

### Step 3: Start Creating!
- 📸 Capture screenshots for Instagram posts
- 🎬 Record rotation videos for Reels
- 🎨 Try different environments and lighting
- ✨ Create stunning content!

## 📚 Documentation Overview

### Essential Guides:

| File | What It's For | When to Use |
|------|---------------|-------------|
| **README.md** | Complete project overview | Understanding the full system |
| **GETTING_STARTED.md** (this file) | Quick start guide | Your first time setup |
| **BLENDER_SCRIPTS.md** | Python scripts for Blender | Professional rendering |
| **INSTAGRAM_CONTENT_GUIDE.md** | Content strategy & tips | Planning your posts |
| **HOW_TO_DOWNLOAD_MODEL.md** | Download .glb from Drive | Getting your model file |

## 🎓 Learning Path

### Beginner (Start Here!)
1. Read this GETTING_STARTED.md
2. Download your .glb model
3. Run the web viewer (`npm run dev`)
4. Upload model and explore controls
5. Capture your first screenshot

### Intermediate (Next Steps)
1. Read INSTAGRAM_CONTENT_GUIDE.md
2. Try different environment presets
3. Enable auto-rotate for video
4. Record a 360° turntable video
5. Edit and post to Instagram

### Advanced (Pro Content)
1. Read BLENDER_SCRIPTS.md thoroughly
2. Open your model in Blender
3. Run the lighting setup script
4. Run the turntable animation script
5. Render high-quality video (256+ samples)
6. Color grade and post

## 🎬 Two Workflows Compared

### Web Viewer Workflow
```
Upload .glb → Adjust settings → Screen record → Edit → Post
⏱️ Time: 10-15 minutes
💎 Quality: Good (web-quality)
💰 Cost: Free
🎯 Best for: Quick content, testing ideas, daily posts
```

### Blender Workflow
```
Open model → Run scripts → Render → Edit → Post
⏱️ Time: 30-60 minutes (+ render time)
💎 Quality: Excellent (production-quality)
💰 Cost: Free (but requires time)
🎯 Best for: Hero shots, product launches, portfolio
```

## 💡 Recommended Workflow

**For Daily Content**: Use Web Viewer
- Fast iterations
- Test different angles
- Quick posts and Stories

**For Weekly Hero Content**: Use Blender Scripts
- High-quality showcase videos
- Feature announcements
- Portfolio pieces

**Example Weekly Schedule**:
- Mon, Wed, Fri: Web viewer (quick posts)
- Saturday: Blender render (hero content for the week)
- Daily: Stories using web viewer screenshots

## 🛠️ Setup Checklist

- [ ] Node.js installed (v16+)
- [ ] Downloaded BBQ bike .glb model
- [ ] Ran `npm install`
- [ ] Can run `npm run dev` successfully
- [ ] Uploaded model to web viewer
- [ ] Explored different environment presets
- [ ] Tested auto-rotate feature
- [ ] Recorded first screen capture
- [ ] (Optional) Blender installed
- [ ] (Optional) Tested Blender script

## 🎯 Your First Content Piece (Step-by-Step)

Let's create your first Instagram post right now!

### What You'll Create:
A clean, professional 360° rotation video of your BBQ bike

### Steps:

1. **Start the viewer**:
   ```bash
   npm run dev
   ```

2. **Upload your model**:
   - Click "Choose GLB File"
   - Select your downloaded .glb

3. **Configure settings**:
   - Environment: `studio`
   - Background: `#1a1a1a` (dark gray)
   - Shadows: ON
   - Grid: OFF

4. **Position camera**:
   - Rotate to show best angle (front-right, 45°)
   - Zoom to fill frame nicely
   - Slight downward angle to see bike features

5. **Enable auto-rotate**:
   - Click "Auto Rotate" button
   - Watch it spin smoothly

6. **Record**:
   - **Windows**: Win + G, then click record
   - **Mac**: Cmd + Shift + 5, select area, record
   - Record for 15 seconds (full rotation)
   - Stop recording

7. **Edit** (optional):
   - Trim to perfect loop
   - Add trending audio
   - Add text: "BBQ Bike 🔥🚴"

8. **Post to Instagram**:
   - Export as 1080x1080 (square)
   - Caption: "Introducing the BBQ Bike. Function meets flavor. 🔥🚴 What do you think?"
   - Add hashtags from INSTAGRAM_CONTENT_GUIDE.md

**Congratulations!** You just created your first piece of BBQ Bike content! 🎉

## 🎨 Popular Environment Presets

Try these for different moods:

| Preset | Vibe | Best For |
|--------|------|----------|
| `studio` | Clean, professional | Product shots, features |
| `sunset` | Warm, golden | Lifestyle, emotional appeal |
| `warehouse` | Industrial, edgy | Urban, street style |
| `city` | Modern, urban | Metropolitan lifestyle |
| `night` | Dramatic, moody | Artistic, attention-grabbing |

## 💻 System Requirements

### For Web Viewer:
- **Browser**: Chrome, Firefox, Safari, or Edge (latest)
- **RAM**: 4GB minimum, 8GB recommended
- **GPU**: Any modern GPU with WebGL support
- **Storage**: Minimal (just the .glb file)

### For Blender Rendering:
- **CPU**: Multi-core recommended (render time)
- **RAM**: 8GB minimum, 16GB+ recommended
- **GPU**: NVIDIA/AMD with CUDA/OpenCL for faster rendering
- **Storage**: 1-2GB per video project

## 🆘 Troubleshooting

### Web Viewer Issues:

**Model won't load**:
- Check file is .glb or .gltf format
- Ensure file size under 100MB
- Try refreshing browser
- Check browser console for errors

**Slow performance**:
- Close other browser tabs
- Reduce environment quality in settings
- Try a different browser
- Simplify model in Blender (reduce polygons)

**Model looks wrong**:
- Materials may not have exported correctly
- Re-export from Blender with:
  - Format: glTF 2.0 (.glb/.gltf)
  - Include: Selected Objects, Materials, Textures
  - Transform: +Y Up
  - Materials: Export

### Blender Script Issues:

**Script error**:
- Ensure you selected the right object first
- Change `'BBQ_Bike'` to your actual object name
- Check Blender version (2.8+ required)

**Render looks dark**:
- Increase light intensity in script
- Adjust world strength
- Enable denoising

**Render takes forever**:
- Reduce samples (128 for preview, 256 for final)
- Use GPU rendering (Preferences → System → Cycles Render Device → GPU)
- Reduce resolution for testing

## 🎓 Learning Resources

### Three.js / React Three Fiber:
- [React Three Fiber Docs](https://docs.pmnd.rs/react-three-fiber)
- [Three.js Journey](https://threejs-journey.com/) (course)
- [Drei Helpers](https://github.com/pmndrs/drei)

### Blender:
- [Blender Guru YouTube](https://www.youtube.com/user/AndrewPPrice) (tutorials)
- [Blender Docs](https://docs.blender.org/)
- [CGBoost](https://cgboost.com/) (advanced tutorials)

### Instagram Marketing:
- [Later Blog](https://later.com/blog/) (strategies)
- [Hootsuite Resources](https://blog.hootsuite.com/instagram-marketing/)

## 📞 Next Steps

After you're comfortable with the basics:

1. **Experiment with environments** - Try all 10 presets
2. **Create a content calendar** - Plan 1 week of posts
3. **Test Blender scripts** - Start with turntable animation
4. **Optimize your workflow** - Find what works best
5. **Build your Instagram presence** - Post consistently!

## 🔥 Pro Tips

1. **Start Simple**: Master the web viewer before Blender scripts
2. **Quality Matters**: One great post > five mediocre ones
3. **Be Consistent**: Post regularly (3-5x per week)
4. **Engage**: Respond to comments, build community
5. **Analyze**: Check Instagram Insights to see what works
6. **Iterate**: Keep improving based on feedback
7. **Have Fun**: Your passion will show in your content!

## 📈 Success Metrics

Track your progress:
- [ ] First post created and uploaded
- [ ] 10+ posts using web viewer
- [ ] First Blender render completed
- [ ] 100 followers gained
- [ ] Consistent posting schedule (3+ weeks)
- [ ] Engagement rate above 3%
- [ ] First viral post (1000+ likes)
- [ ] Portfolio of 50+ posts

## 🎊 You're Ready!

You now have everything you need to create stunning BBQ Bike content:

✅ Professional 3D viewer  
✅ Blender automation scripts  
✅ Instagram strategy guide  
✅ Complete documentation  
✅ Step-by-step workflows  

**Now it's time to create!** 🚀

---

## Quick Links

- 📖 [Complete Project README](README.md)
- 🎬 [Blender Scripts](BLENDER_SCRIPTS.md)
- 📱 [Instagram Guide](INSTAGRAM_CONTENT_GUIDE.md)
- 📥 [Download Model Guide](HOW_TO_DOWNLOAD_MODEL.md)

---

**Made for BBQ Bike** 🚴🔥  
*Let's create content that sizzles!*
