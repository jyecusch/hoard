import { useState } from 'react'
import { Check, Copy, QrCode, X } from 'lucide-react'
import { codeUrl, parseScannedCode } from '#/lib/codes'
import { Badge } from '#/components/ui/badge'
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

/**
 * Shows the label code attached to a container (with copy/detach), or an
 * "Add label" affordance that accepts a typed code from a pre-printed sheet.
 */
export function CodeBadge({
  code,
  canEdit,
  onChange,
}: {
  code: string | null | undefined
  canEdit: boolean
  onChange: (code: string | null) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [manual, setManual] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!code && !canEdit) return null

  async function attach(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseScannedCode(manual)
    if (!parsed) {
      setError('That doesn’t look like a Hoard label code')
      return
    }
    setBusy(true)
    try {
      await onChange(parsed)
      setOpen(false)
      setManual('')
      setError(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex"
        title={code ? 'Label options' : 'Attach a label'}
      >
        <Badge variant={code ? 'default' : 'outline'} className="gap-1 font-mono">
          <QrCode className="h-3 w-3" />
          {code ?? 'Add label'}
        </Badge>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          {code ? (
            <>
              <DialogHeader>
                <DialogTitle>Label</DialogTitle>
                <DialogDescription>
                  Scanning this label opens this page directly.
                </DialogDescription>
              </DialogHeader>
              <p className="rounded-md bg-muted p-3 text-center font-mono text-lg tracking-wide">
                {code}
              </p>
              <DialogFooter className="gap-2 sm:justify-between">
                {canEdit && (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true)
                      try {
                        await onChange(null)
                        setOpen(false)
                      } finally {
                        setBusy(false)
                      }
                    }}
                  >
                    <X className="mr-1 h-4 w-4" /> Detach
                  </Button>
                )}
                <Button
                  onClick={async () => {
                    await navigator.clipboard.writeText(codeUrl(code))
                    setCopied(true)
                    setTimeout(() => setCopied(false), 1500)
                  }}
                >
                  {copied ? (
                    <Check className="mr-1 h-4 w-4" />
                  ) : (
                    <Copy className="mr-1 h-4 w-4" />
                  )}
                  Copy link
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Attach a label</DialogTitle>
                <DialogDescription>
                  Type the code printed under the barcode, or just scan the label with the Scan
                  tab — unassigned labels offer to link here.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={attach} className="space-y-3">
                <Input
                  placeholder="e.g. x7k2mfp9qa"
                  value={manual}
                  onChange={(e) => {
                    setManual(e.target.value)
                    setError(null)
                  }}
                  autoFocus
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={!manual.trim() || busy}>
                  Attach
                </Button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
