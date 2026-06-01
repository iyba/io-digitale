const KEY = 'theme'

export function getTheme() {
  return localStorage.getItem(KEY) || 'dark'
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  // aggiorna la barra di stato iOS / colore tema
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === 'light' ? '#eef0f6' : '#1b1b26')
}

export function setTheme(theme) {
  localStorage.setItem(KEY, theme)
  applyTheme(theme)
}
