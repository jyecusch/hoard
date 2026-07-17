import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { CodeScanner } from '#/components/code-scanner'
import { parseScannedCode } from '#/lib/codes'
import { Input } from '#/components/ui/input'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/_app/scan')({
  component: ScanPage,
})

function ScanPage() {
  const navigate = useNavigate()
  const [manual, setManual] = useState('')
  const [flash, setFlash] = useState<string | null>(null)

  function handleDetect(raw: string) {
    const code = parseScannedCode(raw)
    if (!code) {
      setFlash('Not a Hoard label')
      setTimeout(() => setFlash(null), 1500)
      return
    }
    navigate({ to: '/c/$code', params: { code } })
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 p-4 md:p-8">
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Scan a label</h1>
      <CodeScanner onDetect={handleDetect} />
      {flash && <p className="mt-2 text-center text-sm text-destructive">{flash}</p>}
      <form
        className="mt-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          const code = parseScannedCode(manual)
          if (code) navigate({ to: '/c/$code', params: { code } })
          else setFlash('That doesn’t look like a Hoard code')
        }}
      >
        <Input
          placeholder="Or type the code from the label…"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
        />
        <Button type="submit" variant="secondary">
          Go
        </Button>
      </form>
    </main>
  )
}
