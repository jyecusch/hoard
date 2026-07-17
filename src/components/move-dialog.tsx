import { useMemo, useState } from 'react'
import { Boxes, Home } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { cn } from '#/lib/utils'
import type { Inventory, InventoryContainer } from '#/lib/inventory'

/**
 * Pick a destination container. Excludes the moved container's own subtree
 * (you can't move something into itself) and all items.
 */
export function MoveDialog({
  open,
  onOpenChange,
  container,
  inventory,
  onMove,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  container: InventoryContainer
  inventory: Inventory
  onMove: (destinationId: string | null) => Promise<void>
}) {
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState<string | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)

  const candidates = useMemo(
    () =>
      inventory.containers
        .filter(
          (c) =>
            !c.isItem &&
            inventory.canEdit(c.id) &&
            c.id !== container.parentId &&
            !inventory.isSelfOrDescendant(container.id, c.id),
        )
        .filter((c) => c.name.toLowerCase().includes(filter.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [inventory, container, filter],
  )

  async function handleMove() {
    if (selected === undefined || busy) return
    setBusy(true)
    try {
      await onMove(selected)
      onOpenChange(false)
      setSelected(undefined)
      setFilter('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move “{container.name}”</DialogTitle>
          <DialogDescription>Choose where it should live.</DialogDescription>
        </DialogHeader>
        <Input
          placeholder="Filter…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div className="max-h-64 overflow-y-auto rounded-md border">
          {!container.isItem && container.parentId && (
            <button
              type="button"
              onClick={() => setSelected(null)}
              className={cn(
                'flex w-full items-center gap-2 border-b p-2.5 text-left text-sm hover:bg-accent',
                selected === null && 'bg-accent',
              )}
            >
              <Home className="h-4 w-4 text-primary" /> Top level (make it a hoard)
            </button>
          )}
          {candidates.map((c) => {
            const path = inventory.pathTo(c.id)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelected(c.id)}
                className={cn(
                  'flex w-full items-center gap-2 p-2.5 text-left text-sm hover:bg-accent',
                  selected === c.id && 'bg-accent',
                )}
              >
                <Boxes className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">
                  {path
                    .slice(0, -1)
                    .map((p) => p.name + ' / ')
                    .join('')}
                  <span className="font-medium">{c.name}</span>
                </span>
              </button>
            )
          })}
          {candidates.length === 0 && (
            <p className="p-4 text-center text-sm text-muted-foreground">No matches</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleMove} disabled={selected === undefined || busy}>
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
