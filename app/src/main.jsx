import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
// Creator UI shell (Agent #2 · UI only). Mounted here — beside the engine,
// never inside it — so App.jsx / StudioCanvas stay untouched: the shell is a
// pointer-transparent fixed overlay and adds no prop, no state and no style
// contract to the Studio Engine.
import StudioShell from './ui/StudioShell.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <StudioShell />
  </StrictMode>,
)
