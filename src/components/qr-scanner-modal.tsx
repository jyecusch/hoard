"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { DialogTitle } from '@radix-ui/react-dialog';

interface QRScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'navigate' | 'assign'; // navigate = go to item, assign = assign code to current item
  onCodeScanned?: (code: string) => void; // callback for assign mode
}

export function QRScannerModal({ 
  open, 
  onOpenChange, 
  mode = 'navigate', 
  onCodeScanned 
}: QRScannerModalProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleScan = (detectedCodes: { rawValue: string }[]) => {
    if (detectedCodes.length > 0) {
      const result = detectedCodes[0].rawValue;
      
      if (mode === 'assign') {
        // In assign mode, just pass the raw scanned value to the callback
        onCodeScanned?.(result);
        onOpenChange(false);
        return;
      }

      // Navigation mode (existing behavior)
      try {
        // Expected format: hoard://item/{containerId}
        const url = new URL(result);
        if (url.protocol === 'hoard:' && url.hostname === 'item') {
          const containerId = url.pathname.slice(1); // Remove leading slash
          onOpenChange(false);
          router.push(`/i/${containerId}`);
        } else {
          setError('Invalid QR code format');
        }
      } catch {
        // If it's not a URL, treat it as a code and use the code lookup route
        if (result && result.length > 0) {
          onOpenChange(false);
          // Use code lookup route to find and redirect to the correct item
          router.push(`/code/${encodeURIComponent(result)}`);
        } else {
          setError('Invalid QR code');
        }
      }
    }
  };

  const handleError = (error: unknown) => {
    console.error('QR Scanner error:', error);
    const errorMessage = error instanceof Error ? error.message : 
                        (error as { message?: string })?.message || 'Failed to access camera';
    setError(errorMessage);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTitle className="sr-only">QR Scanner</DialogTitle>
      <DialogContent 
        className="!max-w-none !w-screen !h-screen !p-0 !m-0 bg-black !border-0 !rounded-none !translate-x-0 !translate-y-0 !top-0 !left-0" 
        showCloseButton={false}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          maxWidth: 'none',
          transform: 'none',
        }}
      >
        <div className="relative w-full h-full flex flex-col">
          <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/60 to-transparent">
            <div className="flex justify-between items-center">
              <h2 className="text-white text-lg font-semibold">
                {mode === 'assign' ? 'Scan Code to Assign' : 'Scan QR Code'}
              </h2>
              <Button
                onClick={() => onOpenChange(false)}
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="flex-1 relative">
            <Scanner
              onScan={handleScan}
              onError={handleError}
              formats={["data_matrix", "qr_code"]}
              constraints={{
                facingMode: 'environment'
              }}
              styles={{
                container: {
                  width: '100%',
                  height: '100%',
                },
                video: {
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                },
              }}
            />
            
            {error && (
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-red-500/90 text-white">
                <p className="text-center">{error}</p>
                <Button
                  onClick={() => setError(null)}
                  variant="ghost"
                  className="mt-2 w-full text-white hover:bg-white/20"
                >
                  Dismiss
                </Button>
              </div>
            )}
          </div>

          <div className="absolute bottom-8 left-0 right-0 text-center">
            <p className="text-white text-sm px-4">
              {mode === 'assign' 
                ? 'Position the QR or data matrix code within the camera view'
                : 'Position the QR code within the camera view'
              }
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}