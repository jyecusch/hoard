"use client";

import { Document, Page, View, Image, StyleSheet } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { nanoid } from "nanoid";
import { generateDataMatrixDataURL } from "./data-matrix";
import { LabelConfig } from "./label-generator";

interface LabelPDFProps {
  config: LabelConfig;
  codes: string[];
}

// Convert mm to points (PDF unit)
const mmToPoints = (mm: number) => mm * 2.834645669;

export function LabelPDF({ config, codes }: LabelPDFProps) {
  const paperSizes = {
    A4: { width: mmToPoints(210), height: mmToPoints(297) },
    US_LETTER: { width: mmToPoints(216), height: mmToPoints(279) },
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
    },
    lastLabel: {
      width: labelWidth,
      height: labelHeight,
      marginRight: 0,
      justifyContent: "center",
      alignItems: "center",
    },
    qrCode: {
      width: Math.min(labelWidth * 0.8, labelHeight * 0.8),
      height: Math.min(labelWidth * 0.8, labelHeight * 0.8),
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
                {code && <Image src={code} style={styles.qrCode} />}
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
export async function generateCodes(count: number, codeType: "qr" | "datamatrix" = "qr"): Promise<string[]> {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
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
      
      codes.push(codeDataURL);
    } catch (error) {
      console.error(`Error generating ${codeType} code:`, error);
      // Push empty string as fallback
      codes.push("");
    }
  }

  return codes;
}
