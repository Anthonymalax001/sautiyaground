const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'https://sautiyaground.onrender.com'

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`)
  return result
}
