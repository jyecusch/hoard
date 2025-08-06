"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { useAuth } from "./auth-provider";
import { useBreadcrumbs } from "@/hooks/use-zero";

interface BreadcrumbsProps {
  containerId: string;
}

export function Breadcrumbs({ containerId }: BreadcrumbsProps) {
  const { user } = useAuth();
  const { breadcrumbs, isLoading: loading, error } = useBreadcrumbs(containerId, user?.id);
  
  if (loading) {
    return (
      <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-4">
        <Home className="h-4 w-4" />
        <ChevronRight className="h-4 w-4" />
        <div className="h-4 w-20 bg-muted animate-pulse rounded" />
      </nav>
    );
  }

  if (error || !breadcrumbs.length) {
    return (
      <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-4">
        <Link href="/" className="hover:text-foreground">
          <Home className="h-4 w-4" />
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">Container</span>
      </nav>
    );
  }
  
  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-4">
      <Link href="/" className="hover:text-foreground">
        <Home className="h-4 w-4" />
      </Link>
      {breadcrumbs.map((item, index) => (
        <div key={item.id} className="flex items-center space-x-1">
          <ChevronRight className="h-4 w-4" />
          {index === breadcrumbs.length - 1 ? (
            <span className="text-foreground">{item.name}</span>
          ) : (
            <Link href={`/i/${item.id}`} className="hover:text-foreground">
              {item.name}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}