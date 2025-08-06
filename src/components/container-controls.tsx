"use client";

import { Star, Trash2, FolderInput } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ContainerControlsProps {
  containerId: string;
  containerName: string;
  code?: string | null;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onDelete?: () => void;
  onMove?: () => void;
}

export function ContainerControls({
  isFavorite = false,
  onToggleFavorite,
  onDelete,
  onMove,
}: ContainerControlsProps) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Button
        onClick={onToggleFavorite}
        variant="ghost"
        size="icon"
        className={cn(
          "rounded-full",
          "hover:fill-yellow-400 hover:text-yellow-400"
        )}
      >
        <Star
          className={cn(
            "h-4 w-4",
            isFavorite
              ? "text-yellow-500 fill-yellow-500 hover:fill-amber-50"
              : ""
          )}
        />
      </Button>
      <Button
        onClick={onMove}
        variant="ghost"
        size="icon"
        className="rounded-full"
        title="Move to different location"
      >
        <FolderInput className="h-4 w-4" />
      </Button>
      <Button
        onClick={onDelete}
        variant="ghost"
        size="icon"
        className="rounded-full hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}