# 💻 Where to Run These Commands - Complete Guide

## 🎯 You Asked: "Where do I run this bash?"

Here's the **complete answer** for your operating system!

---

## 🪟 Windows Users

### Option 1: Command Prompt (Easiest)

#### Step 1: Open Command Prompt
**Method A - Using Search:**
1. Click the **Start button** (Windows logo, bottom-left)
2. Type: **cmd**
3. Click **Command Prompt** (black icon)
4. A black window opens ✅

**Method B - Using Run:**
1. Press **Windows key + R**
2. Type: **cmd**
3. Press **Enter**
4. A black window opens ✅

#### Step 2: Navigate to Your Project
```cmd
cd Desktop\bbq-bike-3d-showcase
```

If your project is in Downloads:
```cmd
cd Downloads\bbq-bike-3d-showcase
```

If your project is somewhere else:
```cmd
cd path\to\your\project
```

#### Step 3: Run the Commands
```cmd
npm install
npm run dev
```

#### What You'll See:
```
C:\Users\YourName> cd Desktop\bbq-bike-3d-showcase
C:\Users\YourName\Desktop\bbq-bike-3d-showcase> npm install
... installing packages ...
C:\Users\YourName\Desktop\bbq-bike-3d-showcase> npm run dev

  VITE v7.3.2  ready in 523 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

**Browser opens automatically!** 🎉

---

### Option 2: PowerShell (Also Good)

#### Step 1: Open PowerShell
1. Click **Start button**
2. Type: **powershell**
3. Click **Windows PowerShell** (blue icon)
4. A blue window opens ✅

#### Step 2 & 3: Same as Command Prompt
```powershell
cd Desktop\bbq-bike-3d-showcase
npm install
npm run dev
```

---

### Option 3: VS Code Terminal (If You Use VS Code)

#### Step 1: Open VS Code
1. Open **Visual Studio Code**
2. Click **File** → **Open Folder**
3. Select your **bbq-bike-3d-showcase** folder

#### Step 2: Open Terminal
1. Click **Terminal** menu at top
2. Click **New Terminal**
3. Terminal panel appears at bottom ✅

#### Step 3: Run Commands
```bash
npm install
npm run dev
```

**You're already in the right folder!** No need to `cd`! ✨

---

## 🍎 Mac Users

### Option 1: Terminal (Standard)

#### Step 1: Open Terminal
**Method A - Using Spotlight:**
1. Press **Command (⌘) + Space**
2. Type: **terminal**
3. Press **Enter**
4. Terminal window opens ✅

**Method B - Using Finder:**
1. Open **Finder**
2. Go to **Applications** → **Utilities**
3. Double-click **Terminal**
4. Terminal window opens ✅

#### Step 2: Navigate to Your Project
```bash
cd Desktop/bbq-bike-3d-showcase
```

If in Downloads:
```bash
cd Downloads/bbq-bike-3d-showcase
```

If somewhere else:
```bash
cd ~/path/to/your/project
```

#### Step 3: Run Commands
```bash
npm install
npm run dev
```

#### What You'll See:
```
YourName@MacBook ~ % cd Desktop/bbq-bike-3d-showcase
YourName@MacBook bbq-bike-3d-showcase % npm install
... installing packages ...
YourName@MacBook bbq-bike-3d-showcase % npm run dev

  VITE v7.3.2  ready in 523 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

**Browser opens automatically!** 🎉

---

### Option 2: VS Code Terminal (If You Use VS Code)

Same as Windows - see above! ✅

---

## 🐧 Linux Users

### Terminal

#### Step 1: Open Terminal
**Most common methods:**
- Press **Ctrl + Alt + T** (most distros)
- Or search for "Terminal" in your app menu

#### Step 2: Navigate to Project
```bash
cd ~/Desktop/bbq-bike-3d-showcase
```

#### Step 3: Run Commands
```bash
npm install
npm run dev
```

---

## 🎯 Visual Guide - What It Looks Like

