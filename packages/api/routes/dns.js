import { isValidIPv4 } from '../lib/validation.js'

const NAMECOM_API = 'https://api.name.com'

function getDnsConfig() {
  return {
    user: process.env.NAMECOM_USER,
    token: process.env.NAMECOM_TOKEN,
    domain: process.env.NAMECOM_DOMAIN,
    host: process.env.NAMECOM_HOST || 'mc.server',
    recordId: process.env.RECORD_ID,
  }
}

export async function updateDnsHandler(req, res) {
  const ipv4 = req.body?.ipv4
  if (!ipv4 || !isValidIPv4(ipv4)) {
    return res.status(400).json({ error: 'Invalid or missing ipv4' })
  }

  const config = getDnsConfig()
  if (!config.user || !config.token || !config.recordId || !config.domain) {
    return res.status(500).json({ error: 'DNS update not configured' })
  }

  const url = `${NAMECOM_API}/v4/domains/${encodeURIComponent(config.domain)}/records/${encodeURIComponent(config.recordId)}`
  const body = {
    host: config.host,
    type: 'A',
    answer: ipv4,
    ttl: 300,
  }
  const auth = Buffer.from(`${config.user}:${config.token}`, 'utf8').toString('base64')

  try {
    const r = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(body),
    })
    if (!r.ok) {
      const text = await r.text()
      return res.status(r.status).json({
        error: 'Name.com API error',
        detail: text || r.statusText,
      })
    }
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message || 'DNS update failed' })
  }
}

export async function getDnsHandler(req, res) {
  const config = getDnsConfig()
  if (!config.user || !config.token || !config.recordId || !config.domain) {
    return res.status(500).json({ error: 'DNS not configured' })
  }

  const url = `${NAMECOM_API}/v4/domains/${encodeURIComponent(config.domain)}/records/${encodeURIComponent(config.recordId)}`
  const auth = Buffer.from(`${config.user}:${config.token}`, 'utf8').toString('base64')

  try {
    const r = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Basic ${auth}` },
    })
    if (!r.ok) {
      const text = await r.text()
      return res.status(r.status).json({
        error: 'Name.com API error',
        detail: text || r.statusText,
      })
    }
    const data = await r.json()
    const answer = data?.answer ?? null
    res.json({ answer })
  } catch (e) {
    res.status(500).json({ error: e.message || 'DNS fetch failed' })
  }
}
