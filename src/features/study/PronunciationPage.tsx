import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAppServices } from '../../app/use-app-services'
import type { ConceptOccurrenceRecord, ConceptRecord, SourceRecord } from '../../db/schema/types'
import { textSimilarityPercent } from '../../learning/study/text-scoring'
import { createId } from '../../shared/ids'
import { recognizeEnglishOnce, speakEnglish, speechRecognitionSupported, speechSynthesisSupported } from '../../shared/speech/browser-speech'

type PronunciationTarget = { concept: ConceptRecord; text: string }

export function PronunciationPage() {
  const { analyzeSource, skillAttempts, settings } = useAppServices()
  const [params] = useSearchParams()
  const packId = params.get('pack') ?? ''
  const [targets, setTargets] = useState<PronunciationTarget[]>([])
  const [source, setSource] = useState<SourceRecord | null>(null)
  const [index, setIndex] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [score, setScore] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const synthesisReady = useMemo(() => speechSynthesisSupported(), [])
  const recognitionReady = useMemo(() => speechRecognitionSupported(), [])

  useEffect(() => {
    if (!packId) return
    void analyzeSource.getPackDetail(packId).then((detail) => {
      if (!detail) return
      setSource(detail.source)
      setTargets(buildPronunciationTargets(detail.concepts, detail.occurrences))
    })
  }, [analyzeSource, packId])

  const target = targets[index] ?? null

  async function record() {
    if (!target) return
    setBusy(true); setError(null); setTranscript(''); setScore(null)
    try {
      const result = await recognizeEnglishOnce()
      const nextScore = textSimilarityPercent(target.text, result.transcript)
      setTranscript(result.transcript); setScore(nextScore)
      await skillAttempts.put({
        id: createId('skill'), mode: 'pronunciation', conceptId: target.concept.id, sourceId: source?.id ?? null,
        packId, targetText: target.text, responseText: result.transcript, score: nextScore, createdAt: new Date().toISOString(),
      })
      await settings.touchMeaningfulChange()
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not capture your voice.') } finally { setBusy(false) }
  }

  function next() { if (targets.length) { setIndex((value) => (value + 1) % targets.length); setTranscript(''); setScore(null); setError(null) } }

  if (!packId) return <div className="page"><h1>Pronunciation</h1><div className="card empty-state"><strong>Choose a pack first.</strong><Link className="btn btn-primary" to="/study">Open Study studio</Link></div></div>

  return (
    <div className="page app-screen skill-page">
      <header className="session-header"><Link to="/study" className="session-back" aria-label="Back to Study">‹</Link><div><h1>Pronunciation</h1><small>{index + 1} of {targets.length || 0}</small></div><span className="session-spacer" /></header>
      {!recognitionReady ? <div className="banner warning">Speech recognition is unavailable here. Playback still works; Chrome on Android/desktop usually offers the best support.</div> : null}
      {error ? <div className="banner error">{error}</div> : null}
      {!target ? <div className="card empty-state"><strong>No pronunciation targets found.</strong></div> : (
        <section className="practice-stage">
          <div className="practice-topline"><span>Listen · shadow · speak</span><span>{target.concept.kind}</span></div>
          <div className="skill-card pronunciation-card">
            <p className="eyebrow">Target</p><h2>{target.text}</h2><p className="muted">{target.concept.definition ?? target.concept.canonicalLabel}</p>
            <div className="row centered"><button className="btn btn-secondary" type="button" disabled={!synthesisReady} onClick={() => void speakEnglish(target.text, { rate: 0.82 })}>Hear slowly</button><button className="btn btn-secondary" type="button" disabled={!synthesisReady} onClick={() => void speakEnglish(target.text, { rate: 1 })}>Hear natural</button><button className="btn btn-primary" type="button" disabled={!recognitionReady || busy} onClick={() => void record()}>{busy ? 'Listening…' : 'Speak now'}</button></div>
            {score !== null ? <div className="result-panel"><strong>{score}% transcript match</strong><p>Browser heard: “{transcript || '—'}”</p><button className="btn btn-primary" type="button" onClick={next}>Next target</button></div> : <p className="muted centered-text">Tip: listen once, shadow once, then record without looking away from the rhythm.</p>}
          </div>
        </section>
      )}
    </div>
  )
}

function buildPronunciationTargets(concepts: ConceptRecord[], occurrences: ConceptOccurrenceRecord[]): PronunciationTarget[] {
  return concepts.map((concept) => {
    const evidence = occurrences.find((item) => item.conceptId === concept.id)?.evidenceText?.trim()
    return { concept, text: evidence && evidence.length <= 140 ? evidence : concept.canonicalLabel }
  }).filter((item) => item.text.length > 0)
}
