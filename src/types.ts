export interface Credentials {
  apiUrl: string
  idInstance: string
  apiTokenInstance: string
}

export type MessageDirection = 'in' | 'out'
export type MessageStatus = 'sending' | 'sent' | 'error'

export interface Message {
  id: string
  text: string
  direction: MessageDirection
  timestamp: number
  status?: MessageStatus
}

export interface Chat {
  /** Локальный ключ чата — номер телефона (только цифры) или chatId MAX, если номер неизвестен */
  id: string
  phone?: string
  /** Идентификатор чата в MAX (например, "10000000"), узнаём из входящих уведомлений */
  maxChatId?: string
  name?: string
  messages: Message[]
  unread: number
}
