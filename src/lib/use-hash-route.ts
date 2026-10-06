'use client'

import * as React from 'react'

export type Route = 'home' | 'archive' | 'special' | 'ranking' | 'submit' | 'about' | 'defacer'

const HEAD_MAP: Record<string, Route> = {
  '': 'home',
  archive: 'archive',
  special: 'special',
  ranking: 'ranking',
  submit: 'submit',
  about: 'about',
  defacer: 'defacer',
}

function parse(): { route: Route; param: string | null } {
  if (typeof window === 'undefined') return { route: 'home', param: null }
  // hash looks like "#/defacer/n0vakane" → strip "#", split on "/"
  const h = window.location.hash.replace(/^#/, '')
  const parts = h.split('/').filter(Boolean)
  const head = parts[0] ?? ''
  const route = HEAD_MAP[head] ?? 'home'
  const param = route === 'defacer' ? decodeURIComponent(parts[1] ?? '') || null : null
  return { route, param }
}

export function useHashRoute() {
  const [state, setState] = React.useState<{ route: Route; param: string | null }>(parse)

  React.useEffect(() => {
    const on = () => setState(parse())
    window.addEventListener('hashchange', on)
    // normalize empty hash to #/ on first load
    if (!window.location.hash) {
      window.history.replaceState(null, '', '#/')
    }
    setState(parse())
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

  return { route: state.route, param: state.param, navigate }
}
