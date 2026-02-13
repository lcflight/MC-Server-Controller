// "There are 2 of a max of 20 players online: ..." (from RCON output)
export const PLAYERS_RE = /There are (\d+) of a max of (\d+) players online/

/**
 * Parse player count from RCON stdout output.
 * @param {string} stdout - RCON output string
 * @returns {{ online: number|null, max: number|null }}
 */
export function parsePlayersFromStdout(stdout) {
  if (typeof stdout !== 'string') return { online: null, max: null }
  const m = stdout.match(PLAYERS_RE)
  if (!m) return { online: null, max: null }
  return { online: parseInt(m[1], 10), max: parseInt(m[2], 10) }
}
