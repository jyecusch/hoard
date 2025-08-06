"use client";

import { useState } from "react";
import { FolderOpen, ChevronRight, ChevronDown, Box, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "./auth-provider";
import { Container } from "@/types/container";
import { useMoveDestinations } from "@/hooks/use-zero";

interface MoveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  currentContainerId: string;
  onMove: (destinationId: string | null) => void;
}

export function MoveModal({
  open,
  onOpenChange,
  itemName,
  currentContainerId,
  onMove,
}: MoveModalProps) {
  const { user } = useAuth();
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [isMoving, setIsMoving] = useState(false);

  // Use Zero hook for reactive container data
  const { destinations: containers, isLoading: loading } = useMoveDestinations(
    user?.id, 
    currentContainerId
  );

  const toggleExpanded = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleMove = async () => {
    setIsMoving(true);
    try {
      await onMove(selectedDestination);
      onOpenChange(false);
      setSelectedDestination(null);
    } catch (error) {
      console.error("Failed to move:", error);
    } finally {
      setIsMoving(false);
    }
  };

  const isValidDestination = (container: Container): boolean => {
    // Can't move to itself
    if (container.id === currentContainerId) return false;

    // Can't move to an item
    if (container.isItem) return false;

    // Can't move to a descendant (would create a loop)
    const isDescendant = (parent: Container, targetId: string): boolean => {
      if (parent.id === targetId) return true;
      if (parent.children) {
        for (const child of parent.children) {
          if (child && isDescendant(child, targetId)) return true;
        }
      }
      return false;
    };

    // Find the current container in the tree
    const findContainer = (nodes: Container[], id: string): Container | null => {
      for (const node of nodes) {
        if (!node) continue;
        if (node.id === id) return node;
        if (node.children) {
          const found = findContainer(node.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    const currentContainer = findContainer(containers, currentContainerId);
    if (currentContainer && isDescendant(currentContainer, container.id)) {
      return false;
    }

    return true;
  };

  const renderContainerTree = (nodes: Container[], level: number = 0) => {
    return nodes
      .filter((node) => node && !node.isItem) // Only show containers, not items
      .map((node) => {
        const hasChildren =
          node.children &&
          node.children.some((child) => child && !child.isItem);
        const isExpanded = expandedNodes.has(node.id);
        const isValid = isValidDestination(node);
        const isSelected = selectedDestination === node.id;

        return (
          <div
            key={node.id}
            style={{ marginLeft: level > 0 ? `${level * 0.5}rem` : 0 }}
          >
            <div
              className={cn(
                "flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer transition-colors",
                isValid ? "hover:bg-accent" : "opacity-50 cursor-not-allowed",
                isSelected && "bg-accent"
              )}
              onClick={() => isValid && setSelectedDestination(node.id)}
            >
              {hasChildren ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpanded(node.id);
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              ) : (
                <div className="w-5" />
              )}

              <Box className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm">{node.name}</span>
              {node.id === currentContainerId && (
                <span className="text-xs text-muted-foreground">
                  (current location)
                </span>
              )}
            </div>

            {isExpanded &&
              hasChildren &&
              renderContainerTree(node.children || [], level + 1)}
          </div>
        );
      });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Move &apos;{itemName}&apos;</DialogTitle>
          <DialogDescription>
            Select a new container location. Only containers are shown as valid destinations.
          </DialogDescription>
        </DialogHeader>

        <div className="border rounded-lg p-4 max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Root option */}
              <div
                className={cn(
                  "flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer transition-colors hover:bg-accent",
                  selectedDestination === null && "bg-accent"
                )}
                onClick={() => setSelectedDestination(null)}
              >
                <div className="w-5" />
                <Home className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm">Root (No parent)</span>
              </div>
              
              {/* Container tree */}
              {renderContainerTree(containers)}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              onOpenChange(false);
              setSelectedDestination(null);
            }}
            disabled={isMoving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleMove}
            disabled={isMoving || loading}
            className="gap-2"
          >
            <FolderOpen className="h-4 w-4" />
            {isMoving ? "Moving..." : "Move Here"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}