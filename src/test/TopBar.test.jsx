import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TopBar from '../components/layout/TopBar'

describe('TopBar component', () => {
  it('renders Gx logo', () => {
    render(<TopBar />)
    expect(screen.getByText(/G/)).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(<TopBar title="PROGRESS" />)
    expect(screen.getByText('PROGRESS')).toBeInTheDocument()
  })

  it('renders rightContent when provided', () => {
    render(<TopBar rightContent={<span data-testid="sync">synced</span>} />)
    expect(screen.getByTestId('sync')).toBeInTheDocument()
  })

  it('renders spacer when no rightContent', () => {
    const { container } = render(<TopBar title="TEST" />)
    const spacer = container.querySelector('.w-10')
    expect(spacer).toBeInTheDocument()
  })
})
