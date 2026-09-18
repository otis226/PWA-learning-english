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

  return (
    <div className="page home-page">
      {backupReminder ? <div className="banner warning">Your learning memory changed since the last export. <Link to="/settings/data">Back up now</Link>.</div> : null}

      <section className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow">{dateLabel}</p>
          <h1>Build English that stays with you.</h1>
          <p>Practice recall, listening, pronunciation and reading from the same local learning memory. AI creates material; the app remembers the learning.</p>
          <div className="row"><Link className="btn btn-primary btn-large" to={due > 0 ? '/review' : '/study'}>{due > 0 ? `Review ${due} due` : 'Start studying'}</Link><Link className="btn btn-secondary btn-large" to="/learn/new">Create with AI</Link></div>
        </div>
        <div className="memory-orbit" aria-label={`Average memory strength ${Math.round(memoryStrength * 100)} percent`}>
          <div className="memory-ring" style={{ '--memory-progress': `${Math.round(memoryStrength * 100) * 3.6}deg` } as React.CSSProperties}>
            <span><strong>{Math.round(memoryStrength * 100)}%</strong><small>memory strength</small></span>
          </div>
          <div className="hero-stats"><span><strong>{due}</strong> due</span><span><strong>{snap?.weakConcepts.length ?? 0}</strong> weak</span><span><strong>{snap?.recentPacks.length ?? 0}</strong> recent packs</span></div>
        </div>
      </section>

      <section>
        <div className="section-heading"><div><p className="eyebrow">Daily mix</p><h2>One app, multiple ways to remember</h2></div><Link className="text-link" to="/study">All study modes</Link></div>
        <div className="quick-mode-grid">
          <QuickMode to="/review" code="∞" title="Long-term review" detail={`${due} concepts due`} accent="mint" />
          <QuickMode to="/study" code="Aa" title="Flashcards & quiz" detail="Recall before recognition" accent="violet" />
          <QuickMode to="/study" code="耳" title="Listening" detail="Hear, type, compare" accent="amber" />
          <QuickMode to="/study" code="声" title="Pronunciation" detail="Hear, repeat, shadow" accent="blue" />
          <QuickMode to="/study" code="¶" title="Reading room" detail="Read with optional audio" accent="rose" />
          <QuickMode to="/learn/new" code="AI" title="Generate a lesson" detail="Bring your own API" accent="slate" />
        </div>
      </section>

      <section className="two-column home-columns">
        <article className="card stack">
          <div className="section-heading"><div><p className="eyebrow">Continue</p><h2>Recent learning packs</h2></div></div>
          {!snap?.recentPacks.length ? <div className="empty-state compact"><span>Your first pack can start from a topic, paragraph or word list.</span><Link className="text-link" to="/learn/new">Create material</Link></div> : <ul className="entity-list modern-list">{snap.recentPacks.slice(0, 4).map((pack) => <li key={pack.id}><div><span className="badge">{pack.learningGoal}</span><strong>{pack.title}</strong><small>{pack.conceptIds.length} concepts · {pack.exerciseIds.length} exercises</small></div><Link className="text-link" to={`/packs/${pack.id}`}>Open</Link></li>)}</ul>}
        </article>
        <article className="card stack">
          <div className="section-heading"><div><p className="eyebrow">Attention</p><h2>Weak concepts</h2></div><Link className="text-link" to="/memory">Memory center</Link></div>
          {!snap?.weakConcepts.length ? <p className="muted">Mistakes and weak concepts will appear here as you practice.</p> : <div className="weak-list">{snap.weakConcepts.slice(0, 6).map((concept) => <div key={concept.id}><div><strong>{concept.label}</strong><small>{concept.kind} · {concept.incorrectCount} misses</small></div><span>{Math.round(concept.strength * 100)}%</span></div>)}</div>}
        </article>
      </section>
    </div>
  )
}

function QuickMode(props: { to: string; code: string; title: string; detail: string; accent: string }) {
  return <Link className={`quick-mode accent-${props.accent}`} to={props.to}><span className="mode-code">{props.code}</span><div><strong>{props.title}</strong><small>{props.detail}</small></div><span className="arrow">→</span></Link>
}
