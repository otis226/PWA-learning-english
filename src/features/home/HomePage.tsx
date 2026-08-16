import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppServices } from '../../app/use-app-services'
import type { DashboardSnapshot } from '../../learning/dashboard/dashboard-service'

export function HomePage() {
  const { dashboard, settings, exportService } = useAppServices()
  const [snap, setSnap] = useState<DashboardSnapshot | null>(null)
  const [backupReminder, setBackupReminder] = useState(false)

  const reload = useCallback(async () => {
    const [next, appSettings] = await Promise.all([
      dashboard.getSnapshot(),
      settings.get(),
    ])
    setSnap(next)
    setBackupReminder(exportService.shouldRemindBackup(appSettings))
  }, [dashboard, exportService, settings])

  useEffect(() => {
    void reload()
  }, [reload])

  return (
    <div className="page">
      <h1>Turn anything into something you can learn</h1>
      <p className="lead">
        Local-first English practice: analyze material, practice mixed exercises, remember mistakes,
        and review with FSRS — all on this device.
      </p>

      {backupReminder ? (
        <div className="banner warning">
          You have new learning data since your last export.{' '}
          <Link to="/settings/data">Back up your data</Link>.
        </div>
      ) : null}

      <section className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>Today</h2>
          <div className="row">
            <Link className="btn btn-primary" to="/learn/new">
              New material
            </Link>
            <Link className="btn btn-secondary" to="/review">
              Reviews ({snap?.dueCount ?? '…'})
            </Link>
          </div>
        </div>
        <div className="status-grid">
          <div className="status-item">
            <strong>Due reviews</strong>
            <span className="muted">{snap?.dueCount ?? '…'}</span>
          </div>
          <div className="status-item">
            <strong>Recent packs</strong>
            <span className="muted">{snap?.recentPacks.length ?? '…'}</span>
          </div>
          <div className="status-item">
            <strong>Weak concepts</strong>
            <span className="muted">{snap?.weakConcepts.length ?? '…'}</span>
          </div>
        </div>
      </section>

      <section className="card stack">
        <h2>Continue recent pack</h2>
        {!snap || snap.recentPacks.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No packs yet. Paste text or a topic to create your first learning pack.
          </p>
        ) : (
          <ul className="entity-list">
            {snap.recentPacks.map((pack) => (
              <li key={pack.id} className="entity-item">
                <div>
                  <strong>{pack.title}</strong>
                  <div className="muted">
                    {pack.learningGoal} · {pack.status} · {pack.exerciseIds.length} exercises
                  </div>
                </div>
                <Link className="btn btn-secondary" to={`/packs/${pack.id}`}>
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card stack">
        <h2>Weak concepts</h2>
        {!snap || snap.weakConcepts.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Mistakes will appear here as concept-level weakness.
          </p>
        ) : (
          <ul className="list-plain">
            {snap.weakConcepts.map((c) => (
              <li key={c.id}>
                <strong>{c.label}</strong> · {c.kind} · strength {(c.strength * 100).toFixed(0)}% ·{' '}
                {c.incorrectCount} misses
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card stack">
        <h2>Recent activity</h2>
        {!snap || snap.recentActivity.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Practice sessions and attempts will show up here.
          </p>
        ) : (
          <ul className="list-plain">
            {snap.recentActivity.map((item) => (
              <li key={`${item.kind}-${item.id}`}>
                {item.label}{' '}
                <span className="muted">· {new Date(item.at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card stack">
        <h2>Setup</h2>
        <div className="row">
          <Link className="btn btn-secondary" to="/settings/ai">
            AI provider
          </Link>
          <Link className="btn btn-secondary" to="/settings/data">
            Data &amp; storage
          </Link>
        </div>
      </section>
    </div>
  )
}
