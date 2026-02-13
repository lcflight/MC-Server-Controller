import { describe, it, expect } from 'vitest'
import { getPollingDetail, getPollingSummary } from './polling.js'

describe('getPollingDetail', () => {
  it('returns stage-specific messages', () => {
    expect(getPollingDetail('ssm_in_progress')).toBe('Waiting for SSM status')
    expect(getPollingDetail('missing_mc_dir')).toBe('Server path is not configured')
    expect(getPollingDetail('missing_mcrcon')).toBe('mcrcon is not installed on the server')
    expect(getPollingDetail('starting_process')).toBe('Starting Java process')
    expect(getPollingDetail('port_open')).toBe('Minecraft port is open')
    expect(getPollingDetail('rcon_listen')).toBe('RCON port is listening')
    expect(getPollingDetail('loading_world')).toBe('Loading world')
    expect(getPollingDetail('preparing_spawn')).toBe('Preparing spawn area')
    expect(getPollingDetail('started')).toBe('Server started, waiting for RCON')
  })

  it('returns default message for unknown stage', () => {
    expect(getPollingDetail('unknown_stage')).toBe('Waiting for the Minecraft server to accept connections')
    expect(getPollingDetail(null)).toBe('Waiting for the Minecraft server to accept connections')
    expect(getPollingDetail(undefined)).toBe('Waiting for the Minecraft server to accept connections')
  })
})

describe('getPollingSummary', () => {
  it('includes detail and signal status', () => {
    const summary = getPollingSummary({
      stage: 'loading_world',
      signals: { java_running: true, mc_port_listening: true, rcon_port_listening: false },
      rcon: { ok: false },
    })
    expect(summary).toContain('Loading world')
    expect(summary).toContain('Java on')
    expect(summary).toContain('Game port open')
    expect(summary).not.toContain('RCON ready')
  })

  it('includes RCON ready when rcon.ok is true', () => {
    const summary = getPollingSummary({
      stage: 'started',
      signals: { java_running: true, mc_port_listening: true, rcon_port_listening: true },
      rcon: { ok: true },
    })
    expect(summary).toContain('RCON ready')
    expect(summary).toContain('Server started, waiting for RCON')
  })

  it('handles missing signals and rcon', () => {
    const summary = getPollingSummary({ stage: 'port_open' })
    expect(summary).toBe('Minecraft port is open')
  })

  it('joins parts with middle dot', () => {
    const summary = getPollingSummary({
      stage: 'started',
      signals: { java_running: true },
      rcon: { ok: true },
    })
    expect(summary).toContain(' · ')
    expect(summary.split(' · ').length).toBeGreaterThan(1)
  })
})
