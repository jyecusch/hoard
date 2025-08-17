"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { LabelGenerator, LabelConfig } from "@/components/label-generator";
import { LabelPDF, generateCodes } from "@/components/qr-label-pdf";
import { useAuth } from "@/components/auth-provider";

export default function LabelsPage() {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async (config: LabelConfig) => {
    if (!user) return;

    setIsGenerating(true);

    try {
      // Generate codes (QR or DataMatrix)
      const codes = await generateCodes(
        config.numLabels,
        config.codeType,
        config.skipLabelNumbers
      );

      // Create PDF document
      const pdfDoc = <LabelPDF config={config} codes={codes} />;

      // Generate PDF blob
      const pdfBlob = await pdf(pdfDoc).toBlob();

      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${config.codeType}-labels-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!user) {
    return (
      <LayoutWrapper>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="text-muted-foreground">
              Please sign in to use the label generator.
            </p>
          </div>
        </div>
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Barcode Label Generator</h1>
          <p className="mt-2">
            Generate printable QR code or Data Matrix labels for your inventory
            system. Use this tool to pre-print labels before cataloging items.
          </p>
          <p className="mt-2">
            You can scan the barcode labels with the mobile version of this app,
            to assign them to a container/item on the page for that inventory
            item.
          </p>
        </div>

        <LabelGenerator
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
        />
      </div>
    </LayoutWrapper>
  );
}
