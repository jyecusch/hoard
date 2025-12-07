"use client";

import { Document, Page, View, Image, Text, StyleSheet } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { nanoid } from "nanoid";
import { generateDataMatrixDataURL } from "./data-matrix";
import { LabelConfig } from "./label-generator";

interface CodeData {
  dataUrl: string;
  text: string;
}

interface LabelPDFProps {
  config: LabelConfig;
  codes: CodeData[];
}

// Convert mm to points (PDF unit)
const mmToPoints = (mm: number) => mm * 2.834645669;

export function LabelPDF({ config, codes }: LabelPDFProps) {
  // Helper function to calculate the largest square that fits in a circle
  const getInscribedSquareSize = (circleRadius: number) => {
    return circleRadius * Math.sqrt(2);
  };

  const paperSizes = {
    A4: { width: mmToPoints(210), height: mmToPoints(297) },
    US_LETTER: { width: mmToPoints(216), height: mmToPoints(279) },
    A5: { width: mmToPoints(148), height: mmToPoints(210) },
    US_LEGAL: { width: mmToPoints(216), height: mmToPoints(356) },
    A3: { width: mmToPoints(297), height: mmToPoints(420) },
    TABLOID: { width: mmToPoints(279), height: mmToPoints(432) },
  };

  const paper = paperSizes[config.paperSize];

  const availableWidth =
    paper.width - mmToPoints(config.marginLeft + config.marginRight);
  const availableHeight =
    paper.height - mmToPoints(config.marginTop + config.marginBottom);

  const labelWidth =
    (availableWidth - mmToPoints((config.labelsX - 1) * config.gapHorizontal)) /
    config.labelsX;
  const labelHeight =
    (availableHeight - mmToPoints((config.labelsY - 1) * config.gapVertical)) /
    config.labelsY;

  // Calculate content area for barcode placement
  const paddingPoints = mmToPoints(config.labelPadding);
  const contentWidth = labelWidth - (paddingPoints * 2);
  const contentHeight = labelHeight - (paddingPoints * 2);
  
  let barcodeArea;
  if (config.labelShape === "circular") {
    const radius = Math.min(labelWidth, labelHeight) / 2;
    const contentRadius = radius - paddingPoints;
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

  const styles = StyleSheet.create({
    page: {
      flexDirection: "column",
      paddingTop: mmToPoints(config.marginTop),
      paddingRight: mmToPoints(config.marginRight),
      paddingBottom: mmToPoints(config.marginBottom),
      paddingLeft: mmToPoints(config.marginLeft),
    },
    row: {
      flexDirection: "row",
      marginBottom: mmToPoints(config.gapVertical),
    },
    lastRow: {
      flexDirection: "row",
      marginBottom: 0,
    },
    label: {
      width: labelWidth,
      height: labelHeight,
      marginRight: mmToPoints(config.gapHorizontal),
      justifyContent: "center",
      alignItems: "center",
      ...(config.labelShape === "circular" ? { borderRadius: Math.round(labelWidth / 2) } : {}),
      overflow: "hidden",
    },
    lastLabel: {
      width: labelWidth,
      height: labelHeight,
      marginRight: 0,
      justifyContent: "center",
      alignItems: "center",
      ...(config.labelShape === "circular" ? { borderRadius: Math.round(labelWidth / 2) } : {}),
      overflow: "hidden",
    },
    qrCode: {
      width: Math.min(barcodeArea.width * (config.includeText ? 0.7 : 0.9), barcodeArea.height * (config.includeText ? 0.7 : 0.9)),
      height: Math.min(barcodeArea.width * (config.includeText ? 0.7 : 0.9), barcodeArea.height * (config.includeText ? 0.7 : 0.9)),
    },
    codeText: {
      fontSize: config.labelShape === "circular" 
        ? Math.min(barcodeArea.width * 0.08, 6)
        : Math.min(barcodeArea.width * 0.06, barcodeArea.height * 0.06, 8),
      textAlign: "center" as const,
      marginTop: 2,
      fontFamily: "Courier",
    },
  });

  const labelsPerPage = config.labelsX * config.labelsY;
  const pages = [];

  for (let pageIndex = 0; pageIndex < config.numPages; pageIndex++) {
    const pageCodes = codes.slice(
      pageIndex * labelsPerPage,
      (pageIndex + 1) * labelsPerPage
    );

    const rows = [];
    for (let rowIndex = 0; rowIndex < config.labelsY; rowIndex++) {
      const rowCodes = pageCodes.slice(
        rowIndex * config.labelsX,
        (rowIndex + 1) * config.labelsX
      );

      rows.push(
        <View
          key={rowIndex}
          style={rowIndex === config.labelsY - 1 ? styles.lastRow : styles.row}
        >
          {Array.from({ length: config.labelsX }, (_, colIndex) => {
            const code = rowCodes[colIndex];

            return (
              <View
                key={colIndex}
                style={
                  colIndex === config.labelsX - 1
                    ? styles.lastLabel
                    : styles.label
                }
              >
                {code && (
                  <View style={{ alignItems: "center" }}>
                    <Image src={code.dataUrl} style={styles.qrCode} />
                    {config.includeText && (
                      <Text style={styles.codeText}>{code.text}</Text>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      );
    }

    pages.push(
      <Page
        key={pageIndex}
        size={[paper.width, paper.height]}
        style={styles.page}
      >
        {rows}
      </Page>
    );
  }

  return <Document>{pages}</Document>;
}

// Utility function to generate codes (QR or DataMatrix)
export async function generateCodes(
  count: number, 
  codeType: "qr" | "datamatrix" = "qr",
  skipNumbers: number[] = []
): Promise<CodeData[]> {
  const codes: CodeData[] = [];

  for (let i = 0; i < count; i++) {
    const labelNumber = i + 1;
    
    // Check if this label should be skipped
    if (skipNumbers.includes(labelNumber)) {
      codes.push({ dataUrl: "", text: "" }); // Empty for skipped labels
      continue;
    }
    
    // Generate a simple nanoid for each code
    const codeContent = nanoid(8); // 8 character nanoid

    try {
      let codeDataURL: string;
      
      if (codeType === "datamatrix") {
        codeDataURL = await generateDataMatrixDataURL(codeContent, 200);
      } else {
        codeDataURL = await QRCode.toDataURL(codeContent, {
          width: 200,
          margin: 1,
          errorCorrectionLevel: "H", // High error correction to match modal
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });
      }
      
      codes.push({ dataUrl: codeDataURL, text: codeContent });
    } catch (error) {
      console.error(`Error generating ${codeType} code:`, error);
      // Push empty as fallback
      codes.push({ dataUrl: "", text: "" });
    }
  }

  return codes;
}
