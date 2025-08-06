"use client";

import { useState } from "react";
import Image from "next/image";
import { X, Download, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { useAuth } from "./auth-provider";

interface ImageData {
  id: string;
  filename: string;
  filepath: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  order: number;
  createdAt: Date;
}

interface ImageGalleryProps {
  images: ImageData[];
  containerId: string;
  onDeleteImage?: (imageId: string) => void;
}

export function ImageGallery({ images, containerId, onDeleteImage }: ImageGalleryProps) {
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [deletingImages, setDeletingImages] = useState<Set<string>>(new Set());

  // Don't render images if user is not authenticated
  if (!user) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-sm mt-2">Loading...</p>
      </div>
    );
  }

  const handleDelete = async (imageId: string) => {
    setDeletingImages(prev => new Set(prev).add(imageId));
    
    try {
      const response = await fetch(`/api/containers/${containerId}/images/${imageId}`, {
        method: 'DELETE',
        // Add headers to ensure proper request handling
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Delete request failed:', response.status, errorText);
        throw new Error(`Failed to delete image: ${response.status} ${errorText}`);
      }

      // Call the callback to inform parent component
      onDeleteImage?.(imageId);
      
      // Zero will automatically refetch the data
      // due to the database change, no manual cache invalidation needed
      
    } catch (error) {
      console.error('Failed to delete image:', error);
      // Provide more specific error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to delete image: ${errorMessage}`);
    } finally {
      setDeletingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(imageId);
        return newSet;
      });
    }
  };

  const handleDownload = (image: ImageData) => {
    const link = document.createElement('a');
    link.href = `/api/images/${image.filepath}`;
    link.download = image.filename;
    link.click();
  };

  if (images.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <div className="text-4xl mb-2">📷</div>
        <p className="text-sm">No photos yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image) => (
          <div
            key={image.id}
            className="relative group aspect-square rounded-lg overflow-hidden bg-muted"
          >
            <Image
              src={`/api/images/${image.filepath}`}
              alt={image.filename}
              fill
              className="object-cover transition-transform group-hover:scale-105 cursor-pointer"
              onClick={() => setSelectedImage(image)}
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
            
            {/* Overlay buttons */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImage(image);
                }}
              >
                <Maximize className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(image);
                }}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(image.id);
                }}
                disabled={deletingImages.has(image.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Loading overlay for delete */}
            {deletingImages.has(image.id) && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Full-screen image dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          {selectedImage && (
            <div className="relative">
              <Image
                src={`/api/images/${selectedImage.filepath}`}
                alt={selectedImage.filename}
                width={selectedImage.width || 800}
                height={selectedImage.height || 600}
                className="w-full h-auto max-h-[80vh] object-contain"
              />
              
              {/* Image info overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/75 text-white p-4">
                <p className="text-sm font-medium">{selectedImage.filename}</p>
                <p className="text-xs text-white/75">
                  {selectedImage.width} × {selectedImage.height} • {Math.round(selectedImage.size / 1024)} KB
                </p>
              </div>
              
              {/* Action buttons */}
              <div className="absolute top-2 right-2 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleDownload(selectedImage)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    handleDelete(selectedImage.id);
                    setSelectedImage(null);
                  }}
                  disabled={deletingImages.has(selectedImage.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}