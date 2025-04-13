//import { notifyDiscord } from './discord';

const pageConfig = {
  // Title for your status page
  title: "GlobalSRV Status Page",
  // Links shown at the header of your status page, could set `highlight` to `true`
  links: [
    { link: 'https://globalsrv.net', label: 'Web' },
    { link: 'https://discord.com/users/forged5909', label: 'Contact me', highlight: true },
  ],
  // [OPTIONAL] Group your monitors
  group: {
    "🌐 Fplay": ['fplay_web', 'fplay_master'],
    "🌐 WEB Services": ['vs_web', 'vs_map'],
    "🗄️ Servers": ['vs_server'],
  },
};

const workerConfig = {
  kvWriteCooldownMinutes: 3,
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
  ],

  callbacks: {
    onStatusChange: async (env, monitor, isUp, timeIncidentStart, timeNow, reason) => {
      try {
        await notifyDiscord(monitor, isUp);
      } catch (e) {
        console.error("Failed to send Discord notification:", e);
      }
    },

    onIncident: async (env, monitor, timeIncidentStart, timeNow, reason) => {
      try {
        const durationMs = timeNow - timeIncidentStart;
        const durationMinutes = Math.floor(durationMs / 60000);
        const modifiedMonitor = {
          ...monitor,
          name: `${monitor.name} (Still Down — ${durationMinutes} min)`,
        };
        await notifyDiscord(modifiedMonitor, false);
      } catch (e) {
        console.error("Failed to send repeat Discord notification:", e);
      }
    },
  },
};

export { pageConfig, workerConfig };
