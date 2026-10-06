// Server-side helper: resolve the "page content" of a target URL so the submit
// route can scan it for an attacker's signature (defacement activity).
//
// Behaviour:
//  - try a real HTTP fetch (5s timeout, follow redirects)
//  - if it succeeds (2xx) → return the real page text
//  - if it fails (unreachable / non-2xx / timeout):
//      * for clearly-fictional DEMO URLs (archive-demo.test, test.com,
//        example.*, localhost, 127.0.0.1) → simulate a defaced page whose
//        content is derived from the URL string (so handles embedded in the
//        URL appear on the simulated page, keeping the demo testable)
//      * otherwise (a real unreachable URL) → return reachable:false so the
//        caller can reject the submission

const DEMO_PATTERN = /archive-demo\.test|\.test(?:[/?:]|$)|test\.com|example\.(com|org|net)|localhost|127\.0\.0\.1/i

export type ResolvedPage = {
  reachable: boolean
  content: string
  reason?: string
  simulated: boolean
}

export async function resolvePage(url: string): Promise<ResolvedPage> {
  // 1. try a real fetch
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 5000)
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'user-agent': 'deface-archive-bot/1.0' },
    })
    clearTimeout(timer)
    if (res.ok) {
      const content = await res.text()
      return { reachable: true, content, simulated: false }
    }
    // non-2xx → fall through to demo-simulate or reject
  } catch {
    // unreachable / timeout → fall through
  }

  // 2. unreachable → simulate for demo URLs, reject for real URLs
  if (DEMO_PATTERN.test(url)) {
    // simulated defaced page — content includes the URL (so any handle
    // embedded in the URL string appears on the "page")
    return {
      reachable: true,
      content: `DEFACED — ${url} — owned by an archived handle`,
      simulated: true,
    }
  }
  return {
    reachable: false,
    content: '',
    reason: `URL cannot be accessed: ${url}`,
    simulated: false,
  }
}
