<script setup>
import { ref } from 'vue'

const LAMBDA_URL = 'https://6yk7rznufd7y7dnbeghcu7rcye0upukf.lambda-url.us-east-2.on.aws/'

const loading = ref(false)
const error = ref(null)
const result = ref(null)
const copied = ref(false)

async function startServer() {
  loading.value = true
  error.value = null
  result.value = null
  try {
    const res = await fetch(LAMBDA_URL, { method: 'POST' })
    if (!res.ok) throw new Error(res.statusText || 'Failed to start server')
    const data = await res.json()
    result.value = {
      instanceId: data.instanceId,
      state: data.state,
      publicIpv4: data.publicIpv4,
    }
  } catch (e) {
    error.value = e.message || 'Failed to start server'
  } finally {
    loading.value = false
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
        </div>
        <div class="ip-row">
          <span class="label">Server IP</span>
          <span class="ip">{{ result.publicIpv4 }}</span>
          <button type="button" class="copy-btn" @click="copyIp">
            {{ copied ? 'Copied!' : 'Copy' }}
          </button>
        </div>
        <p class="status">
          <span class="status-item">State: {{ result.state }}</span>
          <span class="status-dot">·</span>
          <span class="status-item">Instance: {{ result.instanceId }}</span>
        </p>
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
