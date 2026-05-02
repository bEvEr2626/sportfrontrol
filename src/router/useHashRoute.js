import { useEffect, useMemo, useState } from 'react'

const normalizeHash = (hash) => {
  if (!hash) return ''
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  return raw.trim()
}

export const useHashRoute = (routesConfig) => {
  const routes = useMemo(() => routesConfig, [routesConfig])

  const getCurrentPath = () => {
    const current = normalizeHash(window.location.hash)
    // allow "#/sports" and "#sports"
    if (!current) return routes.default
    if (routes.byKey[current]) return current
    if (current.startsWith('/')) {
      const withoutSlash = current.slice(1)
      if (routes.byKey[withoutSlash]) return withoutSlash
    }
    return routes.default
  }

  const [routeKey, setRouteKey] = useState(getCurrentPath)

  useEffect(() => {
    const onHashChange = () => setRouteKey(getCurrentPath())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const route = routes.byKey[routeKey] || routes.byKey[routes.default]

  return { routeKey, route }
}
