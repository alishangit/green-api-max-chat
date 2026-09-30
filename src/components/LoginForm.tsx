import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { getStateInstance } from '../api/greenApi'
import type { Credentials } from '../types'

const DEFAULT_API_URL = 'https://api.green-api.com'

/** Берёт последний http(s)-адрес из строки — на случай, если адрес вставили поверх другого */
function normalizeApiUrl(value: string): string | null {
  const matches = value.trim().match(/https?:\/\/[^\s]+?(?=https?:\/\/|\s|$)/g)
  const url = matches?.[matches.length - 1]
  if (!url) return value.trim() ? null : DEFAULT_API_URL
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

const STATE_HINTS: Record<string, string> = {
  notAuthorized: 'инстанс не авторизован — отсканируйте QR-код в личном кабинете GREEN-API',
  blocked: 'аккаунт заблокирован',
  starting: 'инстанс запускается, попробуйте через пару минут',
  yellowCard: 'отправка сообщений временно ограничена',
}

export function LoginForm({ onLogin }: { onLogin: (creds: Credentials) => void }) {
  const [form, setForm] = useState<Credentials>({ apiUrl: '', idInstance: '', apiTokenInstance: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof Credentials) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!/^\d+$/.test(form.idInstance.trim())) {
      setError('idInstance — это число со страницы инстанса, например 7107000000')
      return
    }
    if (/\s/.test(form.apiTokenInstance.trim()) || form.apiTokenInstance.includes('://')) {
      setError('apiTokenInstance — длинная строка из букв и цифр со страницы инстанса')
      return
    }
    const apiUrl = normalizeApiUrl(form.apiUrl)
    if (!apiUrl) {
      setError('Некорректный apiUrl. Скопируйте его со страницы инстанса, например https://7107.api.greenapi.com')
      return
    }
    setForm((f) => ({ ...f, apiUrl }))
    setLoading(true)
    const creds = {
      apiUrl,
      idInstance: form.idInstance.trim(),
      apiTokenInstance: form.apiTokenInstance.trim(),
    }
    try {
      const { stateInstance } = await getStateInstance(creds)
      if (stateInstance !== 'authorized') {
        setError(`Статус инстанса: ${stateInstance}${STATE_HINTS[stateInstance] ? ` — ${STATE_HINTS[stateInstance]}` : ''}`)
        return
      }
      onLogin(creds)
    } catch (err) {
      setError(err instanceof TypeError ? 'Не удалось подключиться к GREEN-API. Проверьте apiUrl и сеть.' : (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="logo">MAX</div>
        <h1>Вход в чат</h1>
        <p className="muted">Введите данные инстанса из личного кабинета GREEN-API</p>

        <label>
          idInstance
          <input value={form.idInstance} onChange={set('idInstance')} placeholder="7107000000" inputMode="numeric" required autoFocus />
        </label>
        <label>
          apiTokenInstance
          <input value={form.apiTokenInstance} onChange={set('apiTokenInstance')} placeholder="d75b3a66374942c5b3c019c698abc2067e151558acbd412345" type="password" required />
        </label>
        <label>
          apiUrl
          <input value={form.apiUrl} onChange={set('apiUrl')} placeholder="https://7107.api.greenapi.com" type="url" inputMode="url" />
        </label>

        {error && <div className="error">{error}</div>}

        <button className="btn-primary" disabled={loading}>
          {loading ? 'Проверяем…' : 'Войти'}
        </button>
      </form>
    </div>
  )
}