### Windows Command Prompt:
```
┌─────────────────────────────────────────────────────────┐
│ Command Prompt                                    ☐ ☐ ✕ │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Microsoft Windows [Version 10.0.19045.0]              │
│  (c) Microsoft Corporation. All rights reserved.       │
│                                                         │
│  C:\Users\YourName> cd Desktop\bbq-bike-3d-showcase    │
│                                                         │
│  C:\Users\YourName\Desktop\bbq-bike-3d-showcase> _     │
│                     ▲                                   │
│                     └─── Type your commands here!       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Mac Terminal:
```
┌─────────────────────────────────────────────────────────┐
│ Terminal                                          ☐ ☐ ✕ │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Last login: Mon Jan 15 10:30:00 on ttys000            │
│                                                         │
│  YourName@MacBook ~ % cd Desktop/bbq-bike-3d-showcase  │
│                                                         │
│  YourName@MacBook bbq-bike-3d-showcase % _             │
│                                    ▲                    │
│                                    └─── Type here!      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### VS Code Terminal:
```
┌─────────────────────────────────────────────────────────┐
│ Visual Studio Code                                ☐ ☐ ✕ │
├─────────────────────────────────────────────────────────┤
│  File  Edit  View  Terminal  Help                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Your code files here]                                │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ ⚡ TERMINAL                                        bash │
├─────────────────────────────────────────────────────────┤
│  bbq-bike-3d-showcase % npm install                    │
│  ... installing ...                                    │
│  bbq-bike-3d-showcase % npm run dev                    │
│                                                         │
│  VITE v7.3.2  ready in 523 ms                          │
│  ➜  Local:   http://localhost:5173/                   │
│  bbq-bike-3d-showcase % _                              │
│                         ▲                              │
│                         └─── Type here!                │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Complete Step-by-Step Walkthrough

### Starting From Scratch:

#### 1️⃣ Download/Clone This Project
First, you need this project on your computer:
- If you have a ZIP file, extract it to Desktop
- If using Git: `git clone [repo-url]`

#### 2️⃣ Open Terminal/Command Prompt
**Windows:**
- Start → Type "cmd" → Enter

**Mac:**
- Command + Space → Type "terminal" → Enter

#### 3️⃣ Navigate to the Project Folder
**Windows:**
```cmd
cd Desktop\bbq-bike-3d-showcase
```

**Mac/Linux:**
```bash
cd Desktop/bbq-bike-3d-showcase
```

💡 **Tip:** Type `cd Desktop\` then press **Tab** key - it will autocomplete!

#### 4️⃣ Verify You're in the Right Place
Type:
```bash
dir
```
(Windows) or
```bash
ls
```
(Mac/Linux)

**You should see files like:**
- package.json ✓
- src/ ✓
- README.md ✓
- index.html ✓

If you see these, you're in the right place! ✅

#### 5️⃣ Install Dependencies (First Time Only)
```bash
npm install
```

**Wait 1-3 minutes** while it installs everything.

You'll see lots of text scrolling - that's normal! ✓

**Success message:**
```
added 210 packages in 45s
```

#### 6️⃣ Start the Viewer
```bash
npm run dev
```

**Success message:**
```
  VITE v7.3.2  ready in 523 ms

  ➜  Local:   http://localhost:5173/
  ➜  Press h to show help
