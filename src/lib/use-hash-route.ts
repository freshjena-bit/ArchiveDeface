'use client'

import * as React from 'react'

export type Route = 'home' | 'archive' | 'ranking' | 'submit' | 'about'

const MAP: Record<string, Route> = {
  '': 'home',
  '/': 'home',
  '/archive': 'archive',
  '/ranking': 'ranking',
  '/submit': 'submit',
  '/about': 'about',
}

function parse(): Route {
  if (typeof window === 'undefined') return 'home'
  const h = window.location.hash.replace(/^#/, '')
  return MAP[h] ?? 'home'
}

export function useHashRoute() {
  const [route, setRoute] = React.useState<Route>(parse)

  React.useEffect(() => {
    const on = () => setRoute(parse())
    window.addEventListener('hashchange', on)
    // normalize empty hash to #/ on first load
    if (!window.location.hash) {
      window.history.replaceState(null, '', '#/')
    }
    setRoute(parse())
    return () => window.removeEventListener('hashchange', on)
  }, [])

  const navigate = React.useCallback((to: string) => {
    const target = to.startsWith('/') ? to : `/${to}`
    if (window.location.hash === `#${target}`) {
      // same route — just scroll top
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    window.location.hash = target
  }, [])

  return { route, navigate }
}
