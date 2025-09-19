import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card'

describe('Card', () => {
  it('renders with default classes', () => {
    render(<Card data-testid="card">Card content</Card>)
    
    const card = screen.getByTestId('card')
    expect(card).toBeInTheDocument()
    expect(card).toHaveTextContent('Card content')
    expect(card).toHaveClass('rounded-lg', 'border', 'bg-card', 'text-card-foreground', 'shadow-sm')
  })

  it('applies custom className', () => {
    render(<Card className="custom-card">Custom Card</Card>)
    
    const card = screen.getByText('Custom Card')
    expect(card).toHaveClass('custom-card')
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(<Card ref={ref}>Card with ref</Card>)
    
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('passes through other div props', () => {
    render(<Card id="card-1" data-testid="card-props">Card with props</Card>)
    
    const card = screen.getByTestId('card-props')
    expect(card).toHaveAttribute('id', 'card-1')
  })
})

describe('CardHeader', () => {
  it('renders with default classes', () => {
    render(<CardHeader data-testid="card-header">Header content</CardHeader>)
    
    const header = screen.getByTestId('card-header')
    expect(header).toBeInTheDocument()
    expect(header).toHaveTextContent('Header content')
    expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6')
  })

  it('applies custom className', () => {
    render(<CardHeader className="custom-header">Custom Header</CardHeader>)
    
    const header = screen.getByText('Custom Header')
    expect(header).toHaveClass('custom-header')
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(<CardHeader ref={ref}>Header with ref</CardHeader>)
    
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })
})

describe('CardTitle', () => {
  it('renders as h3 element with default classes', () => {
    render(<CardTitle>Card Title</CardTitle>)
    
    const title = screen.getByRole('heading', { level: 3 })
    expect(title).toBeInTheDocument()
    expect(title).toHaveTextContent('Card Title')
    expect(title).toHaveClass('text-2xl', 'font-semibold', 'leading-none', 'tracking-tight')
  })

  it('applies custom className', () => {
    render(<CardTitle className="custom-title">Custom Title</CardTitle>)
    
    const title = screen.getByRole('heading')
    expect(title).toHaveClass('custom-title')
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(<CardTitle ref={ref}>Title with ref</CardTitle>)
    
    expect(ref.current).toBeInstanceOf(HTMLHeadingElement)
  })
})

describe('CardDescription', () => {
  it('renders as p element with default classes', () => {
    render(<CardDescription>Card description text</CardDescription>)
    
    const description = screen.getByText('Card description text')
    expect(description).toBeInTheDocument()
    expect(description.tagName).toBe('P')
    expect(description).toHaveClass('text-sm', 'text-muted-foreground')
  })

  it('applies custom className', () => {
    render(<CardDescription className="custom-desc">Custom Description</CardDescription>)
    
    const description = screen.getByText('Custom Description')
    expect(description).toHaveClass('custom-desc')
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(<CardDescription ref={ref}>Description with ref</CardDescription>)
    
    expect(ref.current).toBeInstanceOf(HTMLParagraphElement)
  })
})

describe('CardContent', () => {
  it('renders with default classes', () => {
    render(<CardContent data-testid="card-content">Content area</CardContent>)
    
    const content = screen.getByTestId('card-content')
    expect(content).toBeInTheDocument()
    expect(content).toHaveTextContent('Content area')
    expect(content).toHaveClass('p-6', 'pt-0')
  })

  it('applies custom className', () => {
    render(<CardContent className="custom-content">Custom Content</CardContent>)
    
    const content = screen.getByText('Custom Content')
    expect(content).toHaveClass('custom-content')
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(<CardContent ref={ref}>Content with ref</CardContent>)
    
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })
})

describe('CardFooter', () => {
  it('renders with default classes', () => {
    render(<CardFooter data-testid="card-footer">Footer content</CardFooter>)
    
    const footer = screen.getByTestId('card-footer')
    expect(footer).toBeInTheDocument()
    expect(footer).toHaveTextContent('Footer content')
    expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0')
  })

  it('applies custom className', () => {
    render(<CardFooter className="custom-footer">Custom Footer</CardFooter>)
    
    const footer = screen.getByText('Custom Footer')
    expect(footer).toHaveClass('custom-footer')
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(<CardFooter ref={ref}>Footer with ref</CardFooter>)
    
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })
})

describe('Card composition', () => {
  it('renders complete card with all components', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Card</CardTitle>
          <CardDescription>This is a test card description</CardDescription>
        </CardHeader>
        <CardContent>
          <p>This is the main content of the card.</p>
        </CardContent>
        <CardFooter>
          <button>Action</button>
        </CardFooter>
      </Card>
    )

    expect(screen.getByRole('heading', { name: 'Test Card' })).toBeInTheDocument()
    expect(screen.getByText('This is a test card description')).toBeInTheDocument()
    expect(screen.getByText('This is the main content of the card.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
  })

  it('works with minimal composition', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Simple Card</CardTitle>
        </CardHeader>
        <CardContent>
          Simple content
        </CardContent>
      </Card>
    )

    expect(screen.getByRole('heading', { name: 'Simple Card' })).toBeInTheDocument()
    expect(screen.getByText('Simple content')).toBeInTheDocument()
  })

  it('handles complex nested content', () => {
    render(
      <Card>
        <CardContent>
          <div>
            <span>Nested content</span>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    )

    expect(screen.getByText('Nested content')).toBeInTheDocument()
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
  })
})

