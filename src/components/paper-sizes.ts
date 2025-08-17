// Shared paper size definitions
export const PAPER_SIZES = {
  A4: { width: 210, height: 297 },
  US_LETTER: { width: 216, height: 279 },
  A5: { width: 148, height: 210 },
  US_LEGAL: { width: 216, height: 356 },
  A3: { width: 297, height: 420 },
  TABLOID: { width: 279, height: 432 },
} as const;

export type PaperSize = keyof typeof PAPER_SIZES;

// Convert mm to points (PDF unit)
export const mmToPoints = (mm: number) => mm * 2.834645669;