import { db } from '@/lib/db'

/**
 * Lazy promotion: any on-hold record whose verification window has elapsed
 * (pendingUntil < now) is promoted to "archived" (verified).
 * Called at the start of read routes so promotions happen as data is viewed.
 */
export async function promoteDueOnhold(): Promise<void> {
  try {
    await db.defacement.updateMany({
      where: {
        status: 'onhold',
        pendingUntil: { lt: new Date() },
      },
      data: {
        status: 'archived',
        pendingUntil: null,
      },
    })
  } catch {
    // non-fatal — reads should still succeed
  }
}
