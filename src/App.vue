<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const START_URL = 'https://6yk7rznufd7y7dnbeghcu7rcye0upukf.lambda-url.us-east-2.on.aws/'
const STATUS_URL = 'https://tctml2n2ct5eskfsgmvld6x2lq0xaqbc.lambda-url.us-east-2.on.aws/'
const STATE_URL = 'https://oi4y6ecythpjrueovwlktyjrsq0eiymd.lambda-url.us-east-2.on.aws/state'

const POLL_INTERVAL_MS = 5_000
const POLL_TIMEOUT_MS = 90_000

const loading = ref(false)
const initialLoading = ref(false)
const refreshLoading = ref(false)
const error = ref(null)
const result = ref(null)
const copied = ref(null)

const statusLoading = ref(false)
const minecraftReady = ref(null) // null = unknown, false = checking/not ready, true = ready
const minecraftReason = ref(null)
const minecraftStage = ref(null)
const minecraftSignals = ref(null)
const minecraftRcon = ref(null)
const minecraftLogTail = ref(null)
const minecraftError = ref(null)
const showProgress = ref(false)
const barCompleting = ref(false)
const playersOnline = ref(null) // number when known
const playersMax = ref(null) // number when known
const isPolling = ref(false)
const pollElapsedSeconds = ref(0)
let pollTimer = null
let pollStartedAt = null
let pollElapsedTimer = null
let progressHideTimer = null

// "There are 2 of a max of 20 players online: ..." (from RCON output)
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

async function fetchState() {
  const res = await fetch(STATE_URL, { method: 'GET' })
  if (!res.ok) throw new Error(res.statusText || 'Failed to fetch state')
  return res.json()
}

async function checkStatus(updateReady = true, setLoading = true) {
  if (setLoading) statusLoading.value = true
  try {
    const data = await fetchStatus()
    const minecraft = data?.minecraft ?? {}
    const readyFlag = minecraft?.readyToJoin
    const ready =
      readyFlag === true ||
      readyFlag === 'true' ||
      data?.ssm?.stdout?.includes('__MC_READY__')
    const reason = minecraft?.stage ?? null
    const { online, max } = parsePlayersFromStdout(minecraft?.rcon?.out)
    if (updateReady) {
      minecraftReady.value = ready
      minecraftReason.value = reason
      minecraftStage.value = minecraft?.stage ?? null
      minecraftSignals.value = minecraft?.signals ?? null
      minecraftRcon.value = minecraft?.rcon ?? null
      minecraftLogTail.value = minecraft?.logTail ?? null
      minecraftError.value = minecraft?.error ?? null
      playersOnline.value = online
      playersMax.value = max
    }
    return { ready, reason, online, max, data }
  } catch (e) {
    if (updateReady) {
      minecraftReady.value = false
      minecraftReason.value = null
      minecraftStage.value = null
      minecraftSignals.value = null
      minecraftRcon.value = null
      minecraftLogTail.value = null
      minecraftError.value = null
      playersOnline.value = null
      playersMax.value = null
    }
    throw e
  } finally {
    if (setLoading) statusLoading.value = false
  }
}

function stopPolling() {
  if (pollTimer) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
  if (pollElapsedTimer) {
    clearInterval(pollElapsedTimer)
    pollElapsedTimer = null
  }
  if (progressHideTimer) {
    clearTimeout(progressHideTimer)
    progressHideTimer = null
  }
  pollStartedAt = null
  isPolling.value = false
  pollElapsedSeconds.value = 0
  showProgress.value = false
  barCompleting.value = false
}

