<script setup>
import { ref, onUnmounted } from 'vue'

const START_URL = 'https://6yk7rznufd7y7dnbeghcu7rcye0upukf.lambda-url.us-east-2.on.aws/'
const STATUS_URL = 'https://tctml2n2ct5eskfsgmvld6x2lq0xaqbc.lambda-url.us-east-2.on.aws/'

const POLL_INTERVAL_MS = 5_000
const POLL_TIMEOUT_MS = 45_000

const loading = ref(false)
const error = ref(null)
const result = ref(null)
const copied = ref(false)

const statusLoading = ref(false)
const minecraftReady = ref(null) // null = unknown, false = checking/not ready, true = ready
const minecraftReason = ref(null)
const playersOnline = ref(null) // number when known
const playersMax = ref(null) // number when known
const isPolling = ref(false)
let pollTimer = null
let pollStartedAt = null

// "There are 2 of a max of 20 players online: ..." (from ssm.stdout)
const PLAYERS_RE = /There are (\d+) of a max of (\d+) players online/

function parsePlayersFromStdout(stdout) {
  if (typeof stdout !== 'string') return { online: null, max: null }
  const m = stdout.match(PLAYERS_RE)
  if (!m) return { online: null, max: null }
  return { online: parseInt(m[1], 10), max: parseInt(m[2], 10) }
}

async function fetchStatus() {
  const res = await fetch(STATUS_URL, { method: 'GET' })
  if (!res.ok) throw new Error(res.statusText || 'Failed to fetch status')
  return res.json()
}

async function checkStatus(updateReady = true) {
  statusLoading.value = true
  try {
    const data = await fetchStatus()
    const readyFlag = data?.minecraft?.readyToJoin
    const ready =
      readyFlag === true ||
      readyFlag === 'true' ||
      data?.ssm?.stdout?.includes('__MC_READY__')
    const reason = data?.minecraft?.reason ?? null
    const { online, max } = parsePlayersFromStdout(data?.ssm?.stdout)
    if (updateReady) {
      minecraftReady.value = ready
      minecraftReason.value = reason
      playersOnline.value = online
      playersMax.value = max
    }
    return { ready, reason, online, max, data }
  } catch (e) {
    if (updateReady) {
      minecraftReady.value = false
      minecraftReason.value = null
      playersOnline.value = null
      playersMax.value = null
    }
    throw e
  } finally {
    statusLoading.value = false
  }
}

function stopPolling() {
  if (pollTimer) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
  pollStartedAt = null
  isPolling.value = false
}

function startStatusPolling() {
  stopPolling()
  minecraftReady.value = false
  minecraftReason.value = null
  playersOnline.value = null
  playersMax.value = null
  isPolling.value = true
  pollStartedAt = Date.now()

  async function poll() {
    if (!pollStartedAt) return
    const elapsed = Date.now() - pollStartedAt
    if (elapsed >= POLL_TIMEOUT_MS) {
      stopPolling()
      return
    }
    try {
      const { ready } = await checkStatus(true)
      if (ready) {
        stopPolling()
        return
      }
    } catch {
      // retry on transient errors
    }
    if (!isPolling.value) return
    pollTimer = setTimeout(poll, POLL_INTERVAL_MS)
  }

  poll()
}

async function startServer() {
  loading.value = true
  error.value = null
  result.value = null
  minecraftReady.value = null
  minecraftReason.value = null
  playersOnline.value = null
  playersMax.value = null
  stopPolling()
  try {
    const res = await fetch(START_URL, { method: 'POST' })
    if (!res.ok) throw new Error(res.statusText || 'Failed to start server')
    const data = await res.json()
    result.value = {
      instanceId: data.instanceId,
      state: data.state,
      publicIpv4: data.publicIpv4,
    }
    startStatusPolling()
  } catch (e) {
    error.value = e.message || 'Failed to start server'
  } finally {
    loading.value = false
  }
}

async function checkStatusManual() {
  if (isPolling.value) return
  statusLoading.value = true
  error.value = null
  minecraftReady.value = null
  minecraftReason.value = null
  playersOnline.value = null
  playersMax.value = null
  try {
    await checkStatus(true)
  } catch (e) {
    error.value = e.message || 'Failed to fetch status'
  } finally {
    statusLoading.value = false
  }
}

async function copyIp() {
  if (!result.value?.publicIpv4) return
  try {
    await navigator.clipboard.writeText(result.value.publicIpv4)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  } catch {
    // ignore clipboard errors
  }
}

onUnmounted(stopPolling)
</script>

