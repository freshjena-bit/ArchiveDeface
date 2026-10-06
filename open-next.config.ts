import type { OpenNextConfig } from '@opennextjs/cloudflare'

const config: OpenNextConfig = {
  default: {
    override: {
      // Prisma + node:crypto need the Node compat flag (set in wrangler.jsonc)
      wrapper: 'node',
      converter: 'node',
      incrementalCache: false,
    },
  },
}

export default config
