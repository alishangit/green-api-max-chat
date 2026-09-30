import { useCallback, useEffect, useReducer, useState } from 'react'
import { sendMessage } from './api/greenApi'
import type { NotificationBody } from './api/greenApi'
import { ChatWindow } from './components/ChatWindow'
import { LoginForm } from './components/LoginForm'
import { Sidebar } from './components/Sidebar'
import { useNotifications } from './hooks/useNotifications'
import { chatsReducer, sendChatId } from './lib/chatsReducer'
import { load, save } from './lib/storage'
import type { Chat, Credentials, Message } from './types'

const CREDS_KEY = 'green-api:credentials'
const chatsKey = (idInstance: string) => `green-api:chats:${idInstance}`

export default function App() {
  const [creds, setCreds] = useState<Credentials | null>(() => load<Credentials | null>(CREDS_KEY, null))

  const handleLogin = (c: Credentials) => {
    save(CREDS_KEY, c)
    setCreds(c)
  }
  const handleLogout = () => {
    save(CREDS_KEY, null)
    setCreds(null)
  }

  if (!creds) return <LoginForm onLogin={handleLogin} />
  return <Messenger key={creds.idInstance} creds={creds} onLogout={handleLogout} />
}

function Messenger({ creds, onLogout }: { creds: Credentials; onLogout: () => void }) {
  const [chats, dispatch] = useReducer(chatsReducer, creds.idInstance, (id) => load<Chat[]>(chatsKey(id), []))
  const [activeChatId, setActiveChatId] = useState<string | null>(null)

  useEffect(() => save(chatsKey(creds.idInstance), chats), [chats, creds.idInstance])

  const onNotification = useCallback(
    (body: NotificationBody) => dispatch({ type: 'notification', body, activeChatId }),
    [activeChatId],
  )
  const pollError = useNotifications(creds, onNotification)

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null

  function selectChat(id: string) {
    setActiveChatId(id)
    dispatch({ type: 'markRead', chatId: id })
  }

  async function deliver(chat: Chat, message: Message) {
    try {
      const { idMessage } = await sendMessage(creds, sendChatId(chat), message.text)
      dispatch({ type: 'updateMessage', chatId: chat.id, tempId: message.id, patch: { id: idMessage, status: 'sent' } })
    } catch {
      dispatch({ type: 'updateMessage', chatId: chat.id, tempId: message.id, patch: { status: 'error' } })
    }
  }

  function handleSend(text: string) {
    if (!activeChat) return
    const message: Message = { id: `local-${crypto.randomUUID()}`, text, direction: 'out', timestamp: Date.now(), status: 'sending' }
    dispatch({ type: 'addOutgoing', chatId: activeChat.id, message })
    deliver(activeChat, message)
  }

  function handleRetry(message: Message) {
    if (!activeChat) return
    dispatch({ type: 'updateMessage', chatId: activeChat.id, tempId: message.id, patch: { status: 'sending' } })
    deliver(activeChat, message)
  }

  return (
    <div className={`app${activeChat ? ' has-active' : ''}`}>
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        idInstance={creds.idInstance}
        onSelect={selectChat}
        onCreate={(phone) => {
          dispatch({ type: 'createChat', phone })
          const existing = chats.find((c) => c.phone === phone)
          selectChat(existing?.id ?? phone)
        }}
        onLogout={onLogout}
      />
      <main className="main">
        {pollError && <div className="banner">Нет связи с GREEN-API: {pollError}. Повторяем попытку…</div>}
        {activeChat ? (
          <ChatWindow chat={activeChat} onSend={handleSend} onRetry={handleRetry} onBack={() => setActiveChatId(null)} />
        ) : (
          <div className="placeholder">
            <div className="logo big">MAX</div>
            <p>Выберите чат или создайте новый по номеру телефона</p>
          </div>
        )}
      </main>
    </div>
  )
}
