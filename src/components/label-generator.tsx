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
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Download,
  FileText,
  Settings,
  Eye,
  Info,
  ChevronDown,
  Ruler,
  Square,
  Circle,
  Move,
  RectangleHorizontal,
} from "lucide-react";
import { LabelPreview } from "./label-preview";
import { IconButtonGroup, IconButtonGroupItem } from "@/components/ui/icon-button-group";

export interface LabelConfig {
  paperSize: "A4" | "US_LETTER" | "A5" | "US_LEGAL" | "A3" | "TABLOID";
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
  inputMode: "pages" | "labels";
  skipLabels: string;
  skipLabelNumbers: number[];
  includeText: boolean;
  labelShape: "rectangular" | "circular";
  labelPadding: number;
  layoutMode: "gaps" | "dimensions";
  labelWidth: number;
  labelHeight: number;
}

interface LabelGeneratorProps {
  onGenerate: (config: LabelConfig) => void;
  isGenerating?: boolean;
}

// Common label sheet presets
const labelPresets = {
  "template-30": {
    name: "30 labels (3×10)",
    labelsX: 3,
    labelsY: 10,
    marginTop: 13,
    marginBottom: 13,
    marginLeft: 8,
    marginRight: 8,
    gapH: 3,
    gapV: 0,
  },
  "template-21": {
    name: "21 labels (3×7)",
    labelsX: 3,
    labelsY: 7,
    marginTop: 15,
    marginBottom: 15,
    marginLeft: 7,
    marginRight: 7,
    gapH: 3,
    gapV: 0,
  },
  "template-14": {
    name: "14 labels (2×7)",
    labelsX: 2,
    labelsY: 7,
    marginTop: 15,
    marginBottom: 15,
    marginLeft: 15,
    marginRight: 15,
    gapH: 5,
    gapV: 0,
  },
  custom: {
    name: "Custom layout",
    labelsX: 3,
    labelsY: 8,
    marginTop: 15,
    marginBottom: 15,
    marginLeft: 15,
    marginRight: 15,
    gapH: 5,
    gapV: 5,
  },
};

