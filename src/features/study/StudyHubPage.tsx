import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppServices } from '../../app/use-app-services'
import type { ExerciseType, LearningPackRecord } from '../../db/schema/types'
import { toUserFacingError } from '../../learning/errors/user-facing-error'

const QUIZ_TYPES: ExerciseType[] = ['multiple_choice', 'cloze', 'true_false', 'short_answer']

export function StudyHubPage() {
  const { packs, practice } = useAppServices()
  const navigate = useNavigate()
  const [recentPacks, setRecentPacks] = useState<LearningPackRecord[]>([])
  const [selectedPackId, setSelectedPackId] = useState('')
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void packs.listRecent(20).then((rows) => {
      setRecentPacks(rows)
      setSelectedPackId((current) => current || rows[0]?.id || '')
    })
  }, [packs])

  const selectedPack = useMemo(
    () => recentPacks.find((pack) => pack.id === selectedPackId) ?? null,
    [recentPacks, selectedPackId],
  )

  async function startMode(mode: 'flashcards' | 'quiz') {
    if (!selectedPack) return
    const key = `${selectedPack.id}-${mode}`
    setBusyKey(key)
    setError(null)
    try {
      const { session } = await practice.startPracticeSession(selectedPack.id, {
        types: mode === 'flashcards' ? ['flashcard'] : QUIZ_TYPES,
      })
      void navigate(`/practice/${session.id}`)
    } catch (err) {
      setError(toUserFacingError(err).message)
      setBusyKey(null)
    }
  }

  return (
    <div className="page app-screen study-screen">
      <header className="screen-header">
        <div><p>Choose a skill</p><h1>Study</h1></div>
        <Link to="/learn/new" className="screen-action" aria-label="Create lesson">＋</Link>
      </header>

      {error ? <div className="banner error">{error}</div> : null}

      {recentPacks.length === 0 ? (
        <div className="app-empty-screen">
          <span className="empty-illustration">Aa</span>
          <h2>No learning pack yet</h2>
          <p>Create one from a topic, article or vocabulary list.</p>
          <Link className="btn btn-primary" to="/learn/new">Create lesson</Link>
        </div>
      ) : (
        <>
          <section className="pack-picker">
            <label htmlFor="study-pack">Learning pack</label>
            <select id="study-pack" value={selectedPackId} onChange={(event) => setSelectedPackId(event.target.value)}>
              {recentPacks.map((pack) => <option key={pack.id} value={pack.id}>{pack.title}</option>)}
            </select>
            {selectedPack ? <small>{selectedPack.conceptIds.length} concepts · {selectedPack.exerciseIds.length} exercises</small> : null}
          </section>

          {selectedPack ? (
            <section className="study-mode-list" aria-label="Study modes">
              <button type="button" disabled={busyKey !== null} onClick={() => void startMode('flashcards')}>
                <span className="study-mode-icon">Aa</span><span><strong>Flashcards</strong><small>Recall first, then rate memory</small></span><span>›</span>
              </button>
              <button type="button" disabled={busyKey !== null} onClick={() => void startMode('quiz')}>
                <span className="study-mode-icon">?</span><span><strong>Quiz</strong><small>MCQ, cloze and short answer</small></span><span>›</span>
              </button>
              <Link to={`/study/listening?pack=${encodeURIComponent(selectedPack.id)}`}>
                <span className="study-mode-icon">◉</span><span><strong>Listening</strong><small>Hear, type and compare</small></span><span>›</span>
              </Link>
              <Link to={`/study/pronunciation?pack=${encodeURIComponent(selectedPack.id)}`}>
                <span className="study-mode-icon">◌</span><span><strong>Pronunciation</strong><small>Hear, repeat and shadow</small></span><span>›</span>
              </Link>
              <Link to={`/study/reading?source=${encodeURIComponent(selectedPack.sourceId)}`}>
                <span className="study-mode-icon">¶</span><span><strong>Reading</strong><small>Focused reading with audio</small></span><span>›</span>
              </Link>
              <Link to="/review">
                <span className="study-mode-icon">∞</span><span><strong>Long-term review</strong><small>FSRS scheduled memory</small></span><span>›</span>
              </Link>
            </section>
          ) : null}

          {selectedPack ? <Link className="pack-detail-link" to={`/packs/${selectedPack.id}`}>Pack details</Link> : null}
        </>
      )}
    </div>
  )
}
