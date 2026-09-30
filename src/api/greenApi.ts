import type { Credentials } from '../types'

export interface SenderData {
  chatId: string
  sender?: string
  senderName?: string
  chatName?: string
  senderPhoneNumber?: number
}

export interface MessageData {
  typeMessage: string
  textMessageData?: { textMessage: string }
  extendedTextMessageData?: { text: string }
}

export interface NotificationBody {
  typeWebhook: string
  timestamp: number
  idMessage?: string
  senderData?: SenderData
  messageData?: MessageData
}

export interface Notification {
  receiptId: number
  body: NotificationBody
}

export class GreenApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function methodUrl({ apiUrl, idInstance, apiTokenInstance }: Credentials, method: string, suffix = '') {
  const base = apiUrl.trim().replace(/\/+$/, '')
  return `${base}/waInstance${idInstance.trim()}/${method}/${apiTokenInstance.trim()}${suffix}`
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const details = text && !text.trimStart().startsWith('<') && text.length < 300 ? `: ${text}` : ''
    const message =
      res.status === 401 || res.status === 403
        ? 'Неверный idInstance или apiTokenInstance'
        : res.status === 404
          ? 'Инстанс не найден — проверьте idInstance и apiUrl'
          : res.status === 429
            ? 'Слишком много запросов к GREEN-API, подождите немного'
            : `Ошибка GREEN-API (${res.status})${details}`
    throw new GreenApiError(message, res.status)
  }
  const text = await res.text()
  return (text ? JSON.parse(text) : null) as T
}

export function getStateInstance(creds: Credentials, signal?: AbortSignal) {
  return request<{ stateInstance: string }>(methodUrl(creds, 'getStateInstance'), { signal })
}

/** https://green-api.com/v3/docs/api/sending/SendMessage/ */
export function sendMessage(creds: Credentials, chatId: string, message: string) {
  return request<{ idMessage: string }>(methodUrl(creds, 'sendMessage'), {
    method: 'POST',
    body: JSON.stringify({ chatId, message }),
  })
}

/** https://green-api.com/v3/docs/api/receiving/technology-http-api/ReceiveNotification/ */
export function receiveNotification(creds: Credentials, receiveTimeout: number, signal?: AbortSignal) {
  return request<Notification | null>(
    methodUrl(creds, 'receiveNotification', `?receiveTimeout=${receiveTimeout}`),
    { signal },
  )
}

/** https://green-api.com/v3/docs/api/receiving/technology-http-api/DeleteNotification/ */
export function deleteNotification(creds: Credentials, receiptId: number, signal?: AbortSignal) {
  return request<{ result: boolean }>(methodUrl(creds, 'deleteNotification', `/${receiptId}`), {
    method: 'DELETE',
    signal,
  })
}

export function extractText(data?: MessageData): string | null {
  if (!data) return null
  return data.textMessageData?.textMessage ?? data.extendedTextMessageData?.text ?? null
}
