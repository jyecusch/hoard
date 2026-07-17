import { useEffect, useRef, useState } from 'react'
import { BarcodeDetector } from 'barcode-detector/ponyfill'
import { CameraOff, Loader2 } from 'lucide-react'

/**
 * Live camera scanner for QR + DataMatrix. Calls onDetect with the raw
 * decoded text (deduped) whenever a code enters the frame. Uses the native
 * BarcodeDetector when available, zxing WASM ponyfill otherwise.
 */
export function CodeScanner({
  onDetect,
  paused = false,
  className,
}: {
  onDetect: (rawValue: string) => void
  paused?: boolean
  className?: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onDetectRef = useRef(onDetect)
  onDetectRef.current = onDetect
  const pausedRef = useRef(paused)
  pausedRef.current = paused
  const [state, setState] = useState<'starting' | 'active' | 'denied' | 'unavailable'>(
    'starting',
  )

  useEffect(() => {
    let stream: MediaStream | null = null
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | null = null
    let lastValue = ''
    let lastValueAt = 0

    const detector = new BarcodeDetector({ formats: ['qr_code', 'data_matrix'] })

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        })
      } catch {
        setState((s) => (s === 'starting' ? 'denied' : s))
        return
      }
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      await video.play().catch(() => {})
      setState('active')
      scheduleScan()
    }

    function scheduleScan() {
      if (stopped) return
      timer = setTimeout(scan, 180)
    }

    async function scan() {
      const video = videoRef.current
      if (stopped || !video || video.readyState < 2 || pausedRef.current) {
        scheduleScan()
        return
      }
      try {
        const codes = await detector.detect(video)
        const value = codes[0]?.rawValue
        if (value) {
          const now = Date.now()
          // Re-fire the same code only after it has been out of frame a while.
          if (value !== lastValue || now - lastValueAt > 3000) {
            lastValue = value
            lastValueAt = now
            onDetectRef.current(value)
          } else {
            lastValueAt = now
          }
        }
      } catch {
        // Detector hiccups on some frames; keep scanning.
      }
      scheduleScan()
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- absent on http/older browsers
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('unavailable')
    } else {
      start()
    }

    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  return (
    <div
      className={
        'relative overflow-hidden rounded-xl bg-black ' + (className ?? 'aspect-[3/4] w-full')
      }
    >
      <video
        ref={videoRef}
        playsInline
        muted
        className="h-full w-full object-cover"
        data-testid="scanner-video"
      />
      {state === 'starting' && (
        <div className="absolute inset-0 flex items-center justify-center text-white">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}
      {(state === 'denied' || state === 'unavailable') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-white">
          <CameraOff className="h-8 w-8" />
          <p className="text-sm">
            {state === 'denied'
              ? 'Camera access was blocked. Allow camera permission for this site to scan labels.'
              : 'No camera available on this device.'}
          </p>
        </div>
      )}
      {state === 'active' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-48 w-48 rounded-2xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        </div>
      )}
    </div>
  )
}
