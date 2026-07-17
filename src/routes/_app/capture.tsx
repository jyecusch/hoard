import { useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useDb } from 'jazz-tools/react'
import {
  Box,
  Boxes,
  Camera,
  Loader2,
  MapPin,
  QrCode,
  Sparkles,
  Undo2,
  X,
} from 'lucide-react'
import { app } from '@schema'
import { CodeScanner } from '#/components/code-scanner'
import { ContainerPicker } from '#/components/container-picker'
import { parseScannedCode } from '#/lib/codes'
import { addPhoto, compressImage, deletePhoto } from '#/lib/photos'
import { useInventory, useInventoryActions } from '#/lib/inventory'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/_app/capture')({
  component: CapturePage,
})

/** localStorage key remembering the capture target across visits. */
const TARGET_KEY = 'hoard-capture-target'
/** Sentinel target meaning "create at top level" (a new hoard per capture). */
const TOP_LEVEL = 'top'

interface Suggestion {
  name: string
  description: string
  keywords: Array<string>
}

interface CapturedPhoto {
  key: number
  blob: Blob
  url: string
}

interface LastSave {
  containerId: string
  name: string
  /** Settles when the row + photos are durable; undo waits on it. */
  settled: Promise<void>
}

function readStoredTarget() {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(TARGET_KEY)
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('read failed'))
    reader.readAsDataURL(blob)
  })
}

function CapturePage() {
  const inventory = useInventory()
  const [target, setTarget] = useState<string | null>(readStoredTarget)
  const [picking, setPicking] = useState(false)

  function chooseTarget(id: string) {
    setTarget(id)
    setPicking(false)
    window.localStorage.setItem(TARGET_KEY, id)
  }

  if (inventory.loading) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    )
  }

  const targetValid =
    target === TOP_LEVEL ||
    (!!target && inventory.byId.has(target) && inventory.canEdit(target))

  if (!targetValid || picking) {
    return (
      <TargetPicker
        inventory={inventory}
        selectedId={targetValid ? target : null}
        onChoose={chooseTarget}
        onCancel={targetValid ? () => setPicking(false) : undefined}
      />
    )
  }

  return (
    <CaptureLoop
      key={target}
      inventory={inventory}
      target={target}
      onChangeTarget={() => setPicking(true)}
    />
  )
}

function TargetPicker({
  inventory,
  selectedId,
  onChoose,
  onCancel,
}: {
  inventory: ReturnType<typeof useInventory>
  selectedId: string | null
  onChoose: (id: string) => void
  onCancel?: () => void
}) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 p-4 md:p-8">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Where are you?</h1>
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Everything you capture is filed into this container until you change it.
      </p>
      <button
        type="button"
        onClick={() => onChoose(TOP_LEVEL)}
        className={cn(
          'mb-3 flex w-full items-center gap-2 rounded-md border p-2.5 text-left text-sm hover:bg-accent',
          selectedId === TOP_LEVEL && 'bg-accent',
        )}
      >
        <MapPin className="h-4 w-4 shrink-0 text-primary" />
        <span>
          <span className="font-medium">Top level</span>
          <span className="text-muted-foreground"> — new hoards, not inside anything</span>
        </span>
      </button>
      <ContainerPicker
        inventory={inventory}
        selectedId={selectedId === TOP_LEVEL ? null : selectedId}
        onSelect={(c) => onChoose(c.id)}
        maxHeightClass="max-h-[50vh]"
      />
    </main>
  )
}

