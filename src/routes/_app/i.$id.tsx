import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  Box,
  Boxes,
  ChevronRight,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Star,
  Trash2,
  FolderInput,
  HandHeart,
  Share2,
} from 'lucide-react'
import { useInventory, useInventoryActions } from '#/lib/inventory'
import type { InventoryContainer } from '#/lib/inventory'
import { useFavoriteActions, useFavorites } from '#/lib/favorites'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { AddEntityDialog } from '#/components/add-entity-dialog'
import { PhotoSection } from '#/components/photo-section'
import { CodeBadge } from '#/components/code-badge'
import { LendSection } from '#/components/lend-section'
import { ShareDialog } from '#/components/share-dialog'
import { EditEntityDialog } from '#/components/edit-entity-dialog'
import { MoveDialog } from '#/components/move-dialog'
import { DeleteDialog } from '#/components/delete-dialog'

export const Route = createFileRoute('/_app/i/$id')({
  component: ContainerPage,
})

function ContainerPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const inv = useInventory()
  const actions = useInventoryActions()
  const favorites = useFavorites()
  const favoriteActions = useFavoriteActions()

  const [adding, setAdding] = useState<'container' | 'item' | null>(null)
  const [editing, setEditing] = useState(false)
  const [moving, setMoving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [lending, setLending] = useState(false)
  const [sharing, setSharing] = useState(false)

  const container = inv.byId.get(id)

  // Rows shared with us can arrive a moment after the inventory's first
  // (local) result — give sync a grace period before declaring not-found.
  const [graceExpired, setGraceExpired] = useState(false)
  useEffect(() => {
    if (container) return
    const timer = setTimeout(() => setGraceExpired(true), 6000)
    return () => clearTimeout(timer)
  }, [container])

  if (inv.loading || (!container && !graceExpired)) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    )
  }
  if (!container) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <Package className="mb-4 h-12 w-12 text-muted-foreground/60" />
        <h1 className="mb-1 text-xl font-semibold">Not found</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          This doesn’t exist or you don’t have access to it.
        </p>
        <Button variant="outline" onClick={() => navigate({ to: '/' })}>
          Back home
        </Button>
      </main>
    )
  }

  const path = inv.pathTo(id)
  const children = inv.childrenOf(id)
  const canEdit = inv.canEdit(id)

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 p-4 md:p-8">
      {/* Breadcrumbs */}
      <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          Home
        </Link>
        {path.map((node, i) => (
          <span key={node.id} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5" />
            {i === path.length - 1 ? (
              <span className="font-medium text-foreground">{node.name}</span>
            ) : (
              <Link
                to="/i/$id"
                params={{ id: node.id }}
                className="hover:text-foreground"
              >
                {node.name}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="ledger-label mb-1.5">
            {container.parentId ? (container.isItem ? 'Item' : 'Container') : 'Hoard'}
          </p>
          <h1 className="break-words text-3xl font-extrabold leading-tight">
            {container.name}
          </h1>
          {container.description && (
            <p className="mt-2 max-w-prose whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {container.description}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {container.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
            <CodeBadge
              code={container.code}
              canEdit={canEdit}
              onChange={async (code) => {
                await actions.updateContainer(id, { code })
              }}
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={
              favorites.isFavorite(id)
                ? 'Remove from favorites'
                : 'Add to favorites'
            }
            onClick={() => favoriteActions.toggle(id, favorites.favoriteOf(id))}
          >
            <Star
              className={
                favorites.isFavorite(id)
                  ? 'h-5 w-5 fill-primary text-primary'
                  : 'h-5 w-5 text-muted-foreground'
              }
            />
          </Button>
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditing(true)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMoving(true)}>
                  <FolderInput className="mr-2 h-4 w-4" /> Move
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLending(true)}>
                  <HandHeart className="mr-2 h-4 w-4" /> Lend…
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSharing(true)}>
                  <Share2 className="mr-2 h-4 w-4" /> Share…
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleting(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <LendSection
        containerId={id}
        containerName={container.name}
        canEdit={canEdit}
        lendOpen={lending}
        onLendOpenChange={setLending}
      />

      {/* Contents */}
      {!container.isItem && (
        <section className="mb-8">
          <div className="mb-3 flex items-end justify-between border-b pb-2">
            <h2 className="ledger-label">Contents — {children.length}</h2>
            {canEdit && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAdding('container')}
                >
                  <Plus className="mr-1 h-4 w-4" /> Container
                </Button>
                <Button size="sm" onClick={() => setAdding('item')}>
                  <Plus className="mr-1 h-4 w-4" /> Item
                </Button>
              </div>
            )}
          </div>

          {children.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nothing in here yet.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {children.map((child) => (
                <ContentRow
                  key={child.id}
                  node={child}
                  childCount={inv.childrenOf(child.id).length}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      <PhotoSection containerId={id} canEdit={canEdit} />

      {/* Dialogs */}
      <AddEntityDialog
        open={adding !== null}
        onOpenChange={(open) => !open && setAdding(null)}
        kind={adding ?? 'item'}
        onSubmit={async (values) => {
          await actions.createContainer({
            ...values,
            isItem: adding === 'item',
            parentId: id,
          })
        }}
      />
      <EditEntityDialog
        open={editing}
        onOpenChange={setEditing}
        container={container}
        onSubmit={async (patch) => {
          await actions.updateContainer(id, patch)
        }}
      />
      <MoveDialog
        open={moving}
        onOpenChange={setMoving}
        container={container}
        inventory={inv}
        onMove={async (destinationId) => {
          await actions.updateContainer(id, { parentId: destinationId })
        }}
      />
      <ShareDialog
        open={sharing}
        onOpenChange={setSharing}
        containerId={id}
        containerName={container.name}
      />
      <DeleteDialog
        open={deleting}
        onOpenChange={setDeleting}
        container={container}
        hasChildren={children.length > 0}
        onDelete={async (mode) => {
          await actions.deleteContainer(
            id,
            mode,
            inv.childrenOf,
            container.parentId ?? null,
          )
          if (container.parentId) {
            navigate({ to: '/i/$id', params: { id: container.parentId } })
          } else {
            navigate({ to: '/' })
          }
        }}
      />
    </main>
  )
}

function ContentRow({
  node,
  childCount,
}: {
  node: InventoryContainer
  childCount: number
}) {
  return (
    <li>
      <Link
        to="/i/$id"
        params={{ id: node.id }}
        className="flex items-center gap-3 p-3 hover:bg-accent/50"
      >
        {node.isItem ? (
          <Box className="h-5 w-5 shrink-0 text-muted-foreground" />
        ) : (
          <Boxes className="h-5 w-5 shrink-0 text-primary" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{node.name}</p>
          {node.description && (
            <p className="truncate text-xs text-muted-foreground">
              {node.description}
            </p>
          )}
        </div>
        {!node.isItem && (
          <span className="text-xs text-muted-foreground">{childCount}</span>
        )}
        {node.tags.slice(0, 2).map((tag) => (
          <Badge key={tag} variant="outline" className="hidden sm:inline-flex">
            {tag}
          </Badge>
        ))}
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  )
}
