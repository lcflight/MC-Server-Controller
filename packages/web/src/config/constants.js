export const START_URL = 'https://6yk7rznufd7y7dnbeghcu7rcye0upukf.lambda-url.us-east-2.on.aws/'
export const STATUS_URL = 'https://tctml2n2ct5eskfsgmvld6x2lq0xaqbc.lambda-url.us-east-2.on.aws/'
export const STATE_URL = 'https://oi4y6ecythpjrueovwlktyjrsq0eiymd.lambda-url.us-east-2.on.aws/state'

export const MC_JOIN_HOSTNAME = 'mc.server.seasonsprint.com:25565'

export const POLL_INTERVAL_MS = 5_000
export const POLL_TIMEOUT_MS = 90_000

export function getUpdateDnsUrl() {
  const apiBase = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
  return apiBase ? `${apiBase}/api/update-dns` : '/api/update-dns'
}

export function getGetDnsUrl() {
  const apiBase = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
  return apiBase ? `${apiBase}/api/get-dns` : '/api/get-dns'
}