function CaptureLoop({
  inventory,
  target,
  onChangeTarget,
}: {
  inventory: ReturnType<typeof useInventory>
  target: string
  onChangeTarget: () => void
}) {
  const db = useDb()
  const actions = useInventoryActions()

  // --- per-item form state ---
  const [code, setCode] = useState<string | null>(null)
  const [photos, setPhotos] = useState<Array<CapturedPhoto>>([])
  const [name, setName] = useState('')
  const [tags, setTags] = useState('')
  const [isItem, setIsItem] = useState(true)
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  // --- session state ---
  const [scannerOpen, setScannerOpen] = useState(false)
  const [aiDisabled, setAiDisabled] = useState(false)
  const [count, setCount] = useState(0)
  /** Saves whose row/photos are still syncing in the background. */
  const [pendingSaves, setPendingSaves] = useState(0)
  const [lastSave, setLastSave] = useState<LastSave | null>(null)
  const [undoing, setUndoing] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  const nameInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Bumped on every form reset so in-flight enrich responses for a previous
  // item are dropped instead of populating the next one.
  const itemSeq = useRef(0)
  const photoKey = useRef(0)

  const targetPath =
    target === TOP_LEVEL
      ? 'Top level'
      : inventory
          .pathTo(target)
          .map((c) => c.name)
          .join(' / ')

  function showFlash(message: string) {
    setFlash(message)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash(null), 2500)
  }

  function handleScan(raw: string) {
    const parsed = parseScannedCode(raw)
    if (!parsed) {
      showFlash('Not a Hoard label')
      return
    }
    if (parsed === code) return
    const existing = inventory.containers.find((c) => c.code === parsed)
    if (existing) {
      showFlash(`That label is already on “${existing.name}”`)
      return
    }
    setCode(parsed)
    setScannerOpen(false)
    nameInputRef.current?.focus()
  }

  async function enrichFrom(blob: Blob, seq: number) {
    if (aiDisabled) return
    setAiLoading(true)
    try {
      const small = await compressImage(blob, 800, 0.75)
      const image = await blobToDataUrl(small)
      const res = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ image }),
      })
      if (res.status === 503) {
        // No AI key configured — enrichment is unavailable, hide it entirely.
        setAiDisabled(true)
        return
      }
      if (!res.ok) return
      const data = (await res.json()) as Partial<Suggestion>
      if (itemSeq.current !== seq) return // user already moved on
      if (typeof data.name !== 'string' || !Array.isArray(data.keywords)) return
      setSuggestion({
        name: data.name,
        description: typeof data.description === 'string' ? data.description : '',
        keywords: data.keywords.filter((k): k is string => typeof k === 'string'),
      })
    } catch {
      // AI is best-effort; never surface a blocking error mid-capture.
    } finally {
      if (itemSeq.current === seq) setAiLoading(false)
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files?.length) return
    const added = Array.from(files).map((file) => ({
      key: photoKey.current++,
      blob: file,
      url: URL.createObjectURL(file),
    }))
    const isFirst = photos.length === 0
    setPhotos((prev) => [...prev, ...added])
    if (isFirst) {
      void enrichFrom(added[0].blob, itemSeq.current)
      nameInputRef.current?.focus()
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removePhoto(key: number) {
    setPhotos((prev) => {
      const gone = prev.find((p) => p.key === key)
      if (gone) URL.revokeObjectURL(gone.url)
      return prev.filter((p) => p.key !== key)
    })
  }

  function resetForm() {
    for (const p of photos) URL.revokeObjectURL(p.url)
    setPhotos([])
    setCode(null)
    setName('')
    setTags('')
    setIsItem(true)
    setSuggestion(null)
    setAiLoading(false)
    itemSeq.current++
  }

  function handleSave(e?: React.FormEvent) {
    e?.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    const handle = actions.createContainer({
      name: trimmed,
      description: suggestion?.description || undefined,
      isItem,
      parentId: target === TOP_LEVEL ? null : target,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      keywords: suggestion?.keywords ?? [],
      code: code ?? undefined,
    })
    const containerId = handle.value.id
    const blobs = photos.map((p) => p.blob)

    // Photos upload in the background so the loop stays ~10s/item; undo
    // awaits `settled` so it never races the uploads.
    const settled = (async () => {
      await handle.wait({ tier: 'edge' })
      for (let i = 0; i < blobs.length; i++) {
        await addPhoto(db, containerId, blobs[i], i)
      }
    })()
    setPendingSaves((n) => n + 1)
    settled
      .catch(() => showFlash(`Photo upload failed for “${trimmed}”`))
      .finally(() => setPendingSaves((n) => n - 1))

    setLastSave({ containerId, name: trimmed, settled })
    setCount((c) => c + 1)
    resetForm()
  }

  async function handleUndo() {
    if (!lastSave || undoing) return
    setUndoing(true)
    try {
      await lastSave.settled.catch(() => {})
      const rows = await db.all(app.photos.where({ containerId: lastSave.containerId }))
      for (const photo of rows) await deletePhoto(db, photo)
      db.delete(app.containers, lastSave.containerId)
      setCount((c) => Math.max(0, c - 1))
      setLastSave(null)
    } finally {
      setUndoing(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 p-4 md:p-8">
      {/* Target chip */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onChangeTarget}
          className="flex min-w-0 items-center gap-1.5 rounded-full border bg-muted/50 py-1 pl-2.5 pr-3 text-sm hover:bg-accent"
          title="Change target container"
        >
          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="truncate font-medium">{targetPath}</span>
          <span className="shrink-0 text-xs text-muted-foreground underline">change</span>
        </button>
        <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          {pendingSaves > 0 && (
            <Loader2
              className="h-3 w-3 animate-spin"
              aria-label="Syncing"
              data-testid="capture-syncing"
            />
          )}
          <span className="tabular-nums" data-testid="capture-count">
            {count} captured this session
          </span>
        </span>
      </div>

      {/* Undo affordance for the last save */}
      {lastSave && (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          <span className="min-w-0 truncate">
            Saved <span className="font-medium">“{lastSave.name}”</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            disabled={undoing}
            onClick={handleUndo}
          >
            {undoing ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Undo2 className="mr-1 h-4 w-4" />
            )}
            Undo
          </Button>
        </div>
      )}

      {flash && (
        <p className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {flash}
        </p>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {/* Label (optional) */}
        <section>
          {code ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1.5 font-mono">
                <QrCode className="h-3.5 w-3.5" />
                {code}
                <button
                  type="button"
                  aria-label="Remove label"
                  onClick={() => setCode(null)}
                  className="ml-0.5 rounded-full hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
              <span className="text-xs text-muted-foreground">label attached</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setScannerOpen((o) => !o)}
              className="flex w-full items-center justify-between rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground hover:bg-accent/40"
            >
              <span className="flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                {scannerOpen ? 'Point at a printed label…' : 'Scan label (optional)'}
              </span>
              <span className="text-xs underline">{scannerOpen ? 'close' : 'scan'}</span>
            </button>
          )}
          {scannerOpen && !code && (
            <CodeScanner
              onDetect={handleScan}
              className="mt-2 aspect-video w-full"
            />
          )}
        </section>

        {/* Photos */}
        <section>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
          {photos.length === 0 ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-36 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-muted-foreground transition-colors hover:bg-accent/40"
              data-testid="capture-photo-button"
            >
              <Camera className="h-8 w-8" />
              <span className="text-sm font-medium">Take a photo</span>
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {photos.map((p) => (
                <div key={p.key} className="relative">
                  <img
                    src={p.url}
                    alt=""
                    className="h-20 w-20 rounded-md border object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => removePhoto(p.key)}
                    className="absolute -right-1.5 -top-1.5 rounded-full border bg-background p-0.5 text-muted-foreground shadow-sm hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Add another photo"
                className="flex h-20 w-20 items-center justify-center rounded-md border border-dashed text-muted-foreground hover:bg-accent/40"
              >
                <Camera className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* AI suggestion — hidden entirely when enrichment is unavailable */}
          {!aiDisabled && aiLoading && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Identifying…
            </p>
          )}
          {!aiDisabled && suggestion && (
            <button
              type="button"
              onClick={() => {
                setName(suggestion.name)
                nameInputRef.current?.focus()
              }}
              className="mt-2 w-full rounded-lg border bg-primary/5 p-3 text-left transition-colors hover:bg-primary/10"
              data-testid="ai-suggestion"
            >
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-primary" />
                {suggestion.name}
              </span>
              {suggestion.description && (
                <span className="mt-1 block text-xs text-muted-foreground">
                  {suggestion.description}
                </span>
              )}
              <span className="mt-1 block text-[11px] text-muted-foreground/80">
                Tap to use this name · keywords saved automatically
              </span>
            </button>
          )}
        </section>

        {/* Name + tags */}
        <section className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="capture-name">Name</Label>
            <Input
              id="capture-name"
              ref={nameInputRef}
              placeholder="e.g. Crimping tool"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="capture-tags">Tags (optional, comma-separated)</Label>
            <Input
              id="capture-tags"
              placeholder="tools, electronics"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              autoComplete="off"
            />
          </div>
        </section>

        {/* Item vs container */}
        <div className="grid grid-cols-2 gap-1 rounded-lg border p-1" role="radiogroup">
          <button
            type="button"
            role="radio"
            aria-checked={isItem}
            onClick={() => setIsItem(true)}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm',
              isItem ? 'bg-accent font-medium' : 'text-muted-foreground hover:bg-accent/40',
            )}
          >
            <Box className="h-4 w-4" />
            Item
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={!isItem}
            onClick={() => setIsItem(false)}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm',
              !isItem ? 'bg-accent font-medium' : 'text-muted-foreground hover:bg-accent/40',
            )}
          >
            <Boxes className="h-4 w-4" />
            Container
          </button>
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={!name.trim()}>
          Save & next
        </Button>
      </form>
    </main>
  )
}
