const KEY = 'theme'

export function getTheme() {
  return localStorage.getItem(KEY) || 'dark'
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  // aggiorna la barra di stato iOS / colore tema
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === 'light' ? '#f3f4f8' : '#07070f')
}

export function setTheme(theme) {
  localStorage.setItem(KEY, theme)
  applyTheme(theme)
}
