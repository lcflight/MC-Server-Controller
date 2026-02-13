import { describe, it, expect } from 'vitest'
import { parsePlayersFromStdout, PLAYERS_RE } from './players.js'

describe('parsePlayersFromStdout', () => {
  it('parses player count from RCON output', () => {
    const stdout = 'There are 2 of a max of 20 players online: player1, player2'
    expect(parsePlayersFromStdout(stdout)).toEqual({ online: 2, max: 20 })
  })

  it('returns nulls when no match', () => {
    expect(parsePlayersFromStdout('Some other output')).toEqual({ online: null, max: null })
    expect(parsePlayersFromStdout('')).toEqual({ online: null, max: null })
  })

  it('returns nulls for non-string input', () => {
    expect(parsePlayersFromStdout(null)).toEqual({ online: null, max: null })
    expect(parsePlayersFromStdout(undefined)).toEqual({ online: null, max: null })
    expect(parsePlayersFromStdout(123)).toEqual({ online: null, max: null })
  })

  it('parses zero players', () => {
    const stdout = 'There are 0 of a max of 20 players online:'
    expect(parsePlayersFromStdout(stdout)).toEqual({ online: 0, max: 20 })
  })
})

describe('PLAYERS_RE', () => {
  it('matches expected format', () => {
    expect('There are 5 of a max of 10 players online: a, b'.match(PLAYERS_RE)).toBeTruthy()
  })
})
