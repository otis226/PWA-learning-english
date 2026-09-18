import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAppServices } from '../../app/use-app-services'
import type { SourceRecord } from '../../db/schema/types'
import { createId } from '../../shared/ids'
import { speakEnglish, speechSynthesisSupported, stopSpeaking } from '../../shared/speech/browser-speech'

export function ReadingPage() {
  const { sources, skillAttempts, settings } = useAppServices()
  const [params] = useSearchParams()
  const sourceId = params.get('source') ?? ''
  const [source, setSource] = useState<SourceRecord | null>(null)
  const [recent, setRecent] = useState<SourceRecord[]>([])
  const [rate, setRate] = useState(0.92)
  const [focus, setFocus] = useState(false)
  const [done, setDone] = useState(false)
  const openedAt = useRef(Date.now())
  const synthesisReady = useMemo(() => speechSynthesisSupported(), [])

  useEffect(() => {
    void sources.listRecent(20).then((rows) => {
      setRecent(rows)
      const selected = sourceId ? rows.find((row) => row.id === sourceId) : rows[0]
      setSource(selected ?? null)
      openedAt.current = Date.now()
      setDone(false)
    })
    return () => stopSpeaking()
  }, [sourceId, sources])

  useEffect(() => {
    document.body.classList.toggle('reading-focus-active', focus)
    return () => document.body.classList.remove('reading-focus-active')
  }, [focus])

  async function markComplete() {
    if (!source || done) return
    await skillAttempts.put({ id: createId('skill'), mode: 'reading', sourceId: source.id, targetText: source.title, score: null, durationMs: Date.now() - openedAt.current, createdAt: new Date().toISOString() })
    await settings.touchMeaningfulChange(); setDone(true)
  }

  const wordCount = source ? source.normalizedContent.trim().split(/\s+/).filter(Boolean).length : 0
  const minutes = Math.max(1, Math.ceil(wordCount / 190))

  return (
    <div className={`page reading-page ${focus ? 'reading-focus' : ''}`}>
      <section className="page-heading"><div><p className="eyebrow">Reading room</p><h1>Read for meaning, not for speed.</h1><p className="lead">Use read-aloud only when useful. Your original source stays local and can be studied offline.</p></div><Link className="btn btn-secondary" to="/study">Study studio</Link></section>
      {recent.length === 0 ? <div className="card empty-state"><strong>No reading material yet.</strong><Link className="btn btn-primary" to="/learn/new">Create material</Link></div> : (
        <>
          <section className="reading-toolbar card">
            <label>Material <select value={source?.id ?? ''} onChange={(e) => { const id = e.target.value; const next = recent.find((row) => row.id === id) ?? null; setSource(next); openedAt.current = Date.now(); setDone(false); stopSpeaking() }}>{recent.map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}</select></label>
            <span>{wordCount} words · ~{minutes} min</span>
            <label>Voice speed <select value={rate} onChange={(e) => setRate(Number(e.target.value))}><option value={0.78}>Slow</option><option value={0.92}>Study</option><option value={1}>Natural</option><option value={1.12}>Fast</option></select></label>
            <button className="btn btn-secondary" type="button" onClick={() => setFocus((value) => !value)}>{focus ? 'Exit focus' : 'Focus mode'}</button>
          </section>
          {source ? <article className="reading-sheet"><div className="reading-meta"><span className="badge">{source.type}</span><div className="row"><button className="btn btn-secondary" type="button" disabled={!synthesisReady} onClick={() => void speakEnglish(source.normalizedContent, { rate })}>Read aloud</button><button className="btn btn-secondary" type="button" onClick={stopSpeaking}>Stop</button></div></div><h2>{source.title}</h2><div className="reading-copy">{paragraphs(source.normalizedContent).map((paragraph, index) => <p key={`${source.id}-${index}`} onDoubleClick={() => void speakEnglish(paragraph, { rate })}>{paragraph}</p>)}</div><div className="reading-finish"><button className="btn btn-primary" type="button" disabled={done} onClick={() => void markComplete()}>{done ? 'Reading saved' : 'Mark reading complete'}</button><span className="muted">Double-click a paragraph to hear just that paragraph.</span></div></article> : null}
        </>
      )}
    </div>
  )
}

function paragraphs(text: string): string[] {
  const blocks = text.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean)
  if (blocks.length > 1) return blocks
  return text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((item) => item.trim()).filter(Boolean) ?? [text]
}
