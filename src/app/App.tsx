import { NavLink, Route, Routes } from 'react-router-dom'
import { HomePage } from '../features/home/HomePage'
import { NewSourcePage } from '../features/learn/NewSourcePage'
import { PackDetailPage } from '../features/packs/PackDetailPage'
import { PracticeSessionPage } from '../features/practice/PracticeSessionPage'
import { ReviewPage } from '../features/review/ReviewPage'
import { AiSettingsPage } from '../features/settings/AiSettingsPage'
import { DataSettingsPage } from '../features/settings/DataSettingsPage'
import { PwaUpdateBanner } from './pwa-update-banner'

export function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <strong>PWA Learning English</strong>
          <span>Local-first study loop</span>
        </div>
        <nav className="nav-links" aria-label="Primary">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/learn/new">Learn</NavLink>
          <NavLink to="/review">Review</NavLink>
          <NavLink to="/settings/ai">AI Provider</NavLink>
          <NavLink to="/settings/data">Data &amp; Storage</NavLink>
        </nav>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/learn/new" element={<NewSourcePage />} />
          <Route path="/packs/:packId" element={<PackDetailPage />} />
          <Route path="/practice/:sessionId" element={<PracticeSessionPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/settings/ai" element={<AiSettingsPage />} />
          <Route path="/settings/data" element={<DataSettingsPage />} />
        </Routes>
      </main>
      <PwaUpdateBanner />
    </div>
  )
}
