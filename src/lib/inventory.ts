import { useMemo } from 'react'
import { useAll, useDb, useSession } from 'jazz-tools/react'
import { app } from '@schema'

/**
 * Central inventory data layer.
 *
 * The whole readable container set is a few thousand rows at most, so we keep
 * one live subscription to all of it and derive trees, breadcrumbs, and search
 * from memoized maps. This keeps every view (dashboard, tree, move dialog,
 * search) instant and consistent.
 */


export type InventoryContainer = NonNullable<
  ReturnType<typeof useAllContainersRaw>
>[number]

function useAllContainersRaw() {
  return useAll(app.containers.select('*', '$createdBy'))
}

export interface Inventory {
  /** undefined while the first result is loading */
  loading: boolean
  containers: Array<InventoryContainer>
  byId: Map<string, InventoryContainer>
  childrenOf: (parentId: string) => Array<InventoryContainer>
  /** Top-level hoards created by the current user. */
  myHoards: Array<InventoryContainer>
  /** Readable containers whose parent is unreadable/absent (shared subtree roots). */
  sharedRoots: Array<InventoryContainer>
  /** Path from root hoard down to (and including) the given container. */
  pathTo: (id: string) => Array<InventoryContainer>
  /** True if `candidateId` is `id` itself or a descendant of it. */
  isSelfOrDescendant: (id: string, candidateId: string) => boolean
  /**
   * Client-side mirror of the server edit policy: creator, or editor share on
   * the container or any ancestor. (Selecting the `$canEdit` magic column
   * breaks share-granted rows in the current alpha, so we derive it.)
   */
  canEdit: (id: string) => boolean
  userId: string | null
}

export function useInventory(): Inventory {
  const rows = useAllContainersRaw()
  const session = useSession()
  const userId = session?.user_id ?? null
  const myShares = useAll(
    userId ? app.shares.where({ user_id: userId }) : undefined,
  )

  return useMemo(() => {
    const editorShareContainers = new Set(
      (myShares ?? []).filter((s) => s.role === 'editor').map((s) => s.containerId),
    )
    const containers = rows ?? []
    const byId = new Map(containers.map((c) => [c.id, c]))
    const childrenMap = new Map<string, Array<InventoryContainer>>()
    for (const c of containers) {
      if (!c.parentId) continue
      const list = childrenMap.get(c.parentId)
      if (list) list.push(c)
      else childrenMap.set(c.parentId, [c])
    }
    for (const list of childrenMap.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name))
    }

    const roots = containers.filter((c) => !c.parentId || !byId.has(c.parentId))
    const myHoards = roots
      .filter((c) => !c.parentId && c.$createdBy === userId)
      .sort((a, b) => a.name.localeCompare(b.name))
    const sharedRoots = roots
      .filter((c) => c.$createdBy !== userId)
      .sort((a, b) => a.name.localeCompare(b.name))

    const childrenOf = (parentId: string) => childrenMap.get(parentId) ?? []

    const pathTo = (id: string) => {
      const path: Array<InventoryContainer> = []
      let cur = byId.get(id)
      let guard = 0
      while (cur && guard++ < 32) {
        path.unshift(cur)
        cur = cur.parentId ? byId.get(cur.parentId) : undefined
      }
      return path
    }

    const isSelfOrDescendant = (id: string, candidateId: string): boolean => {
      let cur = byId.get(candidateId)
      let guard = 0
      while (cur && guard++ < 32) {
        if (cur.id === id) return true
        cur = cur.parentId ? byId.get(cur.parentId) : undefined
      }
      return false
    }

    const canEdit = (id: string): boolean => {
      let cur = byId.get(id)
      let guard = 0
      while (cur && guard++ < 32) {
        if (cur.$createdBy === userId) return true
        if (editorShareContainers.has(cur.id)) return true
        cur = cur.parentId ? byId.get(cur.parentId) : undefined
      }
      return false
    }

    return {
      loading: rows === undefined,
      containers,
      byId,
      childrenOf,
      myHoards,
      sharedRoots,
      pathTo,
      isSelfOrDescendant,
      canEdit,
      userId,
    }
  }, [rows, myShares, userId])
}

/** Write operations for containers. */
export function useInventoryActions() {
  const db = useDb()

  return useMemo(
    () => ({
      createContainer(input: {
        name: string
        description?: string
        isItem: boolean
        parentId?: string | null
        tags?: Array<string>
        keywords?: Array<string>
        code?: string
      }) {
        return db.insert(app.containers, {
          name: input.name.trim(),
          description: input.description?.trim() || null,
          isItem: input.isItem,
          parentId: input.parentId ?? null,
          tags: input.tags ?? [],
          keywords: input.keywords ?? [],
          code: input.code ?? null,
        })
      },

      updateContainer(
        id: string,
        patch: Partial<{
          name: string
          description: string | null
          tags: Array<string>
          keywords: Array<string>
          code: string | null
          parentId: string | null
        }>,
      ) {
        return db.update(app.containers, id, patch)
      },

      /**
       * Delete a container. `mode: 'lift'` re-parents children to the deleted
       * container's parent; `mode: 'recursive'` deletes the whole subtree.
       */
      async deleteContainer(
        id: string,
        mode: 'lift' | 'recursive',
        childrenOf: (parentId: string) => Array<{ id: string }>,
        parentId: string | null,
      ) {
        if (mode === 'lift') {
          for (const child of childrenOf(id)) {
            db.update(app.containers, child.id, { parentId })
          }
          db.delete(app.containers, id)
          return
        }
        const stack = [id]
        const order: Array<string> = []
        while (stack.length) {
          const cur = stack.pop()!
          order.push(cur)
          for (const child of childrenOf(cur)) stack.push(child.id)
        }
        // Delete leaves first so parent-inherited permissions stay resolvable.
        for (const cid of order.reverse()) {
          db.delete(app.containers, cid)
        }
      },
    }),
    [db],
  )
}
