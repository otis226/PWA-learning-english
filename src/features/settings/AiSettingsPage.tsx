import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useAppServices } from '../../app/use-app-services'
import type { ConnectionTestResult } from '../../ai/gateway/types'
import type { ProviderAuthMode } from '../../db/schema/types'
import type { ProviderSettingsView } from './provider-settings-service'

type FormState = {
  displayName: string
  baseUrl: string
  model: string
  apiKey: string
  authMode: ProviderAuthMode
  authHeaderName: string
  rememberOnDevice: boolean
}

const emptyForm: FormState = {
  displayName: 'My AI',
  baseUrl: 'https://api.openai.com/v1',
  model: '',
  apiKey: '',
  authMode: 'bearer',
  authHeaderName: '',
  rememberOnDevice: false,
}

const PROVIDER_PRESETS: Array<{
  id: string
  label: string
  detail: string
  displayName: string
  baseUrl: string
  authMode: ProviderAuthMode
}> = [
  {
    id: 'openai',
    label: 'OpenAI',
    detail: 'Official API',
    displayName: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    authMode: 'bearer',
  },
  {
    id: 'zcode-coding',
    label: 'ZCode Plan',
    detail: 'Coding-only endpoint',
    displayName: 'ZCode Coding Plan',
    baseUrl: 'https://api.z.ai/api/coding/paas/v4',
    authMode: 'bearer',
  },
  {
    id: 'zai-api',
    label: 'Z.ai API',
    detail: 'Balance / resources',
    displayName: 'Z.ai API',
    baseUrl: 'https://api.z.ai/api/paas/v4',
    authMode: 'bearer',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    detail: 'OpenAI compatible',
    displayName: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    authMode: 'bearer',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    detail: 'Many model vendors',
    displayName: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    authMode: 'bearer',
  },
  {
    id: 'groq',
    label: 'Groq',
    detail: 'OpenAI compatible',
    displayName: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    authMode: 'bearer',
  },
]

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
          authMode: next.profile.authMode ?? 'bearer',
          authHeaderName: next.profile.authHeaderName ?? '',
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
        authMode: form.authMode,
        authHeaderName: form.authHeaderName || undefined,
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
          authMode: form.authMode,
          authHeaderName: form.authHeaderName || undefined,
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

  function applyPreset(preset: (typeof PROVIDER_PRESETS)[number]) {
    setForm((current) => ({
      ...current,
      displayName: preset.displayName,
      baseUrl: preset.baseUrl,
      authMode: preset.authMode,
      authHeaderName: '',
    }))
  }

  const isZCodeCoding = form.baseUrl === 'https://api.z.ai/api/coding/paas/v4'

  return (
    <div className="page app-screen settings-screen">
      <header className="screen-header"><div><p>Content generation</p><h1>AI</h1></div></header>

      {message ? (
        <div className={`banner ${message.kind === 'success' ? 'success' : message.kind === 'error' ? 'error' : 'info'}`}>
          {message.text}
        </div>
      ) : null}

      <form className="provider-setup" onSubmit={(e) => void onSubmit(e)}>
        <section className="provider-presets" aria-label="Provider presets">
          {PROVIDER_PRESETS.map((preset) => (
            <button
              type="button"
              key={preset.id}
              className={form.baseUrl === preset.baseUrl ? 'active' : ''}
              onClick={() => applyPreset(preset)}
            >
              <strong>{preset.label}</strong>
              <small>{preset.detail}</small>
            </button>
          ))}
        </section>
        {isZCodeCoding ? (
          <div className="provider-inline-note">
            ZCode Coding Plan is intended for coding workloads. For English lessons, prefer Z.ai API if your account has general API balance/resources.
          </div>
        ) : null}

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

        <details className="provider-advanced">
          <summary>Advanced endpoint</summary>
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
            <label>API key authentication</label>
            <div className="auth-mode-row" role="group" aria-label="API key authentication">
              <button
                type="button"
                className={form.authMode === 'bearer' ? 'active' : ''}
                onClick={() => setForm((current) => ({ ...current, authMode: 'bearer', authHeaderName: '' }))}
              >
                Bearer
              </button>
              <button
                type="button"
                className={form.authMode === 'x-api-key' ? 'active' : ''}
                onClick={() => setForm((current) => ({ ...current, authMode: 'x-api-key', authHeaderName: '' }))}
              >
                x-api-key
              </button>
              <button
                type="button"
                className={form.authMode === 'custom-header' ? 'active' : ''}
                onClick={() => setForm((current) => ({ ...current, authMode: 'custom-header' }))}
              >
                Custom
              </button>
            </div>
          </div>
          {form.authMode === 'custom-header' ? (
            <div className="field">
              <label htmlFor="authHeaderName">Header name</label>
              <input
                id="authHeaderName"
                name="authHeaderName"
                type="text"
                autoComplete="off"
                placeholder="e.g. X-API-Key"
                value={form.authHeaderName}
                onChange={(event) => setForm((current) => ({ ...current, authHeaderName: event.target.value }))}
                required
              />
            </div>
          ) : null}
        </details>

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

        <div className="provider-actions">
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

      <section className="provider-status">
        <div><span className={`provider-dot ${view?.hasCredential ? 'ready' : ''}`} /><strong>{view?.profile?.model ?? 'Not connected'}</strong></div>
        <span>
          {view?.hasCredential
            ? `${view.profile?.authMode === 'x-api-key' ? 'x-api-key' : view.profile?.authMode === 'custom-header' ? view.profile.authHeaderName : 'Bearer'} · ${view.credentialPersistence === 'remember' ? 'saved on device' : 'this session'}`
            : 'Add a key to generate lessons'}
        </span>
        {connection && !connection.ok && connection.providerMessage ? (
          <p className="muted" style={{ margin: 0 }}>
            Provider message: {connection.providerMessage}
          </p>
        ) : null}
      </section>

      <details className="provider-security-note">
        <summary>About API keys</summary>
        <p>Keys entered here are available to JavaScript in this browser and are never included in learning-data exports. Session-only storage is the default.</p>
      </details>
    </div>
  )
}
