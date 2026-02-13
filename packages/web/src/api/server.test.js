import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchStatus, fetchState, startServer } from './server.js'

describe('server API', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('fetchStatus returns parsed JSON on success', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ minecraft: { readyToJoin: true } }),
    })
    const data = await fetchStatus()
    expect(data.minecraft.readyToJoin).toBe(true)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('lambda-url'),
      { method: 'GET' }
    )
  })

  it('fetchStatus throws on non-ok response', async () => {
    global.fetch.mockResolvedValue({ ok: false, statusText: 'Not Found' })
    await expect(fetchStatus()).rejects.toThrow('Not Found')
  })

  it('fetchState returns parsed JSON on success', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ state: 'running', publicIp: '1.2.3.4' }),
    })
    const data = await fetchState()
    expect(data.state).toBe('running')
    expect(data.publicIp).toBe('1.2.3.4')
  })

  it('startServer returns instance data on success', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          instanceId: 'i-123',
          state: 'running',
          publicIpv4: '1.2.3.4',
        }),
    })
    const data = await startServer()
    expect(data.instanceId).toBe('i-123')
    expect(data.publicIpv4).toBe('1.2.3.4')
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('lambda-url'),
      { method: 'POST' }
    )
  })

  it('startServer throws on failure', async () => {
    global.fetch.mockResolvedValue({ ok: false, statusText: 'Internal Server Error' })
    await expect(startServer()).rejects.toThrow('Internal Server Error')
  })

  it('startServer throws generic message when statusText is empty', async () => {
    global.fetch.mockResolvedValue({ ok: false, statusText: '' })
    await expect(startServer()).rejects.toThrow('Failed to start server')
  })
})
