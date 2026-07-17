import { toCanvas } from 'bwip-js/browser'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { codeUrl, generateCode } from '#/lib/codes'

/** 1mm in PDF points. */
export const MM_TO_PT = 2.834645669

export const PAPER_SIZES = {
  a4: { name: 'A4', width: 210, height: 297 },
  letter: { name: 'US Letter', width: 216, height: 279 },
  a5: { name: 'A5', width: 148, height: 210 },
  legal: { name: 'US Legal', width: 216, height: 356 },
  a3: { name: 'A3', width: 297, height: 420 },
  tabloid: { name: 'Tabloid', width: 279, height: 432 },
} as const

export type PaperSizeId = keyof typeof PAPER_SIZES

export type CodeType = 'qrcode' | 'datamatrix'
export type LabelShape = 'rect' | 'circle'
export type QuantityMode = 'pages' | 'labels'

export type LabelSizing =
  /** Labels fill the grid cell; cells separated by gaps. */
  | { mode: 'gap'; gapH: number; gapV: number }
  /** Explicit label dimensions, centered within each grid cell. */
  | { mode: 'dimensions'; labelWidth: number; labelHeight: number }

export interface SheetLayout {
  labelsX: number
  labelsY: number
  marginTop: number
  marginRight: number
  marginBottom: number
  marginLeft: number
  sizing: LabelSizing
}

export interface SheetPreset {
  id: string
  name: string
  layout: SheetLayout
}

export const SHEET_PRESETS: SheetPreset[] = [
  {
    id: '30',
    name: '30 labels (3×10)',
    layout: {
      labelsX: 3,
      labelsY: 10,
      marginTop: 13,
      marginBottom: 13,
      marginLeft: 8,
      marginRight: 8,
      sizing: { mode: 'gap', gapH: 3, gapV: 0 },
    },
  },
  {
    id: '21',
    name: '21 labels (3×7)',
    layout: {
      labelsX: 3,
      labelsY: 7,
      marginTop: 15,
      marginBottom: 15,
      marginLeft: 7,
      marginRight: 7,
      sizing: { mode: 'gap', gapH: 3, gapV: 0 },
    },
  },
  {
    id: '14',
    name: '14 labels (2×7)',
    layout: {
      labelsX: 2,
      labelsY: 7,
      marginTop: 15,
      marginBottom: 15,
      marginLeft: 15,
      marginRight: 15,
      sizing: { mode: 'gap', gapH: 5, gapV: 0 },
    },
  },
]

export interface LabelSheetConfig {
  paper: PaperSizeId
  layout: SheetLayout
  codeType: CodeType
  shape: LabelShape
  /** Print the raw code in small monospace text under the barcode. */
  showText: boolean
  quantityMode: QuantityMode
  quantity: number
  /** 1-based label positions (row-major) to skip on the FIRST page only. */
  skipPositions: number[]
}

/** A label rectangle in mm, top-left origin. */
export interface LabelCell {
  x: number
  y: number
  width: number
  height: number
}

export interface SheetGeometry {
  paper: { width: number; height: number }
  cells: LabelCell[]
  /** False when the configured labels don't physically fit on the page. */
  fits: boolean
}

function finite(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback
}