function startStatusPolling() {
  stopPolling()
  minecraftReady.value = false
  minecraftReason.value = null
  minecraftStage.value = null
  minecraftSignals.value = null
  minecraftRcon.value = null
  minecraftLogTail.value = null
  minecraftError.value = null
  playersOnline.value = null
  playersMax.value = null
  showProgress.value = true
  barCompleting.value = false
  isPolling.value = true
  pollStartedAt = Date.now()
  pollElapsedSeconds.value = 0
  pollElapsedTimer = setInterval(() => {
    if (!pollStartedAt) return
    pollElapsedSeconds.value = Math.floor((Date.now() - pollStartedAt) / 1000)
  }, 1000)

  async function poll() {
    if (!pollStartedAt) return
    const elapsed = Date.now() - pollStartedAt
    if (elapsed >= POLL_TIMEOUT_MS) {
      stopPolling()
      return
    }
    try {
      const { ready } = await checkStatus(true, false)
      if (ready) {
        barCompleting.value = true
        isPolling.value = false
        pollStartedAt = null
        if (pollTimer) {
          clearTimeout(pollTimer)
          pollTimer = null
        }
        if (pollElapsedTimer) {
          clearInterval(pollElapsedTimer)
          pollElapsedTimer = null
        }
        progressHideTimer = setTimeout(() => {
          showProgress.value = false
          barCompleting.value = false
        }, 650)
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

const POLL_TIMEOUT_SECONDS = Math.ceil(POLL_TIMEOUT_MS / 1000)

function pollProgressPercent() {
  if (!pollStartedAt) return 0
  return Math.min(100, Math.round((pollElapsedSeconds.value / POLL_TIMEOUT_SECONDS) * 100))
}

function getPollingDetail() {
  const stage = minecraftStage.value || minecraftReason.value
  if (stage === 'ssm_in_progress') return 'Waiting for SSM status'
  if (stage === 'missing_mc_dir') return 'Server path is not configured'
  if (stage === 'missing_mcrcon') return 'mcrcon is not installed on the server'
  if (stage === 'starting_process') return 'Starting Java process'
  if (stage === 'port_open') return 'Minecraft port is open'
  if (stage === 'rcon_listen') return 'RCON port is listening'
  if (stage === 'loading_world') return 'Loading world'
  if (stage === 'preparing_spawn') return 'Preparing spawn area'
  if (stage === 'started') return 'Server started, waiting for RCON'
  return 'Waiting for the Minecraft server to accept connections'
}

function getPollingSummary() {
  const parts = [getPollingDetail()]
  if (minecraftSignals.value?.java_running === true) parts.push('Java on')
  if (minecraftSignals.value?.mc_port_listening === true) parts.push('Game port open')
  if (minecraftSignals.value?.rcon_port_listening === true) parts.push('RCON port open')
  if (minecraftRcon.value?.ok === true) parts.push('RCON ready')
  return parts.join(' · ')
}

async function startServer() {
  loading.value = true
  error.value = null
  result.value = null
  minecraftReady.value = null
  minecraftReason.value = null
  minecraftStage.value = null
  minecraftSignals.value = null
  minecraftRcon.value = null
  minecraftLogTail.value = null
  minecraftError.value = null
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

async function checkInitialState(kind = 'initial') {
  if (kind === 'initial') initialLoading.value = true
  if (kind === 'refresh') refreshLoading.value = true
  error.value = null
  try {
    const data = await fetchState()
    if (data?.state === 'running' && data?.publicIp) {
      result.value = {
        instanceId: data.instanceId,
        state: data.state,
        publicIpv4: data.publicIp,
      }
      minecraftReady.value = null
      minecraftReason.value = null
      minecraftStage.value = null
      minecraftSignals.value = null
      minecraftRcon.value = null
      minecraftLogTail.value = null
      minecraftError.value = null
      playersOnline.value = null
      playersMax.value = null
      await checkStatus(true)
    } else if (data?.state) {
      result.value = {
        instanceId: data.instanceId,
        state: data.state,
        publicIpv4: data.publicIp ?? null,
      }
    } else if (kind === 'refresh') {
      result.value = null
    }
  } catch (e) {
    error.value = e.message || 'Failed to fetch current state'
  } finally {
    if (kind === 'initial') initialLoading.value = false
    if (kind === 'refresh') refreshLoading.value = false
  }
}

async function checkStatusManual() {
  if (isPolling.value) return
  statusLoading.value = true
  error.value = null
  minecraftReady.value = null
  minecraftReason.value = null
  minecraftStage.value = null
  minecraftSignals.value = null
  minecraftRcon.value = null
  minecraftLogTail.value = null
  minecraftError.value = null
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

async function copyText(text, kind) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    copied.value = kind
    setTimeout(() => {
      if (copied.value === kind) copied.value = null
    }, 1500)
  } catch {
    // ignore clipboard errors
  }
}

onUnmounted(stopPolling)

onMounted(() => {
  checkInitialState('initial')
})
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
        v-if="result?.state !== 'running'"
        type="button"
        class="start-btn"
        :disabled="loading || initialLoading"
        @click="startServer"
      >
        <span class="btn-icon">{{ loading ? '⋯' : '▶' }}</span>
        {{ loading ? 'Starting…' : 'Start MC Server' }}
      </button>
      <button
        v-else
        type="button"
        class="start-btn refresh-btn"
        :disabled="refreshLoading"
        @click="checkInitialState('refresh')"
      >
        <span class="btn-icon">{{ refreshLoading ? '⋯' : '↻' }}</span>
        {{ refreshLoading ? 'Refreshing…' : 'Refresh server state' }}
      </button>

      <p v-if="initialLoading && !result" class="loading">Checking current server state…</p>
      <p v-if="error" class="error">{{ error }}</p>

      <div v-if="result" class="result card">
        <div class="result-header">
          <span
            class="result-badge"
            :class="result.state === 'running' ? 'ready-badge' : 'not-ready-badge'"
          >
            {{ result.state === 'running' ? 'Online' : 'Offline' }}
          </span>
          <span v-if="result.state === 'running' && minecraftReady === true" class="result-badge ready-badge">Ready to join</span>
          <span v-else-if="result.state === 'running' && (statusLoading || isPolling)" class="result-badge checking-badge">Checking…</span>
          <span v-else-if="result.state === 'running' && minecraftReady === false" class="result-badge not-ready-badge">Not yet ready</span>
        </div>
        <section v-if="result.state === 'running' && showProgress" class="progress-section">
          <div class="polling-status" :class="{ 'bar-completing': barCompleting }">
          <div class="polling-row">
            <span class="spinner" aria-hidden="true"></span>
            <span class="polling-text">
              {{ getPollingSummary() }}
            </span>
          </div>
          <div class="polling-bar">
            <span
              class="polling-bar-fill"
              :class="{ 'bar-complete': barCompleting }"
              :style="{ width: barCompleting ? '100%' : `${pollProgressPercent()}%` }"
            ></span>
          </div>
          <details
            v-if="minecraftStage || minecraftError || minecraftSignals || minecraftRcon || minecraftLogTail"
            class="polling-details"
          >
            <summary>Details</summary>
            <div class="polling-extra">
              <p v-if="minecraftStage" class="status-reason">Stage: {{ minecraftStage }}</p>
              <p v-if="minecraftError" class="error-inline">Error: {{ minecraftError }}</p>
              <div v-if="minecraftSignals" class="signals">
                <span class="signal">Java: {{ minecraftSignals.java_running ? 'running' : 'off' }}</span>
                <span class="signal">Game port: {{ minecraftSignals.mc_port_listening ? 'open' : 'closed' }}</span>
                <span class="signal">RCON port: {{ minecraftSignals.rcon_port_listening ? 'open' : 'closed' }}</span>
                <span v-if="minecraftSignals.uptime_s != null" class="signal">Uptime: {{ minecraftSignals.uptime_s }}s</span>
              </div>
              <p v-if="minecraftRcon" class="status-reason">
                RCON: {{ minecraftRcon.ok ? 'ok' : 'not ready' }} · port {{ minecraftRcon.port }}
              </p>
              <details v-if="minecraftLogTail" class="log-details">
                <summary>Logs</summary>
                <pre class="log-tail">{{ minecraftLogTail }}</pre>
              </details>
            </div>
          </details>
          </div>
        </section>
        <div class="ip-row">
          <span class="label">Server IP</span>
          <span class="ip">{{ result.publicIpv4 || 'NA' }}</span>
          <button
            type="button"
            class="copy-btn"
            aria-label="Copy server IP"
            :disabled="!result.publicIpv4"
            @click="copyText(result.publicIpv4, 'ip')"
          >
            {{ copied === 'ip' ? '✓' : '⧉' }}
          </button>
        </div>
        <div class="ip-row">
          <span class="label">server address</span>
          <span class="ip">{{ result.publicIpv4 ? `${result.publicIpv4}:25565` : 'NA' }}</span>
          <button
            type="button"
            class="copy-btn"
            aria-label="Copy server address"
            :disabled="!result.publicIpv4"
            @click="copyText(`${result.publicIpv4}:25565`, 'address')"
          >
            {{ copied === 'address' ? '✓' : '⧉' }}
          </button>
        </div>
        <p v-if="minecraftReady === true" class="ready-status">
          Ready to join
          <span v-if="playersOnline != null && playersMax != null" class="players-count"> · {{ playersOnline }} of {{ playersMax }} players online</span>
        </p>
        <p v-else-if="minecraftReady === false && !statusLoading && !isPolling" class="not-ready-status">Minecraft is not yet ready.</p>
        <p class="status">
          <span class="status-item">State: {{ result.state }}</span>
          <span class="status-dot">·</span>
          <span class="status-item">Instance: {{ result.instanceId }}</span>
        </p>
        <button
          type="button"
          class="check-status-btn"
          :disabled="result.state !== 'running' || isPolling || statusLoading"
          @click="checkStatusManual"
        >
          {{ statusLoading || isPolling ? 'Checking…' : 'Check status now' }}
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

.refresh-btn {
  background: linear-gradient(180deg, #38bdf8 0%, #0ea5e9 100%);
  box-shadow: 0 2px 12px rgba(14, 165, 233, 0.35);
}

.refresh-btn:hover:not(:disabled) {
  box-shadow: 0 4px 20px rgba(14, 165, 233, 0.45);
  background: linear-gradient(180deg, #60d2ff 0%, #38bdf8 100%);
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

.loading {
  margin-top: 1rem;
  font-size: 0.9375rem;
  color: #94a3b8;
}

.polling-status {
  margin: 0.75rem 0 0.5rem;
  padding: 0.75rem;
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 10px;
  transition: opacity 0.35s ease, transform 0.35s ease;
}

.progress-section {
  margin-bottom: 0.75rem;
}

.polling-status.bar-completing {
  opacity: 0;
  transform: translateY(-4px);
}

.polling-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #e2e8f0;
  font-size: 0.875rem;
  font-weight: 500;
}

.polling-text {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.polling-bar {
  position: relative;
  height: 6px;
  margin-top: 0.5rem;
  background: rgba(71, 85, 105, 0.35);
  border-radius: 999px;
  overflow: hidden;
}

.polling-bar-fill {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #eab308 0%, #22c55e 100%);
  transition: width 0.25s ease;
}

.polling-bar-fill.bar-complete {
  transition: width 0.2s ease;
}

.polling-details {
  margin-top: 0.45rem;
}

.polling-details summary {
  list-style: none;
  cursor: pointer;
  font-size: 0.75rem;
  color: #94a3b8;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.polling-details summary::before {
  content: '▸';
  font-size: 0.7rem;
  opacity: 0.8;
  transform: translateY(-0.5px);
  transition: transform 0.15s ease;
}

.polling-details[open] summary::before {
  transform: rotate(90deg) translateX(-1px);
}

.polling-extra {
  margin-top: 0.45rem;
  padding-top: 0.55rem;
  border-top: 1px dashed rgba(148, 163, 184, 0.2);
}

.spinner {
  flex-shrink: 0;
  box-sizing: border-box;
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid rgba(148, 163, 184, 0.35);
  border-top-color: #eab308;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
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

.error-inline {
  font-size: 0.8125rem;
  color: #fca5a5;
  margin: 0.25rem 0 0;
}

.signals {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.5rem;
  margin-top: 0.35rem;
}

.signal {
  font-size: 0.75rem;
  color: #94a3b8;
  background: rgba(148, 163, 184, 0.12);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 999px;
  padding: 0.2rem 0.5rem;
}

.log-tail {
  margin: 0.6rem 0 0;
  padding: 0.6rem 0.75rem;
  font-size: 0.75rem;
  color: #cbd5f5;
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  white-space: pre-wrap;
  max-height: 200px;
  overflow: auto;
}

.log-details {
  margin-top: 0.5rem;
}

.log-details summary {
  list-style: none;
  cursor: pointer;
  font-size: 0.75rem;
  color: #94a3b8;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.log-details summary::before {
  content: '▸';
  font-size: 0.7rem;
  opacity: 0.8;
  transform: translateY(-0.5px);
  transition: transform 0.15s ease;
}

.log-details[open] summary::before {
  transform: rotate(90deg) translateX(-1px);
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

.ip-row + .ip-row {
  margin-top: 0.5rem;
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
  padding: 0.35rem 0.6rem;
  font-family: inherit;
  font-size: 0.95rem;
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

.copy-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
