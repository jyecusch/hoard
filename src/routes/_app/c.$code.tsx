import { Navigate, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Box, Boxes, Link2, QrCode } from 'lucide-react'
import { useInventory, useInventoryActions } from '#/lib/inventory'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { ContainerPicker } from '#/components/container-picker'
import type { InventoryContainer } from '#/lib/inventory'

export const Route = createFileRoute('/_app/c/$code')({
  component: CodePage,
})

/**
 * Landing page for a scanned/typed label code.
 * Assigned code -> jump straight to the thing it's stuck on.
 * Unassigned -> claim it: create something new here or link an existing one.
 */
function CodePage() {
  const { code } = Route.useParams()
  const inv = useInventory()

  if (inv.loading) {
    return <main className="p-8 text-sm text-muted-foreground">Looking up label…</main>
  }

  const match = inv.containers.find((c) => c.code === code)
  if (match) {
    return <Navigate to="/i/$id" params={{ id: match.id }} replace />
  }

  return <ClaimCode code={code} />
}

function ClaimCode({ code }: { code: string }) {
  const navigate = useNavigate()
  const inv = useInventory()
  const actions = useInventoryActions()
  const [mode, setMode] = useState<'create' | 'link'>('create')
  const [kind, setKind] = useState<'container' | 'item'>('container')
  const [name, setName] = useState('')
  const [parent, setParent] = useState<InventoryContainer | null>(null)
  const [linkTarget, setLinkTarget] = useState<InventoryContainer | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || busy) return
    setBusy(true)
    try {
      const result = actions.createContainer({
        name,
        isItem: kind === 'item',
        parentId: parent?.id ?? null,
        code,
      })
      const id = result.value.id
      await result.wait({ tier: 'edge' })
      navigate({ to: '/i/$id', params: { id }, replace: true })
    } finally {
      setBusy(false)
    }
  }

  async function handleLink() {
    if (!linkTarget || busy) return
    setBusy(true)
    try {
      await actions.updateContainer(linkTarget.id, { code }).wait({ tier: 'edge' })
      navigate({ to: '/i/$id', params: { id: linkTarget.id }, replace: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" /> New label scanned
          </CardTitle>
          <CardDescription>
            Code <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{code}</code> isn’t
            attached to anything yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={mode === 'create' ? 'default' : 'outline'}
              onClick={() => setMode('create')}
            >
              Create new
            </Button>
            <Button
              variant={mode === 'link' ? 'default' : 'outline'}
              onClick={() => setMode('link')}
            >
              <Link2 className="mr-1 h-4 w-4" /> Link existing
            </Button>
          </div>

          {mode === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={kind === 'container' ? 'secondary' : 'ghost'}
                  className="border"
                  onClick={() => setKind('container')}
                >
                  <Boxes className="mr-1 h-4 w-4" /> Container
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={kind === 'item' ? 'secondary' : 'ghost'}
                  className="border"
                  onClick={() => setKind('item')}
                >
                  <Box className="mr-1 h-4 w-4" /> Item
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="claim-name">Name</Label>
                <Input
                  id="claim-name"
                  placeholder={kind === 'item' ? 'e.g. Soldering iron' : 'e.g. Black tub #4'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Where is it? {parent ? `→ ${parent.name}` : '(top level)'}</Label>
                <ContainerPicker
                  inventory={inv}
                  selectedId={parent?.id ?? null}
                  onSelect={(c) => setParent(parent?.id === c.id ? null : c)}
                  maxHeightClass="max-h-40"
                />
              </div>
              <Button type="submit" className="w-full" disabled={!name.trim() || busy}>
                Create &amp; attach label
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <ContainerPicker
                inventory={inv}
                selectedId={linkTarget?.id ?? null}
                onSelect={setLinkTarget}
                includeItems
              />
              {linkTarget?.code && (
                <p className="text-sm text-primary">
                  “{linkTarget.name}” already has a label — linking will replace it.
                </p>
              )}
              <Button className="w-full" onClick={handleLink} disabled={!linkTarget || busy}>
                Attach label to {linkTarget ? `“${linkTarget.name}”` : '…'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
