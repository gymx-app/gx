import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Text, Badge, SectionLabel, Checkbox, Button } from '../components/ui'

describe('Text component', () => {
  it('renders with pageTitle variant', () => {
    render(<Text variant="pageTitle">Hello</Text>)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('renders with body variant', () => {
    render(<Text variant="body">Body text</Text>)
    expect(screen.getByText('Body text')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(
      <Text variant="body" className="mt-4">
        Styled
      </Text>
    )
    const el = screen.getByText('Styled')
    expect(el.className).toContain('mt-4')
  })
})

describe('Badge component', () => {
  it('renders label text', () => {
    render(<Badge label="PUSH" />)
    expect(screen.getByText('PUSH')).toBeInTheDocument()
  })
})

describe('SectionLabel component', () => {
  it('renders uppercase label', () => {
    render(<SectionLabel label="Exercises" />)
    expect(screen.getByText('Exercises')).toBeInTheDocument()
  })
})

describe('Checkbox component', () => {
  it('renders unchecked state', () => {
    render(<Checkbox checked={false} />)
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toHaveAttribute('aria-checked', 'false')
  })

  it('renders checked state', () => {
    render(<Checkbox checked={true} />)
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toHaveAttribute('aria-checked', 'true')
  })
})

describe('Button component', () => {
  it('renders label text', () => {
    render(<Button label="SIGN IN" />)
    expect(screen.getByText('SIGN IN')).toBeInTheDocument()
  })

  it('renders disabled state', () => {
    render(<Button label="SUBMIT" disabled />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('renders loading state', () => {
    render(<Button label="SUBMIT" loading />)
    const btn = screen.getByRole('button')
    expect(btn).toHaveAttribute('aria-busy', 'true')
    expect(btn).toHaveTextContent('Loading...')
  })

  it('uses warm cream text, not pure white', () => {
    const { container } = render(<Button variant="primary" label="TEST" />)
    const btn = container.querySelector('button')
    expect(btn.className).toContain('text-[#f0ede8]')
    expect(btn.className).not.toContain('text-white')
  })
})
