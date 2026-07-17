import { useEffect, useState } from 'react'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'

export function EditEntityDialog({
  open,
  onOpenChange,
  container,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  container: { name: string; description?: string | null; tags: Array<string> }
  onSubmit: (patch: {
    name: string
    description: string | null
    tags: Array<string>
  }) => Promise<void>
}) {
  const [name, setName] = useState(container.name)
  const [description, setDescription] = useState(container.description ?? '')
  const [tags, setTags] = useState(container.tags.join(', '))
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setName(container.name)
      setDescription(container.description ?? '')
      setTags(container.tags.join(', '))
    }
  }, [open, container.name, container.description, container.tags])

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!name.trim() || busy) return
    setBusy(true)
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      })
      onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
            <Input id="edit-tags" value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || busy}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
