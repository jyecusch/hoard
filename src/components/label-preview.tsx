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
            {labels.map((label) => (
              <div
                key={label.id}
                className={`absolute border cursor-pointer ${
                  label.isSkipped 
                    ? 'border-red-300 bg-red-50 hover:bg-red-100' 
                    : 'border-dashed border-gray-300 bg-white hover:bg-gray-50'
                } flex items-center justify-center transition-colors`}
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
                      width: `${Math.min(label.width * 0.4, label.height * 0.4)}px`,
                      height: `${Math.min(label.width * 0.4, label.height * 0.4)}px`,
                    }}
                  />
                ) : label.width > 15 && label.height > 15 ? (
                  <div className="flex flex-col items-center pointer-events-none">
                    <QrCode
                      className="text-gray-400"
                      style={{
                        width: `${Math.min(label.width * (config.includeText ? 0.5 : 0.6), label.height * (config.includeText ? 0.5 : 0.6))}px`,
                        height: `${Math.min(label.width * (config.includeText ? 0.5 : 0.6), label.height * (config.includeText ? 0.5 : 0.6))}px`,
                      }}
                    />
                    {config.includeText && (
                      <div 
                        className="text-gray-500 font-mono text-center mt-1"
                        style={{
                          fontSize: `${Math.min(label.width * 0.06, label.height * 0.06, 8)}px`,
                          lineHeight: '1',
                        }}
                      >
                        ABC123XY
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-red-500 text-center p-1 pointer-events-none">
                    Too small
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      
    </div>
  );
}