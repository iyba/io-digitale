import { useState, useEffect } from 'react'

export const WMO = {
  0:  { icon: '☀️', label: 'Sereno',                    rain: false },
  1:  { icon: '🌤️', label: 'Prevalentemente sereno',    rain: false },
  2:  { icon: '⛅',  label: 'Parzialmente nuvoloso',     rain: false },
  3:  { icon: '☁️', label: 'Nuvoloso',                   rain: false },
  45: { icon: '🌫️', label: 'Nebbia',                    rain: false },
  48: { icon: '🌫️', label: 'Nebbia',                    rain: false },
  51: { icon: '🌦️', label: 'Pioggerella',               rain: true  },
  53: { icon: '🌦️', label: 'Pioggerella',               rain: true  },
  55: { icon: '🌧️', label: 'Pioggerella forte',         rain: true  },
  61: { icon: '🌧️', label: 'Pioggia leggera',           rain: true  },
  63: { icon: '🌧️', label: 'Pioggia',                   rain: true  },
  65: { icon: '🌧️', label: 'Pioggia intensa',           rain: true  },
  71: { icon: '🌨️', label: 'Neve leggera',              rain: true  },
  73: { icon: '❄️',  label: 'Neve',                     rain: true  },
  75: { icon: '❄️',  label: 'Neve intensa',             rain: true  },
  77: { icon: '🌨️', label: 'Nevischio',                 rain: true  },
  80: { icon: '🌦️', label: 'Rovesci',                   rain: true  },
  81: { icon: '🌧️', label: 'Rovesci moderati',          rain: true  },
  82: { icon: '⛈️', label: 'Rovesci forti',             rain: true  },
  85: { icon: '🌨️', label: 'Neve',                      rain: true  },
  86: { icon: '❄️',  label: 'Neve intensa',             rain: true  },
  95: { icon: '⛈️', label: 'Temporale',                 rain: true  },
  96: { icon: '⛈️', label: 'Temporale con grandine',    rain: true  },
  99: { icon: '⛈️', label: 'Temporale forte',           rain: true  },
}

export function outdoorAlert(code, rainProb) {
  const w = WMO[code] ?? WMO[0]
  if (w.rain)         return { level: 'bad',  msg: `${w.icon} ${w.label} — attività all'aperto sconsigliata` }
  if (rainProb >= 70) return { level: 'bad',  msg: `🌧️ Alta probabilità di pioggia (${rainProb}%)` }
  if (rainProb >= 40) return { level: 'warn', msg: `🌦️ Possibile pioggia (${rainProb}%) — controlla prima` }
  return null
}

const CACHE_KEY  = 'weather_v1'
const COORDS_KEY = 'weather_coords'
const CACHE_TTL  = 30 * 60 * 1000 // 30 min

async function fetchWeather(lat, lon) {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
    `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&timezone=auto&forecast_days=7`
  const json = await (await fetch(url)).json()
  return {
    current: {
      temp:  Math.round(json.current.temperature_2m),
      feels: Math.round(json.current.apparent_temperature),
      code:  json.current.weather_code,
      wind:  Math.round(json.current.wind_speed_10m),
    },
    today: {
      max:      Math.round(json.daily.temperature_2m_max[0]),
      min:      Math.round(json.daily.temperature_2m_min[0]),
      rainProb: json.daily.precipitation_probability_max[0] ?? 0,
    },
    week: json.daily.time.map((date, i) => ({
      date,
      code:     json.daily.weather_code[i],
      max:      Math.round(json.daily.temperature_2m_max[i]),
      rainProb: json.daily.precipitation_probability_max[i] ?? 0,
    })),
  }
}

export function useWeather() {
  const [weather, setWeather] = useState(() => {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE_KEY))
      if (c && Date.now() - c.ts < CACHE_TTL) return c.data
    } catch {}
    return null
  })
  const [status, setStatus] = useState(weather ? 'ok' : 'idle')

  useEffect(() => {
    if (weather) return

    // If we have saved coordinates, fetch weather silently (no permission prompt)
    try {
      const saved = JSON.parse(localStorage.getItem(COORDS_KEY))
      if (saved?.lat && saved?.lon) {
        fetchWeather(saved.lat, saved.lon)
          .then(data => {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
            setWeather(data)
            setStatus('ok')
          })
          .catch(() => setStatus('idle'))
        return
      }
    } catch {}

    setStatus('idle') // show "tap to enable" button
  }, [])

  // Called when user explicitly taps the weather button
  async function requestWeather() {
    if (!navigator.geolocation) { setStatus('no-geo'); return }
    setStatus('loading')
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lon } }) => {
        try {
          localStorage.setItem(COORDS_KEY, JSON.stringify({ lat, lon }))
          const data = await fetchWeather(lat, lon)
          localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
          setWeather(data)
          setStatus('ok')
        } catch { setStatus('error') }
      },
      () => setStatus('denied'),
      { timeout: 8000 }
    )
  }

  return { weather, status, requestWeather }
}
