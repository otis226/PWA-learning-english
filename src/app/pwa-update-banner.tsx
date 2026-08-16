import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export function PwaUpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW() {
      // registration succeeded; offline-ready is handled by the plugin
    },
    onRegisterError() {
      // keep UI quiet; PWA is optional for local dev without SW
    },
  })

  const [offlineReady, setOfflineReady] = useState(false)

  useEffect(() => {
    // vite-plugin-pwa may set offline ready via events; keep a simple online/offline note
    const onOffline = () => setOfflineReady(false)
    const onOnline = () => setOfflineReady(true)
    setOfflineReady(typeof navigator !== 'undefined' ? navigator.onLine : true)
    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    return () => {
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
    }
  }, [])

  if (!needRefresh) {
    return (
      <div className="banner info" role="status" style={{ marginTop: '1rem' }}>
        {offlineReady
          ? 'Network online. After install, the app shell can work offline; AI calls still need the network.'
          : 'You are offline. Local settings remain available; AI connection tests will fail until you reconnect.'}
      </div>
    )
  }

  return (
    <div className="sw-banner" role="status">
      <span>A new app version is available. Reload to update the shell (your local data stays in IndexedDB).</span>
      <div className="row">
        <button
          type="button"
          className="btn"
          onClick={() => {
            void updateServiceWorker(true)
          }}
        >
          Reload to update
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setNeedRefresh(false)}
        >
          Later
        </button>
      </div>
    </div>
  )
}
