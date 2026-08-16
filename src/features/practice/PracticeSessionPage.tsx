import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAppServices } from '../../app/use-app-services'
import type { AttemptRecord, ExerciseRecord, StudySessionRecord } from '../../db/schema/types'
import { toUserFacingError } from '../../learning/errors/user-facing-error'
import type { FsrsRatingLabel } from '../../learning/review/fsrs-scheduler'

export function PracticeSessionPage() {
  const { sessionId = '' } = useParams()
  const { practice } = useAppServices()
  const [session, setSession] = useState<StudySessionRecord | null>(null)
  const [attempts, setAttempts] = useState<AttemptRecord[]>([])
  const [current, setCurrent] = useState<ExerciseRecord | null>(null)
  const [flipped, setFlipped] = useState(false)
  const [mcqIndex, setMcqIndex] = useState<number | null>(null)
  const [tfValue, setTfValue] = useState<boolean | null>(null)
  const [textAnswer, setTextAnswer] = useState('')
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean | null
    explanation: string
  } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [startedAt] = useState(() => Date.now())

  const reload = useCallback(async () => {
    const view = await practice.getSessionView(sessionId)
    if (!view) {
      setSession(null)
      return
    }
    setSession(view.session)
    setAttempts(view.attempts)
    setCurrent(view.currentExercise)
    setFlipped(false)
    setMcqIndex(null)
    setTfValue(null)
    setTextAnswer('')
    setFeedback(null)
  }, [practice, sessionId])

  useEffect(() => {
    void reload()
  }, [reload])

  const progressLabel = useMemo(() => {
    if (!session) return ''
    const total = session.exerciseIds.length
    const at = session.status === 'completed' ? total : session.currentIndex + 1
    return `${Math.min(at, total)} / ${total}`
  }, [session])

  async function submit(answer: unknown, selfRating?: FsrsRatingLabel) {
    if (!session || !current) return
    setBusy(true)
    setError(null)
    try {
      const result = await practice.submitAnswer({
        sessionId: session.id,
        exerciseId: current.id,
        answer,
        selfRating,
        responseTimeMs: Date.now() - startedAt,
        requestLearnerExplanation: true,
      })
      setFeedback({
        isCorrect: result.attempt.isCorrect,
        explanation: result.explanation,
      })
      setSession(result.session)
      setAttempts((prev) => [...prev, result.attempt])
      if (result.session.status === 'completed') {
        setCurrent(null)
      }
    } catch (err) {
      setError(toUserFacingError(err).message)
    } finally {
      setBusy(false)
    }
  }

  async function onContinue() {
    await reload()
  }

  if (!session) {
    return (
      <div className="page">
        <h1>Session not found</h1>
        <Link to="/">Home</Link>
      </div>
    )
  }

  if (session.status === 'completed' && !feedback) {
    return (
      <div className="page">
        <h1>Session complete</h1>
        <section className="card stack">
          <p>
            Correct: <strong>{session.correctCount}</strong> · Incorrect:{' '}
            <strong>{session.incorrectCount}</strong>
          </p>
          <p className="muted" style={{ margin: 0 }}>
            Attempts are saved on this device. Due reviews use FSRS scheduling.
          </p>
          <div className="row">
            <Link className="btn btn-primary" to="/review">
              Review due
            </Link>
            <Link className="btn btn-secondary" to="/">
              Dashboard
            </Link>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>{session.kind === 'review' ? 'Review' : 'Practice'}</h1>
        <span className="badge">{progressLabel}</span>
      </div>
      <div className="progress-track" aria-hidden>
        <div
          className="progress-fill"
          style={{
            width: `${session.exerciseIds.length ? (attempts.length / session.exerciseIds.length) * 100 : 0}%`,
          }}
        />
      </div>

      {error ? (
        <div className="banner error" role="alert">
          {error}
        </div>
      ) : null}

      {feedback ? (
        <section className="card stack">
          <div
            className={`banner ${feedback.isCorrect === false ? 'error' : feedback.isCorrect ? 'success' : 'info'}`}
          >
            {feedback.isCorrect === true
              ? 'Correct'
              : feedback.isCorrect === false
                ? 'Not quite'
                : 'Recorded'}
          </div>
          <h2>Explanation</h2>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{feedback.explanation}</p>
          <div className="row">
            {session.status === 'completed' ? (
              <>
                <Link className="btn btn-primary" to="/">
                  Dashboard
                </Link>
                <Link className="btn btn-secondary" to="/review">
                  Reviews
                </Link>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() => void onContinue()}
              >
                Next
              </button>
            )}
          </div>
        </section>
      ) : current ? (
        <ExercisePrompt
          exercise={current}
          flipped={flipped}
          setFlipped={setFlipped}
          mcqIndex={mcqIndex}
          setMcqIndex={setMcqIndex}
          tfValue={tfValue}
          setTfValue={setTfValue}
          textAnswer={textAnswer}
          setTextAnswer={setTextAnswer}
          busy={busy}
          onSubmit={(answer, rating) => void submit(answer, rating)}
        />
      ) : (
        <p className="muted">Loading…</p>
      )}
    </div>
  )
}

