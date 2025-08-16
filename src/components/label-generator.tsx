"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileText, Settings, Eye } from "lucide-react";
import { LabelPreview } from "./label-preview";

export interface LabelConfig {
  paperSize: "A4" | "US_LETTER";
  labelsX: number;
  labelsY: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  gapHorizontal: number;
  gapVertical: number;
  numPages: number;
  numLabels: number;
  codeType: "qr" | "datamatrix";
}

interface LabelGeneratorProps {
  onGenerate: (config: LabelConfig) => void;
  isGenerating?: boolean;
}

export function LabelGenerator({
  onGenerate,
  isGenerating = false,
}: LabelGeneratorProps) {
  const [config, setConfig] = useState<LabelConfig>({
    paperSize: "A4",
    labelsX: 3,
    labelsY: 8,
    marginTop: 15,
    marginRight: 15,
    marginBottom: 15,
    marginLeft: 15,
    gapHorizontal: 5,
    gapVertical: 5,
    numPages: 1,
    numLabels: 24,
    codeType: "qr",
  });

  const [previewScale, setPreviewScale] = useState(0.3);

  const updateConfig = (key: keyof LabelConfig, value: string | number) => {
    const newConfig = { ...config, [key]: value };

    // Auto-calculate numLabels when other values change
    if (key === "labelsX" || key === "labelsY" || key === "numPages") {
      newConfig.numLabels =
        newConfig.labelsX * newConfig.labelsY * newConfig.numPages;
    }

    setConfig(newConfig);
  };

  const paperSizes = {
    A4: { width: 210, height: 297, unit: "mm" },
    US_LETTER: { width: 216, height: 279, unit: "mm" },
  };

  const currentPaper = paperSizes[config.paperSize];
  const availableWidth =
    currentPaper.width - config.marginLeft - config.marginRight;
  const availableHeight =
    currentPaper.height - config.marginTop - config.marginBottom;
  const labelWidth =
    (availableWidth - (config.labelsX - 1) * config.gapHorizontal) /
    config.labelsX;
  const labelHeight =
    (availableHeight - (config.labelsY - 1) * config.gapVertical) /
    config.labelsY;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            QR Code Label Generator
          </CardTitle>
          <CardDescription>
            Configure your label layout and generate printable QR code sheets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Paper Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Paper Settings</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paperSize">Paper Size</Label>
                <Select
                  value={config.paperSize}
                  onValueChange={(value) => updateConfig("paperSize", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A4">A4 (210 × 297 mm)</SelectItem>
                    <SelectItem value="US_LETTER">
                      US Letter (8.5 x 11 in)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="numPages">Number of pages</Label>
                <Input
                  id="numPages"
                  type="number"
                  min="1"
                  max="100"
                  value={config.numPages}
                  onChange={(e) =>
                    updateConfig("numPages", parseInt(e.target.value) || 1)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="codeType">Code Type</Label>
                <Select
                  value={config.codeType}
                  onValueChange={(value) => updateConfig("codeType", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="qr">QR Code</SelectItem>
                    <SelectItem value="datamatrix">Data Matrix</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Layout Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Layout</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="labelsX">Labels per row</Label>
                <Input
                  id="labelsX"
                  type="number"
                  min="1"
                  max="10"
                  value={config.labelsX}
                  onChange={(e) =>
                    updateConfig("labelsX", parseInt(e.target.value) || 1)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="labelsY">Labels per column</Label>
                <Input
                  id="labelsY"
                  type="number"
                  min="1"
                  max="20"
                  value={config.labelsY}
                  onChange={(e) =>
                    updateConfig("labelsY", parseInt(e.target.value) || 1)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gapHorizontal">Horizontal gap (mm)</Label>
                <Input
                  id="gapHorizontal"
                  type="number"
                  min="0"
                  max="20"
                  value={config.gapHorizontal}
                  onChange={(e) =>
                    updateConfig(
                      "gapHorizontal",
                      parseFloat(e.target.value) || 0
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gapVertical">Vertical gap (mm)</Label>
                <Input
                  id="gapVertical"
                  type="number"
                  min="0"
                  max="20"
                  value={config.gapVertical}
                  onChange={(e) =>
                    updateConfig("gapVertical", parseFloat(e.target.value) || 0)
                  }
                />
              </div>
            </div>
          </div>

          {/* Margins */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Margins (mm)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="marginTop">Top</Label>
                <Input
                  id="marginTop"
                  type="number"
                  min="0"
                  max="50"
                  value={config.marginTop}
                  onChange={(e) =>
                    updateConfig("marginTop", parseFloat(e.target.value) || 0)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="marginRight">Right</Label>
                <Input
                  id="marginRight"
                  type="number"
                  min="0"
                  max="50"
                  value={config.marginRight}
                  onChange={(e) =>
                    updateConfig("marginRight", parseFloat(e.target.value) || 0)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="marginBottom">Bottom</Label>
                <Input
                  id="marginBottom"
                  type="number"
                  min="0"
                  max="50"
                  value={config.marginBottom}
                  onChange={(e) =>
                    updateConfig(
                      "marginBottom",
                      parseFloat(e.target.value) || 0
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="marginLeft">Left</Label>
                <Input
                  id="marginLeft"
                  type="number"
                  min="0"
                  max="50"
                  value={config.marginLeft}
                  onChange={(e) =>
                    updateConfig("marginLeft", parseFloat(e.target.value) || 0)
                  }
                />
              </div>
            </div>
          </div>

          {/* Preview Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Preview</h3>
              <div className="flex items-center gap-2">
                <Label htmlFor="previewScale" className="text-sm">
                  Scale:
                </Label>
                <Select
                  value={previewScale.toString()}
                  onValueChange={(value) => setPreviewScale(parseFloat(value))}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.2">20%</SelectItem>
                    <SelectItem value="0.3">30%</SelectItem>
                    <SelectItem value="0.4">40%</SelectItem>
                    <SelectItem value="0.5">50%</SelectItem>
                    <SelectItem value="0.6">60%</SelectItem>
                    <SelectItem value="0.7">70%</SelectItem>
                    <SelectItem value="0.8">80%</SelectItem>
                    <SelectItem value="0.9">90%</SelectItem>
                    <SelectItem value="1">100%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <LabelPreview config={config} scale={previewScale} />
            </div>

            <div className="bg-muted p-3 rounded-lg">
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  <strong>Label size:</strong> {labelWidth.toFixed(1)} ×{" "}
                  {labelHeight.toFixed(1)} {currentPaper.unit}
                </p>
                <p>
                  <strong>Labels per page:</strong> {config.labelsX} ×{" "}
                  {config.labelsY} = {config.labelsX * config.labelsY}
                </p>
                <p>
                  <strong>Total labels:</strong> {config.numLabels} across{" "}
                  {config.numPages} page(s)
                </p>
              </div>
            </div>
          </div>

          {/* Generate Button - Outside tabs so it's always visible */}
          <div className="mt-6">
            <Button
              onClick={() => onGenerate(config)}
              className="w-full"
              disabled={isGenerating}
            >
              <Download className="h-4 w-4 mr-2" />
              {isGenerating ? "Generating PDF..." : "Generate QR Code Labels"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
