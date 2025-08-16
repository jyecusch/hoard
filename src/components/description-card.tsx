"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { useZeroMutate } from "@/hooks/use-zero";
import { mutators } from "@/zero/mutators";

interface DescriptionCardProps {
  containerId: string;
  description?: string | null;
  onUpdate?: (description: string) => void;
}

export function DescriptionCard({ containerId, description, onUpdate }: DescriptionCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentDescription, setCurrentDescription] = useState(description || "");
  const [tempDescription, setTempDescription] = useState(description || "");
  const z = useZeroMutate();

  useEffect(() => {
    setCurrentDescription(description || "");
    setTempDescription(description || "");
  }, [description]);

  const handleSave = async () => {
    try {
      await mutators.updateContainer(z, {
        id: containerId,
        description: tempDescription.trim() || undefined
      });
      
      setCurrentDescription(tempDescription);
      onUpdate?.(tempDescription);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update description:", error);
    }
  };

  const handleCancel = () => {
    setTempDescription(currentDescription);
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Description</CardTitle>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={tempDescription}
              onChange={(e) => setTempDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) handleSave();
                if (e.key === "Escape") handleCancel();
              }}
              placeholder="Enter a description..."
              className="min-h-[100px] resize-none"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>
                <Check className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Press Ctrl+Enter to save, Escape to cancel
            </p>
          </div>
        ) : (
          <div 
            className="min-h-[60px] cursor-pointer hover:bg-accent/50 transition-colors rounded-md p-2 -m-2"
            onClick={() => setIsEditing(true)}
          >
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {currentDescription || "Click to add a description"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}