import { useState } from 'react'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Label } from '#/components/ui/label'

export function DeleteDialog({
  open,
  onOpenChange,
  container,
  hasChildren,
  onDelete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  container: { name: string; isItem: boolean }
  hasChildren: boolean
  onDelete: (mode: 'lift' | 'recursive') => Promise<void>
}) {
  const [mode, setMode] = useState<'lift' | 'recursive'>('lift')
  const [busy, setBusy] = useState(false)

  async function handleDelete() {
    if (busy) return
    setBusy(true)
    try {
      await onDelete(hasChildren ? mode : 'lift')
      onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete “{container.name}”?</DialogTitle>
          <DialogDescription>
            {hasChildren
              ? 'This container has things inside it.'
              : 'This can’t be undone.'}
          </DialogDescription>
        </DialogHeader>
        {hasChildren && (
          <div className="space-y-2">
            <label className="flex items-start gap-2 rounded-md border p-3 text-sm has-[:checked]:border-primary">
              <input
                type="radio"
                name="delete-mode"
                checked={mode === 'lift'}
                onChange={() => setMode('lift')}
                className="mt-0.5"
              />
              <span>
                <Label className="font-medium">Keep contents</Label>
                <span className="block text-muted-foreground">
                  Move everything inside up one level.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 rounded-md border p-3 text-sm has-[:checked]:border-destructive">
              <input
                type="radio"
                name="delete-mode"
                checked={mode === 'recursive'}
                onChange={() => setMode('recursive')}
                className="mt-0.5"
              />
              <span>
                <Label className="font-medium">Delete everything</Label>
                <span className="block text-muted-foreground">
                  Permanently delete this and all its contents.
                </span>
              </span>
            </label>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={busy}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
