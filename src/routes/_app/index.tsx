import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Box, Boxes, ChevronRight, Plus, Undo2 } from 'lucide-react'
import { useInventory, useInventoryActions } from '#/lib/inventory'
import { formatLoanDate, useActiveLoans, useLoanActions } from '#/lib/loans'
import { useFavorites } from '#/lib/favorites'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { AddEntityDialog } from '#/components/add-entity-dialog'
import type { InventoryContainer } from '#/lib/inventory'

export const Route = createFileRoute('/_app/')({
  component: Dashboard,
})

function Dashboard() {
  const inv = useInventory()
  const actions = useInventoryActions()
  const [creating, setCreating] = useState(false)

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-8">
      <div className="mb-8 flex items-end justify-between">
        <h1 className="text-3xl font-extrabold">My hoards</h1>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-1 h-4 w-4" /> New hoard
        </Button>
      </div>

      {inv.loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : inv.myHoards.length === 0 ? (
        <EmptyState onCreate={() => setCreating(true)} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {inv.myHoards.map((hoard) => (
            <HoardCard key={hoard.id} hoard={hoard} childCount={inv.childrenOf(hoard.id).length} />
          ))}
        </div>
      )}

      {inv.sharedRoots.length > 0 && (
        <>
          <h2 className="ledger-label mb-3 mt-12 border-b pb-2">
            Shared with me — {inv.sharedRoots.length}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {inv.sharedRoots.map((hoard) => (
              <HoardCard
                key={hoard.id}
                hoard={hoard}
                childCount={inv.childrenOf(hoard.id).length}
              />
            ))}
          </div>
        </>
      )}

      <FavoritesSection inventory={inv} />

      <LentOutSection inventory={inv} />

      <AddEntityDialog
        open={creating}
        onOpenChange={setCreating}
        kind="hoard"
        onSubmit={async (values) => {
          await actions.createContainer({ ...values, isItem: false, parentId: null })
        }}
      />
    </main>
  )
}

function FavoritesSection({ inventory }: { inventory: ReturnType<typeof useInventory> }) {
  const favorites = useFavorites()

  const things = favorites.containerIds
    .map((id) => inventory.byId.get(id))
    .filter((c) => c !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name))

  if (things.length === 0) return null

  return (
    <>
      <h2 className="ledger-label mb-3 mt-12 border-b pb-2">
        Favorites — {things.length}
      </h2>
      <ul className="divide-y rounded-lg border bg-card">
        {things.map((thing) => {
          const path = inventory.pathTo(thing.id)
          return (
            <li key={thing.id}>
              <Link
                to="/i/$id"
                params={{ id: thing.id }}
                className="flex items-center gap-3 p-3 hover:bg-accent/50"
              >
                {thing.isItem ? (
                  <Box className="h-5 w-5 shrink-0 text-muted-foreground" />
                ) : (
                  <Boxes className="h-5 w-5 shrink-0 text-primary" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{thing.name}</p>
                  {path.length > 1 && (
                    <p className="truncate text-xs text-muted-foreground">
                      {path
                        .slice(0, -1)
                        .map((p) => p.name)
                        .join(' / ')}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          )
        })}
      </ul>
    </>
  )
}

function LentOutSection({ inventory }: { inventory: ReturnType<typeof useInventory> }) {
  const loans = useActiveLoans()
  const actions = useLoanActions()

  if (loans.length === 0) return null

  return (
    <>
      <h2 className="ledger-label mb-3 mt-12 border-b pb-2">
        Lent out — {loans.length}
      </h2>
      <ul className="divide-y rounded-lg border bg-card">
        {loans.map((loan) => {
          const thing = inventory.byId.get(loan.containerId)
          return (
            <li key={loan.id} className="flex items-center gap-3 p-3">
              {thing?.isItem === false ? (
                <Boxes className="h-5 w-5 shrink-0 text-primary" />
              ) : (
                <Box className="h-5 w-5 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                {thing ? (
                  <Link
                    to="/i/$id"
                    params={{ id: thing.id }}
                    className="truncate font-medium hover:underline"
                  >
                    {thing.name}
                  </Link>
                ) : (
                  <span className="truncate font-medium">(deleted)</span>
                )}
                <p className="truncate text-xs text-muted-foreground">
                  {loan.borrower} · since {formatLoanDate(loan.lentAt)}
                  {loan.note ? ` · ${loan.note}` : ''}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => actions.markReturned(loan.id)}>
                <Undo2 className="mr-1 h-4 w-4" /> Returned
              </Button>
            </li>
          )
        })}
      </ul>
    </>
  )
}

function HoardCard({
  hoard,
  childCount,
}: {
  hoard: InventoryContainer
  childCount: number
}) {
  return (
    <Link to="/i/$id" params={{ id: hoard.id }} className="group block">
      <div className="flex h-full flex-col justify-between gap-6 rounded-lg border bg-card p-5 transition-colors group-hover:border-primary">
        <div>
          <h3 className="text-xl font-bold leading-snug transition-colors group-hover:text-primary">
            {hoard.name}
          </h3>
          {hoard.description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {hoard.description}
            </p>
          )}
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="ledger-label">
            {childCount} {childCount === 1 ? 'thing' : 'things'}
          </span>
          {hoard.tags.length > 0 && (
            <span className="truncate text-xs text-muted-foreground">
              {hoard.tags.slice(0, 3).join(' · ')}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-lg border border-dashed px-6 py-16 sm:px-12">
      <p className="ledger-label mb-3">Nothing catalogued yet</p>
      <h2 className="mb-3 max-w-md text-2xl font-extrabold leading-tight">
        Every box in the house, findable from your pocket.
      </h2>
      <p className="mb-8 max-w-md text-sm leading-relaxed text-muted-foreground">
        Start with a top-level place — “Garage”, “Under house”, “Office” — then fill it with
        containers and items. Print label sheets when you’re ready to go fast.
      </p>
      <Button size="lg" onClick={onCreate}>
        <Plus className="mr-1 h-4 w-4" /> Create your first hoard
      </Button>
    </div>
  )
}
