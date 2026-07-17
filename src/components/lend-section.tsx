import { useState } from 'react'
import { HandHeart, Undo2 } from 'lucide-react'
import {
  formatLoanDate,
  useBorrowerSuggestions,
  useContainerLoan,
  useLoanActions,
} from '#/lib/loans'
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

/** Loan banner + lend dialog for a container/item page. */
export function LendSection({
  containerId,
  containerName,
  canEdit,
  lendOpen,
  onLendOpenChange,
}: {
  containerId: string
  containerName: string
  canEdit: boolean
  lendOpen: boolean
  onLendOpenChange: (open: boolean) => void
}) {
  const loan = useContainerLoan(containerId)
  const suggestions = useBorrowerSuggestions()
  const actions = useLoanActions()
  const [borrower, setBorrower] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleLend(e: React.FormEvent) {
    e.preventDefault()
    if (!borrower.trim() || busy) return
    setBusy(true)
    try {
      await actions.lend(containerId, borrower, note)
      setBorrower('')
      setNote('')
      onLendOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {loan && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/8 p-3 text-sm">
          <p className="flex items-center gap-2">
            <HandHeart className="h-4 w-4 shrink-0 text-primary" />
            <span>
              Lent to <strong>{loan.borrower}</strong> since {formatLoanDate(loan.lentAt)}
              {loan.note && <span className="text-muted-foreground"> — {loan.note}</span>}
            </span>
          </p>
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => actions.markReturned(loan.id)}
            >
              <Undo2 className="mr-1 h-4 w-4" /> Returned
            </Button>
          )}
        </div>
      )}

      <Dialog open={lendOpen} onOpenChange={onLendOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Lend “{containerName}”</DialogTitle>
            <DialogDescription>
              Keep track of who has it so it finds its way home.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLend} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lend-borrower">Who has it?</Label>
              <Input
                id="lend-borrower"
                list="borrower-suggestions"
                placeholder="e.g. Sarah"
                value={borrower}
                onChange={(e) => setBorrower(e.target.value)}
                autoFocus
                required
              />
              <datalist id="borrower-suggestions">
                {suggestions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lend-note">Note (optional)</Label>
              <Input
                id="lend-note"
                placeholder="e.g. for the deck project"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onLendOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!borrower.trim() || busy}>
                Lend it
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
