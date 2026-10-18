import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App'
import { AppProvider } from './state'
import { AuthProvider } from './auth/AuthProvider'
import { AuthGate } from './auth/AuthGate'
import { ThemeProvider } from './theme'

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
    <HashRouter>
      <AuthProvider>
        <AuthGate>
          <AppProvider>
            <App />
          </AppProvider>
        </AuthGate>
      </AuthProvider>
    </HashRouter>
    </ThemeProvider>
  </StrictMode>,
)