<template>
  <div class="app">
    <div class="card main-card">
      <div class="header">
        <span class="logo">◆</span>
        <h3>Luke Arthur's MC Server (Aireal59)</h3>
        <h1>MC Server Controller</h1>
        <p class="tagline">Start your Minecraft server on demand</p>
      </div>

      <button
        type="button"
        class="start-btn"
        :disabled="loading"
        @click="startServer"
      >
        <span class="btn-icon">{{ loading ? '⋯' : '▶' }}</span>
        {{ loading ? 'Starting…' : 'Start MC Server' }}
      </button>

      <p v-if="error" class="error">{{ error }}</p>

      <div v-if="result" class="result card">
        <div class="result-header">
          <span class="result-badge">Online</span>
          <span v-if="minecraftReady === true" class="result-badge ready-badge">Ready to join</span>
          <span v-else-if="statusLoading || isPolling" class="result-badge checking-badge">Checking…</span>
          <span v-else-if="minecraftReady === false" class="result-badge not-ready-badge">Not yet ready</span>
        </div>
        <div class="ip-row">
          <span class="label">Server IP</span>
          <span class="ip">{{ result.publicIpv4 }}</span>
          <button type="button" class="copy-btn" @click="copyIp">
            {{ copied ? 'Copied!' : 'Copy' }}
          </button>
        </div>
        <p v-if="minecraftReady === true" class="ready-status">
          Ready to join
          <span v-if="playersOnline != null && playersMax != null" class="players-count"> · {{ playersOnline }} of {{ playersMax }} players online</span>
        </p>
        <p v-if="minecraftReady === true && minecraftReason" class="status-reason">Status: {{ minecraftReason }}</p>
        <p v-else-if="minecraftReady === false && !statusLoading && !isPolling" class="not-ready-status">Minecraft is not yet ready.</p>
        <p class="status">
          <span class="status-item">State: {{ result.state }}</span>
          <span class="status-dot">·</span>
          <span class="status-item">Instance: {{ result.instanceId }}</span>
        </p>
        <button
          type="button"
          class="check-status-btn"
          :disabled="isPolling || statusLoading"
          @click="checkStatusManual"
        >
          {{ statusLoading ? 'Checking…' : 'Check status now' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  padding: 2rem 1rem;
  font-family: 'Outfit', system-ui, sans-serif;
  background: linear-gradient(165deg, #0f1419 0%, #1a2332 40%, #0d1117 100%);
  background-attachment: fixed;
}

.app::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(rgba(34, 197, 94, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(34, 197, 94, 0.03) 1px, transparent 1px);
  background-size: 24px 24px;
  pointer-events: none;
  z-index: 0;
}

.main-card {
  position: relative;
  z-index: 1;
  max-width: 28rem;
  margin: 0 auto;
  padding: 2rem;
}

.card {
  background: rgba(22, 30, 41, 0.85);
  border: 1px solid rgba(34, 197, 94, 0.2);
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
}

.main-card {
  padding: 2.5rem;
}

.header {
  text-align: center;
  margin-bottom: 2rem;
}

.logo {
  display: inline-block;
  font-size: 1.75rem;
  color: #22c55e;
  margin-bottom: 0.5rem;
  filter: drop-shadow(0 0 8px rgba(34, 197, 94, 0.4));
}

h1 {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 0.25rem;
  color: #f1f5f9;
  letter-spacing: -0.02em;
}

h3 {
  font-size: 0.75rem;
  font-weight: 700;
  margin: 0 0 0.25rem;
  color: #f1f5f9;
  letter-spacing: -0.02em;
}

.tagline {
  font-size: 0.9375rem;
  color: #94a3b8;
  margin: 0;
}

.start-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.875rem 1.25rem;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  color: #0f172a;
  background: linear-gradient(180deg, #22c55e 0%, #16a34a 100%);
  border: none;
  border-radius: 10px;
  box-shadow: 0 2px 12px rgba(34, 197, 94, 0.35);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.start-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(34, 197, 94, 0.45);
  background: linear-gradient(180deg, #2dd66b 0%, #22c55e 100%);
}

.start-btn:active:not(:disabled) {
  transform: translateY(0);
}

.start-btn:disabled {
  opacity: 0.8;
  cursor: not-allowed;
  transform: none;
}

.btn-icon {
  font-size: 0.875rem;
  opacity: 0.9;
}

.error {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  font-size: 0.9375rem;
  color: #fca5a5;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
}

.result {
  margin-top: 1.5rem;
  padding: 1.25rem 1.5rem;
  text-align: left;
}

.result-header {
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.result-badge {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #22c55e;
  padding: 0.2rem 0.5rem;
  background: rgba(34, 197, 94, 0.15);
  border-radius: 4px;
}

.ready-badge {
  color: #22c55e;
  background: rgba(34, 197, 94, 0.2);
}

.checking-badge {
  color: #eab308;
  background: rgba(234, 179, 8, 0.15);
}

.not-ready-badge {
  color: #94a3b8;
  background: rgba(148, 163, 184, 0.15);
}

.ready-status {
  font-size: 0.9375rem;
  color: #22c55e;
  margin: 0.5rem 0 0;
  font-weight: 500;
}

.ready-status .players-count {
  color: #94a3b8;
  font-weight: 400;
}

.status-reason {
  font-size: 0.8125rem;
  color: #94a3b8;
  margin: 0.25rem 0 0;
}

.not-ready-status {
  font-size: 0.875rem;
  color: #94a3b8;
  margin: 0.5rem 0 0;
}

.check-status-btn {
  display: block;
  width: 100%;
  margin-top: 1rem;
  padding: 0.5rem 0.75rem;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  color: #94a3b8;
  background: rgba(51, 65, 85, 0.6);
  border: 1px solid rgba(71, 85, 105, 0.5);
  border-radius: 8px;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.check-status-btn:hover:not(:disabled) {
  color: #e2e8f0;
  background: rgba(71, 85, 105, 0.7);
  border-color: rgba(100, 116, 139, 0.5);
}

.check-status-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}


.ip-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.ip {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 1.125rem;
  font-weight: 600;
  color: #e2e8f0;
  flex: 1;
  min-width: 0;
}

.copy-btn {
  padding: 0.35rem 0.75rem;
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  color: #e2e8f0;
  background: rgba(51, 65, 85, 0.8);
  border: 1px solid rgba(71, 85, 105, 0.6);
  border-radius: 6px;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.copy-btn:hover {
  background: rgba(71, 85, 105, 0.9);
  border-color: rgba(100, 116, 139, 0.6);
}

.copy-btn:active {
  background: rgba(30, 41, 59, 0.95);
}

.status {
  margin: 1rem 0 0;
  padding-top: 0.75rem;
  font-size: 0.8125rem;
  color: #64748b;
  border-top: 1px solid rgba(71, 85, 105, 0.4);
}

.status-dot {
  margin: 0 0.35rem;
  opacity: 0.6;
}

.status-item {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.75rem;
}
</style>
