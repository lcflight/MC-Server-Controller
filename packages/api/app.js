import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import express from 'express'
import { corsMiddleware } from './middleware/cors.js'
import { updateDnsHandler } from './routes/dns.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const app = express()

app.use(corsMiddleware)
app.use(express.json({ type: ['application/json', 'text/plain'] }))

app.post('/api/update-dns', updateDnsHandler)

export { app }
export { isValidIPv4 } from './lib/validation.js'
export { updateDnsHandler } from './routes/dns.js'
