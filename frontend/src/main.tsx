import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyFontScale, loadFontScale } from './lib/fontScale'

// Przed renderem, zeby strona nie mrugnela najpierw w domyslnym rozmiarze.
applyFontScale(loadFontScale())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
