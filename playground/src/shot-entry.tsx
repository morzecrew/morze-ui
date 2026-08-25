/**
 * The still used in the README. Rendered at a fixed 1366×707 canvas and
 * captured with `npm run shot`, so the picture can be regenerated whenever the
 * look changes instead of being re-composed by hand.
 */
import React from 'react'
import { createRoot } from 'react-dom/client'

import '@morze/ui/styles.css'
import './shot.css'
import Shot from './Shot'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Shot />
  </React.StrictMode>
)
