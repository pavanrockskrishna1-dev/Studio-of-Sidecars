# Next session — start here

A short brief for a fresh Claude Code session (for example in VS Code). Read this
first; `HANDOFF.md` is the long history (3,000+ lines) and only needs reading for
the area you are changing.

## The app

- React 19 + Vite + three.js 0.170 + @react-three/fiber v9 + drei, all in `app/src`.
- Run it: `cd app`, `npm run dev`, open http://localhost:5173.
- State lives in small module stores (`subscribe` / `getSnapshot`, read with
  `useSyncExternalStore`). Follow that pattern for anything new.
- The stage is `components/StudioCanvas.jsx`. The side sheets are in `ui/`
  (`SheetContents.jsx`, `InspectorRail.jsx`).

## The owner's rules (important)

1. **Do not export videos or run heavy renders/tests.** It makes the laptop slow
   and the app freeze. Build features and let the owner try them in the app.
   Exporting is the very last step, and the owner does it.
2. **Do not use the existing HDRIs** for the Halloween / night look. The night stage
   (`fx/NightStage.jsx`, `fx/stageLook.js`) has its own sky, ground and lights.
3. **Moving, rotating and repositioning GLBs in the studio is a must-have.** Never
   remove or hide it.
4. **Leave the deleted files and models in `git status` alone.** About 70 old files
   show as deleted; the owner chose not to commit or restore them. Stage only the
   files you changed (`git add -- <paths>`), never `git add -A`.
5. Commit only when the owner says the feature works. Never push unless asked.
6. Explain things in plain, simple steps; the owner is not a developer.

## Windows notes

- The shell is Windows PowerShell 5.1: no `&&`; use `;` or `if ($?) { }`.
- Commit messages: write the message to a file, then `git commit -F <file>`.
  Here-strings piped into `git commit -F -` fail.
- End commit messages with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Quick syntax check of a file without starting the app:
  `node -e "require('esbuild').buildSync({entryPoints:['src/x.jsx'],write:false,loader:{'.jsx':'jsx'},jsx:'automatic'})"` from `app`.

## What was built recently (newest first, all committed on `main`)

| Commit | Feature | Main files |
|---|---|---|
| `9edd638` | 8 more scene effects: Grill smoke, Spark fountain, Fireflies, Ghost lights, Snowfall, Rain, Confetti, Magic dust (12 types, up to 20 placed). Particles have their own colour, fade and size. | `fx/EffectsLayer.jsx`, `fx/effectsStore.js` |
| `b789f7c` | Named projects: save the whole set (session + occasion, stage look, Look, effects) with a thumbnail; open, rename, delete, save as new. | `session/projects.js`, `session/studioSession.js`, `ui/ProjectsPanel.jsx` (in the Save sheet) |
| `ef54d2c` | Focus blur in the Look, and 3D effects placed in the scene (Garage → Effects: click one, click the ground). | `fx/exportLook.js`, `fx/lookStore.js`, `ui/LookPanel.jsx` |
| `4815e97` | Occasion packs, the Halloween Night set (one button builds it), Look engine (live view matches export), smooth mode for slow laptops, set builder (prop shelf, click-to-place, auto-size, duplicate, snap to ground, 30 props), camera director (camera keys per Reel shot). | `animation/halloweenSet.js`, `ui/OccasionSheet.jsx`, `ui/CameraDirector.jsx`, `garage/placeMode.js`, `ui/InspectorRail.jsx` |

How the pieces connect:
- The Garage sheet (`GaragePanel` in `ui/InspectorRail.jsx`) holds the prop shelf
  (`GaragePropShelf`), the effects shelf (`GarageEffectsShelf`) and the object
  move / rotate / size controls.
- Placing works through `garage/placeMode.js`: the shelf starts placing, and the
  click handler in `StudioCanvas.jsx` adds a prop (`addObject`) or an effect
  (`effectsStore.addEffect`) where the ground was clicked.
- New effect types: add an entry in `EFFECT_TYPES` (`fx/effectsStore.js`) and a
  matching kind in `KINDS` (`fx/EffectsLayer.jsx`); the shelf lists them on its own.
- Anything new that belongs to a "set" must be saved in `setForSession` /
  `applySet` / `resetSet` in `session/studioSession.js`, so projects keep it.
- The export steps every `useFrame` effect once per frame, so animated things
  must be driven by the frame clock (as `EffectsLayer.jsx` does), not wall time.

## Feature queue (owner picks the order)

1. **Lock props**: a lock toggle per placed prop so it can't be moved or deleted
   by accident (Garage objects list in `ui/InspectorRail.jsx`; the click and
   gizmo handling in `StudioCanvas.jsx`). Save the lock in projects.
2. **Thumbnails on the prop shelf**: a small picture on each prop button instead
   of text only (`GaragePropShelf`; props are listed in `products/props.js`).
3. **Occasion sets for other occasions**: one-button sets like Halloween Night
   (`animation/halloweenSet.js` is the model to copy; `ui/OccasionSheet.jsx`).

## Working with more than one agent

Several sessions can run at once, but two sessions must never edit the same files
at the same time. Features 1 and 2 both touch `ui/InspectorRail.jsx`, so run them
one after the other, or give each its own git worktree / branch. Feature 3 is
mostly separate files and can run alongside one of them.
