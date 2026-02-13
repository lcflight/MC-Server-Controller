<script setup>
defineProps({
  showProgress: { type: Boolean, default: false },
  barCompleting: { type: Boolean, default: false },
  pollProgressPercent: { type: Function, required: true },
  getPollingSummaryValue: { type: Function, required: true },
  minecraftStage: { type: [String, Object], default: null },
  minecraftError: { type: [String, Object], default: null },
  minecraftSignals: { type: Object, default: null },
  minecraftRcon: { type: Object, default: null },
  minecraftLogTail: { type: [String, Object], default: null },
})
</script>

<template>
  <section v-if="showProgress" class="progress-section">
    <div class="polling-status" :class="{ 'bar-completing': barCompleting }">
      <div class="polling-row">
        <span class="spinner" aria-hidden="true"></span>
        <span class="polling-text">
          {{ getPollingSummaryValue() }}
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
</template>

<style scoped>
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
</style>
