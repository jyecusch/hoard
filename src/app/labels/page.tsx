"use client";

import { useState } from "react";
import { pdf } from '@react-pdf/renderer';
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
      const codes = await generateCodes(config.numLabels, config.codeType);
      
      // Create PDF document
      const pdfDoc = <LabelPDF config={config} codes={codes} />;
      
      // Generate PDF blob
      const pdfBlob = await pdf(pdfDoc).toBlob();
      
      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${config.codeType}-labels-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
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
            <p className="text-muted-foreground">Please sign in to use the label generator.</p>
          </div>
        </div>
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Barcode Labels</h1>
          <p className="text-muted-foreground mt-2">
            Generate printable QR code or Data Matrix labels for your inventory system. 
            Perfect for pre-printing labels before cataloging items around your home.
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