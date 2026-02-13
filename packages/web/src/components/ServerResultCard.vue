<script setup>
import { MC_JOIN_HOSTNAME, getUpdateDnsUrl } from '../config/constants.js'

defineProps({
  result: { type: Object, default: null },
  minecraftReady: { type: [Boolean, Object], default: null },
  statusLoading: { type: Boolean, default: false },
  isPolling: { type: Boolean, default: false },
  showProgress: { type: Boolean, default: false },
  barCompleting: { type: Boolean, default: false },
  minecraftStage: { type: [String, Object], default: null },
  minecraftError: { type: [String, Object], default: null },
  minecraftSignals: { type: Object, default: null },
  minecraftRcon: { type: Object, default: null },
  minecraftLogTail: { type: [String, Object], default: null },
  playersOnline: { type: Number, default: null },
  playersMax: { type: Number, default: null },
  copied: { type: String, default: null },
  dnsUpdateStatus: { type: String, default: 'idle' },
  dnsUpdateError: { type: [String, Object], default: null },
})

defineEmits(['copy', 'update-dns', 'check-status', 'refresh'])

const updateDnsUrl = getUpdateDnsUrl()
</script>

<template>
  <div class="result card">
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
    <slot name="progress" />
    <div class="ip-row">
      <span class="label">Server IP</span>
      <span class="ip">{{ result.publicIpv4 || 'NA' }}</span>
      <button
        type="button"
        class="copy-btn"
        aria-label="Copy server IP"
        :disabled="!result.publicIpv4"
        @click="$emit('copy', result.publicIpv4, 'ip')"
      >
        {{ copied === 'ip' ? '✓' : '⧉' }}
      </button>
    </div>
    <div class="ip-row">
      <span class="label">Join by IP</span>
      <span class="ip">{{ result.publicIpv4 ? `${result.publicIpv4}:25565` : 'NA' }}</span>
      <button
        type="button"
        class="copy-btn"
        aria-label="Copy join address (IP)"
        :disabled="!result.publicIpv4"
        @click="$emit('copy', `${result.publicIpv4}:25565`, 'address')"
      >
        {{ copied === 'address' ? '✓' : '⧉' }}
      </button>
    </div>
    <div class="ip-row ip-row--stacked">
      <span class="label">Join by hostname</span>
      <span class="ip">{{ MC_JOIN_HOSTNAME }}</span>
      <button
        type="button"
        class="copy-btn"
        aria-label="Copy join address (hostname)"
        @click="$emit('copy', MC_JOIN_HOSTNAME, 'hostname')"
      >
        {{ copied === 'hostname' ? '✓' : '⧉' }}
      </button>
    </div>
    <p class="propagation-note">Address propagation can take up to 5 minutes.</p>
    <p v-if="dnsUpdateStatus === 'pending'" class="dns-status">Updating DNS…</p>
    <p v-else-if="dnsUpdateStatus === 'ok'" class="dns-status dns-ok">DNS record updated.</p>
    <p v-else-if="dnsUpdateStatus === 'error'" class="dns-status dns-error">DNS update failed: {{ dnsUpdateError }}</p>
    <button
      v-if="result?.publicIpv4 && updateDnsUrl"
      type="button"
      class="update-dns-btn"
      :disabled="dnsUpdateStatus === 'pending'"
      @click="$emit('update-dns', result.publicIpv4)"
    >
      {{ dnsUpdateStatus === 'pending' ? 'Updating…' : (dnsUpdateStatus === 'error' ? 'Retry DNS update' : 'Update DNS again') }}
    </button>
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
      @click="$emit('check-status')"
    >
      {{ statusLoading || isPolling ? 'Checking…' : 'Check status now' }}
    </button>
  </div>
</template>

<style scoped>
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
  flex-shrink: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.ip-row--stacked {
  row-gap: 0.2rem;
}

.ip-row--stacked .label {
  flex-basis: 100%;
}

.ip {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 1.125rem;
  font-weight: 600;
  color: #e2e8f0;
  flex: 1;
  min-width: 0;
}

.ip-row--stacked .ip {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.copy-btn {
  flex-shrink: 0;
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

.propagation-note {
  margin: 0.75rem 0 0;
  font-size: 0.8125rem;
  color: #94a3b8;
}

.dns-status {
  margin: 0.35rem 0 0;
  font-size: 0.8125rem;
  color: #94a3b8;
}

.dns-status.dns-ok {
  color: #86efac;
}

.dns-status.dns-error {
  color: #fca5a5;
}

.update-dns-btn {
  display: inline-block;
  margin-top: 0.5rem;
  padding: 0.4rem 0.7rem;
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  color: #94a3b8;
  background: rgba(51, 65, 85, 0.6);
  border: 1px solid rgba(71, 85, 105, 0.5);
  border-radius: 8px;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.update-dns-btn:hover:not(:disabled) {
  color: #e2e8f0;
  background: rgba(71, 85, 105, 0.7);
  border-color: rgba(100, 116, 139, 0.5);
}

.update-dns-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
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
