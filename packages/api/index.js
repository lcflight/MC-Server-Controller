import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const app = express()

// CORS: allow comma-separated origins from env, or reflect request origin
const corsOrigin = process.env.CORS_ORIGIN
let origin
if (!corsOrigin || corsOrigin.trim() === '*') {
  origin = true // reflect any request origin
} else {
  origin = corsOrigin.split(',').map((o) => o.trim()).filter(Boolean)
}
app.use(cors({ origin, methods: ['GET', 'POST', 'PUT', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }))
app.use(express.json({ type: ['application/json', 'text/plain'] }))

const PORT = Number(process.env.PORT) || 3001
const NAMECOM_USER = process.env.NAMECOM_USER
const NAMECOM_TOKEN = process.env.NAMECOM_TOKEN
const NAMECOM_DOMAIN = process.env.NAMECOM_DOMAIN
const NAMECOM_HOST = process.env.NAMECOM_HOST || 'mc.server'
const RECORD_ID = process.env.RECORD_ID

const NAMECOM_API = 'https://api.name.com'

// Basic IPv4 validation (quad-dot format)
const IPV4_RE = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/
function isValidIPv4(s) {
  if (typeof s !== 'string') return false
  if (!IPV4_RE.test(s)) return false
  return s.split('.').every((n) => {
    const v = parseInt(n, 10)
    return v >= 0 && v <= 255
  })
}

const updateDnsHandler = async (req, res) => {
  const ipv4 = req.body?.ipv4
  if (!ipv4 || !isValidIPv4(ipv4)) {
    return res.status(400).json({ error: 'Invalid or missing ipv4' })
  }
  if (!NAMECOM_USER || !NAMECOM_TOKEN || !RECORD_ID || !NAMECOM_DOMAIN) {
    return res.status(500).json({ error: 'DNS update not configured' })
  }

  const url = `${NAMECOM_API}/v4/domains/${encodeURIComponent(NAMECOM_DOMAIN)}/records/${encodeURIComponent(RECORD_ID)}`
  const body = {
    host: NAMECOM_HOST,
    type: 'A',
    answer: ipv4,
    ttl: 300,
  }
  const auth = Buffer.from(`${NAMECOM_USER}:${NAMECOM_TOKEN}`, 'utf8').toString('base64')

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

app.post('/api/update-dns', updateDnsHandler)

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`)
})
