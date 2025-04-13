export async function notifyDiscord(monitor: any, isUp: boolean) {
  const webhook = process.env.DISCORD_WEBHOOK_URL
  if (!webhook) {
    console.warn('DISCORD_WEBHOOK_URL not set, skipping Discord notification')
    return
  }

  const payload = {
    username: 'Uptime Monitor',
    embeds: [
      {
        title: `${monitor.name} is ${isUp ? 'Operational ✅' : 'Down ❌'}`,
        description: `\`${monitor.method || 'GET'} ${monitor.url}\` - 👀 Status Page`,
        color: isUp ? 0x2ecc71 : 0xe74c3c,
        timestamp: new Date().toISOString(),
      },
    ],
  }

  return fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