function ExercisePrompt(props: {
  exercise: ExerciseRecord
  flipped: boolean
  setFlipped: (v: boolean) => void
  mcqIndex: number | null
  setMcqIndex: (v: number | null) => void
  tfValue: boolean | null
  setTfValue: (v: boolean | null) => void
  textAnswer: string
  setTextAnswer: (v: string) => void
  busy: boolean
  onSubmit: (answer: unknown, selfRating?: FsrsRatingLabel) => void
}) {
  const { exercise } = props
  const payload = exercise.payload

  switch (payload.type) {
    case 'flashcard':
      return (
        <section className="card stack">
          <span className="badge">Flashcard</span>
          <p className="exercise-prompt">{props.flipped ? payload.back : payload.front}</p>
          {!props.flipped ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => props.setFlipped(true)}
              disabled={props.busy}
            >
              Show answer
            </button>
          ) : (
            <div className="row">
              {(['again', 'hard', 'good', 'easy'] as const).map((rating) => (
                <button
                  key={rating}
                  type="button"
                  className="btn btn-secondary"
                  disabled={props.busy}
                  onClick={() => props.onSubmit(payload.back, rating)}
                >
                  {rating}
                </button>
              ))}
            </div>
          )}
          <p className="muted" style={{ margin: 0 }}>
            Rate how well you recalled it (maps to FSRS).
          </p>
        </section>
      )
    case 'multiple_choice':
      return (
        <section className="card stack">
          <span className="badge">Multiple choice</span>
          <p className="exercise-prompt">{payload.question}</p>
          <div className="choice-grid">
            {payload.options.map((option, index) => (
              <label
                key={option}
                className={`choice-card ${props.mcqIndex === index ? 'active' : ''}`}
              >
                <input
                  type="radio"
                  name="mcq"
                  checked={props.mcqIndex === index}
                  onChange={() => props.setMcqIndex(index)}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={props.busy || props.mcqIndex === null}
            onClick={() => props.onSubmit(props.mcqIndex)}
          >
            Submit
          </button>
        </section>
      )
    case 'true_false':
      return (
        <section className="card stack">
          <span className="badge">True / false</span>
          <p className="exercise-prompt">{payload.statement}</p>
          <div className="row">
            <button
              type="button"
              className={`btn ${props.tfValue === true ? 'btn-primary' : 'btn-secondary'}`}
              disabled={props.busy}
              onClick={() => props.setTfValue(true)}
            >
              True
            </button>
            <button
              type="button"
              className={`btn ${props.tfValue === false ? 'btn-primary' : 'btn-secondary'}`}
              disabled={props.busy}
              onClick={() => props.setTfValue(false)}
            >
              False
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={props.busy || props.tfValue === null}
              onClick={() => props.onSubmit(props.tfValue)}
            >
              Submit
            </button>
          </div>
        </section>
      )
    case 'cloze':
      return (
        <section className="card stack">
          <span className="badge">Cloze</span>
          <p className="exercise-prompt">{payload.sentenceWithBlank}</p>
          <div className="field">
            <label htmlFor="cloze">Your answer</label>
            <input
              id="cloze"
              type="text"
              value={props.textAnswer}
              onChange={(e) => props.setTextAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && props.textAnswer.trim()) {
                  props.onSubmit(props.textAnswer)
                }
              }}
              autoComplete="off"
            />
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={props.busy || !props.textAnswer.trim()}
            onClick={() => props.onSubmit(props.textAnswer)}
          >
            Submit
          </button>
        </section>
      )
    case 'short_answer':
      return (
        <section className="card stack">
          <span className="badge">Short answer</span>
          <p className="exercise-prompt">{payload.prompt}</p>
          <div className="field">
            <label htmlFor="sa">Your answer</label>
            <textarea
              id="sa"
              rows={3}
              value={props.textAnswer}
              onChange={(e) => props.setTextAnswer(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={props.busy || !props.textAnswer.trim()}
            onClick={() => props.onSubmit(props.textAnswer)}
          >
            Submit
          </button>
        </section>
      )
    default: {
      const _exhaustive: never = payload
      return _exhaustive
    }
  }
}
