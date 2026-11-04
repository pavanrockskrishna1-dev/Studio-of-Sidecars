# Studio of Sidecars: rules for coding agents

The app is React 19 + Vite + three.js (@react-three/fiber, drei) in `app/src`. Run it with `cd app`, `npm run dev`, then open http://localhost:5173. Read `app/NEXT_SESSION.md` before you start. `HANDOFF.md` is the long history; read only the part you need.

## The owner's rules
1. **Do not export videos or run heavy renders or tests.** It makes the laptop freeze. Build features and let the owner try them. Exporting is the owner's job.
2. **Do not use the existing HDRIs** for the Halloween or night look. The night stage (`fx/NightStage.jsx`, `fx/stageLook.js`) has its own sky, ground and lights.
3. **Moving, rotating and repositioning GLBs in the studio must keep working.** Never remove or hide it.
4. **Leave the deleted files and models in `git status` alone** (about 57). Stage only the files you changed with `git add -- <paths>`. Never `git add -A`.
5. **Do not commit or push** unless the owner says the feature works.
6. Explain things in plain, simple steps. The owner is not a developer.

## How the code is organised
- State lives in small module stores (`subscribe` / `getSnapshot`, read with `useSyncExternalStore`). Follow that pattern.
- The stage is `components/StudioCanvas.jsx`. Sheets are in `ui/` (`SheetContents.jsx`, `InspectorRail.jsx`). The Reel sheet starts with the AI Reel Builder (`ui/AiScenePanel.jsx`, `ai/aiScene.js`).
- Ready-made occasion sets are plain data in `animation/occasionSetDefs.js` (format documented at the top of that file). Each also needs an entry in `animation/occasionDefs.js`.
- Props are listed in `products/props.js` (max 30, shared with `garage/sceneObjects.js`). Ground surfaces are in `fx/groundSurfaces.js`.
- Anything that belongs to a "set" must be saved in `session/studioSession.js` (`setForSession` / `applySet` / `resetSet`) so projects keep it.
- The export steps every `useFrame` effect once per frame, so animation must use the frame clock, not wall time.

## Checking your work
- Light checks only: `node scripts/test-occasion-sets.mjs`, `node scripts/test-reel.mjs`, `node scripts/test-props.mjs`, and a syntax check with esbuild.
- The shell on the owner's laptop is Windows PowerShell 5.1 (no `&&`). On the VM it is bash.
- Several agents may work at once. Two agents must never edit the same files. Stay inside the files your task names.
