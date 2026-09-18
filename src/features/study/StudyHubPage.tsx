import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppServices } from '../../app/use-app-services'
import type { ExerciseType, LearningPackRecord } from '../../db/schema/types'
import { toUserFacingError } from '../../learning/errors/user-facing-error'

const QUIZ_TYPES: ExerciseType[] = ['multiple_choice', 'cloze', 'true_false', 'short_answer']

export function StudyHubPage() {
  const { packs, practice } = useAppServices()
  const navigate = useNavigate()
  const [recentPacks, setRecentPacks] = useState<LearningPackRecord[]>([])
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void packs.listRecent(20).then(setRecentPacks)
  }, [packs])

  async function startMode(packId: string, mode: 'flashcards' | 'quiz') {
    const key = `${packId}-${mode}`
    setBusyKey(key)
    setError(null)
    try {
      const { session } = await practice.startPracticeSession(packId, {
        types: mode === 'flashcards' ? ['flashcard'] : QUIZ_TYPES,
      })
      void navigate(`/practice/${session.id}`)
    } catch (err) {
      setError(toUserFacingError(err).message)
      setBusyKey(null)
    }
  }

  return (
    <div className="page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Study studio</p>
          <h1>Choose the skill, keep one memory.</h1>
          <p className="lead">
            Flashcards and quizzes feed your concept memory. Listening, pronunciation and reading
            keep their own durable practice history on this device.
          </p>
        </div>
        <Link className="btn btn-primary" to="/learn/new">
          Create with AI
        </Link>
      </section>

      {error ? <div className="banner error">{error}</div> : null}

      <section className="mode-grid" aria-label="Study modes">
        <ModeIntro code="Aa" title="Flashcards" text="Active recall with Again / Hard / Good / Easy ratings." />
        <ModeIntro code="?" title="Quiz" text="MCQ, cloze, true/false and short-answer practice." />
        <ModeIntro code="耳" title="Listening" text="Hear English without seeing the text, then type what you heard." />
        <ModeIntro code="声" title="Pronunciation" text="Listen, repeat and compare browser speech recognition with the target." />
        <ModeIntro code="¶" title="Reading" text="Focused reading with read-aloud, pacing and completion history." />
        <ModeIntro code="∞" title="Long-term memory" text="FSRS reviews, weak concepts and skill history in one place." />
      </section>

      <section className="card stack">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Your material</p>
            <h2>Pick a learning pack</h2>
          </div>
          <Link to="/review" className="text-link">Due review</Link>
        </div>
        {recentPacks.length === 0 ? (
          <div className="empty-state">
            <strong>No learning packs yet.</strong>
            <span>Create one from a topic, article or vocabulary list using your AI provider.</span>
            <Link className="btn btn-primary" to="/learn/new">Create first pack</Link>
          </div>
        ) : (
          <div className="pack-grid">
            {recentPacks.map((pack) => (
              <article className="pack-card" key={pack.id}>
                <div>
                  <span className="badge">{pack.learningGoal}</span>
                  <h3>{pack.title}</h3>
                  <p className="muted">{pack.conceptIds.length} concepts · {pack.exerciseIds.length} exercises</p>
                </div>
                <div className="mode-actions">
                  <button className="study-action" type="button" disabled={busyKey !== null} onClick={() => void startMode(pack.id, 'flashcards')}>
                    <strong>Flashcards</strong><span>Recall</span>
                  </button>
                  <button className="study-action" type="button" disabled={busyKey !== null} onClick={() => void startMode(pack.id, 'quiz')}>
                    <strong>Quiz</strong><span>Test</span>
                  </button>
                  <Link className="study-action" to={`/study/listening?pack=${encodeURIComponent(pack.id)}`}>
                    <strong>Listening</strong><span>Dictation</span>
                  </Link>
                  <Link className="study-action" to={`/study/pronunciation?pack=${encodeURIComponent(pack.id)}`}>
                    <strong>Pronunciation</strong><span>Repeat</span>
                  </Link>
                  <Link className="study-action" to={`/study/reading?source=${encodeURIComponent(pack.sourceId)}`}>
                    <strong>Reading</strong><span>Focus</span>
                  </Link>
                </div>
                <Link className="text-link" to={`/packs/${pack.id}`}>Open pack details</Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function ModeIntro(props: { code: string; title: string; text: string }) {
  return (
    <article className="mode-card">
      <span className="mode-code" aria-hidden="true">{props.code}</span>
      <div><h2>{props.title}</h2><p>{props.text}</p></div>
    </article>
  )
}
