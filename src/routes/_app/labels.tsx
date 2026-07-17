import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { Loader2, Printer, Tags } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RadioGroup, RadioGroupItem } from '#/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Separator } from '#/components/ui/separator'
import { Switch } from '#/components/ui/switch'
import {
  PAPER_SIZES,
  SHEET_PRESETS,
  computeCells,
  computeLabelGeometry,
  countSheets,
  downloadPdf,
  generateLabelSheetPdf,
} from '#/lib/label-pdf'
import type {
  CodeType,
  LabelShape,
  LabelSheetConfig,
  PaperSizeId,
  QuantityMode,
  SheetLayout,
} from '#/lib/label-pdf'

export const Route = createFileRoute('/_app/labels')({
  component: LabelsPage,
})

type SizingMode = 'gap' | 'dimensions'

interface CustomLayoutState {
  labelsX: number
  labelsY: number
  marginTop: number
  marginRight: number
  marginBottom: number
  marginLeft: number
  sizingMode: SizingMode
  gapH: number
  gapV: number
  labelWidth: number
  labelHeight: number
}

function toCustomState(
  layout: SheetLayout,
  paper: PaperSizeId,
): CustomLayoutState {
  const cells = computeCells({
    paper,
    layout,
    codeType: 'qrcode',
    shape: 'rect',
    showText: false,
    quantityMode: 'pages',
    quantity: 1,
    skipPositions: [],
  }).cells
  const cell = cells[0]
  return {
    labelsX: layout.labelsX,
    labelsY: layout.labelsY,
    marginTop: layout.marginTop,
    marginRight: layout.marginRight,
    marginBottom: layout.marginBottom,
    marginLeft: layout.marginLeft,
    sizingMode: layout.sizing.mode,
    gapH: layout.sizing.mode === 'gap' ? layout.sizing.gapH : 3,
    gapV: layout.sizing.mode === 'gap' ? layout.sizing.gapV : 0,
    labelWidth:
      layout.sizing.mode === 'dimensions'
        ? layout.sizing.labelWidth
        : Math.round(cell.width * 10) / 10,
    labelHeight:
      layout.sizing.mode === 'dimensions'
        ? layout.sizing.labelHeight
        : Math.round(cell.height * 10) / 10,
  }
}

function toSheetLayout(state: CustomLayoutState): SheetLayout {
  return {
    labelsX: state.labelsX,
    labelsY: state.labelsY,
    marginTop: state.marginTop,
    marginRight: state.marginRight,
    marginBottom: state.marginBottom,
    marginLeft: state.marginLeft,
    sizing:
      state.sizingMode === 'gap'
        ? { mode: 'gap', gapH: state.gapH, gapV: state.gapV }
        : {
            mode: 'dimensions',
            labelWidth: state.labelWidth,
            labelHeight: state.labelHeight,
          },
  }
}

function parseSkipPositions(text: string): number[] {
  return [
    ...new Set(
      text
        .split(/[\s,;]+/)
        .map((part) => Number.parseInt(part, 10))
        .filter((n) => Number.isFinite(n) && n >= 1),
    ),
  ]
}

