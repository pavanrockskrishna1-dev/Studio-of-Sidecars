# 🚴 BBQ Bike 3D Showcase

A professional web-based 3D viewer for your BBQ Bike brand model, built with React, Three.js, and advanced rendering capabilities. Perfect for creating high-quality Instagram content and showcasing your product.

## ✨ Features

- **🎨 Interactive 3D Viewer**: Rotate, zoom, and pan your BBQ bike model in real-time
- **💡 Professional Lighting**: Multiple environment presets (studio, sunset, warehouse, etc.)
- **🎬 Auto-Rotation**: Automated turntable animation for video capture
- **⚡ High-Quality Rendering**: Realistic materials, shadows, and reflections
- **📱 Instagram-Ready**: Optimized for creating social media content
- **🎮 Easy Controls**: Intuitive mouse/touch controls
- **🎛️ Customizable Settings**: Adjust lighting, shadows, environment, and more

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Your BBQ bike .glb 3D model file

### Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to the URL shown (usually `http://localhost:5173`)

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` folder.

## 📖 How to Use

1. **Upload Your Model**: Click "Choose GLB File" and select your BBQ bike .glb file
2. **Navigate the View**:
   - **Left Mouse Button**: Rotate the camera around the model
   - **Right Mouse Button**: Pan the camera
   - **Mouse Wheel**: Zoom in/out
3. **Adjust Settings**: Use the control panel on the right to:
   - Change environment presets
   - Adjust lighting intensity and position
   - Toggle shadows and grid
   - Modify background color
4. **Auto-Rotate**: Click the "Auto Rotate" button for turntable animation
5. **Capture Content**: Use screen recording software to capture videos for Instagram

## 🎬 Creating Instagram Content

### Recommended Workflow:

1. **Upload your model** in the web viewer
2. **Select environment preset**:
   - `studio` - Clean, professional look
   - `sunset` - Warm, golden hour lighting
   - `warehouse` - Industrial, edgy vibe
   - `city` - Urban environment
3. **Enable auto-rotate** for smooth turntable videos
4. **Record your screen**:
   - **Windows**: Win + G (Xbox Game Bar)
   - **Mac**: Cmd + Shift + 5
   - **Or use**: OBS Studio, QuickTime, etc.
5. **Edit in video editor** (add music, text, effects)
6. **Export** at 1080x1080 (square) or 1080x1350 (portrait) for Instagram

### Tips for Best Results:

- Use `studio` or `sunset` environments for clean product shots
- Enable shadows for realism
- Adjust lighting intensity to highlight details
- Try different camera angles by manually positioning before recording
- Keep videos under 60 seconds for Instagram feed posts

## 🎨 Blender Scripts

For even more advanced content creation, check out the **BLENDER_SCRIPTS.md** file which includes:

- 🔄 Turntable animation script (360° rotation)
- 💡 Professional studio lighting setup
- 🎨 Material enhancement (realistic metals & paint)
- 🎬 Dynamic camera animations
- 📸 Batch render multiple angles
- ⚙️ Physics simulation setup
- 📱 Instagram-optimized render settings

These scripts will help you create high-quality renders and animations directly in Blender for the most professional results.

## 🛠️ Technical Stack

- **React 19** - UI framework
- **Three.js** - 3D rendering engine
- **React Three Fiber** - React renderer for Three.js
- **@react-three/drei** - Useful helpers for R3F
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **Leva** - Control panel for tweaking settings

## 📁 Project Structure

```
bbq-bike-viewer/
├── src/
│   ├── App.tsx              # Main application component
│   ├── components/
│   │   └── AnimationControls.tsx  # Animation control buttons
│   └── main.tsx             # Entry point
├── public/                  # Static assets
├── BLENDER_SCRIPTS.md       # Blender Python scripts
└── README.md               # This file
```

## 🎯 Environment Presets

The viewer includes 10 professional environment presets:

| Preset | Description | Best For |
|--------|-------------|----------|
| studio | Clean white studio | Product shots |
| sunset | Warm golden hour | Lifestyle content |
| dawn | Soft morning light | Elegant shots |
| night | Dark with city lights | Dramatic shots |
| warehouse | Industrial setting | Edgy content |
| forest | Natural outdoor | Adventure theme |
| apartment | Indoor residential | Lifestyle |
| city | Urban environment | Street style |
| park | Outdoor daylight | Casual shots |
| lobby | Modern interior | Professional |

## 💡 Tips for Instagram Success

1. **Consistency**: Use the same environment preset for a cohesive feed
2. **Variety**: Mix static shots with rotation videos
3. **Details**: Zoom in on unique features (BBQ grill, bike components)
4. **Storytelling**: Show different angles to tell a complete story
5. **Quality**: Always use high-quality renders (good lighting + shadows)
6. **Hashtags**: Use relevant hashtags like #bbqbike #productdesign #3drendering

## 🔧 Customization

### Adding Custom Environments

You can add your own HDRI environment maps by modifying the `Environment` component in `App.tsx`.

### Adjusting Render Quality

In the `Canvas` component, you can adjust:
- `gl.antialias` - Enable/disable antialiasing
- `gl.toneMapping` - Change tone mapping algorithm
- `gl.toneMappingExposure` - Adjust overall brightness

### Material Tweaks

If your model's materials don't look right, you may need to adjust them in Blender before exporting the .glb file.

## 🤝 Support

For issues or questions:
1. Check the BLENDER_SCRIPTS.md for advanced rendering options
2. Adjust lighting and environment settings in the control panel
3. Ensure your .glb file is properly exported from Blender with materials

## 📄 License

This project is provided as-is for creating content for your BBQ Bike brand.

---

**Made with ❤️ for creating amazing BBQ Bike content** 🚴🔥
