// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import MainRouter from './MainRouter.jsx'
import { AuthProvider } from './auth.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <MainRouter />
    </AuthProvider>
  </StrictMode>
)