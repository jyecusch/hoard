"use client";

import { useState } from "react";
import { QrCode, ChevronLeft, ChevronRight, X } from "lucide-react";
import { LabelConfig } from "./label-generator";
import { Button } from "@/components/ui/button";

interface LabelPreviewProps {
  config: LabelConfig;
  scale?: number; // Scale as a percentage (0.1 to 1.0)
  onSkipToggle?: (labelNumber: number) => void;
}

export function LabelPreview({ config, scale = 0.3, onSkipToggle }: LabelPreviewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  
  // Helper function to calculate the largest square that fits in a circle
  const getInscribedSquareSize = (circleRadius: number) => {
    // For a circle, the largest inscribed square has side length = radius * sqrt(2)
    return circleRadius * Math.sqrt(2);
  };
  
  const paperSizes = {
    A4: { width: 210, height: 297 }, // mm
    US_LETTER: { width: 216, height: 279 }, // mm
    A5: { width: 148, height: 210 }, // mm
    US_LEGAL: { width: 216, height: 356 }, // mm
    A3: { width: 297, height: 420 }, // mm
    TABLOID: { width: 279, height: 432 }, // mm
  };

  const paper = paperSizes[config.paperSize];

  // Convert mm to pixels for display
  const mmToPixelRatio = 3.78; // approximate conversion (96 DPI / 25.4 mm per inch)

  // Convert paper dimensions to pixels and apply scale
  const scaledWidth = paper.width * mmToPixelRatio * scale;
  const scaledHeight = paper.height * mmToPixelRatio * scale;

  // Calculate label dimensions (convert mm to pixels then scale)
  const marginTop = config.marginTop * mmToPixelRatio * scale;
  const marginRight = config.marginRight * mmToPixelRatio * scale;
  const marginBottom = config.marginBottom * mmToPixelRatio * scale;
  const marginLeft = config.marginLeft * mmToPixelRatio * scale;
  const gapH = config.gapHorizontal * mmToPixelRatio * scale;
  const gapV = config.gapVertical * mmToPixelRatio * scale;

  const availableWidth = scaledWidth - marginLeft - marginRight;
  const availableHeight = scaledHeight - marginTop - marginBottom;

  const labelWidth =
    (availableWidth - (config.labelsX - 1) * gapH) / config.labelsX;
  const labelHeight =
    (availableHeight - (config.labelsY - 1) * gapV) / config.labelsY;

  // Calculate total labels and pages
  const labelsPerPage = config.labelsX * config.labelsY;
  const totalPages = config.numPages;
  const totalLabels = config.numLabels;
  
  // Calculate labels for current page
  const pageStartLabel = (currentPage - 1) * labelsPerPage + 1;
  const pageEndLabel = Math.min(currentPage * labelsPerPage, totalLabels);
  const labelsOnThisPage = pageEndLabel - pageStartLabel + 1;

  // Generate label grid for current page
  const labels = [];
  let labelNumber = pageStartLabel;

  for (let row = 0; row < config.labelsY; row++) {
    for (let col = 0; col < config.labelsX; col++) {
      if (labelNumber <= pageEndLabel) {
        const x = marginLeft + col * (labelWidth + gapH);
        const y = marginTop + row * (labelHeight + gapV);
        const isSkipped = config.skipLabelNumbers.includes(labelNumber);
        
        labels.push({
          x,
          y,
          width: labelWidth,
          height: labelHeight,
          id: `${row}-${col}`,
          labelNumber,
          isSkipped,
        });
        
        labelNumber++;
      }
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="space-y-4">
      {/* Page navigation */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
            {currentPage === totalPages && labelsOnThisPage < labelsPerPage && (
              <span className="ml-2 text-amber-500">
                (Partial page: {labelsOnThisPage} label{labelsOnThisPage !== 1 ? 's' : ''})
              </span>
            )}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
      
      <div className="bg-neutral-500 p-4 rounded overflow-auto">
        <div className="flex justify-center">
          <div
            className="relative bg-white shadow-lg"
            style={{
              width: `${scaledWidth}px`,
              height: `${scaledHeight}px`,
              minWidth: `${scaledWidth}px`,
              minHeight: `${scaledHeight}px`,
            }}
          >
            {/* Labels */}
            {labels.map((label) => {
              // Calculate effective content area accounting for padding
              const paddingPx = config.labelPadding * mmToPixelRatio * scale;
              const contentWidth = label.width - (paddingPx * 2);
              const contentHeight = label.height - (paddingPx * 2);
              
              // For circular labels, calculate the inscribed square
              let barcodeArea;
              if (config.labelShape === "circular") {
                const radius = Math.min(label.width, label.height) / 2;
                const contentRadius = radius - paddingPx;
                const squareSize = getInscribedSquareSize(contentRadius);
                barcodeArea = {
                  width: squareSize,
                  height: squareSize,
                };
              } else {
                barcodeArea = {
                  width: contentWidth,
                  height: contentHeight,
                };
              }
              
              return (
                <div
                  key={label.id}
                  className={`absolute border cursor-pointer ${
                    label.isSkipped 
                      ? 'border-red-300 bg-red-50 hover:bg-red-100' 
                      : 'border-dashed border-gray-300 bg-white hover:bg-gray-50'
                  } flex items-center justify-center transition-colors ${
                    config.labelShape === "circular" ? "rounded-full" : ""
                  }`}
                  style={{
                    left: `${label.x}px`,
                    top: `${label.y}px`,
                    width: `${label.width}px`,
                    height: `${label.height}px`,
                  }}
                  onClick={() => onSkipToggle?.(label.labelNumber)}
                  title={`Label #${label.labelNumber} - Click to ${label.isSkipped ? 'include' : 'skip'}`}
                >
                {label.isSkipped ? (
                  <X
                    className="text-red-400 pointer-events-none"
                    style={{
                      width: `${Math.min(barcodeArea.width * 0.4, barcodeArea.height * 0.4)}px`,
                      height: `${Math.min(barcodeArea.width * 0.4, barcodeArea.height * 0.4)}px`,
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center pointer-events-none">
                    <QrCode
                      className="text-gray-400"
                      style={{
                        width: `${Math.max(1, Math.min(barcodeArea.width * (config.includeText ? 0.6 : 0.8), barcodeArea.height * (config.includeText ? 0.6 : 0.8)))}px`,
                        height: `${Math.max(1, Math.min(barcodeArea.width * (config.includeText ? 0.6 : 0.8), barcodeArea.height * (config.includeText ? 0.6 : 0.8)))}px`,
                      }}
                    />
                    {config.includeText && config.labelShape === "circular" && (
                      <div 
                        className="text-gray-500 font-mono text-center mt-1"
                        style={{
                          fontSize: `${Math.max(1, Math.min(barcodeArea.width * 0.08, 6))}px`,
                          lineHeight: '1',
                        }}
                      >
                        ABC123XY
                      </div>
                    )}
                    {config.includeText && config.labelShape === "rectangular" && (
                      <div 
                        className="text-gray-500 font-mono text-center mt-1"
                        style={{
                          fontSize: `${Math.max(1, Math.min(barcodeArea.width * 0.06, barcodeArea.height * 0.06, 8))}px`,
                          lineHeight: '1',
                        }}
                      >
                        ABC123XY
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
            })}
          </div>
        </div>
      </div>
      
    </div>
  );
}