import { createContext } from 'react'
import type { AppServices } from './create-services'

export const AppServicesContext = createContext<AppServices | null>(null)
