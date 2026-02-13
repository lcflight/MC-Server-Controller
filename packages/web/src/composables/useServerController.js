import { ref, onMounted, onUnmounted } from 'vue'
import { parsePlayersFromStdout } from '../utils/players.js'
import { getPollingSummary } from '../utils/polling.js'
import { getUpdateDnsUrl, POLL_INTERVAL_MS, POLL_TIMEOUT_MS } from '../config/constants.js'
import { fetchStatus, fetchState, startServer as apiStartServer } from '../api/server.js'

const POLL_TIMEOUT_SECONDS = Math.ceil(POLL_TIMEOUT_MS / 1000)

export function useServerController() {
  const loading = ref(false)
  const initialLoading = ref(false)
  const refreshLoading = ref(false)
  const error = ref(null)
  const result = ref(null)
  const copied = ref(null)
  const dnsUpdateStatus = ref('idle')
  const dnsUpdateError = ref(null)

  const statusLoading = ref(false)
  const minecraftReady = ref(null)
  const minecraftReason = ref(null)
  const minecraftStage = ref(null)
  const minecraftSignals = ref(null)
  const minecraftRcon = ref(null)
  const minecraftLogTail = ref(null)
  const minecraftError = ref(null)
  const showProgress = ref(false)
  const barCompleting = ref(false)
  const playersOnline = ref(null)
  const playersMax = ref(null)
  const isPolling = ref(false)
  const pollElapsedSeconds = ref(0)

  let pollTimer = null
  let pollStartedAt = null
  let pollElapsedTimer = null
  let progressHideTimer = null

  function resetMinecraftState(unknownReady = false) {
    minecraftReady.value = unknownReady ? null : false
    minecraftReason.value = null
    minecraftStage.value = null
    minecraftSignals.value = null
    minecraftRcon.value = null
    minecraftLogTail.value = null
    minecraftError.value = null
    playersOnline.value = null
    playersMax.value = null
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
      if (updateReady) resetMinecraftState()
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
    resetMinecraftState()
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

  function pollProgressPercent() {
    if (!pollStartedAt) return 0
    return Math.min(100, Math.round((pollElapsedSeconds.value / POLL_TIMEOUT_SECONDS) * 100))
  }

  function getPollingSummaryValue() {
    return getPollingSummary({
      stage: minecraftStage.value || minecraftReason.value,
      signals: minecraftSignals.value,
      rcon: minecraftRcon.value,
    })
  }

  async function updateDns(ipv4) {
    const UPDATE_DNS_URL = getUpdateDnsUrl()
    if (!ipv4) return
    if (!UPDATE_DNS_URL) {
      dnsUpdateStatus.value = 'error'
      dnsUpdateError.value = 'API URL not configured'
      return
    }
    dnsUpdateStatus.value = 'pending'
    dnsUpdateError.value = null
    try {
      const r = await fetch(UPDATE_DNS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ ipv4 }),
      })
      const data = await r.json().catch(() => ({}))
      if (r.ok && data?.ok === true) {
        dnsUpdateStatus.value = 'ok'
      } else {
        dnsUpdateStatus.value = 'error'
        dnsUpdateError.value =
          data?.error || data?.detail || (r.ok ? 'Invalid response from server' : r.statusText)
      }
    } catch (e) {
      dnsUpdateStatus.value = 'error'
      dnsUpdateError.value = e.message || 'Request failed'
    }
  }

  async function startServer() {
    loading.value = true
    error.value = null
    result.value = null
    dnsUpdateStatus.value = 'idle'
    dnsUpdateError.value = null
    resetMinecraftState()
    stopPolling()
    try {
      const data = await apiStartServer()
      result.value = {
        instanceId: data.instanceId,
        state: data.state,
        publicIpv4: data.publicIpv4,
      }
      updateDns(data.publicIpv4)
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
        dnsUpdateStatus.value = 'idle'
        dnsUpdateError.value = null
        resetMinecraftState(true)
        await checkStatus(true)
      } else if (data?.state) {
        result.value = {
          instanceId: data.instanceId,
          state: data.state,
          publicIpv4: data.publicIp ?? null,
        }
        dnsUpdateStatus.value = 'idle'
        dnsUpdateError.value = null
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
    resetMinecraftState(true)
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
  onMounted(() => checkInitialState('initial'))

  return {
    loading,
    initialLoading,
    refreshLoading,
    error,
    result,
    copied,
    dnsUpdateStatus,
    dnsUpdateError,
    statusLoading,
    minecraftReady,
    minecraftReason,
    minecraftStage,
    minecraftSignals,
    minecraftRcon,
    minecraftLogTail,
    minecraftError,
    showProgress,
    barCompleting,
    playersOnline,
    playersMax,
    isPolling,
    pollElapsedSeconds,
    startServer,
    checkInitialState,
    checkStatusManual,
    copyText,
    updateDns,
    pollProgressPercent,
    getPollingSummaryValue,
  }
}
