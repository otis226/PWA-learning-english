import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppServices } from '../../app/use-app-services'
import type { LearningGoal, SourceType } from '../../db/schema/types'
import { toUserFacingError } from '../../learning/errors/user-facing-error'
import { MAX_SOURCE_CHARS } from '../../learning/source/normalize-source'

const PRESETS = [
  { id: 'conversation', label: 'Daily talk', glyph: '☕', prompt: 'Create a practical English lesson for everyday conversation. Focus on natural phrases, listening-friendly sentences, and useful collocations.' },
  { id: 'work', label: 'Work', glyph: '⌁', prompt: 'Create a workplace English lesson for meetings, updates, polite disagreement, and clear professional phrasing.' },
  { id: 'travel', label: 'Travel', glyph: '✈', prompt: 'Create a travel English lesson for airports, hotels, restaurants, directions, and solving common travel problems.' },
  { id: 'story', label: 'Story', glyph: '✦', prompt: 'Create a short interesting English story for reading and listening practice, then extract useful vocabulary and comprehension concepts.' },
] as const

const GOALS: Array<{ value: LearningGoal; label: string }> = [
  { value: 'mixed', label: 'Balanced' },
  { value: 'vocabulary', label: 'Vocabulary' },
  { value: 'grammar', label: 'Grammar' },
  { value: 'collocations', label: 'Phrases' },
  { value: 'reading', label: 'Reading' },
  { value: 'custom', label: 'Custom' },
]

export function NewSourcePage() {
  const { analyzeSource } = useAppServices()
  const navigate = useNavigate()
  const [type, setType] = useState<SourceType>('pasted_text')
  const [goal, setGoal] = useState<LearningGoal>('mixed')
  const [customGoal, setCustomGoal] = useState('')
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<{ title: string; message: string } | null>(null)

  function applyPreset(preset: (typeof PRESETS)[number]) {
    setType('custom_topic')
    setGoal('mixed')
    setContent(preset.prompt)
  }

  async function onAnalyze() {
    setBusy(true)
    setError(null)
    try {
      const result = await analyzeSource.analyze({
        type,
        content,
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

  const placeholder =
    type === 'vocabulary_list'
      ? 'despite\nalthough\nin spite of'
      : type === 'custom_topic'
        ? 'What do you want to practice? e.g. small talk with coworkers'
        : 'Paste a paragraph or short article…'

  return (
    <div className="page app-screen create-screen">
      <header className="screen-header">
        <div><p>AI lesson</p><h1>Create</h1></div>
        <Link to="/" className="screen-action" aria-label="Close create">×</Link>
      </header>

      {error ? <div className="banner error" role="alert"><strong>{error.title}</strong><div>{error.message}</div></div> : null}

      <section className="quick-preset-strip" aria-label="Quick lesson presets">
        {PRESETS.map((preset) => (
          <button type="button" key={preset.id} onClick={() => applyPreset(preset)}>
            <span>{preset.glyph}</span><small>{preset.label}</small>
          </button>
        ))}
      </section>

      <section className="composer-card">
        <div className="source-segment" aria-label="Input type">
          <button type="button" className={type === 'custom_topic' ? 'active' : ''} onClick={() => setType('custom_topic')}>Topic</button>
          <button type="button" className={type === 'pasted_text' ? 'active' : ''} onClick={() => setType('pasted_text')}>Text</button>
          <button type="button" className={type === 'vocabulary_list' ? 'active' : ''} onClick={() => setType('vocabulary_list')}>Words</button>
        </div>

        <label className="composer-input">
          <span>{type === 'custom_topic' ? 'Describe your lesson' : type === 'vocabulary_list' ? 'Add words or phrases' : 'Paste content'}</span>
          <textarea
            aria-label="Paste content"
            rows={6}
            value={content}
            maxLength={MAX_SOURCE_CHARS}
            onChange={(event) => setContent(event.target.value)}
            placeholder={placeholder}
          />
          <small>{content.length ? `${content.length.toLocaleString()} chars` : 'AI will turn this into practice'}</small>
        </label>

        <details className="create-advanced">
          <summary>Learning focus</summary>
          <div className="focus-chip-row">
            {GOALS.map((item) => (
              <button
                type="button"
                key={item.value}
                className={goal === item.value ? 'active' : ''}
                onClick={() => setGoal(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {goal === 'custom' ? (
            <input
              aria-label="Custom goal"
              value={customGoal}
              onChange={(event) => setCustomGoal(event.target.value)}
              placeholder="What should the lesson emphasize?"
            />
          ) : null}
        </details>
      </section>

      <button
        type="button"
        className="btn btn-primary create-generate"
        disabled={busy || !content.trim()}
        onClick={() => void onAnalyze()}
      >
        {busy ? 'Building lesson…' : 'Generate lesson'}
      </button>
      <p className="create-footnote">Uses your configured AI provider. Learning history stays on this device.</p>
    </div>
  )
}
