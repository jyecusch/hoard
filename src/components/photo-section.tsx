import { useRef, useState } from 'react'
import { useDb } from 'jazz-tools/react'
import { Camera, ChevronLeft, ChevronRight, ImageIcon, Loader2, Trash2, X } from 'lucide-react'
import { addPhoto, deletePhoto, usePhotoUrl, usePhotos } from '#/lib/photos'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '#/components/ui/dialog'
import { cn } from '#/lib/utils'

export function PhotoSection({
  containerId,
  canEdit,
}: {
  containerId: string
  canEdit: boolean
}) {
  const db = useDb()
  const photos = usePhotos(containerId) ?? []
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(0)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    const startOrder = photos.length
    setUploading(files.length)
    try {
      await Promise.all(
        Array.from(files).map((file, i) => addPhoto(db, containerId, file, startOrder + i)),
      )
    } finally {
      setUploading(0)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  if (photos.length === 0 && !canEdit) return null

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-end justify-between border-b pb-2">
        <h2 className="ledger-label">
          Photos{photos.length > 0 ? ` — ${photos.length}` : ''}
        </h2>
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            disabled={uploading > 0}
            onClick={() => inputRef.current?.click()}
          >
            {uploading > 0 ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Camera className="mr-1 h-4 w-4" />
            )}
            {uploading > 0 ? `Uploading ${uploading}…` : 'Add photos'}
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />

      {photos.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center rounded-lg border border-dashed p-6 text-sm text-muted-foreground transition-colors hover:bg-accent/40"
        >
          <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground/60" />
          Snap what’s inside so you can check without opening the box.
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {photos.map((photo, i) => (
            <PhotoThumb key={photo.id} fileId={photo.fileId} onClick={() => setViewerIndex(i)} />
          ))}
        </div>
      )}

      {/* Fullscreen viewer */}
      <Dialog open={viewerIndex !== null} onOpenChange={(open) => !open && setViewerIndex(null)}>
        <DialogContent
          showCloseButton={false}
          className="max-w-[95vw] border-none bg-transparent p-0 shadow-none sm:max-w-4xl"
        >
          <DialogTitle className="sr-only">Photo viewer</DialogTitle>
          {viewerIndex !== null && photos[viewerIndex] && (
            <PhotoViewer
              key={photos[viewerIndex].id}
              fileId={photos[viewerIndex].fileId}
              hasPrev={viewerIndex > 0}
              hasNext={viewerIndex < photos.length - 1}
              onPrev={() => setViewerIndex((i) => (i ?? 1) - 1)}
              onNext={() => setViewerIndex((i) => (i ?? 0) + 1)}
              onClose={() => setViewerIndex(null)}
              onDelete={
                canEdit
                  ? async () => {
                      await deletePhoto(db, photos[viewerIndex])
                      setViewerIndex(null)
                    }
                  : undefined
              }
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}

function PhotoThumb({ fileId, onClick }: { fileId: string; onClick: () => void }) {
  const url = usePhotoUrl(fileId)
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'aspect-square overflow-hidden rounded-md border bg-muted',
        !url && 'animate-pulse',
      )}
    >
      {url && <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />}
    </button>
  )
}

function PhotoViewer({
  fileId,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onClose,
  onDelete,
}: {
  fileId: string
  hasPrev: boolean
  hasNext: boolean
  onPrev: () => void
  onNext: () => void
  onClose: () => void
  onDelete?: () => Promise<void>
}) {
  const url = usePhotoUrl(fileId)
  const [deleting, setDeleting] = useState(false)

  return (
    <div className="relative flex items-center justify-center">
      {url ? (
        <img src={url} alt="" className="max-h-[85vh] w-auto rounded-lg object-contain" />
      ) : (
        <div className="flex h-64 w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}

      <div className="absolute right-2 top-2 flex gap-1">
        {onDelete && (
          <Button
            variant="secondary"
            size="icon"
            disabled={deleting}
            onClick={async () => {
              setDeleting(true)
              try {
                await onDelete()
              } finally {
                setDeleting(false)
              }
            }}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        )}
        <Button variant="secondary" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {hasPrev && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute left-2 top-1/2 -translate-y-1/2"
          onClick={onPrev}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      )}
      {hasNext && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2"
          onClick={onNext}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      )}
    </div>
  )
}
