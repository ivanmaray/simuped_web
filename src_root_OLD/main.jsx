// src/main.jsx
import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import MainRouter from './MainRouter.jsx'
import { AuthProvider } from './auth.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <MainRouter />
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>
);