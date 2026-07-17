import { useMemo, useState } from 'react'
import { Box, Boxes } from 'lucide-react'
import { Input } from '#/components/ui/input'
import { cn } from '#/lib/utils'
import type { Inventory, InventoryContainer } from '#/lib/inventory'

/** Filterable flat list of containers (optionally items too) with path context. */
export function ContainerPicker({
  inventory,
  selectedId,
  onSelect,
  includeItems = false,
  editableOnly = true,
  excludeSubtreeOf,
  maxHeightClass = 'max-h-64',
}: {
  inventory: Inventory
  selectedId: string | null
  onSelect: (container: InventoryContainer) => void
  includeItems?: boolean
  editableOnly?: boolean
  excludeSubtreeOf?: string
  maxHeightClass?: string
}) {
  const [filter, setFilter] = useState('')

  const candidates = useMemo(
    () =>
      inventory.containers
        .filter(
          (c) =>
            (includeItems || !c.isItem) &&
            (!editableOnly || inventory.canEdit(c.id)) &&
            (!excludeSubtreeOf || !inventory.isSelfOrDescendant(excludeSubtreeOf, c.id)) &&
            c.name.toLowerCase().includes(filter.toLowerCase()),
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [inventory, includeItems, editableOnly, excludeSubtreeOf, filter],
  )

  return (
    <div className="space-y-2">
      <Input
        placeholder="Filter…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div className={cn('overflow-y-auto rounded-md border', maxHeightClass)}>
        {candidates.map((c) => {
          const path = inventory.pathTo(c.id)
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c)}
              className={cn(
                'flex w-full items-center gap-2 p-2.5 text-left text-sm hover:bg-accent',
                selectedId === c.id && 'bg-accent',
              )}
            >
              {c.isItem ? (
                <Box className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <Boxes className="h-4 w-4 shrink-0 text-primary" />
              )}
              <span className="truncate">
                {path.slice(0, -1).map((p) => p.name + ' / ')}
                <span className="font-medium">{c.name}</span>
              </span>
            </button>
          )
        })}
        {candidates.length === 0 && (
          <p className="p-4 text-center text-sm text-muted-foreground">No matches</p>
        )}
      </div>
    </div>
  )
}
