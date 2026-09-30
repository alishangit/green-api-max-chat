import { useState } from 'react'
import { chatTitle } from '../lib/phone'
import type { Chat } from '../types'
import { Avatar } from './Avatar'
import { NewChatForm } from './NewChatForm'

interface Props {
  chats: Chat[]
  activeChatId: string | null
  idInstance: string
  onSelect: (id: string) => void
  onCreate: (phone: string) => void
  onLogout: () => void
}

function formatTime(ts: number) {
  const d = new Date(ts)
  const today = new Date().toDateString() === d.toDateString()
  return today
    ? d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
}

export function Sidebar({ chats, activeChatId, idInstance, onSelect, onCreate, onLogout }: Props) {
  const [creating, setCreating] = useState(false)

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <div>
          <div className="sidebar-title">Чаты</div>
          <div className="muted small">Инстанс {idInstance}</div>
        </div>
        <div className="sidebar-actions">
          <button className="icon-btn" title="Новый чат" onClick={() => setCreating((v) => !v)}>
            <svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
          <button className="icon-btn" title="Выйти" onClick={onLogout}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
          </button>
        </div>
      </header>

      {creating && (
        <NewChatForm
          onCancel={() => setCreating(false)}
          onCreate={(phone) => {
            onCreate(phone)
            setCreating(false)
          }}
        />
      )}

      <ul className="chat-list">
        {chats.length === 0 && !creating && (
          <li className="empty-list">
            Чатов пока нет.
            <button className="btn-link" onClick={() => setCreating(true)}>Создать новый чат</button>
          </li>
        )}
        {chats.map((chat) => {
          const last = chat.messages[chat.messages.length - 1]
          const title = chatTitle(chat)
          return (
            <li key={chat.id}>
              <button className={`chat-item${chat.id === activeChatId ? ' active' : ''}`} onClick={() => onSelect(chat.id)}>
                <Avatar seed={chat.id} label={title} />
                <div className="chat-item-body">
                  <div className="chat-item-top">
                    <span className="chat-item-title">{title}</span>
                    {last && <span className="chat-item-time">{formatTime(last.timestamp)}</span>}
                  </div>
                  <div className="chat-item-bottom">
                    <span className="chat-item-preview">
                      {last ? `${last.direction === 'out' ? 'Вы: ' : ''}${last.text}` : 'Нет сообщений'}
                    </span>
                    {chat.unread > 0 && <span className="badge">{chat.unread}</span>}
                  </div>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
