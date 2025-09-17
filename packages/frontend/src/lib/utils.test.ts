import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('merges class names and deduplicates tailwind conflicts', () => {
    const result = cn('p-2', 'p-4', 'text-base', false && 'hidden', undefined, null)
    expect(result).toContain('p-4')
    expect(result).not.toContain('p-2')
    expect(result).toContain('text-base')
  })

  it('handles conditional class values gracefully', () => {
    const isActive = true
    const result = cn('btn', isActive && 'btn-active')
    expect(result).toBe('btn btn-active')
  })
})
