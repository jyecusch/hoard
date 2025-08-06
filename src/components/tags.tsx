"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Tag, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagsProps {
  tags: string[];
  editable?: boolean;
  onUpdate?: (tags: string[]) => void;
}

export function Tags({ tags, editable = false, onUpdate }: TagsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newTag, setNewTag] = useState("");

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    const updatedTags = [...tags, newTag.trim()];
    onUpdate?.(updatedTags);
    setNewTag("");
    setIsEditing(false);
  };

  const handleRemoveTag = (indexToRemove: number) => {
    const updatedTags = tags.filter((_, index) => index !== indexToRemove);
    onUpdate?.(updatedTags);
  };

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {tags.map((tag, index) => (
        <Badge
          key={index}
          variant="secondary"
          className={cn(editable && "group")}
        >
          {tag}
          {editable && (
            <div
              onClick={() => handleRemoveTag(index)}
              className="ml-1 cursor-pointer opacity-50 hover:opacity-100 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </div>
          )}
        </Badge>
      ))}

      {editable && !isEditing && (
        <Button
          variant="ghost"
          size="sm"
          className="p-0 rounded-full"
          onClick={() => setIsEditing(true)}
        >
          <Tag className="h-4 w-4 text-muted-foreground" />
          <Plus className="h-3 w-3" />
        </Button>
      )}

      {editable && isEditing && (
        <div className="flex items-center gap-1">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddTag();
              if (e.key === "Escape") {
                setNewTag("");
                setIsEditing(false);
              }
            }}
            placeholder="Tag name"
            className="h-6 text-xs px-2 w-20"
            autoFocus
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleAddTag}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
