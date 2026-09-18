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
    setSnapshot(next); setDueCount(due)
  }, [memory, review])
  useEffect(() => { void reload() }, [reload])

  return (
    <div className="page">
      <section className="page-heading"><div><p className="eyebrow">Long-term memory</p><h1>Your learning should survive the chat.</h1><p className="lead">FSRS schedules concepts. Mastery summarizes performance. Listening, pronunciation and reading attempts stay as durable skill history.</p></div><Link className="btn btn-primary" to="/review">Review {dueCount ? `(${dueCount})` : ''}</Link></section>
      <section className="memory-stats">
        <MemoryStat label="Concepts" value={snapshot?.conceptCount ?? 0} detail="learned targets" />
        <MemoryStat label="Strong" value={snapshot?.strongCount ?? 0} detail="≥ 75% strength" />
        <MemoryStat label="Weak" value={snapshot?.weakCount ?? 0} detail="needs attention" />
        <MemoryStat label="Average" value={`${Math.round((snapshot?.averageStrength ?? 0) * 100)}%`} detail="mastery strength" />
      </section>
      <section className="two-column">
        <article className="card stack"><div className="section-heading"><div><p className="eyebrow">Needs work</p><h2>Weakest concepts</h2></div></div>{snapshot?.weakest.length ? <div className="memory-list">{snapshot.weakest.map((item) => <div key={item.id}><strong>{item.label}</strong><span>{Math.round(item.strength * 100)}%</span></div>)}</div> : <p className="muted">Practice a pack to build mastery data.</p>}</article>
        <article className="card stack"><div className="section-heading"><div><p className="eyebrow">Growing</p><h2>Strongest concepts</h2></div></div>{snapshot?.strongest.length ? <div className="memory-list">{snapshot.strongest.map((item) => <div key={item.id}><strong>{item.label}</strong><span>{Math.round(item.strength * 100)}%</span></div>)}</div> : <p className="muted">Your strongest concepts will appear here.</p>}</article>
      </section>
      <section className="card stack"><div className="section-heading"><div><p className="eyebrow">Skill history</p><h2>Practice beyond quizzes</h2></div><span className="muted">Recent 40 attempts</span></div><div className="skill-counts"><span aria-label="Listening attempts"><strong>{snapshot?.skillCounts.listening ?? 0}</strong> listening</span><span aria-label="Pronunciation attempts"><strong>{snapshot?.skillCounts.pronunciation ?? 0}</strong> pronunciation</span><span aria-label="Reading attempts"><strong>{snapshot?.skillCounts.reading ?? 0}</strong> reading</span></div>{snapshot?.recentSkillAttempts.length ? <ul className="timeline-list">{snapshot.recentSkillAttempts.slice(0, 12).map((item) => <li key={item.id}><div><strong>{item.mode}</strong><span>{item.targetText.slice(0, 90)}{item.targetText.length > 90 ? '…' : ''}</span></div><span>{item.score == null ? 'completed' : `${Math.round(item.score)}%`} · {new Date(item.createdAt).toLocaleDateString()}</span></li>)}</ul> : <p className="muted">Listening, pronunciation and reading sessions will show up here.</p>}</section>
    </div>
  )
}

function MemoryStat(props: { label: string; value: number | string; detail: string }) {
  return <article className="memory-stat"><span>{props.label}</span><strong>{props.value}</strong><small>{props.detail}</small></article>
}
