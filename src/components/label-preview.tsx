"use client";

import { QrCode } from "lucide-react";
import { LabelConfig } from "./label-generator";

interface LabelPreviewProps {
  config: LabelConfig;
  scale?: number; // Scale as a percentage (0.1 to 1.0)
}

export function LabelPreview({ config, scale = 0.3 }: LabelPreviewProps) {
  const paperSizes = {
    A4: { width: 210, height: 297 }, // mm
    US_LETTER: { width: 216, height: 279 }, // mm
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

  // Generate label grid for preview
  const labels = [];

  for (let row = 0; row < config.labelsY; row++) {
    for (let col = 0; col < config.labelsX; col++) {
      const x = marginLeft + col * (labelWidth + gapH);
      const y = marginTop + row * (labelHeight + gapV);
      labels.push({
        x,
        y,
        width: labelWidth,
        height: labelHeight,
        id: `${row}-${col}`,
      });
    }
  }

  return (
    <div className="space-y-4 bg-neutral-500 p-4 rounded overflow-auto">
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
              className="absolute border border-dashed border-gray-300 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors"
              style={{
                left: `${label.x}px`,
                top: `${label.y}px`,
                width: `${label.width}px`,
                height: `${label.height}px`,
              }}
              title={`Row ${parseInt(label.id.split("-")[0]) + 1}, Column ${parseInt(label.id.split("-")[1]) + 1}`}
            >
              {label.width > 15 && label.height > 15 ? (
                <QrCode
                  className="text-gray-400"
                  style={{
                    width: `${Math.min(label.width * 0.6, label.height * 0.6)}px`,
                    height: `${Math.min(label.width * 0.6, label.height * 0.6)}px`,
                  }}
                />
              ) : (
                <div className="text-xs text-red-500 text-center p-1">
                  Too small
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