function LabelsPage() {
  const [paper, setPaper] = useState<PaperSizeId>('a4')
  const [presetId, setPresetId] = useState('30')
  const [custom, setCustom] = useState<CustomLayoutState>(() =>
    toCustomState(SHEET_PRESETS[0].layout, 'a4'),
  )
  const [codeType, setCodeType] = useState<CodeType>('qrcode')
  const [shape, setShape] = useState<LabelShape>('rect')
  const [showText, setShowText] = useState(true)
  const [quantityMode, setQuantityMode] = useState<QuantityMode>('pages')
  const [quantity, setQuantity] = useState(1)
  const [skipText, setSkipText] = useState('')
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState<[number, number] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const preset = SHEET_PRESETS.find((p) => p.id === presetId)
  const layout = useMemo(
    () => (preset ? preset.layout : toSheetLayout(custom)),
    [preset, custom],
  )
  const skipPositions = useMemo(() => parseSkipPositions(skipText), [skipText])

  const config = useMemo<LabelSheetConfig>(
    () => ({
      paper,
      layout,
      codeType,
      shape,
      showText,
      quantityMode,
      quantity,
      skipPositions,
    }),
    [
      paper,
      layout,
      codeType,
      shape,
      showText,
      quantityMode,
      quantity,
      skipPositions,
    ],
  )

  const geometry = useMemo(() => computeCells(config), [config])
  const counts = useMemo(() => countSheets(config), [config])
  const invalidQuantity = !Number.isFinite(quantity) || quantity < 1

  function selectPreset(id: string) {
    if (id === 'custom' && preset)
      setCustom(toCustomState(preset.layout, paper))
    setPresetId(id)
  }

  function setCustomField(field: keyof CustomLayoutState, value: number) {
    setCustom((prev) => ({ ...prev, [field]: value }))
  }

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    setProgress(null)
    try {
      const bytes = await generateLabelSheetPdf(config, (done, total) =>
        setProgress([done, total]),
      )
      downloadPdf(bytes, 'hoard-labels.pdf')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to generate the PDF.',
      )
    } finally {
      setGenerating(false)
      setProgress(null)
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 p-4 md:p-8">
      <div className="mb-6 flex items-start gap-3">
        <Tags className="mt-1 h-7 w-7 shrink-0 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Label sheets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Print sheets of uniquely-coded labels, stick them on boxes, then
            scan a label to link it to a container.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          {/* Sheet layout */}
          <Card>
            <CardHeader>
              <CardTitle>Sheet</CardTitle>
              <CardDescription>Paper size and label grid.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="paper">Paper size</Label>
                  <Select
                    value={paper}
                    onValueChange={(v) => setPaper(v as PaperSizeId)}
                  >
                    <SelectTrigger id="paper" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PAPER_SIZES).map(([id, size]) => (
                        <SelectItem key={id} value={id}>
                          {size.name} ({size.width}×{size.height}mm)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preset">Labels per sheet</Label>
                  <Select value={presetId} onValueChange={selectPreset}>
                    <SelectTrigger id="preset" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SHEET_PRESETS.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Custom layout</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {presetId === 'custom' && (
                <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <NumberField
                      id="labelsX"
                      label="Columns"
                      value={custom.labelsX}
                      min={1}
                      onChange={(v) => setCustomField('labelsX', v)}
                    />
                    <NumberField
                      id="labelsY"
                      label="Rows"
                      value={custom.labelsY}
                      min={1}
                      onChange={(v) => setCustomField('labelsY', v)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <NumberField
                      id="marginTop"
                      label="Top (mm)"
                      value={custom.marginTop}
                      onChange={(v) => setCustomField('marginTop', v)}
                    />
                    <NumberField
                      id="marginRight"
                      label="Right (mm)"
                      value={custom.marginRight}
                      onChange={(v) => setCustomField('marginRight', v)}
                    />
                    <NumberField
                      id="marginBottom"
                      label="Bottom (mm)"
                      value={custom.marginBottom}
                      onChange={(v) => setCustomField('marginBottom', v)}
                    />
                    <NumberField
                      id="marginLeft"
                      label="Left (mm)"
                      value={custom.marginLeft}
                      onChange={(v) => setCustomField('marginLeft', v)}
                    />
                  </div>
                  <Separator />
                  <RadioGroup
                    value={custom.sizingMode}
                    onValueChange={(v) =>
                      setCustom((prev) => ({
                        ...prev,
                        sizingMode: v as SizingMode,
                      }))
                    }
                    className="flex flex-wrap gap-4"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="gap" id="sizing-gap" />
                      <Label htmlFor="sizing-gap" className="font-normal">
                        Gaps between labels
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem
                        value="dimensions"
                        id="sizing-dimensions"
                      />
                      <Label
                        htmlFor="sizing-dimensions"
                        className="font-normal"
                      >
                        Exact label size
                      </Label>
                    </div>
                  </RadioGroup>
                  {custom.sizingMode === 'gap' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <NumberField
                        id="gapH"
                        label="Horizontal gap (mm)"
                        value={custom.gapH}
                        onChange={(v) => setCustomField('gapH', v)}
                      />
                      <NumberField
                        id="gapV"
                        label="Vertical gap (mm)"
                        value={custom.gapV}
                        onChange={(v) => setCustomField('gapV', v)}
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <NumberField
                        id="labelWidth"
                        label="Label width (mm)"
                        value={custom.labelWidth}
                        min={1}
                        onChange={(v) => setCustomField('labelWidth', v)}
                      />
                      <NumberField
                        id="labelHeight"
                        label="Label height (mm)"
                        value={custom.labelHeight}
                        min={1}
                        onChange={(v) => setCustomField('labelHeight', v)}
                      />
                    </div>
                  )}
                </div>
              )}

              {!geometry.fits && (
                <p className="text-sm text-destructive">
                  This layout doesn’t fit on the page — reduce the label count,
                  margins, gaps, or label size.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Label appearance */}
          <Card>
            <CardHeader>
              <CardTitle>Labels</CardTitle>
              <CardDescription>
                What gets printed on each label.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Code type</Label>
                  <RadioGroup
                    value={codeType}
                    onValueChange={(v) => setCodeType(v as CodeType)}
                    className="flex gap-4"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="qrcode" id="code-qr" />
                      <Label htmlFor="code-qr" className="font-normal">
                        QR code
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="datamatrix" id="code-dm" />
                      <Label htmlFor="code-dm" className="font-normal">
                        DataMatrix
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label>Label shape</Label>
                  <RadioGroup
                    value={shape}
                    onValueChange={(v) => setShape(v as LabelShape)}
                    className="flex gap-4"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="rect" id="shape-rect" />
                      <Label htmlFor="shape-rect" className="font-normal">
                        Rectangular
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="circle" id="shape-circle" />
                      <Label htmlFor="shape-circle" className="font-normal">
                        Circular
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
              {shape === 'circle' && (
                <p className="text-xs text-muted-foreground">
                  A light circle outline is printed on each label to line up
                  with round sticker sheets.
                </p>
              )}
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="show-text">Human-readable code</Label>
                  <p className="text-xs text-muted-foreground">
                    Print the code as text under the barcode so it can be typed
                    in if scanning fails.
                  </p>
                </div>
                <Switch
                  id="show-text"
                  checked={showText}
                  onCheckedChange={setShowText}
                />
              </div>
            </CardContent>
          </Card>

          {/* Quantity */}
          <Card>
            <CardHeader>
              <CardTitle>Quantity</CardTitle>
              <CardDescription>How many labels to generate.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-4">
                <RadioGroup
                  value={quantityMode}
                  onValueChange={(v) => setQuantityMode(v as QuantityMode)}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="pages" id="qty-pages" />
                    <Label htmlFor="qty-pages" className="font-normal">
                      Pages
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="labels" id="qty-labels" />
                    <Label htmlFor="qty-labels" className="font-normal">
                      Labels
                    </Label>
                  </div>
                </RadioGroup>
                <div className="w-28">
                  <Input
                    id="quantity"
                    type="number"
                    min={1}
                    value={Number.isFinite(quantity) ? quantity : ''}
                    onChange={(e) => setQuantity(e.target.valueAsNumber)}
                    aria-label={
                      quantityMode === 'pages'
                        ? 'Number of pages'
                        : 'Number of labels'
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="skip">Skip positions on first page</Label>
                <Input
                  id="skip"
                  placeholder="e.g. 1,2,5"
                  value={skipText}
                  onChange={(e) => setSkipText(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated label positions (1 = top-left, counted left to
                  right) already used on a partial sheet.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview + generate */}
        <div className="space-y-4 lg:sticky lg:top-8 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                {counts.pages} {counts.pages === 1 ? 'page' : 'pages'} ·{' '}
                {counts.labels} unique{' '}
                {counts.labels === 1 ? 'label' : 'labels'}
                {counts.skipped > 0 && ` · ${counts.skipped} skipped`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SheetPreview config={config} />
              {counts.pages > 1 && (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Page 1 of {counts.pages}
                </p>
              )}
            </CardContent>
          </Card>
          <Button
            className="w-full"
            size="lg"
            disabled={generating || invalidQuantity || !geometry.fits}
            onClick={handleGenerate}
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating{progress ? ` ${progress[0]}/${progress[1]}` : ''}…
              </>
            ) : (
              <>
                <Printer className="mr-2 h-4 w-4" />
                Generate PDF
              </>
            )}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>
    </main>
  )
}

function NumberField({
  id,
  label,
  value,
  onChange,
  min = 0,
}: {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        min={min}
        step="any"
        className="h-8"
        value={Number.isFinite(value) ? value : ''}
        onChange={(e) => onChange(e.target.valueAsNumber)}
      />
    </div>
  )
}

function SheetPreview({ config }: { config: LabelSheetConfig }) {
  const { paper, cells } = computeCells(config)
  const skips = new Set(config.skipPositions)
  return (
    <svg
      viewBox={`0 0 ${paper.width} ${paper.height}`}
      className="mx-auto w-full max-w-[260px] rounded-sm border bg-white shadow-sm"
      role="img"
      aria-label="Sheet layout preview"
    >
      {cells.map((cell, i) => {
        const skipped = skips.has(i + 1)
        const geo = computeLabelGeometry(cell, config.shape, config.showText)
        return (
          <g key={i} opacity={skipped ? 0.35 : 1}>
            {config.shape === 'circle' && geo.circle ? (
              <circle
                cx={geo.circle.cx}
                cy={geo.circle.cy}
                r={geo.circle.r}
                fill="none"
                stroke="var(--border)"
                strokeWidth={0.4}
                strokeDasharray={skipped ? '2 1.5' : undefined}
              />
            ) : (
              <rect
                x={cell.x}
                y={cell.y}
                width={cell.width}
                height={cell.height}
                rx={1}
                fill="none"
                stroke="var(--border)"
                strokeWidth={0.4}
                strokeDasharray={skipped ? '2 1.5' : undefined}
              />
            )}
            {!skipped && (
              <>
                <rect
                  x={geo.barcode.x}
                  y={geo.barcode.y}
                  width={geo.barcode.size}
                  height={geo.barcode.size}
                  rx={0.6}
                  fill="var(--foreground)"
                />
                {geo.text && (
                  <rect
                    x={geo.text.centerX - geo.barcode.size * 0.4}
                    y={geo.text.top + geo.text.height * 0.2}
                    width={geo.barcode.size * 0.8}
                    height={geo.text.height * 0.5}
                    rx={0.4}
                    fill="var(--muted-foreground)"
                  />
                )}
              </>
            )}
          </g>
        )
      })}
    </svg>
  )
}