```

**Browser opens automatically!** 🎉

If it doesn't open automatically:
- Open your browser
- Go to: **http://localhost:5173/**

---

## ❌ Common Errors & Fixes

### Error: "npm is not recognized"
**Problem:** Node.js is not installed

**Fix:**
1. Download Node.js: https://nodejs.org/
2. Click "Download" (LTS version)
3. Install it
4. Close and reopen your terminal/command prompt
5. Try again: `npm install`

### Error: "cannot find module"
**Problem:** Dependencies not installed

**Fix:**
```bash
npm install
```

### Error: "EACCES permission denied"
**Problem:** Permission issue (Mac/Linux)

**Fix:**
```bash
sudo npm install
```
(Enter your password when prompted)

### Error: "port 5173 already in use"
**Problem:** Another app is using the port

**Fix:**
Close the other app, or the dev server is already running!
Check if a browser tab with localhost:5173 is already open.

---

## 🎯 Quick Reference Card

### Windows:
```
1. Start → "cmd" → Enter
2. cd Desktop\bbq-bike-3d-showcase
3. npm install
4. npm run dev
```

### Mac:
```
1. Cmd+Space → "terminal" → Enter
2. cd Desktop/bbq-bike-3d-showcase
3. npm install
4. npm run dev
```

### VS Code (Any OS):
```
1. File → Open Folder → Select project
2. Terminal → New Terminal
3. npm install
4. npm run dev
```

---

## 💡 Pro Tips

### Tip 1: Stay in the Folder
Once you `cd` into the project, you can run commands multiple times:
```bash
cd Desktop/bbq-bike-3d-showcase  # Only once
npm run dev                       # Every time you want to start
# Close with Ctrl+C
npm run dev                       # Start again
```

### Tip 2: Stop the Server
To stop the dev server:
- Press **Ctrl + C** in the terminal
- Type **Y** if it asks "Terminate batch job?"

### Tip 3: Multiple Terminals
You can open multiple terminal windows!
- One for the dev server (`npm run dev`)
- One for other commands

### Tip 4: Copy/Paste in Terminal
**Windows Command Prompt:**
- Right-click to paste
- Or: Ctrl+Shift+V

**Mac Terminal:**
- Cmd+V to paste

**PowerShell:**
- Right-click to paste
- Or: Ctrl+V

---

## 📍 Where Is My Project?

### Finding Your Project Folder:

**Windows File Explorer:**
```
This PC → Desktop → bbq-bike-3d-showcase
```

**Mac Finder:**
```
Macintosh HD → Users → YourName → Desktop → bbq-bike-3d-showcase
```

**In Terminal, type:**
```bash
pwd
```
This shows your current location!

---

## 🎊 You're Ready!

### Quick Start (Copy & Paste This):

**Windows:**
```cmd
cd Desktop\bbq-bike-3d-showcase
npm install
npm run dev
```

**Mac/Linux:**
```bash
cd Desktop/bbq-bike-3d-showcase
npm install
npm run dev
```

**Press Enter after each line!**

---

## 🆘 Still Stuck?

### Can't Find Terminal?

**Windows:**
1. Click Start (Windows logo)
2. Literally type the letters: **c m d**
3. You'll see "Command Prompt"
4. Click it
5. Black window opens ✅

**Mac:**
1. Look at top-right corner (magnifying glass)
2. Click it (or press Cmd+Space)
3. Type: **terminal**
4. Press Enter
5. White/black window opens ✅

### Don't Know Where Project Is?

**Download it to Desktop:**
1. Extract the ZIP file to your Desktop
2. You'll see a folder called "bbq-bike-3d-showcase"
3. Now in terminal: `cd Desktop/bbq-bike-3d-showcase`

---

## 🎬 What Happens When You Run `npm run dev`

```
Step 1: You type: npm run dev
Step 2: Terminal shows: "VITE ready in 523ms"
Step 3: Terminal shows: "Local: http://localhost:5173/"
Step 4: Browser opens automatically
Step 5: You see the 3D viewer! 🎉
Step 6: Upload your .glb file
Step 7: Create content!
```

**Your terminal must stay open while using the viewer!**

To stop: Press **Ctrl+C** in the terminal

---

## 📱 Screenshot Guide

### What "Command Prompt" Looks Like:
- **Icon:** Black square with white text ">_"
- **Window:** Black background, white text
- **Title:** "Command Prompt" or "cmd.exe"

### What "Terminal" Looks Like (Mac):
- **Icon:** Black square with white ">_" 
- **Window:** White or black background
- **Title:** "Terminal" or "zsh" or "bash"

### What "PowerShell" Looks Like:
- **Icon:** Blue square with white ">_"
- **Window:** Blue background, white text
- **Title:** "Windows PowerShell"

---

## ✅ Success Checklist

Once you run `npm run dev`, you should see:

- [ ] Terminal shows "VITE ready"
- [ ] Terminal shows "Local: http://localhost:5173/"
- [ ] Browser opens automatically
- [ ] You see "BBQ Bike 3D Showcase" page
- [ ] You see "Choose GLB File" button

**All checked?** You're successfully running the app! 🎉

**Not checked?** See the "Common Errors" section above.

---

## 🚀 Next Steps

Now that you know where to run commands:

1. ✅ **Run the dev server**: `npm run dev`
2. ✅ **Upload your model**: Click "Choose GLB File"
3. ✅ **Create content**: Try different environments
4. ✅ **Post to Instagram**: Share your amazing content!

---

**You've got this!** 💪

**Terminal = Where you type commands** ✓
**Now go create!** 🚴☕🔥✨
