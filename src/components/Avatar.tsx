const COLORS = ['#7b61ff', '#2d9cff', '#ff6b8b', '#20b486', '#ff9f43', '#a55eea']

export function Avatar({ seed, label, size = 44 }: { seed: string; label: string; size?: number }) {
  const hash = [...seed].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  const letters = label.replace(/[^\p{L}\d]/gu, '').slice(0, 2).toUpperCase() || '?'
  return (
    <div className="avatar" style={{ width: size, height: size, background: COLORS[hash % COLORS.length] }}>
      {/^\d/.test(letters) ? letters.slice(-2) : letters}
    </div>
  )
}
