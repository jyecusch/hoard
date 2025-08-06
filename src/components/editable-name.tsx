"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Edit2, Check, X } from "lucide-react";

interface EditableNameProps {
  containerId: string;
  initialName?: string;
  onUpdate?: (name: string) => void;
}

export function EditableName({ initialName = "", onUpdate }: EditableNameProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [tempName, setTempName] = useState(initialName);

  useEffect(() => {
    setName(initialName);
    setTempName(initialName);
  }, [initialName]);

  const handleSave = async () => {
    if (!tempName.trim()) return;
    
    try {
      // TODO: Implement name update API call
      
      setName(tempName);
      onUpdate?.(tempName);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update name:", error);
    }
  };

  const handleCancel = () => {
    setTempName(name);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={tempName}
          onChange={(e) => setTempName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
          className="text-2xl font-bold border-none shadow-none p-0 h-auto"
          autoFocus
        />
        <Button size="sm" variant="ghost" onClick={handleSave}>
          <Check className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={handleCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group">
      <h1 className="text-2xl font-bold">{name}</h1>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setIsEditing(true)}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Edit2 className="h-4 w-4" />
      </Button>
    </div>
  );
}