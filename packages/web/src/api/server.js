import { START_URL, STATUS_URL, STATE_URL } from '../config/constants.js'

export async function fetchStatus() {
  const res = await fetch(STATUS_URL, { method: 'GET' })
  if (!res.ok) throw new Error(res.statusText || 'Failed to fetch status')
  return res.json()
}

export async function fetchState() {
  const res = await fetch(STATE_URL, { method: 'GET' })
  if (!res.ok) throw new Error(res.statusText || 'Failed to fetch state')
  return res.json()
}

export async function startServer() {
  const res = await fetch(START_URL, { method: 'POST' })
  if (!res.ok) throw new Error(res.statusText || 'Failed to start server')
  return res.json()
}
