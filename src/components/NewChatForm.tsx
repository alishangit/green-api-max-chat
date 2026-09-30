import { useState } from 'react'
import type { FormEvent } from 'react'
import { normalizePhone } from '../lib/phone'

export function NewChatForm({ onCreate, onCancel }: { onCreate: (phone: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const phone = normalizePhone(value)
    if (!phone) {
      setError('Введите номер в международном формате, например 79991234567')
      return
    }
    onCreate(phone)
  }

  return (
    <form className="new-chat" onSubmit={handleSubmit}>
      <input
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setError(null)
        }}
        placeholder="Номер телефона получателя"
        inputMode="tel"
        autoFocus
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
      />
      {error && <div className="error small">{error}</div>}
      <div className="new-chat-actions">
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Отмена
        </button>
        <button className="btn-primary">Создать чат</button>
      </div>
    </form>
  )
}
