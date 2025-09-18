import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Textarea } from './textarea'

describe('Textarea', () => {
  it('renders with default classes', () => {
    render(<Textarea placeholder="Enter text" />)
    
    const textarea = screen.getByPlaceholderText('Enter text')
    expect(textarea).toBeInTheDocument()
    expect(textarea.tagName).toBe('TEXTAREA')
    expect(textarea).toHaveClass(
      'flex',
      'min-h-[80px]',
      'w-full',
      'rounded-md',
      'border',
      'border-input',
      'bg-background',
      'px-3',
      'py-2',
      'text-sm'
    )
  })

  it('applies custom className', () => {
    render(<Textarea className="custom-textarea" placeholder="Custom" />)
    
    const textarea = screen.getByPlaceholderText('Custom')
    expect(textarea).toHaveClass('custom-textarea')
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(<Textarea ref={ref} placeholder="Ref test" />)
    
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement)
  })

  it('handles value changes', async () => {
    const handleChange = vi.fn()
    const user = userEvent.setup()
    
    render(<Textarea onChange={handleChange} placeholder="Type here" />)
    
    const textarea = screen.getByPlaceholderText('Type here')
    await user.type(textarea, 'Hello world')
    
    expect(handleChange).toHaveBeenCalled()
    expect(textarea).toHaveValue('Hello world')
  })

  it('can be controlled', () => {
    const { rerender } = render(<Textarea value="Initial value" readOnly />)
    
    const textarea = screen.getByDisplayValue('Initial value')
    expect(textarea).toHaveValue('Initial value')
    
    rerender(<Textarea value="Updated value" readOnly />)
    expect(textarea).toHaveValue('Updated value')
  })

  it('can be disabled', () => {
    render(<Textarea disabled placeholder="Disabled textarea" />)
    
    const textarea = screen.getByPlaceholderText('Disabled textarea')
    expect(textarea).toBeDisabled()
    expect(textarea).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50')
  })

  it('shows placeholder text', () => {
    render(<Textarea placeholder="Enter your message here" />)
    
    const textarea = screen.getByPlaceholderText('Enter your message here')
    expect(textarea).toHaveClass('placeholder:text-muted-foreground')
  })

  it('handles focus and blur events', async () => {
    const handleFocus = vi.fn()
    const handleBlur = vi.fn()
    const user = userEvent.setup()
    
    render(<Textarea onFocus={handleFocus} onBlur={handleBlur} placeholder="Focus test" />)
    
    const textarea = screen.getByPlaceholderText('Focus test')
    
    await user.click(textarea)
    expect(handleFocus).toHaveBeenCalledTimes(1)
    
    await user.tab()
    expect(handleBlur).toHaveBeenCalledTimes(1)
  })

  it('has correct focus styles', () => {
    render(<Textarea placeholder="Focus styles" />)
    
    const textarea = screen.getByPlaceholderText('Focus styles')
    expect(textarea).toHaveClass(
      'focus-visible:outline-none',
      'focus-visible:ring-2',
      'focus-visible:ring-ring',
      'focus-visible:ring-offset-2'
    )
  })

  it('passes through textarea attributes', () => {
    render(
      <Textarea
        rows={5}
        cols={50}
        maxLength={100}
        data-testid="textarea-attrs"
        placeholder="Attributes test"
      />
    )
    
    const textarea = screen.getByTestId('textarea-attrs')
    expect(textarea).toHaveAttribute('rows', '5')
    expect(textarea).toHaveAttribute('cols', '50')
    expect(textarea).toHaveAttribute('maxlength', '100')
  })

  it('handles required attribute', () => {
    render(<Textarea required placeholder="Required field" />)
    
    const textarea = screen.getByPlaceholderText('Required field')
    expect(textarea).toBeRequired()
  })

  it('handles readonly attribute', () => {
    render(<Textarea readOnly value="Read only text" />)
    
    const textarea = screen.getByDisplayValue('Read only text')
    expect(textarea).toHaveAttribute('readonly')
  })

  it('supports form integration', () => {
    render(
      <form data-testid="test-form">
        <Textarea name="message" placeholder="Form textarea" />
      </form>
    )
    
    const textarea = screen.getByPlaceholderText('Form textarea')
    expect(textarea).toHaveAttribute('name', 'message')
  })

  it('handles keyboard events', async () => {
    const handleKeyDown = vi.fn()
    const user = userEvent.setup()
    
    render(<Textarea onKeyDown={handleKeyDown} placeholder="Keyboard test" />)
    
    const textarea = screen.getByPlaceholderText('Keyboard test')
    await user.click(textarea)
    await user.keyboard('{Enter}')
    
    expect(handleKeyDown).toHaveBeenCalled()
  })

  it('maintains minimum height', () => {
    render(<Textarea placeholder="Min height test" />)
    
    const textarea = screen.getByPlaceholderText('Min height test')
    expect(textarea).toHaveClass('min-h-[80px]')
  })

  it('can be resized', () => {
    render(<Textarea style={{ resize: 'vertical' }} placeholder="Resizable" />)
    
    const textarea = screen.getByPlaceholderText('Resizable')
    expect(textarea).toHaveStyle('resize: vertical')
  })
})
