"use client";

import { useEffect, useRef } from "react";
import bwipjs from "bwip-js";

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
        scale: 3,
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