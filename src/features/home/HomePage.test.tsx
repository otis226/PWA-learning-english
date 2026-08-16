import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { HomePage } from './HomePage'

describe('HomePage', () => {
  it('renders product shell and settings links', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )
    expect(
      screen.getByRole('heading', { name: /turn anything into something you can learn/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /configure ai provider/i })).toHaveAttribute(
      'href',
      '/settings/ai',
    )
  })
})
