import { useEffect, useRef, useState } from 'react'
import type { NotificationBody } from '../api/greenApi'
import { deleteNotification, receiveNotification } from '../api/greenApi'
import type { Credentials } from '../types'

const RECEIVE_TIMEOUT_SEC = 20
const RETRY_DELAY_MS = 3000

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(t)
      resolve()
    })
  })

/**
 * Получение входящих уведомлений через HTTP API (long polling):
 * ReceiveNotification -> обработка -> DeleteNotification.
 */
export function useNotifications(creds: Credentials, onNotification: (body: NotificationBody) => void) {
  const [error, setError] = useState<string | null>(null)
  const handlerRef = useRef(onNotification)

  useEffect(() => {
    handlerRef.current = onNotification
  })

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    ;(async () => {
      while (!signal.aborted) {
        try {
          const notification = await receiveNotification(creds, RECEIVE_TIMEOUT_SEC, signal)
          setError(null)
          if (!notification) continue
          try {
            handlerRef.current(notification.body)
          } finally {
            await deleteNotification(creds, notification.receiptId, signal)
          }
        } catch (e) {
          if (signal.aborted) break
          setError(e instanceof Error ? e.message : 'Ошибка получения сообщений')
          await sleep(RETRY_DELAY_MS, signal)
        }
      }
    })()

    return () => controller.abort()
  }, [creds])

  return error
}
