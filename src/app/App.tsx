import { NavLink, Route, Routes } from 'react-router-dom'
import { HomePage } from '../features/home/HomePage'
import { AiSettingsPage } from '../features/settings/AiSettingsPage'
import { DataSettingsPage } from '../features/settings/DataSettingsPage'
import { PwaUpdateBanner } from './pwa-update-banner'

export function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <strong>PWA Learning English</strong>
          <span>Local-first foundation (M0)</span>
        </div>
        <nav className="nav-links" aria-label="Primary">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/settings/ai">AI Provider</NavLink>
          <NavLink to="/settings/data">Data &amp; Storage</NavLink>
        </nav>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/settings/ai" element={<AiSettingsPage />} />
          <Route path="/settings/data" element={<DataSettingsPage />} />
        </Routes>
      </main>
      <PwaUpdateBanner />
    </div>
  )
}
