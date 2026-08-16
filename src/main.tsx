import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './app/App'
import { AppServicesProvider } from './app/services-context'
import { createDefaultAppServices } from './app/create-services'
import './app/styles.css'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element #root not found')
}

const services = createDefaultAppServices()

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <AppServicesProvider services={services}>
        <App />
      </AppServicesProvider>
    </BrowserRouter>
  </StrictMode>,
)
