"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  containerId: string;
  onUploadComplete?: () => void;
  className?: string;
  variant?: "button" | "dropzone";
}

export function ImageUpload({ 
  containerId, 
  onUploadComplete, 
  className, 
  variant = "button" 
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList) => {
    if (files.length === 0) return;

    setIsUploading(true);
    
    try {
      // Upload each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch(`/api/containers/${containerId}/images`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Upload failed');
        }

        // Get the image data from server response
        const imageData = await response.json();
        console.log('Server uploaded image:', imageData);
      }

      // Small delay to allow Zero to sync the database changes
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onUploadComplete?.();
    } catch (error) {
      console.error('Upload failed:', error);
      alert(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFiles(files);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  if (variant === "dropzone") {
    return (
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 text-center transition-colors",
          dragActive 
            ? "border-primary bg-primary/5" 
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          className
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleInputChange}
          className="hidden"
          disabled={isUploading}
        />
        
        <div className="space-y-2">
          <div className="mx-auto w-12 h-12 text-muted-foreground">
            <Upload className="w-full h-full" />
          </div>
          <div>
            <Button
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="text-sm"
            >
              {isUploading ? "Uploading..." : "Click to upload or drag and drop"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            PNG, JPG, GIF, WebP up to 10MB
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        onChange={handleInputChange}
        className="hidden"
        disabled={isUploading}
      />
      
      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        variant="outline"
        size="sm"
        className={cn("gap-2", className)}
      >
        <Camera className="h-4 w-4" />
        {isUploading ? "Uploading..." : "Add Photo"}
      </Button>
    </>
  );
}