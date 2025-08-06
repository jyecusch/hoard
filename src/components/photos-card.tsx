"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ImageUpload } from "@/components/image-upload";
import { ImageGallery } from "@/components/image-gallery";

interface PhotosCardProps {
  containerId: string;
  containerName: string;
  images: Array<{
    id: string;
    filename: string;
    filepath: string;
    mimeType: string;
    size: number;
    width: number | null;
    height: number | null;
    containerId: string;
    order: number;
    createdAt: Date;
  }>;
}

export function PhotosCard({ containerId, containerName, images }: PhotosCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Photos</CardTitle>
            <CardDescription>
              {images.length} image{images.length === 1 ? '' : 's'} of{" "}
              <span className="text-primary">{containerName}</span>
            </CardDescription>
          </div>
          <ImageUpload containerId={containerId} />
        </div>
      </CardHeader>
      <CardContent>
        <ImageGallery 
          images={images} 
          containerId={containerId}
        />
      </CardContent>
    </Card>
  );
}