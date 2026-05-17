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
        statuses?: Array<{
          id?: string
          status?: string
          recipient_id?: string
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
