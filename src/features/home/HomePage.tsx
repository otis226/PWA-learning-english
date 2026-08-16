import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <div className="page">
      <h1>Turn anything into something you can learn</h1>
      <p className="lead">
        This local-first PWA keeps your learning data on this device. Milestone M0
        establishes provider configuration, storage durability signals, and export
        contracts. Learning pack generation arrives in M1.
      </p>

      <section className="card stack">
        <h2>What works now</h2>
        <ul className="list-plain">
          <li>Installable app shell with explicit update messaging</li>
          <li>OpenAI-compatible provider profile + free-text model name</li>
          <li>Session-only API keys by default, optional remember-on-device</li>
          <li>Connection test with categorized network/auth failures</li>
          <li>Persistent storage status and versioned JSON export (no secrets)</li>
        </ul>
        <div className="row">
          <Link className="btn btn-primary" to="/settings/ai">
            Configure AI provider
          </Link>
          <Link className="btn btn-secondary" to="/settings/data">
            Data &amp; storage
          </Link>
        </div>
      </section>

      <section className="card">
        <h2>Offline note</h2>
        <p className="muted" style={{ margin: 0 }}>
          After installation, the app shell can load offline. AI generation and
          connection tests require network access and a CORS-friendly provider
          endpoint. Your IndexedDB settings stay local.
        </p>
      </section>
    </div>
  )
}
