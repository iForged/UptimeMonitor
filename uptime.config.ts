const pageConfig = {
  // Title for your status page
  title: "GlobalSRV Status Page",
  // Links shown at the header of your status page, could set `highlight` to `true`
  links: [
    { link: 'https://globalsrv.net', label: 'Web' },
    { link: 'https://discord.com/users/forged5909', label: 'Contact me', highlight: true },
  ],
  // [OPTIONAL] Group your monitors
  // If not specified, all monitors will be shown in a single list
  // If specified, monitors will be grouped and ordered, not-listed monitors will be invisble (but still monitored)
  group: {
    "🌐 Fplay": ['fplay_web', 'fplay_master'],
    "🌐 WEB Services": ['vs_web', 'vs_map'],
    "🗄️ Servers": ['vs_server'],
  },
}

const workerConfig = {
  // Write KV at most every 3 minutes unless the status changed
  kvWriteCooldownMinutes: 3,
  // Enable HTTP Basic auth for status page & API by uncommenting the line below, format `<USERNAME>:<PASSWORD>`
  // passwordProtection: 'username:password',
  // Define all your monitors here
  monitors: [
    {
      id: 'fplay_web',
      name: 'FPlay Web',
      method: 'GET',
      target: 'https://fplay.su',
    },
    {
      id: 'fplay_master',
      name: 'FPlay Master Server',
      method: 'GET',
      expectedCodes: [403],
      target: 'http://dev.fplay.free.hr/api/',
    },
    {
      id: 'vs_web',
      name: 'VintageStory Web',
      method: 'GET',
      target: 'https://vs.globalsrv.net',
    },
    {
      id: 'vs_map',
      name: 'VintageStory Map',
      method: 'GET',
      target: 'https://vs-map.globalsrv.net',
    },  
    {
      id: 'vs_server',
      name: 'VintageStory Server',
      method: 'TCP_PING',
      target: '185.9.145.2:42420',
    },
    
    // Example HTTP Monitor
    ///{
      // `id` should be unique, history will be kept if the `id` remains constant
      ///id: 'foo_monitor',
      // `name` is used at status page and callback message
      ///name: 'My API Monitor',
      // `method` should be a valid HTTP Method
      ///method: 'POST',
      // `target` is a valid URL
      ///target: 'https://example.com',
      // [OPTIONAL] `tooltip` is ONLY used at status page to show a tooltip
      ///tooltip: 'This is a tooltip for this monitor',
      // [OPTIONAL] `statusPageLink` is ONLY used for clickable link at status page
      ///statusPageLink: 'https://example.com',
      // [OPTIONAL] `hideLatencyChart` will hide status page latency chart if set to true
      ///hideLatencyChart: false,
      // [OPTIONAL] `expectedCodes` is an array of acceptable HTTP response codes, if not specified, default to 2xx
      ///expectedCodes: [200],
      // [OPTIONAL] `timeout` in millisecond, if not specified, default to 10000
      ///timeout: 10000,
      // [OPTIONAL] headers to be sent
      ///headers: {
        ///'User-Agent': 'Uptimeflare',
        ///Authorization: 'Bearer YOUR_TOKEN_HERE',
      ///},
      // [OPTIONAL] body to be sent
      ///body: 'Hello, world!',
      // [OPTIONAL] if specified, the response must contains the keyword to be considered as operational.
      ///responseKeyword: 'success',
      // [OPTIONAL] if specified, the response must NOT contains the keyword to be considered as operational.
      ///responseForbiddenKeyword: 'bad gateway',
      // [OPTIONAL] if specified, the check will run in your specified region,
      // refer to docs https://github.com/lyc8503/UptimeFlare/wiki/Geo-specific-checks-setup before setting this value
      ///checkLocationWorkerRoute: 'https://xxx.example.com',
    ///},
    // Example TCP Monitor
    ///{
      ///id: 'test_tcp_monitor',
      ///name: 'Example TCP Monitor',
      // `method` should be `TCP_PING` for tcp monitors
      ///method: 'TCP_PING',
      // `target` should be `host:port` for tcp monitors
      ///target: '1.2.3.4:22',
      ///tooltip: 'My production server SSH',
      ///statusPageLink: 'https://example.com',
      ///timeout: 5000,
    ///},
  ],
  callbacks: {
  onStatusChange: /* @__PURE__ */ __name(async (env, monitor, isUp, timeIncidentStart, timeNow, reason) => {
    try {
      await notifyDiscord(monitor, isUp);
    } catch (e) {
      console.error("Failed to send Discord notification:", e);
    }
  }, "onStatusChange"),
  onIncident: /* @__PURE__ */ __name(async (env, monitor, timeIncidentStart, timeNow, reason) => {
  }, "onIncident")
}

// Don't forget this, otherwise compilation fails.
export { pageConfig, workerConfig }
