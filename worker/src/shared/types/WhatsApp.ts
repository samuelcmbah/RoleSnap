export type WhatsAppWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          from?: string
          type?: string
          text?: {
            body?: string
          }
        }>
      }
    }>
  }>
}

export type IncomingWhatsAppMessage = {
  from: string
  type: string
  text?: string
}
