"use client";

import { useState } from 'react'
import QRCode from 'react-qr-code'
import { QrCode, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface QRCodeDialogProps {
  containerId: string
  containerName: string
  code?: string | null // Custom code to display instead of container ID
}

export function QRCodeDialog({ containerId, containerName, code }: QRCodeDialogProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleDownload = () => {
    // Get the QR code SVG element
    const svg = document.getElementById('qr-code')
    if (!svg) return

    // Convert SVG to blob
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `qr-${containerName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }
      })
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <QrCode className="h-4 w-4" />
        QR Code
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code for {containerName}</DialogTitle>
            <DialogDescription>
              Scan this QR code to quickly find this container in your inventory.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center space-y-4 py-4">
            <div className="bg-white p-4 rounded-lg">
              <QRCode
                id="qr-code"
                value={code || containerId}
                size={256}
                level="H"
              />
            </div>
            
            <div className="text-xs text-muted-foreground text-center break-all max-w-full px-4">
              {code ? (
                <div>
                  <div>Code: {code}</div>
                  <div className="text-[10px] mt-1 opacity-70">ID: {containerId}</div>
                </div>
              ) : (
                <div>ID: {containerId}</div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={handleDownload}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}