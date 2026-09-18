import { lazy, Suspense } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { PwaUpdateBanner } from './pwa-update-banner'

const HomePage = lazy(() => import('../features/home/HomePage').then((module) => ({ default: module.HomePage })))
const NewSourcePage = lazy(() => import('../features/learn/NewSourcePage').then((module) => ({ default: module.NewSourcePage })))
const MemoryPage = lazy(() => import('../features/memory/MemoryPage').then((module) => ({ default: module.MemoryPage })))
const PackDetailPage = lazy(() => import('../features/packs/PackDetailPage').then((module) => ({ default: module.PackDetailPage })))
const PracticeSessionPage = lazy(() => import('../features/practice/PracticeSessionPage').then((module) => ({ default: module.PracticeSessionPage })))
const ReviewPage = lazy(() => import('../features/review/ReviewPage').then((module) => ({ default: module.ReviewPage })))
const AiSettingsPage = lazy(() => import('../features/settings/AiSettingsPage').then((module) => ({ default: module.AiSettingsPage })))
const DataSettingsPage = lazy(() => import('../features/settings/DataSettingsPage').then((module) => ({ default: module.DataSettingsPage })))
const ListeningPage = lazy(() => import('../features/study/ListeningPage').then((module) => ({ default: module.ListeningPage })))
const PronunciationPage = lazy(() => import('../features/study/PronunciationPage').then((module) => ({ default: module.PronunciationPage })))
const ReadingPage = lazy(() => import('../features/study/ReadingPage').then((module) => ({ default: module.ReadingPage })))
const StudyHubPage = lazy(() => import('../features/study/StudyHubPage').then((module) => ({ default: module.StudyHubPage })))

const primaryItems = [
  { to: '/', label: 'Today', glyph: '⌂', end: true },
  { to: '/study', label: 'Study', glyph: 'Aa' },
  { to: '/learn/new', label: 'Create', glyph: '+' },
  { to: '/memory', label: 'Memory', glyph: '∞' },
] as const

export function App() {
  return (
    <div className="app-shell">
      <header className="app-topbar">
        <NavLink to="/" className="app-identity" aria-label="English Learning Studio home">
          <span className="app-logo">E</span>
          <span>English</span>
        </NavLink>
        <div className="app-top-actions">
          <NavLink to="/review" className="icon-button" aria-label="Review due cards">↻</NavLink>
          <NavLink to="/settings/ai" className="icon-button" aria-label="Settings">⚙</NavLink>
        </div>
      </header>

      <main className="app-main">
        <Suspense fallback={<div className="route-loading" role="status">Loading…</div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/study" element={<StudyHubPage />} />
            <Route path="/study/listening" element={<ListeningPage />} />
            <Route path="/study/pronunciation" element={<PronunciationPage />} />
            <Route path="/study/reading" element={<ReadingPage />} />
            <Route path="/learn/new" element={<NewSourcePage />} />
            <Route path="/memory" element={<MemoryPage />} />
            <Route path="/packs/:packId" element={<PackDetailPage />} />
            <Route path="/practice/:sessionId" element={<PracticeSessionPage />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/settings/ai" element={<AiSettingsPage />} />
            <Route path="/settings/data" element={<DataSettingsPage />} />
          </Routes>
        </Suspense>
      </main>

      <nav className="mobile-nav app-tabbar" aria-label="Primary">
        {primaryItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={'end' in item ? item.end : false}>
            <span>{item.glyph}</span>
            <small>{item.label}</small>
          </NavLink>
        ))}
      </nav>
      <PwaUpdateBanner />
    </div>
  )
}
