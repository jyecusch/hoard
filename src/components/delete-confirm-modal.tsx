"use client";

import { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface DeleteConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  isContainer: boolean;
  hasContents: boolean;
  onDelete: (deleteContents?: boolean) => void;
}

export function DeleteConfirmModal({
  open,
  onOpenChange,
  itemName,
  isContainer,
  hasContents,
  onDelete,
}: DeleteConfirmModalProps) {
  const [deleteOption, setDeleteOption] = useState<'move' | 'delete'>('move');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      if (isContainer && hasContents) {
        await onDelete(deleteOption === 'delete');
      } else {
        await onDelete();
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle>Delete {isContainer ? 'Container' : 'Item'}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Are you sure you want to delete <strong>{itemName}</strong>?
            {isContainer && !hasContents && (
              <span className="block mt-2 text-muted-foreground">
                This container is empty.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {isContainer && hasContents && (
          <div className="py-4">
            <Label className="text-base font-medium mb-3 block">
              This container has contents. What would you like to do?
            </Label>
            <RadioGroup 
              value={deleteOption} 
              onValueChange={(value) => setDeleteOption(value as 'move' | 'delete')}
            >
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="move" id="move" className="mt-1" />
                  <div className="grid gap-1">
                    <Label htmlFor="move" className="font-normal cursor-pointer">
                      Move contents to parent container
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      All items and containers inside will be moved up one level
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="delete" id="delete" className="mt-1" />
                  <div className="grid gap-1">
                    <Label htmlFor="delete" className="font-normal cursor-pointer text-destructive">
                      Delete everything
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      This container and all its contents will be permanently deleted
                    </p>
                  </div>
                </div>
              </div>
            </RadioGroup>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}