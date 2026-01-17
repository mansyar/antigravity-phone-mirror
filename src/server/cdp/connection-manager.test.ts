import { describe, expect, it } from 'vitest'
import { cdpManager } from './connection-manager'

describe('ConnectionManager', () => {
  it('reports disconnected when no client', () => {
    expect(cdpManager.isConnected()).toBe(false)
  })

  it('returns null port when disconnected', () => {
    expect(cdpManager.getCurrentPort()).toBeNull()
  })

  it('initially has no sync time', () => {
    expect(cdpManager.getLastSyncTime()).toBe(0)
  })
})
