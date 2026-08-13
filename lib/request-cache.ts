// Module-level request cache with in-flight de-duplication.
//
// Why this exists:
//  - The Health Trends dashboard keeps all fetched data in React component
//    state. When the user navigates away and comes back, the dashboard
//    unmounts and remounts, wiping that state, so every return re-hit the
//    backend APIs from scratch.
//  - Parallel loads (e.g. Self's reports firing while a remount races) could
//    also trigger the SAME request more than once at the same time.
//
// Because this cache lives at module scope, it survives component remounts
// within the same browser session (SPA navigation back to the page), so
// returning to Health Trends serves cached data instantly instead of
// re-fetching. In-flight de-duplication guarantees that concurrent callers
// asking for the same key share a single network request.
//
// Only SUCCESSFUL responses are cached. Rejections clear the in-flight entry
// so a failed load can always be retried.

type CacheEntry<T> = { value: T; expiresAt: number }

const resultCache = new Map<string, CacheEntry<unknown>>()
const inflightRequests = new Map<string, Promise<unknown>>()

// Default freshness window. Health report data does not change within a
// browsing session, so 5 minutes avoids redundant hits while still letting
// data refresh for long-lived sessions.
const DEFAULT_TTL_MS = 5 * 60 * 1000

/**
 * Return a cached value for `key` if still fresh, otherwise run `fetcher`.
 * Concurrent calls with the same key share one in-flight promise.
 */
export async function cachedRequest<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<T> {
  const now = Date.now()

  const cached = resultCache.get(key)
  if (cached && cached.expiresAt > now) {
    return cached.value as T
  }

  const existing = inflightRequests.get(key)
  if (existing) {
    return existing as Promise<T>
  }

  const request = (async () => {
    try {
      const value = await fetcher()
      resultCache.set(key, { value, expiresAt: Date.now() + ttlMs })
      return value
    } finally {
      // Always release the in-flight slot; errors are intentionally not cached
      // so the next call can retry.
      inflightRequests.delete(key)
    }
  })()

  inflightRequests.set(key, request)
  return request
}

/**
 * Invalidate cached entries. Pass a key prefix to clear a subset (e.g.
 * "reportDetails:") or omit it to clear everything. Useful for an explicit
 * "refresh" action.
 */
export function clearRequestCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    resultCache.clear()
    inflightRequests.clear()
    return
  }
  for (const key of Array.from(resultCache.keys())) {
    if (key.startsWith(keyPrefix)) resultCache.delete(key)
  }
  for (const key of Array.from(inflightRequests.keys())) {
    if (key.startsWith(keyPrefix)) inflightRequests.delete(key)
  }
}
