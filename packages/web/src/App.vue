<script setup>
import AppHeader from './components/AppHeader.vue'
import ServerResultCard from './components/ServerResultCard.vue'
import ProgressSection from './components/ProgressSection.vue'
import { useServerController } from './composables/useServerController.js'

const ctrl = useServerController()

function handleCopy(text, kind) {
  ctrl.copyText(text, kind)
}

function handleUpdateDns(ipv4) {
  ctrl.updateDns(ipv4)
}

function handleGetDns() {
  ctrl.getDns()
}
</script>

<template>
  <div class="app">
    <div class="card main-card">
      <AppHeader />

      <button
        v-if="ctrl.result?.value?.state !== 'running'"
        type="button"
        class="start-btn"
        :disabled="ctrl.loading?.value || ctrl.initialLoading?.value"
        @click="ctrl.startServer"
      >
        <span class="btn-icon">{{ ctrl.loading?.value ? '⋯' : '▶' }}</span>
        {{ ctrl.loading?.value ? 'Starting…' : 'Start MC Server' }}
      </button>
      <button
        v-else
        type="button"
        class="start-btn refresh-btn"
        :disabled="ctrl.refreshLoading?.value"
        @click="ctrl.checkInitialState('refresh')"
      >
        <span class="btn-icon">{{ ctrl.refreshLoading?.value ? '⋯' : '↻' }}</span>
        {{ ctrl.refreshLoading?.value ? 'Refreshing…' : 'Refresh server state' }}
      </button>

      <p v-if="ctrl.initialLoading?.value && !ctrl.result?.value" class="loading">Checking current server state…</p>
      <p v-if="ctrl.error?.value" class="error">{{ ctrl.error?.value }}</p>

      <ServerResultCard
        v-if="ctrl.result?.value"
        :result="ctrl.result?.value"
        :minecraft-ready="ctrl.minecraftReady?.value"
        :status-loading="ctrl.statusLoading?.value ?? false"
        :is-polling="ctrl.isPolling?.value ?? false"
        :show-progress="ctrl.showProgress?.value ?? false"
        :bar-completing="ctrl.barCompleting?.value ?? false"
        :minecraft-stage="ctrl.minecraftStage?.value"
        :minecraft-error="ctrl.minecraftError?.value"
        :minecraft-signals="ctrl.minecraftSignals?.value"
        :minecraft-rcon="ctrl.minecraftRcon?.value"
        :minecraft-log-tail="ctrl.minecraftLogTail?.value"
        :players-online="ctrl.playersOnline?.value"
        :players-max="ctrl.playersMax?.value"
        :copied="ctrl.copied?.value"
        :dns-update-status="ctrl.dnsUpdateStatus?.value ?? 'idle'"
        :dns-update-error="ctrl.dnsUpdateError?.value"
        :get-dns-status="ctrl.getDnsStatus?.value ?? 'idle'"
        :get-dns-error="ctrl.getDnsError?.value"
        :get-dns-value="ctrl.getDnsValue?.value"
        @copy="handleCopy"
        @update-dns="handleUpdateDns"
        @get-dns="handleGetDns"
        @check-status="ctrl.checkStatusManual"
      >
        <template #progress>
          <ProgressSection
            :show-progress="ctrl.showProgress?.value ?? false"
            :bar-completing="ctrl.barCompleting?.value ?? false"
            :poll-progress-percent="ctrl.pollProgressPercent"
            :get-polling-summary-value="ctrl.getPollingSummaryValue"
            :minecraft-stage="ctrl.minecraftStage?.value"
            :minecraft-error="ctrl.minecraftError?.value"
            :minecraft-signals="ctrl.minecraftSignals?.value"
            :minecraft-rcon="ctrl.minecraftRcon?.value"
            :minecraft-log-tail="ctrl.minecraftLogTail?.value"
          />
        </template>
      </ServerResultCard>
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
</style>
