"use client";

import { FolderPlus, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ContentsCardProps {
  containerName: string;
  itemCount: number;
  onAddItem?: () => void;
  onAddContainer?: () => void;
  children?: React.ReactNode;
}

export function ContentsCard({ 
  containerName, 
  itemCount,
  onAddItem, 
  onAddContainer,
  children
}: ContentsCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Contents</CardTitle>
            <CardDescription>
              {itemCount} item
              {itemCount === 1 ? "" : "s"} in{" "}
              <span className="text-primary">{containerName}</span>
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={onAddItem}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              Add Item
            </Button>
            <Button
              onClick={onAddContainer}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <FolderPlus className="h-4 w-4" />
              Add Container
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}