import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppServices } from '../../app/use-app-services'
import type { DueReviewItem } from '../../learning/review/review-service'
import { toUserFacingError } from '../../learning/errors/user-facing-error'

export function ReviewPage() {
  const { review } = useAppServices()
  const navigate = useNavigate()
  const [items, setItems] = useState<DueReviewItem[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const online = typeof navigator === 'undefined' ? true : navigator.onLine

  const reload = useCallback(async () => {
    const due = await review.listDue()
    setItems(due)
  }, [review])

  useEffect(() => {
    void reload()
  }, [reload])

  async function onStart() {
    setBusy(true)
    setError(null)
    try {
      const { session, skippedWithoutMaterial } = await review.startReviewSession()
      if (skippedWithoutMaterial > 0) {
        // Non-blocking note via error banner style info would need state; navigate with state
        void navigate(`/practice/${session.id}`, {
          state: { skippedWithoutMaterial },
        })
      } else {
        void navigate(`/practice/${session.id}`)
      }
    } catch (err) {
      setError(toUserFacingError(err).message)
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <h1>Due review</h1>
      <p className="lead">
        Scheduling is powered by FSRS on this device. Stored exercises work offline
        {online ? '' : ' (you are offline now)'}.
      </p>

      {error ? (
        <div className="banner error" role="alert">
          {error}
        </div>
      ) : null}

      <section className="card stack">
        <h2>
          {items.length} due concept{items.length === 1 ? '' : 's'}
        </h2>
        {items.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Nothing due. Practice a pack to build your review queue.
          </p>
        ) : (
          <ul className="entity-list">
            {items.map((item) => (
              <li key={item.card.id} className="entity-item">
                <div>
                  <strong>{item.concept.canonicalLabel}</strong>
                  <div className="muted">
                    due {new Date(item.card.fsrs.due).toLocaleString()} ·{' '}
                    {item.exercise ? 'stored exercise ready' : 'no stored exercise yet'}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="row">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || items.length === 0}
            onClick={() => void onStart()}
          >
            {busy ? 'Starting…' : 'Start review session'}
          </button>
          <Link className="btn btn-secondary" to="/">
            Dashboard
          </Link>
        </div>
      </section>
    </div>
  )
}
