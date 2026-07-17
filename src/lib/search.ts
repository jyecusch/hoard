import { useMemo } from 'react'
import Fuse from 'fuse.js'
import { useInventory } from '#/lib/inventory'
import type { InventoryContainer } from '#/lib/inventory'

/**
 * Fuzzy search over the whole readable inventory.
 *
 * Backed by a memoized Fuse.js index over the live container subscription, so
 * results are instant, offline, and typo-tolerant ("wire squeezer thing"
 * finds the crimper via AI keywords).
 */

const RESULT_LIMIT = 50

const FUSE_OPTIONS = {
  keys: [
    { name: 'name', weight: 0.4 },
    { name: 'tags', weight: 0.25 },
    { name: 'keywords', weight: 0.25 },
    { name: 'description', weight: 0.1 },
  ],
  includeScore: true,
  ignoreLocation: true,
  threshold: 0.4,
} satisfies ConstructorParameters<typeof Fuse<InventoryContainer>>[1]

export interface SearchResult {
  container: InventoryContainer
  /** Fuse score: 0 = perfect match, 1 = worst. */
  score: number
  /** Ancestor chain from root hoard down to (and including) the container. */
  path: Array<InventoryContainer>
}

export function useSearch(query: string): {
  loading: boolean
  results: Array<SearchResult>
} {
  const inv = useInventory()

  const fuse = useMemo(
    () => new Fuse(inv.containers, FUSE_OPTIONS),
    [inv.containers],
  )

  const results = useMemo(() => {
    const trimmed = query.trim()
    if (!trimmed) return []
    return fuse.search(trimmed, { limit: RESULT_LIMIT }).map((match) => ({
      container: match.item,
      score: match.score ?? 0,
      path: inv.pathTo(match.item.id),
    }))
  }, [fuse, inv, query])

  return { loading: inv.loading, results }
}
