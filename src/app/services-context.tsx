import type { ReactNode } from 'react'
import type { AppServices } from './create-services'
import { AppServicesContext } from './services-context-internal'

export function AppServicesProvider({
  services,
  children,
}: {
  services: AppServices
  children: ReactNode
}) {
  return (
    <AppServicesContext.Provider value={services}>
      {children}
    </AppServicesContext.Provider>
  )
}