/** Positions of every label on one sheet, in mm from the top-left corner. */
export function computeCells(config: LabelSheetConfig): SheetGeometry {
  const paper = PAPER_SIZES[config.paper]
  const layout = config.layout
  const nx = Math.max(1, Math.floor(finite(layout.labelsX, 1)))
  const ny = Math.max(1, Math.floor(finite(layout.labelsY, 1)))
  const mTop = Math.max(0, finite(layout.marginTop, 0))
  const mRight = Math.max(0, finite(layout.marginRight, 0))
  const mBottom = Math.max(0, finite(layout.marginBottom, 0))
  const mLeft = Math.max(0, finite(layout.marginLeft, 0))
  const usableW = paper.width - mLeft - mRight
  const usableH = paper.height - mTop - mBottom

  let cellW: number
  let cellH: number
  let labelW: number
  let labelH: number
  let gapH = 0
  let gapV = 0
  if (config.layout.sizing.mode === 'gap') {
    gapH = Math.max(0, finite(config.layout.sizing.gapH, 0))
    gapV = Math.max(0, finite(config.layout.sizing.gapV, 0))
    cellW = (usableW - gapH * (nx - 1)) / nx
    cellH = (usableH - gapV * (ny - 1)) / ny
    labelW = cellW
    labelH = cellH
  } else {
    cellW = usableW / nx
    cellH = usableH / ny
    labelW = Math.max(1, finite(config.layout.sizing.labelWidth, 1))
    labelH = Math.max(1, finite(config.layout.sizing.labelHeight, 1))
  }

  const fits =
    cellW >= 4 && cellH >= 4 && labelW <= cellW + 0.01 && labelH <= cellH + 0.01
  const safeLabelW = Math.max(1, Math.min(labelW, Math.max(1, cellW)))
  const safeLabelH = Math.max(1, Math.min(labelH, Math.max(1, cellH)))

  const cells: LabelCell[] = []
  for (let row = 0; row < ny; row++) {
    for (let col = 0; col < nx; col++) {
      const cellX = mLeft + col * (Math.max(1, cellW) + gapH)
      const cellY = mTop + row * (Math.max(1, cellH) + gapV)
      cells.push({
        x: cellX + (Math.max(1, cellW) - safeLabelW) / 2,
        y: cellY + (Math.max(1, cellH) - safeLabelH) / 2,
        width: safeLabelW,
        height: safeLabelH,
      })
    }
  }
  return { paper: { width: paper.width, height: paper.height }, cells, fits }
}

/** Inner geometry of one label: barcode square, optional text line, circle guide. */
export interface LabelGeometry {
  barcode: { x: number; y: number; size: number }
  text: {
    centerX: number
    top: number
    height: number
    maxWidth: number
  } | null
  circle: { cx: number; cy: number; r: number } | null
}

export function computeLabelGeometry(
  cell: LabelCell,
  shape: LabelShape,
  showText: boolean,
): LabelGeometry {
  const textH = showText ? 2.8 : 0
  let availW: number
  let availH: number
  let circle: LabelGeometry['circle'] = null
  if (shape === 'circle') {
    const r = Math.max(1, Math.min(cell.width, cell.height) / 2 - 0.3)
    circle = { cx: cell.x + cell.width / 2, cy: cell.y + cell.height / 2, r }
    // Largest square inscribed in the circle, minus a little breathing room.
    const inner = r * 2 * 0.7071 - 0.8
    availW = inner
    availH = inner
  } else {
    const pad = Math.min(
      2,
      Math.max(0.75, Math.min(cell.width, cell.height) * 0.06),
    )
    availW = cell.width - pad * 2
    availH = cell.height - pad * 2
  }
  const size = Math.max(2, Math.min(availW, availH - textH))
  const blockH = size + textH
  const x = cell.x + (cell.width - size) / 2
  const y = cell.y + (cell.height - blockH) / 2
  return {
    barcode: { x, y, size },
    text: showText
      ? {
          centerX: cell.x + cell.width / 2,
          top: y + size + 0.3,
          height: textH - 0.3,
          maxWidth: Math.max(availW, size),
        }
      : null,
    circle,
  }
}

export interface SheetCounts {
  pages: number
  labels: number
  perPage: number
  /** Skip positions that fall within the first page's grid. */
  skipped: number
}

export function countSheets(config: LabelSheetConfig): SheetCounts {
  const perPage =
    Math.max(1, Math.floor(finite(config.layout.labelsX, 1))) *
    Math.max(1, Math.floor(finite(config.layout.labelsY, 1)))
  const skipped = new Set(
    config.skipPositions.filter((p) => p >= 1 && p <= perPage),
  ).size
  const firstPageCapacity = Math.max(0, perPage - skipped)
  const quantity = Math.max(1, Math.floor(finite(config.quantity, 1)))
  if (config.quantityMode === 'pages') {
    return {
      pages: quantity,
      labels: firstPageCapacity + (quantity - 1) * perPage,
      perPage,
      skipped,
    }
  }
  const pages =
    quantity <= firstPageCapacity
      ? 1
      : 1 + Math.ceil((quantity - firstPageCapacity) / perPage)
  return { pages, labels: quantity, perPage, skipped }
}

