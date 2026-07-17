import { useEffect, useMemo, useState } from 'react'
import { useAll, useDb } from 'jazz-tools/react'
import type { Db } from 'jazz-tools'
import { app } from '@schema'

/** Live list of photos for a container, in display order. */
export function usePhotos(containerId: string) {
  return useAll(app.photos.where({ containerId }).orderBy('order', 'asc'))
}

/**
 * Downscale an image client-side before storing. Phone camera shots are
 * 5–15MB; at 1600px/JPEG-0.85 they land around 300–500KB, which keeps blob
 * sync fast without visibly hurting "what's in this box" quality.
 */
export async function compressImage(
  file: Blob,
  maxDim = 1600,
  quality = 0.85,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality),
  )
  return blob ?? file
}

export async function addPhoto(db: Db, containerId: string, source: Blob, order: number) {
  const compressed = await compressImage(source)
  const file = await db.createFileFromBlob(app, compressed)
  await db
    .insert(app.photos, { containerId, fileId: file.id, order })
    .wait({ tier: 'edge' })
}

/** Delete in dependency order: parts -> file -> photo row (no cascades in Jazz 2). */
export async function deletePhoto(db: Db, photo: { id: string; fileId: string }) {
  const file = await db.one(app.files.where({ id: photo.fileId }))
  if (file) {
    for (const partId of file.partIds) {
      db.delete(app.file_parts, partId)
    }
    db.delete(app.files, photo.fileId)
  }
  db.delete(app.photos, photo.id)
}

// Object-URL cache so gallery thumbs don't refetch blobs on every mount.
// Entries live for the session; a household inventory's photo set is small
// enough that we don't bother evicting.
const urlCache = new Map<string, Promise<string>>()

export function loadPhotoUrl(db: Db, fileId: string): Promise<string> {
  let cached = urlCache.get(fileId)
  if (!cached) {
    cached = db.loadFileAsBlob(app, fileId).then((blob) => URL.createObjectURL(blob))
    cached.catch(() => urlCache.delete(fileId))
    urlCache.set(fileId, cached)
  }
  return cached
}

/** Resolve a photo's blob to an object URL (cached). */
export function usePhotoUrl(fileId: string | null | undefined) {
  const db = useDb()
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!fileId) {
      setUrl(null)
      return
    }
    let cancelled = false
    loadPhotoUrl(db, fileId)
      .then((u) => {
        if (!cancelled) setUrl(u)
      })
      .catch(() => {
        if (!cancelled) setUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [db, fileId])

  return url
}

/** First photo of a container (for header thumbnails). */
export function usePrimaryPhoto(containerId: string) {
  const photos = usePhotos(containerId)
  return useMemo(() => photos?.[0] ?? null, [photos])
}
