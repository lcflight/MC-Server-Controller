import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { app, isValidIPv4 } from './app.js'

describe('isValidIPv4', () => {
  it('accepts valid IPv4 addresses', () => {
    expect(isValidIPv4('192.168.1.1')).toBe(true)
    expect(isValidIPv4('0.0.0.0')).toBe(true)
    expect(isValidIPv4('255.255.255.255')).toBe(true)
    expect(isValidIPv4('10.0.0.1')).toBe(true)
  })

  it('rejects invalid IPv4 addresses', () => {
    expect(isValidIPv4('256.1.1.1')).toBe(false)
    expect(isValidIPv4('192.168.1')).toBe(false)
    expect(isValidIPv4('192.168.1.1.1')).toBe(false)
    expect(isValidIPv4('192.168.1.-1')).toBe(false)
    expect(isValidIPv4('abc.def.ghi.jkl')).toBe(false)
    expect(isValidIPv4('')).toBe(false)
  })

  it('rejects non-strings', () => {
    expect(isValidIPv4(null)).toBe(false)
    expect(isValidIPv4(undefined)).toBe(false)
    expect(isValidIPv4(19216811)).toBe(false)
  })
})

describe('POST /api/update-dns', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    process.env.NAMECOM_USER = 'test-user'
    process.env.NAMECOM_TOKEN = 'test-token'
    process.env.NAMECOM_DOMAIN = 'example.com'
    process.env.RECORD_ID = '12345'
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('returns 400 for missing ipv4', async () => {
    const res = await request(app)
      .post('/api/update-dns')
      .send({})
      .expect(400)
    expect(res.body.error).toBe('Invalid or missing ipv4')
  })

  it('returns 400 for invalid ipv4', async () => {
    const res = await request(app)
      .post('/api/update-dns')
      .send({ ipv4: 'not-an-ip' })
      .expect(400)
    expect(res.body.error).toBe('Invalid or missing ipv4')
  })

  it('returns 400 for invalid ipv4 format (out of range)', async () => {
    const res = await request(app)
      .post('/api/update-dns')
      .send({ ipv4: '256.1.1.1' })
      .expect(400)
    expect(res.body.error).toBe('Invalid or missing ipv4')
  })

  it('returns 200 and ok when Name.com API succeeds', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    })
    const res = await request(app)
      .post('/api/update-dns')
      .send({ ipv4: '192.168.1.1' })
      .expect(200)
    expect(res.body.ok).toBe(true)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v4/domains/example.com/records/12345'),
      expect.objectContaining({
        method: 'PUT',
        body: expect.stringContaining('192.168.1.1'),
      })
    )
  })

  it('returns API error status when Name.com API fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    })
    const res = await request(app)
      .post('/api/update-dns')
      .send({ ipv4: '192.168.1.1' })
      .expect(401)
    expect(res.body.error).toBe('Name.com API error')
    expect(res.body.detail).toBe('Unauthorized')
  })

  it('returns 500 when fetch throws', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
    const res = await request(app)
      .post('/api/update-dns')
      .send({ ipv4: '192.168.1.1' })
      .expect(500)
    expect(res.body.error).toBe('Network error')
  })
})
