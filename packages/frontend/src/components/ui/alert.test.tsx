import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Alert, AlertTitle, AlertDescription } from './alert'

describe('Alert', () => {
  it('renders with default variant', () => {
    render(<Alert>Alert content</Alert>)
    
    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent('Alert content')
    expect(alert).toHaveClass('bg-background', 'text-foreground')
  })

  it('renders with destructive variant', () => {
    render(<Alert variant="destructive">Destructive alert</Alert>)
    
    const alert = screen.getByRole('alert')
    expect(alert).toHaveClass('border-destructive/50', 'text-destructive')
    expect(alert).toHaveTextContent('Destructive alert')
  })

  it('applies custom className', () => {
    render(<Alert className="custom-class">Alert with custom class</Alert>)
    
    const alert = screen.getByRole('alert')
    expect(alert).toHaveClass('custom-class')
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(<Alert ref={ref}>Alert with ref</Alert>)
    
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('passes through other props', () => {
    render(<Alert data-testid="custom-alert" id="alert-1">Alert with props</Alert>)
    
    const alert = screen.getByTestId('custom-alert')
    expect(alert).toHaveAttribute('id', 'alert-1')
  })
})

describe('AlertTitle', () => {
  it('renders as h5 element', () => {
    render(<AlertTitle>Alert Title</AlertTitle>)
    
    const title = screen.getByRole('heading', { level: 5 })
    expect(title).toBeInTheDocument()
    expect(title).toHaveTextContent('Alert Title')
  })

  it('applies default classes', () => {
    render(<AlertTitle>Title</AlertTitle>)
    
    const title = screen.getByRole('heading')
    expect(title).toHaveClass('mb-1', 'font-medium', 'leading-none', 'tracking-tight')
  })

  it('applies custom className', () => {
    render(<AlertTitle className="custom-title">Custom Title</AlertTitle>)
    
    const title = screen.getByRole('heading')
    expect(title).toHaveClass('custom-title')
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(<AlertTitle ref={ref}>Title with ref</AlertTitle>)
    
    expect(ref.current).toBeInstanceOf(HTMLHeadingElement)
  })
})

describe('AlertDescription', () => {
  it('renders as div element', () => {
    render(<AlertDescription>Alert description</AlertDescription>)
    
    const description = screen.getByText('Alert description')
    expect(description).toBeInTheDocument()
    expect(description.tagName).toBe('DIV')
  })

  it('applies default classes', () => {
    render(<AlertDescription>Description</AlertDescription>)
    
    const description = screen.getByText('Description')
    expect(description).toHaveClass('text-sm', '[&_p]:leading-relaxed')
  })

  it('applies custom className', () => {
    render(<AlertDescription className="custom-desc">Custom Description</AlertDescription>)
    
    const description = screen.getByText('Custom Description')
    expect(description).toHaveClass('custom-desc')
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(<AlertDescription ref={ref}>Description with ref</AlertDescription>)
    
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })
})

describe('Alert composition', () => {
  it('renders complete alert with title and description', () => {
    render(
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Something went wrong. Please try again.</AlertDescription>
      </Alert>
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Error' })).toBeInTheDocument()
    expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument()
  })

  it('works with icons and complex content', () => {
    render(
      <Alert>
        <svg data-testid="alert-icon" />
        <AlertTitle>Info</AlertTitle>
        <AlertDescription>
          <p>Paragraph with <strong>bold text</strong></p>
        </AlertDescription>
      </Alert>
    )

    expect(screen.getByTestId('alert-icon')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Info' })).toBeInTheDocument()
    expect(screen.getByText('bold text')).toBeInTheDocument()
  })
})
