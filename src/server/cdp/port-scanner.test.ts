import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { findAntigravityPort } from './port-scanner'

describe('findAntigravityPort', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns first available port when CDP responds', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 200 }))

    const port = await findAntigravityPort()
    // It should check ports in order, default includes 9000
    expect(port).toBe(9000)
  })

  it('returns null when no ports respond', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Connection refused'))

    const port = await findAntigravityPort()
    expect(port).toBeNull()
  })
})
