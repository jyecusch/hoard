"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface DescriptionCardProps {
  description?: string | null;
}

export function DescriptionCard({ description }: DescriptionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Description</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {description || "No description available"}
        </p>
      </CardContent>
    </Card>
  );
}