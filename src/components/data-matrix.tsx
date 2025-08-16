"use client";

import { useEffect, useRef } from "react";
import bwipjs from "bwip-js";

// Utility function to generate DataMatrix as data URL
export async function generateDataMatrixDataURL(value: string, size: number = 200): Promise<string> {
  try {
    const canvas = document.createElement('canvas');
    bwipjs.toCanvas(canvas, {
      bcid: 'datamatrix',
      text: value,
      scale: 8, // High resolution
      includetext: false,
      backgroundcolor: 'ffffff',
      barcolor: '000000',
    });
    return canvas.toDataURL();
  } catch (error) {
    console.error('Error generating DataMatrix data URL:', error);
    return '';
  }
}

interface DataMatrixProps {
  value: string;
  size?: number;
  id?: string;
}

export function DataMatrix({ value, size = 200, id }: DataMatrixProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;

    try {
      bwipjs.toCanvas(canvasRef.current, {
        bcid: 'datamatrix',
        text: value,
        scale: 8, // Higher scale for better resolution
        includetext: false,
        backgroundcolor: 'ffffff',
        barcolor: '000000',
      });
    } catch (error) {
      console.error('Error generating Data Matrix:', error);
    }
  }, [value]);

  return (
    <canvas
      ref={canvasRef}
      id={id}
      style={{ 
        width: size, 
        height: size,
        imageRendering: 'pixelated' as React.CSSProperties['imageRendering']
      }}
    />
  );
}