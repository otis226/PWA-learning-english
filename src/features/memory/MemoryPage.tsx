import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppServices } from '../../app/use-app-services'
import type { MemorySnapshot } from '../../learning/memory/memory-service'

export function MemoryPage() {
  const { memory, review } = useAppServices()
  const [snapshot, setSnapshot] = useState<MemorySnapshot | null>(null)
  const [dueCount, setDueCount] = useState(0)

  const reload = useCallback(async () => {
    const [next, due] = await Promise.all([memory.getSnapshot(), review.countDue()])
    setSnapshot(next)
    setDueCount(due)
  }, [memory, review])

  useEffect(() => { void reload() }, [reload])

  const average = Math.round((snapshot?.averageStrength ?? 0) * 100)

  return (
    <div className="page app-screen memory-screen">
      <header className="screen-header">
        <div><p>Long-term progress</p><h1>Memory</h1></div>
        <Link to="/review" className="screen-action" aria-label="Start review">↻</Link>
      </header>

      <section className="memory-hero-compact">
        <div className="memory-score"><strong>{average}%</strong><span>strength</span></div>
        <div className="memory-summary-grid">
          <div><strong>{dueCount}</strong><span>due</span></div>
          <div><strong>{snapshot?.strongCount ?? 0}</strong><span>strong</span></div>
          <div><strong>{snapshot?.weakCount ?? 0}</strong><span>weak</span></div>
        </div>
      </section>

      <section className="app-section memory-action-section">
        <div className="app-section-title"><h2>Needs attention</h2><Link to="/review">Review now</Link></div>
        {snapshot?.weakest.length ? (
          <div className="app-list">
            {snapshot.weakest.slice(0, 4).map((item) => (
              <div className="app-list-row" key={item.id}>
                <span className="row-icon memory-low">!</span>
                <span><strong>{item.label}</strong><small>Needs another pass</small></span>
                <span>{Math.round(item.strength * 100)}%</span>
              </div>
            ))}
          </div>
        ) : <div className="subtle-state">Weak concepts will appear after practice.</div>}
      </section>

      <section className="app-section">
        <div className="app-section-title"><h2>Recent skills</h2><span>last sessions</span></div>
        <div className="skill-pill-row">
          <span aria-label="Listening attempts"><strong>{snapshot?.skillCounts.listening ?? 0}</strong> Listening</span>
          <span aria-label="Pronunciation attempts"><strong>{snapshot?.skillCounts.pronunciation ?? 0}</strong> Speaking</span>
          <span aria-label="Reading attempts"><strong>{snapshot?.skillCounts.reading ?? 0}</strong> Reading</span>
        </div>
        {snapshot?.recentSkillAttempts.length ? (
          <div className="app-list compact-history">
            {snapshot.recentSkillAttempts.slice(0, 5).map((item) => (
              <div className="app-list-row" key={item.id}>
                <span className="row-icon">{skillGlyph(item.mode)}</span>
                <span><strong>{item.targetText.slice(0, 44)}{item.targetText.length > 44 ? '…' : ''}</strong><small>{item.mode}</small></span>
                <span>{item.score == null ? '✓' : `${Math.round(item.score)}%`}</span>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  )
}

function skillGlyph(mode: 'pronunciation' | 'listening' | 'reading') {
  if (mode === 'listening') return '◉'
  if (mode === 'pronunciation') return '◌'
  return '¶'
}
