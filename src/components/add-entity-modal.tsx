"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AddEntityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "item" | "container";
  parentName: string;
  onAdd: (name: string, description: string, tags: string) => void;
}

export function AddEntityModal({ 
  open, 
  onOpenChange, 
  entityType, 
  parentName, 
  onAdd 
}: AddEntityModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);

  const isItem = entityType === "item";
  const title = isItem ? "Add New Item" : "Add New Container";
  const namePlaceholder = isItem ? "e.g., Coffee Beans" : "e.g., Beverages";
  const tagsPlaceholder = isItem 
    ? "organic, dark-roast, coffee (comma-separated)" 
    : "drinks, kitchen, cold (comma-separated)";
  const submitLabel = isItem ? "Add Item" : "Add Container";
  const loadingLabel = isItem ? "Adding..." : "Adding...";

  const handleSubmit = async () => {
    if (!name.trim()) return;
    
    setLoading(true);
    try {
      await onAdd(name, description, tags);
      // Reset form
      setName("");
      setDescription("");
      setTags("");
      onOpenChange(false);
    } catch (error) {
      console.error(`Failed to add ${entityType}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setName("");
    setDescription("");
    setTags("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Add a new {entityType} to {parentName}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder={namePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder={`Describe the ${entityType}...`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (optional)</Label>
            <Input
              id="tags"
              placeholder={tagsPlaceholder}
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !name.trim()}>
            {loading ? loadingLabel : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}