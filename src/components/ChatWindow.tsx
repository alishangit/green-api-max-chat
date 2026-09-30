import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import type { Chat, Message } from '../types'
import { chatTitle, formatPhone } from '../lib/phone'
import { Avatar } from './Avatar'

const MAX_LENGTH = 4000

interface Props {
  chat: Chat
  onSend: (text: string) => void
  onRetry: (message: Message) => void
  onBack: () => void
}

function StatusIcon({ status }: { status?: Message['status'] }) {
  if (status === 'sending') return <span className="status" title="Отправляется">🕓</span>
  if (status === 'error') return <span className="status error-text" title="Не отправлено">!</span>
  return <span className="status" title="Отправлено">✓</span>
}

const dayLabel = (ts: number) => new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })

export function ChatWindow({ chat, onSend, onRetry, onBack }: Props) {
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [chat.messages.length, chat.id])

  useEffect(() => {
    inputRef.current?.focus()
  }, [chat.id])

  function submit(e?: FormEvent) {
    e?.preventDefault()
    const value = text.trim()
    if (!value) return
    onSend(value)
    setText('')
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) submit(e)
  }

  const title = chatTitle(chat)

  return (
    <section className="chat">
      <header className="chat-header">
        <button className="icon-btn back-btn" onClick={onBack} title="Назад">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <Avatar seed={chat.id} label={title} size={38} />
        <div>
          <div className="chat-header-title">{title}</div>
          {chat.phone && chat.name && <div className="muted small">{formatPhone(chat.phone)}</div>}
        </div>
      </header>

      <div className="messages" ref={listRef}>
        {chat.messages.length === 0 && <div className="messages-empty">Напишите первое сообщение</div>}
        {chat.messages.map((m, i) => {
          const day = dayLabel(m.timestamp)
          const showDay = i === 0 || day !== dayLabel(chat.messages[i - 1].timestamp)
          return (
            <div key={m.id} className="message-row-wrap">
              {showDay && <div className="day-divider"><span>{day}</span></div>}
              <div className={`message-row ${m.direction}`}>
                <div className={`bubble ${m.direction}${m.status === 'error' ? ' failed' : ''}`}>
                  <span className="bubble-text">{m.text}</span>
                  <span className="bubble-meta">
                    {new Date(m.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    {m.direction === 'out' && <StatusIcon status={m.status} />}
                  </span>
                </div>
              </div>
              {m.status === 'error' && (
                <div className="retry">
                  Не удалось отправить. <button className="btn-link" onClick={() => onRetry(m)}>Повторить</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <form className="composer" onSubmit={submit}>
        <textarea
          ref={inputRef}
          rows={1}
          value={text}
          maxLength={MAX_LENGTH}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Сообщение"
        />
        <button className="send-btn" disabled={!text.trim()} title="Отправить">
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M3.4 20.4l17.45-7.48a1 1 0 0 0 0-1.84L3.4 3.6a1 1 0 0 0-1.39 1.2L4.5 12l-2.49 7.2a1 1 0 0 0 1.39 1.2z" fill="currentColor" /></svg>
        </button>
      </form>
    </section>
  )
}
