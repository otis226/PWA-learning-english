import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAppServices } from '../../app/use-app-services'
import type {
  ConceptOccurrenceRecord,
  ConceptRecord,
  ExerciseRecord,
  LearningPackRecord,
  SourceRecord,
} from '../../db/schema/types'
import { toUserFacingError } from '../../learning/errors/user-facing-error'

export function PackDetailPage() {
  const { packId = '' } = useParams()
  const navigate = useNavigate()
  const { analyzeSource, generateExercises, practice, exercises } = useAppServices()
  const [pack, setPack] = useState<LearningPackRecord | null>(null)
  const [source, setSource] = useState<SourceRecord | null>(null)
  const [concepts, setConcepts] = useState<ConceptRecord[]>([])
  const [occurrences, setOccurrences] = useState<ConceptOccurrenceRecord[]>([])
  const [exerciseList, setExerciseList] = useState<ExerciseRecord[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const detail = await analyzeSource.getPackDetail(packId)
    if (!detail) {
      setPack(null)
      return
    }
    setPack(detail.pack)
    setSource(detail.source)
    setConcepts(detail.concepts)
    setOccurrences(detail.occurrences)
    const ex = await exercises.listByPack(packId)
    setExerciseList(ex)
  }, [analyzeSource, exercises, packId])

  useEffect(() => {
    void reload()
  }, [reload])

  async function onRemoveConcept(conceptId: string) {
    setBusy(true)
    setError(null)
    try {
      await analyzeSource.removeConceptFromPack(packId, conceptId)
      await reload()
      setMessage('Concept removed from this pack draft.')
    } catch (err) {
      setError(toUserFacingError(err).message)
    } finally {
      setBusy(false)
    }
  }

  async function onGenerate() {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const result = await generateExercises.generateForPack(packId)
      await reload()
      setMessage(
        `Generated ${result.exercises.length} exercises` +
          (result.rejectedCount ? ` (${result.rejectedCount} rejected by validation)` : '') +
          '.',
      )
    } catch (err) {
      setError(toUserFacingError(err).message)
    } finally {
      setBusy(false)
    }
  }

  async function onPractice() {
    setBusy(true)
    setError(null)
    try {
      const { session } = await practice.startPracticeSession(packId)
      void navigate(`/practice/${session.id}`)
    } catch (err) {
      setError(toUserFacingError(err).message)
      setBusy(false)
    }
  }

  if (!pack || !source) {
    return (
      <div className="page">
        <h1>Pack not found</h1>
        <Link to="/">Back home</Link>
      </div>
    )
  }

  const canEditConcepts = pack.exerciseIds.length === 0

  return (
    <div className="page">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0 }}>{pack.title}</h1>
          <p className="muted" style={{ margin: '0.35rem 0 0' }}>
            Goal: {pack.learningGoal}
            {pack.estimatedCefr ? ` · CEFR ${pack.estimatedCefr}` : ''} · status {pack.status}
          </p>
        </div>
        <Link className="btn btn-secondary" to="/">
          Home
        </Link>
      </div>

      {error ? (
        <div className="banner error" role="alert">
          {error}
        </div>
      ) : null}
      {message ? <div className="banner success">{message}</div> : null}

      <section className="card stack">
        <h2>Source</h2>
        <p className="muted" style={{ margin: 0 }}>
          {source.type} · {source.charCount.toLocaleString()} characters · hash{' '}
          {source.contentHash.slice(0, 12)}…
        </p>
        <pre className="code-block">{source.normalizedContent.slice(0, 1200)}</pre>
      </section>

      <section className="card stack">
        <h2>Learning objectives</h2>
        <ul className="list-plain">
          {pack.learningObjectives.map((obj) => (
            <li key={obj}>{obj}</li>
          ))}
        </ul>
      </section>

      <section className="card stack">
        <h2>Concepts ({concepts.length})</h2>
        {canEditConcepts ? (
          <p className="muted" style={{ margin: 0 }}>
            Remove anything you do not want before generating exercises.
          </p>
        ) : null}
        <ul className="entity-list">
          {concepts.map((concept) => {
            const occ = occurrences.find((o) => o.conceptId === concept.id)
            return (
              <li key={concept.id} className="entity-item">
                <div>
                  <strong>{concept.canonicalLabel}</strong>
                  <span className="muted"> · {concept.kind}</span>
                  {concept.definition ? <div className="muted">{concept.definition}</div> : null}
                  {occ?.evidenceText ? (
                    <div className="evidence">“{occ.evidenceText}”</div>
                  ) : null}
                </div>
                {canEditConcepts ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={busy}
                    onClick={() => void onRemoveConcept(concept.id)}
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            )
          })}
        </ul>
      </section>

      <section className="card stack">
        <h2>Exercises ({exerciseList.length})</h2>
        {exerciseList.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No exercises yet. Generate a mixed set from the concepts above.
          </p>
        ) : (
          <ul className="list-plain">
            {exerciseList.map((ex) => (
              <li key={ex.id}>
                <strong>{ex.type}</strong> — {ex.prompt.slice(0, 80)}
                {ex.prompt.length > 80 ? '…' : ''}
              </li>
            ))}
          </ul>
        )}
        <div className="row">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || concepts.length === 0}
            onClick={() => void onGenerate()}
          >
            {busy ? 'Working…' : exerciseList.length ? 'Regenerate exercises' : 'Generate exercises'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || exerciseList.length === 0}
            onClick={() => void onPractice()}
          >
            Start practice
          </button>
        </div>
      </section>
    </div>
  )
}
