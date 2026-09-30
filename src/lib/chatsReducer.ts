import type { NotificationBody } from '../api/greenApi'
import { extractText } from '../api/greenApi'
import type { Chat, Message } from '../types'

export type ChatsAction =
  | { type: 'createChat'; phone: string }
  | { type: 'addOutgoing'; chatId: string; message: Message }
  | { type: 'updateMessage'; chatId: string; tempId: string; patch: Partial<Message> }
  | { type: 'notification'; body: NotificationBody; activeChatId: string | null }
  | { type: 'markRead'; chatId: string }
  | { type: 'deleteChat'; chatId: string }

const INCOMING = 'incomingMessageReceived'
const OUTGOING = ['outgoingMessageReceived', 'outgoingAPIMessageReceived']

function phoneFromChatId(chatId: string): string | undefined {
  const m = chatId.match(/^(\d+)@c\.us$/)
  return m?.[1]
}

function findChat(chats: Chat[], maxChatId: string, phone?: string) {
  return chats.find(
    (c) => c.maxChatId === maxChatId || c.id === maxChatId || (phone && c.phone === phone),
  )
}

function applyNotification(chats: Chat[], body: NotificationBody, activeChatId: string | null): Chat[] {
  const isIncoming = body.typeWebhook === INCOMING
  if (!isIncoming && !OUTGOING.includes(body.typeWebhook)) return chats

  const text = extractText(body.messageData)
  const sender = body.senderData
  if (text === null || !sender?.chatId) return chats

  const phone =
    (isIncoming && sender.senderPhoneNumber ? String(sender.senderPhoneNumber) : undefined) ??
    phoneFromChatId(sender.chatId)
  const maxChatId = phoneFromChatId(sender.chatId) ? undefined : sender.chatId

  const message: Message = {
    id: body.idMessage ?? `${body.timestamp}-${Math.random()}`,
    text,
    direction: isIncoming ? 'in' : 'out',
    timestamp: body.timestamp * 1000,
    status: isIncoming ? undefined : 'sent',
  }

  const existing = findChat(chats, sender.chatId, phone)
  if (!existing) {
    // Исходящие из других клиентов в неизвестные чаты не показываем — нам не с чем их связать
    if (!isIncoming) return chats
    const chat: Chat = {
      id: phone ?? sender.chatId,
      phone,
      maxChatId,
      name: sender.chatName || sender.senderName,
      messages: [message],
      unread: 1,
    }
    return [chat, ...chats]
  }

  if (existing.messages.some((m) => m.id === message.id)) {
    return chats
  }

  const updated: Chat = {
    ...existing,
    maxChatId: existing.maxChatId ?? maxChatId,
    phone: existing.phone ?? phone,
    name: existing.name || (isIncoming ? sender.chatName || sender.senderName : undefined),
    messages: [...existing.messages, message].sort((a, b) => a.timestamp - b.timestamp),
    unread: isIncoming && existing.id !== activeChatId ? existing.unread + 1 : existing.unread,
  }
  return [updated, ...chats.filter((c) => c !== existing)]
}

export function chatsReducer(chats: Chat[], action: ChatsAction): Chat[] {
  switch (action.type) {
    case 'createChat': {
      if (chats.some((c) => c.id === action.phone || c.phone === action.phone)) return chats
      return [{ id: action.phone, phone: action.phone, messages: [], unread: 0 }, ...chats]
    }
    case 'addOutgoing': {
      const chat = chats.find((c) => c.id === action.chatId)
      if (!chat) return chats
      const updated = { ...chat, messages: [...chat.messages, action.message] }
      return [updated, ...chats.filter((c) => c !== chat)]
    }
    case 'updateMessage':
      return chats.map((c) => {
        if (c.id !== action.chatId) return c
        // Уведомление outgoingAPIMessageReceived могло прийти раньше ответа sendMessage
        const duplicate = action.patch.id && c.messages.some((m) => m.id === action.patch.id)
        return {
          ...c,
          messages: duplicate
            ? c.messages.filter((m) => m.id !== action.tempId)
            : c.messages.map((m) => (m.id === action.tempId ? { ...m, ...action.patch } : m)),
        }
      })
    case 'notification':
      return applyNotification(chats, action.body, action.activeChatId)
    case 'markRead':
      return chats.map((c) => (c.id === action.chatId && c.unread ? { ...c, unread: 0 } : c))
    case 'deleteChat':
      return chats.filter((c) => c.id !== action.chatId)
  }
}

/** chatId для sendMessage: известный chatId MAX или номер телефона в формате 79991234567@c.us */
export function sendChatId(chat: Chat): string {
  return chat.maxChatId ?? (chat.phone ? `${chat.phone}@c.us` : chat.id)
}
