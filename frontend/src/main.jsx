import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { LanguageProvider } from './context/LanguageContext.jsx'
import { StateProvider } from './context/StateContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <StateProvider>
        <App />
      </StateProvider>
    </LanguageProvider>
  </StrictMode>,
)

