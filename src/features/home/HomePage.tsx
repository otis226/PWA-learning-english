import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppServices } from '../../app/use-app-services'
import type { DashboardSnapshot } from '../../learning/dashboard/dashboard-service'

export function HomePage() {
  const { dashboard, settings, exportService, memory } = useAppServices()
  const [snap, setSnap] = useState<DashboardSnapshot | null>(null)
  const [memoryStrength, setMemoryStrength] = useState(0)
  const [backupReminder, setBackupReminder] = useState(false)

  const reload = useCallback(async () => {
    const [next, appSettings, memorySnapshot] = await Promise.all([dashboard.getSnapshot(), settings.get(), memory.getSnapshot()])
    setSnap(next)
    setMemoryStrength(memorySnapshot.averageStrength)
    setBackupReminder(exportService.shouldRemindBackup(appSettings))
  }, [dashboard, exportService, memory, settings])

  useEffect(() => { void reload() }, [reload])

  const dateLabel = useMemo(() => new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date()), [])
  const due = snap?.dueCount ?? 0
  const strength = Math.round(memoryStrength * 100)

  return (
    <div className="page app-screen home-page">
      <header className="screen-header">
        <div><p>{dateLabel}</p><h1>Today</h1></div>
        <Link to="/learn/new" className="screen-action" aria-label="Create lesson">＋</Link>
      </header>

      {backupReminder ? <div className="banner warning">Your learning changed. <Link to="/settings/data">Back up</Link>.</div> : null}

      <section className="daily-card">
        <div className="daily-copy">
          <span className="section-kicker">Daily plan</span>
          <h2>{due > 0 ? `${due} reviews are ready` : 'Keep the streak moving'}</h2>
          <p>{due > 0 ? 'Clear your due memory first, then choose one active skill.' : 'Pick one short skill session. Consistency matters more than volume.'}</p>
          <Link className="btn btn-primary app-primary-action" to={due > 0 ? '/review' : '/study'}>
            {due > 0 ? 'Start review' : 'Start practice'}
          </Link>
        </div>
        <div className="mini-progress" style={{ '--memory-progress': `${strength * 3.6}deg` } as React.CSSProperties}>
          <span><strong>{strength}%</strong><small>memory</small></span>
        </div>
      </section>

      <section className="app-section">
        <div className="app-section-title"><h2>Practice</h2><Link to="/study">See all</Link></div>
        <div className="practice-shortcuts">
          <Shortcut to="/study" glyph="Aa" title="Flashcards" />
          <Shortcut to="/study" glyph="?" title="Quiz" />
          <Shortcut to="/study" glyph="◉" title="Listening" />
          <Shortcut to="/study" glyph="◌" title="Speaking" />
          <Shortcut to="/study" glyph="¶" title="Reading" />
          <Shortcut to="/memory" glyph="∞" title="Memory" />
        </div>
      </section>

      <section className="app-section">
        <div className="app-section-title"><h2>Continue</h2><span>{snap?.recentPacks.length ?? 0} packs</span></div>
        {!snap?.recentPacks.length ? (
          <Link className="app-list-row empty-row" to="/learn/new">
            <span className="row-icon">＋</span>
            <span><strong>Create your first lesson</strong><small>Topic, text or vocabulary list</small></span>
            <span>›</span>
          </Link>
        ) : (
          <div className="app-list">
            {snap.recentPacks.slice(0, 4).map((pack) => (
              <Link className="app-list-row" key={pack.id} to={`/packs/${pack.id}`}>
                <span className="row-icon">Aa</span>
                <span><strong>{pack.title}</strong><small>{pack.conceptIds.length} concepts · {pack.exerciseIds.length} exercises</small></span>
                <span>›</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="app-section">
        <div className="app-section-title"><h2>Needs attention</h2><Link to="/memory">Memory</Link></div>
        {!snap?.weakConcepts.length ? (
          <div className="subtle-state">Weak concepts will appear after practice.</div>
        ) : (
          <div className="app-list">
            {snap.weakConcepts.slice(0, 5).map((concept) => (
              <div className="app-list-row" key={concept.id}>
                <span className="row-icon warning-dot">!</span>
                <span><strong>{concept.label}</strong><small>{concept.incorrectCount} misses · {concept.kind}</small></span>
                <span>{Math.round(concept.strength * 100)}%</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Shortcut(props: { to: string; glyph: string; title: string }) {
  return <Link className="practice-shortcut" to={props.to}><span>{props.glyph}</span><small>{props.title}</small></Link>
}
