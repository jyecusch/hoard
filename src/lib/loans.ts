import { useMemo } from 'react'
import { useAll, useDb } from 'jazz-tools/react'
import { app } from '@schema'

/**
 * Lending. A loan row with no returnedAt means the thing is currently out.
 * History is kept (returned loans stay) and feeds borrower autocomplete.
 */


export function useLoans() {
  return useAll(app.loans.orderBy('lentAt', 'desc'))
}

export function useContainerLoan(containerId: string) {
  const loans = useLoans()
  return useMemo(
    () => loans?.find((l) => l.containerId === containerId && !l.returnedAt) ?? null,
    [loans, containerId],
  )
}

export function useActiveLoans() {
  const loans = useLoans()
  return useMemo(() => (loans ?? []).filter((l) => !l.returnedAt), [loans])
}

/** Distinct past borrowers, most recent first, for autocomplete. */
export function useBorrowerSuggestions() {
  const loans = useLoans()
  return useMemo(() => {
    const seen = new Set<string>()
    const names: Array<string> = []
    for (const loan of loans ?? []) {
      const name = loan.borrower.trim()
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase())
        names.push(name)
      }
    }
    return names
  }, [loans])
}

export function useLoanActions() {
  const db = useDb()
  return useMemo(
    () => ({
      lend(containerId: string, borrower: string, note?: string) {
        return db.insert(app.loans, {
          containerId,
          borrower: borrower.trim(),
          note: note?.trim() || null,
          lentAt: new Date(),
          returnedAt: null,
        })
      },
      markReturned(loanId: string) {
        return db.update(app.loans, loanId, { returnedAt: new Date() })
      },
    }),
    [db],
  )
}

export function formatLoanDate(date: Date) {
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}
