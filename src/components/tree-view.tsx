"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ChevronDown, FolderOpen, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Container } from "@/types/container";

interface TreeViewProps {
  items: Container[];
  level?: number;
}

export function TreeView({ items, level = 0 }: TreeViewProps) {
  return (
    <div className={cn("space-y-1", level > 0 && "ml-6")}>
      {items.map(
        (item) => item && <TreeItem key={item.id} item={item} level={level} />
      )}
    </div>
  );
}

interface TreeItemProps {
  item: Container;
  level: number;
}

function TreeItem({ item, level }: TreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = !item.isItem && item.children && item.children.length > 0;

  return (
    <div>
      <div className="flex items-center gap-1 py-1.5 px-2 rounded hover:bg-accent hover:text-accent-foreground">
        {!item.isItem ? (
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-5 w-5 p-0", hasChildren ? "" : "text-neutral-500")}
            onClick={() => setIsExpanded(!isExpanded)}
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

        <Link
          href={`/i/${item.id}`}
          className="flex items-center gap-2 flex-1 hover:underline"
        >
          {item.isItem ? (
            <Package className="h-4 w-4 text-muted-foreground" />
          ) : (
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          )}
          <div className="flex flex-col gap-1 flex-1">
            <div className="flex items-center gap-2 justify-between">
              <span className="text-sm font-medium">{item.name}</span>
              <div>
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((tag: string, index: number) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Link>
      </div>

      {isExpanded && hasChildren && item.children && (
        <TreeView items={item.children} level={level + 1} />
      )}
    </div>
  );
}