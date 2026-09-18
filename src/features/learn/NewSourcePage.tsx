import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppServices } from '../../app/use-app-services'
import type { LearningGoal, SourceType } from '../../db/schema/types'
import { toUserFacingError } from '../../learning/errors/user-facing-error'
import { MAX_SOURCE_CHARS } from '../../learning/source/normalize-source'

const SOURCE_TYPES: Array<{ value: SourceType; label: string; hint: string }> = [
  {
    value: 'pasted_text',
    label: 'Pasted text / article',
    hint: 'Paste a paragraph or short article to study.',
  },
  {
    value: 'vocabulary_list',
    label: 'Vocabulary list',
    hint: 'One word or phrase per line (commas also work).',
  },
  {
    value: 'custom_topic',
    label: 'Custom topic',
    hint: 'Describe what you want to learn in your own words.',
  },
]

const GOALS: Array<{ value: LearningGoal; label: string }> = [
  { value: 'vocabulary', label: 'Vocabulary' },
  { value: 'grammar', label: 'Grammar' },
  { value: 'prepositions', label: 'Prepositions' },
  { value: 'collocations', label: 'Collocations / expressions' },
  { value: 'reading', label: 'Reading comprehension' },
  { value: 'mixed', label: 'Mixed / everything important' },
  { value: 'custom', label: 'Custom goal' },
]

export function NewSourcePage() {
  const { analyzeSource } = useAppServices()
  const navigate = useNavigate()
  const [type, setType] = useState<SourceType>('pasted_text')
  const [goal, setGoal] = useState<LearningGoal>('mixed')
  const [customGoal, setCustomGoal] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<{ title: string; message: string } | null>(null)

  function applyPreset(preset: 'conversation' | 'work' | 'travel' | 'story') {
    const templates = {
      conversation: 'Create a practical English lesson for everyday conversation. Focus on natural phrases, listening-friendly sentences, and useful collocations.',
      work: 'Create a workplace English lesson for meetings, updates, polite disagreement, and clear professional phrasing.',
      travel: 'Create a travel English lesson for airports, hotels, restaurants, directions, and solving common travel problems.',
      story: 'Create a short interesting English story for reading and listening practice, then extract useful vocabulary and comprehension concepts.',
    } as const
    setType('custom_topic')
    setGoal('mixed')
    setTitle(`AI ${preset} lesson`)
    setContent(templates[preset])
  }

  async function onAnalyze() {
    setBusy(true)
    setError(null)
    try {
      const result = await analyzeSource.analyze({
        type,
        content,
        title: title.trim() || undefined,
        learningGoal: goal,
        customGoalText: goal === 'custom' ? customGoal : undefined,
      })
      void navigate(`/packs/${result.pack.id}`)
    } catch (err) {
      const facing = toUserFacingError(err)
      setError({ title: facing.title, message: facing.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <p className="eyebrow">AI lesson builder</p>
      <h1>Turn a topic or source into practice.</h1>
      <p className="lead">
        Paste text, a vocabulary list, or describe a topic. Your configured OpenAI-compatible API
        creates the learning pack; the app keeps memory, review scheduling and history locally.
      </p>

      <section className="preset-grid" aria-label="Quick AI lesson presets">
        <button type="button" onClick={() => applyPreset('conversation')}><strong>Conversation</strong><span>Natural everyday English</span></button>
        <button type="button" onClick={() => applyPreset('work')}><strong>Work English</strong><span>Meetings and professional phrasing</span></button>
        <button type="button" onClick={() => applyPreset('travel')}><strong>Travel</strong><span>Real-world situations</span></button>
        <button type="button" onClick={() => applyPreset('story')}><strong>Story lesson</strong><span>Reading + listening-friendly content</span></button>
      </section>

      {error ? (
        <div className="banner error" role="alert">
          <strong>{error.title}</strong>
          <div>{error.message}</div>
        </div>
      ) : null}

      <section className="card stack">
        <h2>Input type</h2>
        <div className="choice-grid">
          {SOURCE_TYPES.map((item) => (
            <label key={item.value} className={`choice-card ${type === item.value ? 'active' : ''}`}>
              <input
                type="radio"
                name="sourceType"
                value={item.value}
                checked={type === item.value}
                onChange={() => setType(item.value)}
              />
              <span>
                <strong>{item.label}</strong>
                <span className="muted">{item.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="card stack">
        <h2>Learning goal</h2>
        <div className="field">
          <label htmlFor="goal">What do you want to learn?</label>
          <select
            id="goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value as LearningGoal)}
          >
            {GOALS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
        {goal === 'custom' ? (
          <div className="field">
            <label htmlFor="customGoal">Custom goal</label>
            <input
              id="customGoal"
              type="text"
              value={customGoal}
              onChange={(e) => setCustomGoal(e.target.value)}
              placeholder="e.g. contrast connectors in formal writing"
            />
          </div>
        ) : null}
      </section>

      <section className="card stack">
        <h2>Content</h2>
        <div className="field">
          <label htmlFor="title">Title (optional)</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short label for this material"
          />
        </div>
        <div className="field">
          <label htmlFor="content">Paste content</label>
          <textarea
            id="content"
            rows={12}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              type === 'vocabulary_list'
                ? 'despite\nalthough\nin spite of'
                : type === 'custom_topic'
                  ? 'I want to practice prepositions of time for meetings…'
                  : 'Paste an article or paragraph here…'
            }
          />
          <span className="muted">
            {content.length.toLocaleString()} / {MAX_SOURCE_CHARS.toLocaleString()} characters
          </span>
        </div>
        <div className="row">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !content.trim()}
            onClick={() => void onAnalyze()}
          >
            {busy ? 'Analyzing…' : 'Analyze with AI'}
          </button>
          <Link className="btn btn-secondary" to="/">
            Cancel
          </Link>
        </div>
      </section>
    </div>
  )
}
