function requireWebhookUrl(value, label) {
  const url = String(value || '').trim()
  if (!url) {
    throw new Error(`${label} n'est pas configure dans les variables d'environnement.`)
  }
  return url
}

async function triggerWebhook(url, body = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Webhook n8n en erreur (${response.status})`)
  }

  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function triggerMainContentPipeline(payload = {}) {
  const url = requireWebhookUrl(import.meta.env?.VITE_N8N_MAIN_PIPELINE_WEBHOOK, 'Le webhook du main pipeline')
  return triggerWebhook(url, payload)
}

export async function triggerCheckShotstackWorkflow(payload = {}) {
  const url = requireWebhookUrl(import.meta.env?.VITE_N8N_CHECK_SHOTSTACK_WEBHOOK, 'Le webhook de check Shotstack')
  return triggerWebhook(url, payload)
}

export async function triggerPublishTikTokWorkflow(payload = {}) {
  const url = requireWebhookUrl(import.meta.env?.VITE_N8N_PUBLISH_TIKTOK_WEBHOOK, 'Le webhook de publish TikTok')
  return triggerWebhook(url, payload)
}