function nextFrame() {
  return new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve())
    } else {
      setTimeout(resolve, 0)
    }
  })
}

/**
 * Build a multi-page PDF of uniquely-coded labels, fully client-side.
 * Every label gets a fresh code from generateCode(), rendered as a QR or
 * DataMatrix barcode encoding codeUrl(code).
 */
export async function generateLabelSheetPdf(
  config: LabelSheetConfig,
  onProgress?: (done: number, total: number) => void,
): Promise<Uint8Array> {
  const { paper, cells } = computeCells(config)
  const { pages, labels } = countSheets(config)
  const skips = new Set(config.skipPositions)

  const doc = await PDFDocument.create()
  doc.setTitle('Hoard labels')
  const font = await doc.embedFont(StandardFonts.Courier)
  const canvas = document.createElement('canvas')
  const pageW = paper.width * MM_TO_PT
  const pageH = paper.height * MM_TO_PT
  const guideColor = rgb(0.78, 0.78, 0.78)

  let done = 0
  for (let pageIndex = 0; pageIndex < pages && done < labels; pageIndex++) {
    const page = doc.addPage([pageW, pageH])
    for (let i = 0; i < cells.length && done < labels; i++) {
      if (pageIndex === 0 && skips.has(i + 1)) continue
      const geo = computeLabelGeometry(cells[i], config.shape, config.showText)

      if (geo.circle) {
        page.drawEllipse({
          x: geo.circle.cx * MM_TO_PT,
          y: pageH - geo.circle.cy * MM_TO_PT,
          xScale: geo.circle.r * MM_TO_PT,
          yScale: geo.circle.r * MM_TO_PT,
          borderColor: guideColor,
          borderWidth: 0.5,
        })
      }

      const code = generateCode()
      // Render at a scale that yields ~8px per printed mm so barcodes stay
      // crisp on large labels: probe the module count first, then re-render.
      const targetPx = Math.max(
        96,
        Math.min(1024, Math.round(geo.barcode.size * 8)),
      )
      toCanvas(canvas, { bcid: config.codeType, text: codeUrl(code), scale: 2 })
      const scale = Math.max(
        2,
        Math.min(16, Math.ceil((targetPx * 2) / canvas.width)),
      )
      if (scale !== 2) {
        toCanvas(canvas, { bcid: config.codeType, text: codeUrl(code), scale })
      }
      const png = await doc.embedPng(canvas.toDataURL('image/png'))
      page.drawImage(png, {
        x: geo.barcode.x * MM_TO_PT,
        y: pageH - (geo.barcode.y + geo.barcode.size) * MM_TO_PT,
        width: geo.barcode.size * MM_TO_PT,
        height: geo.barcode.size * MM_TO_PT,
      })

      if (geo.text) {
        let size = Math.min(geo.text.height * MM_TO_PT, 7)
        const maxWidth = geo.text.maxWidth * MM_TO_PT
        const width = font.widthOfTextAtSize(code, size)
        if (width > maxWidth) size = (size * maxWidth) / width
        const baseline =
          pageH - (geo.text.top + geo.text.height * 0.85) * MM_TO_PT
        page.drawText(code, {
          x:
            geo.text.centerX * MM_TO_PT -
            font.widthOfTextAtSize(code, size) / 2,
          y: baseline,
          size,
          font,
          color: rgb(0.25, 0.25, 0.25),
        })
      }

      done++
      if (done % 10 === 0) {
        onProgress?.(done, labels)
        await nextFrame()
      }
    }
  }

  onProgress?.(done, labels)
  return doc.save()
}

/** Trigger a browser download of the generated PDF bytes. */
export function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
