/**
 * Get human-readable detail for a given stage.
 * @param {string|null} stage - Minecraft server stage
 * @returns {string}
 */
export function getPollingDetail(stage) {
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

/**
 * Build polling summary from stage and signals.
 * @param {{ stage?: string|null, signals?: { java_running?: boolean, mc_port_listening?: boolean, rcon_port_listening?: boolean }|null, rcon?: { ok?: boolean }|null }} ctx
 * @returns {string}
 */
export function getPollingSummary(ctx) {
  const { stage, signals, rcon } = ctx
  const parts = [getPollingDetail(stage)]
  if (signals?.java_running === true) parts.push('Java on')
  if (signals?.mc_port_listening === true) parts.push('Game port open')
  if (signals?.rcon_port_listening === true) parts.push('RCON port open')
  if (rcon?.ok === true) parts.push('RCON ready')
  return parts.join(' · ')
}
