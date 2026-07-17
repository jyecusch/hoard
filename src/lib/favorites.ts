import { useMemo } from 'react'
import { useAll, useDb } from 'jazz-tools/react'
import { app } from '@schema'

/** Per-user favorites (policy limits reads/writes to the creator). */
export function useFavorites() {
  const rows = useAll(app.favorites)
  return useMemo(() => {
    const byContainer = new Map((rows ?? []).map((f) => [f.containerId, f]))
    return {
      loading: rows === undefined,
      containerIds: [...byContainer.keys()],
      isFavorite: (containerId: string) => byContainer.has(containerId),
      favoriteOf: (containerId: string) => byContainer.get(containerId) ?? null,
    }
  }, [rows])
}

export function useFavoriteActions() {
  const db = useDb()
  return useMemo(
    () => ({
      toggle(containerId: string, existing: { id: string } | null) {
        if (existing) db.delete(app.favorites, existing.id)
        else db.insert(app.favorites, { containerId })
      },
    }),
    [db],
  )
}
