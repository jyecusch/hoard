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
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'

const COPY = {
  hoard: {
    title: 'New hoard',
    description: 'A top-level place, like “Garage” or “Under house”.',
    namePlaceholder: 'e.g. Garage',
  },
  container: {
    title: 'New container',
    description: 'Something that holds other things — a box, shelf, or tub.',
    namePlaceholder: 'e.g. Blue tub #3',
  },
  item: {
    title: 'New item',
    description: 'A single thing you want to find again later.',
    namePlaceholder: 'e.g. Crimping tool',
  },
} as const

export interface AddEntityValues {
  name: string
  description?: string
  tags: Array<string>
}

export function AddEntityDialog({
  open,
  onOpenChange,
  kind,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: keyof typeof COPY
  onSubmit: (values: AddEntityValues) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [busy, setBusy] = useState(false)
  const copy = COPY[kind]

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!name.trim() || busy) return
    setBusy(true)
    try {
      await onSubmit({
        name,
        description: description || undefined,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      })
      setName('')
      setDescription('')
      setTags('')
      onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add-name">Name</Label>
            <Input
              id="add-name"
              placeholder={copy.namePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-description">Description (optional)</Label>
            <Textarea
              id="add-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-tags">Tags (optional, comma-separated)</Label>
            <Input
              id="add-tags"
              placeholder="tools, electronics"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || busy}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
