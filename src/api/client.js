const getApiBaseUrl = () => {
  const fromEnv = import.meta.env.VITE_API_BASE_URL
  if (!fromEnv) {
    throw new Error('VITE_API_BASE_URL is not set')
  }
  return fromEnv.replace(/\/+$/, '')
}

const joinUrl = (baseUrl, path) => {
  if (!path) return baseUrl
  if (path.startsWith('/')) return `${baseUrl}${path}`
  return `${baseUrl}/${path}`
}

export const API_BASE_URL = getApiBaseUrl()

const formatValidationErrors = (validationErrors) => {
  if (!validationErrors || typeof validationErrors !== 'object') {
    return ''
  }
  const entries = Object.entries(validationErrors)
  if (!entries.length) return ''
  return ' (' + entries.map(([field, message]) => field + ': ' + message).join(', ') + ')'
}

export const apiFetch = async (path, options = {}) => {
  const headers = new Headers(options.headers || {})
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(joinUrl(API_BASE_URL, path), {
    ...options,
    headers,
  })

  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')

  const payload = isJson ? await response.json() : null

  if (!response.ok) {
    const validation = formatValidationErrors(payload?.validationErrors)
    const message = payload?.message || payload?.error || response.statusText
    throw new Error(`${message}${validation}`)
  }

  return payload
}

export const withAbortSignal = (promise, { signal }) => {
  if (!signal) return promise
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(new DOMException('Aborted', 'AbortError'))
    signal.addEventListener('abort', onAbort, { once: true })
    promise
      .then((value) => {
        signal.removeEventListener('abort', onAbort)
        resolve(value)
      })
      .catch((err) => {
        signal.removeEventListener('abort', onAbort)
        reject(err)
      })
  })
}
