import { useCallback, useEffect, useState } from 'react'
import { useAppServices } from '../../app/use-app-services'
import type { StoragePersistenceStatus } from '../../shared/storage/persistence'
import type { ImportValidationResult } from '../../sync/export/export-schema'

function formatBytes(value: number | null): string {
  if (value === null) {
    return 'Unknown'
  }
  if (value < 1024) {
    return `${value} B`
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`
  }
  return `${(value / (1024 * 1024)).toFixed(2)} MB`
}

export function DataSettingsPage() {
  const { storagePersistence, exportService, settings } = useAppServices()
  const [status, setStatus] = useState<StoragePersistenceStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [importPreview, setImportPreview] = useState<ImportValidationResult | null>(null)
  const [pendingRestore, setPendingRestore] = useState<unknown | null>(null)
  const [backupReminder, setBackupReminder] = useState(false)

  const refresh = useCallback(async () => {
    const [next, appSettings] = await Promise.all([
      storagePersistence.getStatus(),
      settings.get(),
    ])
    setStatus(next)
    setBackupReminder(exportService.shouldRemindBackup(appSettings))
  }, [exportService, settings, storagePersistence])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function onRequestPersistent() {
    setBusy(true)
    setMessage(null)
    try {
      const next = await storagePersistence.requestPersistent()
      setStatus(next)
      setMessage(
        next.persisted
          ? 'Persistent storage granted for this origin.'
          : 'Persistent storage was not granted. Export remains important.',
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  async function onExport() {
    setBusy(true)
    setMessage(null)
    try {
      const json = await exportService.exportJsonString(true)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      anchor.href = url
      anchor.download = `pwa-learning-english-export-${stamp}.json`
      anchor.click()
      URL.revokeObjectURL(url)
      setMessage('Export downloaded. API keys are never included.')
      await refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Export failed')
    } finally {
      setBusy(false)
    }
  }

  async function onImportFile(file: File | null) {
    setImportPreview(null)
    setPendingRestore(null)
    if (!file) {
      return
    }
    try {
      const text = await file.text()
      const raw: unknown = JSON.parse(text)
      const result = exportService.validateImport(raw)
      setImportPreview(result)
      if (result.ok) {
        setPendingRestore(raw)
        setMessage(
          `Import valid: ${result.summary.packCount} packs, ${result.summary.exerciseCount} exercises, ${result.summary.attemptCount} attempts. Confirm replace to restore.`,
        )
      } else {
        setMessage(`Import invalid: ${result.issues.join('; ')}`)
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not read import file')
    }
  }

  async function onConfirmRestore() {
    if (!pendingRestore) return
    const ok = window.confirm(
      'Replace ALL local learning data with this export? This cannot be undone. API keys are never imported.',
    )
    if (!ok) return
    setBusy(true)
    setMessage(null)
    try {
      const result = await exportService.restoreReplace(pendingRestore)
      if (!result.ok) {
        setMessage(`Restore failed: ${result.issues.join('; ')}`)
      } else {
        setMessage(
          `Restored ${result.summary.packCount} packs and ${result.summary.reviewCardCount} review cards. Reload if the dashboard looks stale.`,
        )
        setPendingRestore(null)
        await refresh()
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Restore failed')
    } finally {
      setBusy(false)
    }
  }

  async function onClearLearning() {
    const ok = window.confirm(
      'Clear all learning data (sources, packs, attempts, reviews)? Provider profiles are kept. Export first if needed.',
    )
    if (!ok) return
    setBusy(true)
    try {
      await exportService.clearAllLearningData()
      setMessage('Learning data cleared.')
      await refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Clear failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <h1>Data &amp; Storage</h1>
      <p className="lead">
        IndexedDB is the local source of truth. Persistent storage reduces eviction risk, but you
        can still clear site data — keep exports handy.
      </p>

      {backupReminder ? (
        <div className="banner warning">
          Learning data changed since your last export. Download a backup when you can.
        </div>
      ) : null}

      {message ? <div className="banner info">{message}</div> : null}

      {!status?.persisted && status?.supported ? (
        <div className="banner warning">
          Browser storage is not marked persistent. Request persistence and export regularly.
        </div>
      ) : null}

      <section className="card stack">
        <h2>Browser storage</h2>
        <div className="status-grid">
          <div className="status-item">
            <strong>API supported</strong>
            <span className="muted">{status ? (status.supported ? 'Yes' : 'No') : '…'}</span>
          </div>
          <div className="status-item">
            <strong>Persistence state</strong>
            <span className="muted">{status?.state ?? '…'}</span>
          </div>
          <div className="status-item">
            <strong>Persisted</strong>
            <span className="muted">
              {status?.persisted === null || status?.persisted === undefined
                ? 'Unknown'
                : status.persisted
                  ? 'Yes'
                  : 'No'}
            </span>
          </div>
          <div className="status-item">
            <strong>Usage / quota</strong>
            <span className="muted">
              {status
                ? `${formatBytes(status.estimate.usageBytes)} / ${formatBytes(status.estimate.quotaBytes)}`
                : '…'}
            </span>
          </div>
        </div>
        <div className="row">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !status?.supported || status.persisted === true}
            onClick={() => void onRequestPersistent()}
          >
            Request persistent storage
          </button>
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void refresh()}>
            Refresh status
          </button>
        </div>
      </section>

      <section className="card stack">
        <h2>Export</h2>
        <p className="muted" style={{ margin: 0 }}>
          Downloads a versioned JSON envelope of all non-secret learning state (sources, packs,
          exercises, attempts, mastery, FSRS cards). Credentials are excluded by design.
        </p>
        <div className="row">
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void onExport()}>
            Download export
          </button>
        </div>
      </section>

      <section className="card stack">
        <h2>Restore (replace)</h2>
        <p className="muted" style={{ margin: 0 }}>
          Validate an export, then replace local learning data. API keys are never imported.
        </p>
        <div className="field">
          <label htmlFor="importFile">Choose export JSON</label>
          <input
            id="importFile"
            type="file"
            accept="application/json,.json"
            onChange={(e) => void onImportFile(e.target.files?.[0] ?? null)}
          />
        </div>
        {importPreview ? (
          <pre className="code-block">
            {JSON.stringify(
              importPreview.ok
                ? { ok: true, summary: importPreview.summary }
                : { ok: false, issues: importPreview.issues },
              null,
              2,
            )}
          </pre>
        ) : null}
        <div className="row">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !pendingRestore}
            onClick={() => void onConfirmRestore()}
          >
            Replace local data from import
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            onClick={() => void onClearLearning()}
          >
            Clear learning data
          </button>
        </div>
      </section>
    </div>
  )
}
