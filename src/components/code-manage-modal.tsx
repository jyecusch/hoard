"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shuffle,
  Save,
  Download,
  QrCode,
  ScanLine,
  Undo,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QRScannerModal } from "@/components/qr-scanner-modal";
import { nanoid } from "nanoid";
import QRCode from "react-qr-code";
import { DataMatrix } from "@/components/data-matrix";

interface CodeManageModalProps {
  code?: string | null;
  containerName: string;
  containerId: string;
  onCodeUpdate?: (code: string) => void;
  onCodeRemove?: () => void;
  editable?: boolean;
}

export function CodeManageModal({
  code,
  containerName,
  containerId,
  onCodeUpdate,
  onCodeRemove,
  editable = false,
}: CodeManageModalProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(code || "");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [codeType, setCodeType] = useState<"qr" | "datamatrix">("qr");

  // Show the input value if it's been modified, otherwise show stored code or container ID
  const displayCode = inputValue.trim() || code || containerId;

  const handleSave = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue) {
      onCodeUpdate?.(trimmedValue);
    }
  };

  const handleGenerate = () => {
    const newCode = nanoid(8);
    setInputValue(newCode);
  };

  const handleRemove = () => {
    setInputValue("");
    onCodeRemove?.();
  };

  const handleScanCode = (scannedCode: string) => {
    setInputValue(scannedCode);
    setScannerOpen(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setInputValue(code || ""); // Reset input when opening
    }
    setOpen(newOpen);
  };

  const handleDownload = () => {
    const codeElement = document.getElementById(`code-display-${codeType}`);
    if (!codeElement) return;

    const filename = `${codeType}-${containerName.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.png`;

    if (codeType === "datamatrix") {
      // For DataMatrix (canvas), download directly
      const canvas = codeElement as HTMLCanvasElement;
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      });
    } else {
      // For QR code (SVG), convert to canvas first
      const svgData = new XMLSerializer().serializeToString(codeElement);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
        });
      };

      img.src =
        "data:image/svg+xml;base64," +
        btoa(unescape(encodeURIComponent(svgData)));
    }
  };

  if (!editable && !code) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            className="h-auto p-1 text-left justify-start cursor-pointer"
          >
            <QrCode className="h-4 w-4 mr-2" />
            <div className="">Barcode</div>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Barcode for{" "}
                <span className="text-amber-500">{containerName}</span>
              </div>
            </DialogTitle>
            <DialogDescription>
              Download or set a QR or Data Matrix code
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Code Display Section */}
            <div className="space-y-3">
              <Tabs
                value={codeType}
                onValueChange={(value) =>
                  setCodeType(value as "qr" | "datamatrix")
                }
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="qr">QR Code</TabsTrigger>
                  <TabsTrigger value="datamatrix">Data Matrix</TabsTrigger>
                </TabsList>

                <TabsContent value="qr" className="mt-4">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="bg-white p-4 rounded-lg">
                      <QRCode
                        id="code-display-qr"
                        value={displayCode}
                        size={100}
                        level="H"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="datamatrix" className="mt-4">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="bg-white p-4 rounded-lg">
                      <DataMatrix
                        id="code-display-datamatrix"
                        value={displayCode}
                        size={100}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Code Input Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  id="code-input"
                  placeholder={displayCode}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="font-mono"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                    if (e.key === "Escape") setOpen(false);
                  }}
                />
                <Button
                  onClick={handleGenerate}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Shuffle className="h-4 w-4" />
                </Button>

                <Button
                  onClick={() => setScannerOpen(true)}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <ScanLine className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={handleSave}
                  disabled={!inputValue.trim()}
                  className="gap-2"
                  size="sm"
                >
                  Save
                  <Save className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleRemove}
                  disabled={!code || !code.trim()}
                  className="gap-2"
                  size="sm"
                >
                  Reset
                  <Undo className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleDownload}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  Download
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />
          </div>
        </DialogContent>
      </Dialog>

      <QRScannerModal
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        mode="assign"
        onCodeScanned={handleScanCode}
      />
    </>
  );
}
