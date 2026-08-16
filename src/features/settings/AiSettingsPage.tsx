import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useAppServices } from '../../app/use-app-services'
import type { ConnectionTestResult } from '../../ai/gateway/types'
import type { ProviderSettingsView } from './provider-settings-service'

type FormState = {
  displayName: string
  baseUrl: string
  model: string
  apiKey: string
  rememberOnDevice: boolean
}

const emptyForm: FormState = {
  displayName: '',
  baseUrl: 'https://api.openai.com/v1',
  model: '',
  apiKey: '',
  rememberOnDevice: false,
}

export function AiSettingsPage() {
  const { providerSettings } = useAppServices()
  const [view, setView] = useState<ProviderSettingsView | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(
    null,
  )
  const [connection, setConnection] = useState<ConnectionTestResult | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const next = await providerSettings.getView()
      setView(next)
      if (next.profile) {
        setForm({
          displayName: next.profile.displayName,
          baseUrl: next.profile.baseUrl,
          model: next.profile.model,
          apiKey: '',
          rememberOnDevice: next.credentialPersistence === 'remember',
        })
      }
    } catch (error) {
      setMessage({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Failed to load settings',
      })
    } finally {
      setLoading(false)
    }
  }, [providerSettings])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      await providerSettings.saveProvider({
        id: view?.profile?.id,
        displayName: form.displayName,
        baseUrl: form.baseUrl,
        model: form.model,
        apiKey: form.apiKey,
        rememberOnDevice: form.rememberOnDevice,
        setActive: true,
      })
      setMessage({ kind: 'success', text: 'Provider profile saved on this device.' })
      setForm((current) => ({ ...current, apiKey: '' }))
      await refresh()
    } catch (error) {
      setMessage({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Failed to save provider',
      })
    } finally {
      setSaving(false)
    }
  }

  async function onTestConnection() {
    setTesting(true)
    setConnection(null)
    setMessage(null)
    try {
      // Save first if the form has values so test uses current fields when possible
      if (form.displayName && form.baseUrl && form.model) {
        await providerSettings.saveProvider({
          id: view?.profile?.id,
          displayName: form.displayName,
          baseUrl: form.baseUrl,
          model: form.model,
          apiKey: form.apiKey,
          rememberOnDevice: form.rememberOnDevice,
          setActive: true,
        })
        await refresh()
      }
      const result = await providerSettings.testActiveConnection()
      setConnection(result)
      if (result.ok) {
        setMessage({ kind: 'success', text: 'Connection succeeded.' })
      } else {
        setMessage({ kind: 'error', text: result.message })
      }
    } catch (error) {
      setMessage({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Connection test failed',
      })
    } finally {
      setTesting(false)
    }
  }

  if (loading && !view) {
    return (
      <div className="page">
        <h1>AI Provider</h1>
        <p className="muted">Loading settings…</p>
      </div>
    )
  }

  return (
    <div className="page">
      <h1>AI Provider</h1>
      <p className="lead">
        Configure any OpenAI-compatible Chat Completions endpoint. Model names are free
        text — listing <code>/models</code> is not required.
      </p>

      <section className="card banner warning" role="note">
        <strong>Browser key warning (BYOK)</strong>
        <p className="muted" style={{ margin: '0.5rem 0 0' }}>
          API keys entered here are available to JavaScript in this browser. Prefer
          session-only storage. Use personal or low-risk keys — not high-value shared
          production secrets. Keys are never included in exports.
        </p>
      </section>

      {message ? (
        <div className={`banner ${message.kind === 'success' ? 'success' : message.kind === 'error' ? 'error' : 'info'}`}>
          {message.text}
        </div>
      ) : null}

      <form className="card stack" onSubmit={(e) => void onSubmit(e)}>
        <h2>{view?.profile ? 'Edit provider profile' : 'Create provider profile'}</h2>

        <div className="field">
          <label htmlFor="displayName">Display name</label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            autoComplete="off"
            value={form.displayName}
            onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="baseUrl">Base URL</label>
          <input
            id="baseUrl"
            name="baseUrl"
            type="url"
            autoComplete="off"
            placeholder="https://api.openai.com/v1"
            value={form.baseUrl}
            onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="model">Model (free text)</label>
          <input
            id="model"
            name="model"
            type="text"
            autoComplete="off"
            placeholder="e.g. gpt-4o-mini or provider-specific alias"
            value={form.model}
            onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="apiKey">
            API key {view?.hasCredential ? '(leave blank to keep existing)' : ''}
          </label>
          <input
            id="apiKey"
            name="apiKey"
            type="password"
            autoComplete="off"
            value={form.apiKey}
            onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
            placeholder={view?.hasCredential ? '••••••••' : 'sk-…'}
          />
        </div>

        <label className="checkbox-field" htmlFor="rememberOnDevice">
          <input
            id="rememberOnDevice"
            type="checkbox"
            checked={form.rememberOnDevice}
            onChange={(e) =>
              setForm((f) => ({ ...f, rememberOnDevice: e.target.checked }))
            }
          />
          <span>
            Remember credential on this device (opt-in). Default is session-only and is
            safer on shared computers.
          </span>
        </label>

        <div className="row">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save provider'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={testing}
            onClick={() => void onTestConnection()}
          >
            {testing ? 'Testing…' : 'Test connection'}
          </button>
        </div>
      </form>

      <section className="card stack">
        <h2>Connection state</h2>
        <div className="status-grid">
          <div className="status-item">
            <strong>Active profile</strong>
            <span className="muted">{view?.profile?.displayName ?? 'None'}</span>
          </div>
          <div className="status-item">
            <strong>Model</strong>
            <span className="muted">{view?.profile?.model ?? '—'}</span>
          </div>
          <div className="status-item">
            <strong>Credential</strong>
            <span className="muted">
              {view?.hasCredential
                ? view.credentialPersistence === 'remember'
                  ? 'Present (remembered on device)'
                  : 'Present (session)'
                : 'Missing'}
            </span>
          </div>
          <div className="status-item">
            <strong>Last test</strong>
            <span className="muted">
              {!connection
                ? 'Not run'
                : connection.ok
                  ? `OK${connection.contentPreview ? `: ${connection.contentPreview}` : ''}`
                  : `${connection.category}${connection.status ? ` (${connection.status})` : ''}`}
            </span>
          </div>
        </div>
        {connection && !connection.ok && connection.providerMessage ? (
          <p className="muted" style={{ margin: 0 }}>
            Provider message: {connection.providerMessage}
          </p>
        ) : null}
      </section>
    </div>
  )
}
