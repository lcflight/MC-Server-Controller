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
    <h1>MC Server Controller</h1>
    <button
      type="button"
      class="start-btn"
      :disabled="loading"
      @click="startServer"
    >
      {{ loading ? 'Starting…' : 'Start MC Server' }}
    </button>

    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="result" class="result">
      <div class="ip-row">
        <span class="label">Server IP:</span>
        <span class="ip">{{ result.publicIpv4 }}</span>
        <button type="button" class="copy-btn" @click="copyIp">
          {{ copied ? 'Copied!' : 'Copy' }}
        </button>
      </div>
      <p class="status">
        State: {{ result.state }} · Instance: {{ result.instanceId }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.app {
  max-width: 32rem;
  margin: 2rem auto;
  padding: 0 1rem;
  font-family: system-ui, sans-serif;
}
h1 {
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
}
.start-btn {
  padding: 0.5rem 1rem;
  font-size: 1rem;
  cursor: pointer;
  background: #42b883;
  color: #fff;
  border: none;
  border-radius: 0.25rem;
}
.start-btn:hover:not(:disabled) {
  background: #359268;
}
.start-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.error {
  margin-top: 1rem;
  color: #c00;
}
.result {
  margin-top: 1.5rem;
  padding: 1rem;
  background: #f5f5f5;
  border-radius: 0.25rem;
}
.ip-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.label {
  font-weight: 600;
}
.ip {
  font-family: ui-monospace, monospace;
  font-size: 1.1rem;
}
.copy-btn {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
  background: #35495e;
  color: #fff;
  border: none;
  border-radius: 0.25rem;
}
.copy-btn:hover {
  background: #243342;
}
.status {
  margin: 0.5rem 0 0;
  font-size: 0.875rem;
  color: #666;
}
</style>