export function LabelGenerator({
  onGenerate,
  isGenerating = false,
}: LabelGeneratorProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>("custom");
  const [showAdvanced, setShowAdvanced] = useState(false);
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
    inputMode: "pages",
    skipLabels: "",
    skipLabelNumbers: [],
    includeText: false,
    labelShape: "rectangular",
    labelPadding: 2,
    layoutMode: "gaps",
    labelWidth: 65,
    labelHeight: 35,
  });

  const [previewScale, setPreviewScale] = useState(0.3);

  // Paper size definitions
  const paperSizes = {
    A4: { width: 210, height: 297, unit: "mm" },
    US_LETTER: { width: 216, height: 279, unit: "mm" },
    A5: { width: 148, height: 210, unit: "mm" },
    US_LEGAL: { width: 216, height: 356, unit: "mm" },
    A3: { width: 297, height: 420, unit: "mm" },
    TABLOID: { width: 279, height: 432, unit: "mm" },
  };

  const parseSkipLabels = (input: string): number[] => {
    if (!input.trim()) return [];

    const numbers = new Set<number>();
    const parts = input.split(",");

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      // Check if it's a range (e.g., "1-11")
      if (trimmed.includes("-")) {
        const rangeParts = trimmed.split("-").map((s) => s.trim());
        if (rangeParts.length === 2) {
          const start = parseInt(rangeParts[0], 10);
          const end = parseInt(rangeParts[1], 10);

          if (
            !isNaN(start) &&
            !isNaN(end) &&
            start > 0 &&
            end > 0 &&
            start <= end
          ) {
            // Add all numbers in the range
            for (let i = start; i <= end; i++) {
              numbers.add(i);
            }
          }
        }
      } else {
        // Single number
        const num = parseInt(trimmed, 10);
        if (!isNaN(num) && num > 0) {
          numbers.add(num);
        }
      }
    }

    return Array.from(numbers).sort((a, b) => a - b);
  };

  // Helper function to calculate gaps from label dimensions
  const calculateGapsFromDimensions = (config: LabelConfig) => {
    const paper = paperSizes[config.paperSize];
    const availableWidth = paper.width - config.marginLeft - config.marginRight;
    const availableHeight = paper.height - config.marginTop - config.marginBottom;
    
    // Calculate gaps: (available space - total label space) / (number of gaps)
    const totalLabelWidth = config.labelWidth * config.labelsX;
    const totalLabelHeight = config.labelHeight * config.labelsY;
    
    const gapHorizontal = config.labelsX > 1 ? 
      Math.max(0, (availableWidth - totalLabelWidth) / (config.labelsX - 1)) : 0;
    const gapVertical = config.labelsY > 1 ? 
      Math.max(0, (availableHeight - totalLabelHeight) / (config.labelsY - 1)) : 0;
    
    return { gapHorizontal, gapVertical };
  };

  // Helper function to calculate label dimensions from gaps
  const calculateDimensionsFromGaps = (config: LabelConfig) => {
    const paper = paperSizes[config.paperSize];
    const availableWidth = paper.width - config.marginLeft - config.marginRight;
    const availableHeight = paper.height - config.marginTop - config.marginBottom;
    
    const labelWidth = (availableWidth - (config.labelsX - 1) * config.gapHorizontal) / config.labelsX;
    const labelHeight = (availableHeight - (config.labelsY - 1) * config.gapVertical) / config.labelsY;
    
    return { labelWidth: Math.max(1, labelWidth), labelHeight: Math.max(1, labelHeight) };
  };

  const updateConfig = (
    key: keyof LabelConfig,
    value: string | number | number[] | boolean
  ) => {
    const newConfig = { ...config, [key]: value };

    // Handle layout mode changes
    if (key === "layoutMode") {
      if (value === "dimensions") {
        // Convert current gaps to dimensions
        const { labelWidth, labelHeight } = calculateDimensionsFromGaps(newConfig);
        newConfig.labelWidth = Math.round(labelWidth * 10) / 10; // Round to 1 decimal
        newConfig.labelHeight = Math.round(labelHeight * 10) / 10;
      } else {
        // Convert current dimensions to gaps
        const { gapHorizontal, gapVertical } = calculateGapsFromDimensions(newConfig);
        newConfig.gapHorizontal = Math.round(gapHorizontal * 10) / 10;
        newConfig.gapVertical = Math.round(gapVertical * 10) / 10;
      }
    }

    // Auto-calculate gaps when in dimensions mode
    if (newConfig.layoutMode === "dimensions") {
      if (key === "labelWidth" || key === "labelHeight" || key === "labelsX" || key === "labelsY" || 
          key === "marginTop" || key === "marginRight" || key === "marginBottom" || key === "marginLeft" || 
          key === "paperSize") {
        const { gapHorizontal, gapVertical } = calculateGapsFromDimensions(newConfig);
        newConfig.gapHorizontal = Math.round(gapHorizontal * 10) / 10;
        newConfig.gapVertical = Math.round(gapVertical * 10) / 10;
      }
    }

    // Auto-calculate dimensions when in gaps mode
    if (newConfig.layoutMode === "gaps") {
      if (key === "gapHorizontal" || key === "gapVertical" || key === "labelsX" || key === "labelsY" || 
          key === "marginTop" || key === "marginRight" || key === "marginBottom" || key === "marginLeft" || 
          key === "paperSize") {
        const { labelWidth, labelHeight } = calculateDimensionsFromGaps(newConfig);
        newConfig.labelWidth = Math.round(labelWidth * 10) / 10;
        newConfig.labelHeight = Math.round(labelHeight * 10) / 10;
      }
    }

    // Handle input mode changes
    if (key === "inputMode") {
      if (value === "labels") {
        // Calculate pages from labels
        const labelsPerPage = newConfig.labelsX * newConfig.labelsY;
        newConfig.numPages = Math.ceil(newConfig.numLabels / labelsPerPage);
      } else {
        // Calculate labels from pages
        newConfig.numLabels =
          newConfig.labelsX * newConfig.labelsY * newConfig.numPages;
      }
    }

    // Auto-calculate based on input mode
    if (newConfig.inputMode === "pages") {
      if (key === "labelsX" || key === "labelsY" || key === "numPages") {
        newConfig.numLabels =
          newConfig.labelsX * newConfig.labelsY * newConfig.numPages;
      }
    } else {
      if (key === "labelsX" || key === "labelsY" || key === "numLabels") {
        const labelsPerPage = newConfig.labelsX * newConfig.labelsY;
        newConfig.numPages = Math.ceil(newConfig.numLabels / labelsPerPage);
      }
    }

    // Parse skip labels if that field changed
    if (key === "skipLabels") {
      newConfig.skipLabelNumbers = parseSkipLabels(value as string);
    }

    setConfig(newConfig);
  };

  const formatSkipLabelsAsRanges = (numbers: number[]): string => {
    if (numbers.length === 0) return "";

    const sorted = [...numbers].sort((a, b) => a - b);
    const ranges: string[] = [];
    let rangeStart = sorted[0];
    let rangeEnd = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === rangeEnd + 1) {
        // Continue the range
        rangeEnd = sorted[i];
      } else {
        // End the current range and start a new one
        if (rangeStart === rangeEnd) {
          ranges.push(rangeStart.toString());
        } else if (rangeEnd === rangeStart + 1) {
          // Just two consecutive numbers, list them separately
          ranges.push(rangeStart.toString());
          ranges.push(rangeEnd.toString());
        } else {
          // A proper range
          ranges.push(`${rangeStart}-${rangeEnd}`);
        }
        rangeStart = sorted[i];
        rangeEnd = sorted[i];
      }
    }

    // Handle the last range
    if (rangeStart === rangeEnd) {
      ranges.push(rangeStart.toString());
    } else if (rangeEnd === rangeStart + 1) {
      ranges.push(rangeStart.toString());
      ranges.push(rangeEnd.toString());
    } else {
      ranges.push(`${rangeStart}-${rangeEnd}`);
    }

    return ranges.join(", ");
  };

  const handleSkipToggle = (labelNumber: number) => {
    const currentSkipLabels = new Set(config.skipLabelNumbers);

    if (currentSkipLabels.has(labelNumber)) {
      // Remove from skip list
      currentSkipLabels.delete(labelNumber);
    } else {
      // Add to skip list
      currentSkipLabels.add(labelNumber);
    }

    const newSkipNumbers = Array.from(currentSkipLabels).sort((a, b) => a - b);

    // Format the skip labels string using ranges
    const skipLabelsString = formatSkipLabelsAsRanges(newSkipNumbers);

    setConfig({
      ...config,
      skipLabelNumbers: newSkipNumbers,
      skipLabels: skipLabelsString,
    });
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
    <TooltipProvider>
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
          <CardContent className="space-y-6">
            {/* Quick Start - Most Important Settings */}
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Quick Setup
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="paperSize">Paper Size</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Select the paper size for your label sheet</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select
                    value={config.paperSize}
                    onValueChange={(value) => updateConfig("paperSize", value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A4">A4 (210 × 297 mm)</SelectItem>
                      <SelectItem value="US_LETTER">
                        US Letter (8.5 × 11 in)
                      </SelectItem>
                      <SelectItem value="A5">A5 (148 × 210 mm)</SelectItem>
                      <SelectItem value="US_LEGAL">
                        US Legal (8.5 × 14 in)
                      </SelectItem>
                      <SelectItem value="A3">A3 (297 × 420 mm)</SelectItem>
                      <SelectItem value="TABLOID">
                        Tabloid (11 × 17 in)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="preset">Template</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Common label sheet layouts</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select
                    value={selectedPreset}
                    onValueChange={(value) => {
                      setSelectedPreset(value);
                      if (value !== "custom") {
                        const preset =
                          labelPresets[value as keyof typeof labelPresets];
                        setConfig((prev) => ({
                          ...prev,
                          labelsX: preset.labelsX,
                          labelsY: preset.labelsY,
                          marginTop: preset.marginTop,
                          marginBottom: preset.marginBottom,
                          marginLeft: preset.marginLeft,
                          marginRight: preset.marginRight,
                          gapHorizontal: preset.gapH,
                          gapVertical: preset.gapV,
                          numLabels:
                            preset.labelsX * preset.labelsY * prev.numPages,
                        }));
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Custom layout</SelectItem>
                      <SelectItem value="template-30">
                        30 labels (3×10)
                      </SelectItem>
                      <SelectItem value="template-21">
                        21 labels (3×7)
                      </SelectItem>
                      <SelectItem value="template-14">
                        14 labels (2×7)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="codeType">Code Type</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>QR: Better for phones, holds more data</p>
                        <p>Data Matrix: Smaller size, industrial scanners</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select
                    value={config.codeType}
                    onValueChange={(value) => updateConfig("codeType", value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="qr">QR Code</SelectItem>
                      <SelectItem value="datamatrix">Data Matrix</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="includeText">Include Code Text</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Print the code value below each barcode</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex items-center h-10">
                    <Switch
                      id="includeText"
                      checked={config.includeText}
                      onCheckedChange={(checked) => updateConfig("includeText", checked)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quantity Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                How Many Labels?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="inputMode">Count By</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Choose to specify total pages or total labels needed
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select
                    value={config.inputMode}
                    onValueChange={(value) => updateConfig("inputMode", value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pages">Specify Pages</SelectItem>
                      <SelectItem value="labels">Specify Labels</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {config.inputMode === "pages" ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="numPages">Pages</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Number of full pages to generate</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
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
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="numLabels">Total Labels</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Total number of labels to generate (may result in
                            partial last page)
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="numLabels"
                      type="number"
                      min="1"
                      max="1000"
                      value={config.numLabels}
                      onChange={(e) =>
                        updateConfig("numLabels", parseInt(e.target.value) || 1)
                      }
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="skipLabels">Skip Labels</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Labels to leave blank (for already-used positions on
                          the sheet)
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="skipLabels"
                    type="text"
                    placeholder="e.g., 1-11, 15, 20-25"
                    value={config.skipLabels}
                    onChange={(e) => updateConfig("skipLabels", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Advanced Settings - Collapsible */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <div className="flex gap-2">
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="flex-1 justify-between">
                    <span className="flex items-center gap-2">
                      <Ruler className="h-4 w-4" />
                      Advanced Layout Settings
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
                    />
                  </Button>
                </CollapsibleTrigger>
                {selectedPreset === "custom" && showAdvanced && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const preset = labelPresets.custom;
                      setConfig((prev) => ({
                        ...prev,
                        labelsX: preset.labelsX,
                        labelsY: preset.labelsY,
                        marginTop: preset.marginTop,
                        marginBottom: preset.marginBottom,
                        marginLeft: preset.marginLeft,
                        marginRight: preset.marginRight,
                        gapHorizontal: preset.gapH,
                        gapVertical: preset.gapV,
                        numLabels:
                          preset.labelsX * preset.labelsY * prev.numPages,
                      }));
                    }}
                  >
                    Reset
                  </Button>
                )}
              </div>
              <CollapsibleContent className="space-y-6 pt-4">
                {/* Layout Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Layout Grid</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="labelsX">Grid Size</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Number of columns and rows per page</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          id="labelsX"
                          type="number"
                          min="1"
                          max="10"
                          value={config.labelsX}
                          onChange={(e) =>
                            updateConfig("labelsX", parseInt(e.target.value) || 1)
                          }
                          placeholder="Cols"
                        />
                        <span className="flex items-center text-muted-foreground">×</span>
                        <Input
                          id="labelsY"
                          type="number"
                          min="1"
                          max="20"
                          value={config.labelsY}
                          onChange={(e) =>
                            updateConfig("labelsY", parseInt(e.target.value) || 1)
                          }
                          placeholder="Rows"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label>Layout Method</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Choose how to define your layout</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <IconButtonGroup
                        value={config.layoutMode}
                        onValueChange={(value) => updateConfig("layoutMode", value)}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <IconButtonGroupItem value="gaps">
                              <Move className="h-4 w-4" />
                            </IconButtonGroupItem>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Specify Gaps - Define spacing between labels</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <IconButtonGroupItem value="dimensions">
                              <RectangleHorizontal className="h-4 w-4" />
                            </IconButtonGroupItem>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Specify Dimensions - Define exact label size</p>
                          </TooltipContent>
                        </Tooltip>
                      </IconButtonGroup>
                    </div>
                  </div>
                  
                  {/* Conditional fields based on layout mode */}
                  {config.layoutMode === "gaps" ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="gapHorizontal">H. Gap (mm)</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Horizontal space between labels in millimeters</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Input
                          id="gapHorizontal"
                          type="number"
                          min="0"
                          max="20"
                          step="0.1"
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
                        <div className="flex items-center gap-2">
                          <Label htmlFor="gapVertical">V. Gap (mm)</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Vertical space between labels in millimeters</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Input
                          id="gapVertical"
                          type="number"
                          min="0"
                          max="20"
                          step="0.1"
                          value={config.gapVertical}
                          onChange={(e) =>
                            updateConfig(
                              "gapVertical",
                              parseFloat(e.target.value) || 0
                            )
                          }
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="labelWidth">Label Width (mm)</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Width of each label in millimeters</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Input
                          id="labelWidth"
                          type="number"
                          min="5"
                          max="200"
                          step="0.1"
                          value={config.labelWidth}
                          onChange={(e) =>
                            updateConfig(
                              "labelWidth",
                              parseFloat(e.target.value) || 5
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="labelHeight">Label Height (mm)</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Height of each label in millimeters</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Input
                          id="labelHeight"
                          type="number"
                          min="5"
                          max="200"
                          step="0.1"
                          value={config.labelHeight}
                          onChange={(e) =>
                            updateConfig(
                              "labelHeight",
                              parseFloat(e.target.value) || 5
                            )
                          }
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Auto-calculated values display */}
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <div className="text-sm text-muted-foreground space-y-1">
                      {config.layoutMode === "gaps" ? (
                        <p>
                          <strong>Calculated label size:</strong> {config.labelWidth.toFixed(1)} × {config.labelHeight.toFixed(1)} mm
                        </p>
                      ) : (
                        <p>
                          <strong>Calculated gaps:</strong> H: {config.gapHorizontal.toFixed(1)}mm, V: {config.gapVertical.toFixed(1)}mm
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Label Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Label Properties</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label>Shape</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Choose rectangular or circular labels</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <IconButtonGroup
                        value={config.labelShape}
                        onValueChange={(value) => updateConfig("labelShape", value)}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <IconButtonGroupItem value="rectangular">
                              <Square className="h-4 w-4" />
                            </IconButtonGroupItem>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Rectangular Labels</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <IconButtonGroupItem value="circular">
                              <Circle className="h-4 w-4" />
                            </IconButtonGroupItem>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Circular Labels</p>
                          </TooltipContent>
                        </Tooltip>
                      </IconButtonGroup>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="labelPadding">Padding (mm)</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Space between barcode and label edge</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        id="labelPadding"
                        type="number"
                        min="0"
                        max="10"
                        step="0.5"
                        value={config.labelPadding}
                        onChange={(e) =>
                          updateConfig("labelPadding", parseFloat(e.target.value) || 0)
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
                      <div className="flex items-center gap-2">
                        <Label htmlFor="marginTop">Top</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Top margin in millimeters</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        id="marginTop"
                        type="number"
                        min="0"
                        max="50"
                        value={config.marginTop}
                        onChange={(e) =>
                          updateConfig(
                            "marginTop",
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="marginRight">Right</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Right margin in millimeters</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        id="marginRight"
                        type="number"
                        min="0"
                        max="50"
                        value={config.marginRight}
                        onChange={(e) =>
                          updateConfig(
                            "marginRight",
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="marginBottom">Bottom</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Bottom margin in millimeters</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
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
                      <div className="flex items-center gap-2">
                        <Label htmlFor="marginLeft">Left</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Left margin in millimeters</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        id="marginLeft"
                        type="number"
                        min="0"
                        max="50"
                        value={config.marginLeft}
                        onChange={(e) =>
                          updateConfig(
                            "marginLeft",
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Preview Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Live Preview
                </h3>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="previewScale" className="text-sm">
                      Scale:
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Adjust preview size for better visibility</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select
                    value={previewScale.toString()}
                    onValueChange={(value) =>
                      setPreviewScale(parseFloat(value))
                    }
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
                <LabelPreview
                  config={config}
                  scale={previewScale}
                  onSkipToggle={handleSkipToggle}
                />
              </div>

              <div className="bg-muted p-3 rounded-lg">
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    <strong>Label size:</strong> {labelWidth.toFixed(1)} ×{" "}
                    {labelHeight.toFixed(1)} mm
                  </p>
                  <p>
                    <strong>Labels per page:</strong> {config.labelsX} ×{" "}
                    {config.labelsY} = {config.labelsX * config.labelsY}
                  </p>
                  <p>
                    <strong>Labels total:</strong>{" "}
                    {config.numLabels -
                      config.skipLabelNumbers.filter(
                        (n) => n <= config.numLabels
                      ).length}{" "}
                    across {config.numPages} page(s)
                    {config.skipLabelNumbers.length > 0 && (
                      <span className="italic">
                        {" - skipping: "}
                        {config.skipLabelNumbers.length} label
                        {config.skipLabelNumbers.length !== 1 ? "s" : ""} (
                        {formatSkipLabelsAsRanges(config.skipLabelNumbers)})
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Generate Button - More Prominent */}
            <div className="mt-6 p-4 bg-primary/5 rounded-lg border-2 border-primary/20">
              <Button
                onClick={() => onGenerate(config)}
                className="w-full h-12 text-base"
                size="lg"
                disabled={isGenerating}
              >
                <Download className="h-5 w-5 mr-2" />
                {isGenerating
                  ? "Generating PDF..."
                  : `Generate ${config.numLabels - config.skipLabelNumbers.filter((n) => n <= config.numLabels).length} Labels`}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
