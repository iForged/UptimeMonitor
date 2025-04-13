import { workerConfig } from '../../uptime.config'
import { getWorkerLocation } from './util'
import { MonitorState, MonitorTarget } from '../../uptime.types'
import { getStatus } from './monitor'
import { notifyDiscord } from './components/discord'

export interface Env {
  UPTIMEFLARE_STATE: KVNamespace
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const workerLocation = (await getWorkerLocation()) || 'ERROR'
    console.log(`Running scheduled event on ${workerLocation}...`)

    // Read state, set init state if it doesn't exist
    let state =
      ((await env.UPTIMEFLARE_STATE.get('state', {
        type: 'json',
      })) as unknown as MonitorState) ||
      ({
        version: 1,
        lastUpdate: 0,
        overallUp: 0,
        overallDown: 0,
        incident: {},
        latency: {},
      } as MonitorState)
    state.overallDown = 0
    state.overallUp = 0

    let statusChanged = false
    const currentTimeSecond = Math.round(Date.now() / 1000)

    // Check each monitor
    for (const monitor of workerConfig.monitors) {
      console.log(`[${workerLocation}] Checking ${monitor.name}...`)

      let monitorStatusChanged = false
      let checkLocation = workerLocation
      let status

      if (monitor.checkProxy) {
        // Initiate a check using proxy (Geo-specific check)
        try {
          console.log('Calling check proxy: ' + monitor.checkProxy)
          const resp = await (
            await fetch(monitor.checkProxy, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(monitor),
            })
          ).json<{ location: string; status: { ping: number; up: boolean; err: string } }>()
          checkLocation = resp.location
          status = resp.status
        } catch (err) {
          console.log('Error calling proxy: ' + err)
          if (monitor.checkProxyFallback) {
            console.log('Falling back to local check...')
            status = await getStatus(monitor)
          } else {
            status = { ping: 0, up: false, err: 'Error initiating check from remote worker' }
          }
        }
      } else {
        // Initiate a check from the current location
        status = await getStatus(monitor)
      }

      const currentTimeSecond = Math.round(Date.now() / 1000)

      // Update counters
      status.up ? state.overallUp++ : state.overallDown++

      // Update incidents
      state.incident[monitor.id] = state.incident[monitor.id] || [
        {
          start: [currentTimeSecond],
          end: currentTimeSecond,
          error: ['dummy'],
        },
      ]
      let lastIncident = state.incident[monitor.id].slice(-1)[0]

      if (status.up) {
        // Current status is up
        if (lastIncident.end === undefined) {
          lastIncident.end = currentTimeSecond
          monitorStatusChanged = true
          try {
            // Отправляем уведомление в Discord
            await notifyDiscord(monitor, true)
          } catch (e) {
            console.log('Error sending Discord notification for UP status: ', e)
          }
        }
      } else {
        // Current status is down
        if (lastIncident.end !== undefined) {
          state.incident[monitor.id].push({
            start: [currentTimeSecond],
            end: undefined,
            error: [status.err],
          })
          monitorStatusChanged = true
        } else if (
          lastIncident.end === undefined &&
          lastIncident.error.slice(-1)[0] !== status.err
        ) {
          lastIncident.start.push(currentTimeSecond)
          lastIncident.error.push(status.err)
          monitorStatusChanged = true
        }

        const currentIncident = state.incident[monitor.id].slice(-1)[0]
        try {
          if (monitorStatusChanged) {
            await notifyDiscord(monitor, false)
          }
        } catch (e) {
          console.log('Error sending Discord notification for DOWN status: ', e)
        }
      }

      // Append to latency data
      let latencyLists = state.latency[monitor.id] || {
        recent: [],
      }
      latencyLists.all = []

      const record = {
        loc: checkLocation,
        ping: status.ping,
        time: currentTimeSecond,
      }
      latencyLists.recent.push(record)

      // Discard old data
      while (latencyLists.recent[0]?.time < currentTimeSecond - 12 * 60 * 60) {
        latencyLists.recent.shift()
      }
      state.latency[monitor.id] = latencyLists

      // Discard old incidents
      let incidentList = state.incident[monitor.id]
      while (incidentList.length > 0 && incidentList[0].end && incidentList[0].end < currentTimeSecond - 90 * 24 * 60 * 60) {
        incidentList.shift()
      }

      if (incidentList.length == 0 || (
        incidentList[0].start[0] > currentTimeSecond - 90 * 24 * 60 * 60 &&
        incidentList[0].error[0] != 'dummy'
      )) {
        incidentList.unshift({
          start: [currentTimeSecond - 90 * 24 * 60 * 60],
          end: currentTimeSecond - 90 * 24 * 60 * 60,
          error: ['dummy'],
        })
      }
      state.incident[monitor.id] = incidentList

      statusChanged ||= monitorStatusChanged
    }

    console.log(`statusChanged: ${statusChanged}, lastUpdate: ${state.lastUpdate}, currentTime: ${currentTimeSecond}`)
    if (
      statusChanged ||
      currentTimeSecond - state.lastUpdate >= workerConfig.kvWriteCooldownMinutes * 60 - 10
    ) {
      console.log("Updating state...")
      state.lastUpdate = currentTimeSecond
      await env.UPTIMEFLARE_STATE.put('state', JSON.stringify(state))
    } else {
      console.log("Skipping state update due to cooldown period.")
    }
  },
}
