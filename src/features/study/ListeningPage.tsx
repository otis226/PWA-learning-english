import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAppServices } from '../../app/use-app-services'
import type { ConceptOccurrenceRecord, ConceptRecord, SourceRecord } from '../../db/schema/types'
import { textSimilarityPercent } from '../../learning/study/text-scoring'
import { createId } from '../../shared/ids'
import { speakEnglish, speechSynthesisSupported } from '../../shared/speech/browser-speech'

type Target = { concept: ConceptRecord; text: string }

export function ListeningPage() {
  const { analyzeSource, skillAttempts, settings } = useAppServices()
  const [params] = useSearchParams()
  const packId = params.get('pack') ?? ''
  const [targets, setTargets] = useState<Target[]>([])
  const [source, setSource] = useState<SourceRecord | null>(null)
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [score, setScore] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [rate, setRate] = useState(0.86)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!packId) return
    void analyzeSource.getPackDetail(packId).then((detail) => {
      if (!detail) return
      setSource(detail.source)
      setTargets(buildTargets(detail.concepts, detail.occurrences))
    })
  }, [analyzeSource, packId])

  const target = targets[index] ?? null
  const progress = targets.length ? ((index + 1) / targets.length) * 100 : 0
  const synthesisReady = useMemo(() => speechSynthesisSupported(), [])

  async function play() {
    if (!target) return
    setError(null)
    try { await speakEnglish(target.text, { rate }) } catch (err) { setError(err instanceof Error ? err.message : 'Playback failed.') }
  }

  async function check() {
    if (!target || !answer.trim()) return
    const nextScore = textSimilarityPercent(target.text, answer)
    setError(null)
    try {
      await skillAttempts.put({
        id: createId('skill'), mode: 'listening', conceptId: target.concept.id, sourceId: source?.id ?? null,
        packId, targetText: target.text, responseText: answer.trim(), score: nextScore, createdAt: new Date().toISOString(),
      })
      await settings.touchMeaningfulChange()
      setScore(nextScore)
      setRevealed(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this listening attempt.')
    }
  }

  function next() {
    if (!targets.length) return
    setIndex((current) => (current + 1) % targets.length)
    setAnswer(''); setScore(null); setRevealed(false); setError(null)
  }

  if (!packId) return <MissingPack title="Listening" />

  return (
    <div className="page app-screen skill-page">
      <header className="session-header">
        <Link to="/study" className="session-back" aria-label="Back to Study">‹</Link>
        <div><h1>Listening</h1><small>{index + 1} of {targets.length || 0}</small></div>
        <span className="session-spacer" />
      </header>
      {!synthesisReady ? <div className="banner warning">Speech synthesis is not available in this browser. Use Chrome/Edge/Safari with system voices enabled.</div> : null}
      {error ? <div className="banner error">{error}</div> : null}
      {!target ? <div className="card empty-state"><strong>No listening targets in this pack.</strong><span>Generate a pack with concepts/evidence first.</span></div> : (
        <section className="practice-stage">
          <div className="practice-topline"><span>Listen & type</span><span>{target.concept.kind}</span></div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
          <div className="skill-card listening-card">
            <span className="mode-code large" aria-hidden="true">耳</span>
            <h2>{revealed ? target.text : 'Listen without looking'}</h2>
            <p className="muted">Target concept: {target.concept.canonicalLabel}</p>
            <div className="row centered">
              <button className="btn btn-primary" type="button" disabled={!synthesisReady} onClick={() => void play()}>Play audio</button>
              <label className="inline-control">Speed <select value={rate} onChange={(e) => setRate(Number(e.target.value))}><option value={0.72}>Slow</option><option value={0.86}>Study</option><option value={1}>Natural</option><option value={1.12}>Fast</option></select></label>
            </div>
            <div className="field wide-field"><label htmlFor="dictation">Type what you hear</label><textarea id="dictation" rows={3} value={answer} onChange={(e) => setAnswer(e.target.value)} disabled={revealed} /></div>
            {!revealed ? <button className="btn btn-primary" type="button" disabled={!answer.trim()} onClick={() => void check()}>Check dictation</button> : (
              <div className="result-panel"><strong>{score}% match</strong><p>Your answer: {answer}</p><button className="btn btn-primary" type="button" onClick={next}>Next target</button></div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

function buildTargets(concepts: ConceptRecord[], occurrences: ConceptOccurrenceRecord[]): Target[] {
  return concepts.map((concept) => {
    const evidence = occurrences.find((item) => item.conceptId === concept.id)?.evidenceText?.trim()
    const text = evidence && evidence.length <= 180 ? evidence : concept.canonicalLabel
    return { concept, text }
  }).filter((item) => item.text.length > 0)
}

function MissingPack(props: { title: string }) {
  return <div className="page"><h1>{props.title}</h1><div className="card empty-state"><strong>Choose a pack first.</strong><Link className="btn btn-primary" to="/study">Open Study studio</Link></div></div>
}
