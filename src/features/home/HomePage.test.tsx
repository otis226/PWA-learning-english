import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppServicesProvider } from '../../app/services-context'
import type { AppServices } from '../../app/create-services'
import { HomePage } from './HomePage'

function mockServices(): AppServices {
  return {
    dashboard: {
      getSnapshot: vi.fn(async () => ({
        dueCount: 2,
        recentPacks: [],
        weakConcepts: [],
        recentActivity: [],
        recentSessions: [],
      })),
    },
    settings: {
      get: vi.fn(async () => ({
        id: 'app',
        activeProviderProfileId: null,
        updatedAt: new Date().toISOString(),
        lastMeaningfulChangeAt: null,
        lastExportAt: null,
      })),
    },
    exportService: {
      shouldRemindBackup: vi.fn(() => false),
    },
  } as unknown as AppServices
}

describe('HomePage', () => {
  it('renders product shell and primary actions', async () => {
    render(
      <MemoryRouter>
        <AppServicesProvider services={mockServices()}>
          <HomePage />
        </AppServicesProvider>
      </MemoryRouter>,
    )
    expect(
      screen.getByRole('heading', { name: /turn anything into something you can learn/i }),
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /new material/i })).toHaveAttribute(
        'href',
        '/learn/new',
      )
    })
    expect(screen.getByRole('link', { name: /ai provider/i })).toHaveAttribute(
      'href',
      '/settings/ai',
    )
  })
})
