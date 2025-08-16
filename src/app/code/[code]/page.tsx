"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { useAllContainers } from "@/hooks/use-zero";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { Package, Loader2 } from "lucide-react";

export default function CodeLookupPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const code = params.code as string;
  
  const { allContainers, isLoading } = useAllContainers(user?.id);

  useEffect(() => {
    if (!user) {
      // Redirect to login if not authenticated
      router.push('/auth/login');
      return;
    }

    if (isLoading || !allContainers) {
      return; // Still loading
    }

    // Look for container with matching code
    const container = allContainers.find(c => c.code === code);
    
    if (container) {
      // Found container, redirect to its page
      router.replace(`/i/${container.id}`);
    } else {
      // No container found with this code
      // Stay on this page to show error
    }
  }, [user, isLoading, allContainers, code, router]);

  if (!user) {
    return (
      <LayoutWrapper>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="text-muted-foreground">Please sign in to continue.</p>
          </div>
        </div>
      </LayoutWrapper>
    );
  }

  if (isLoading) {
    return (
      <LayoutWrapper>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Looking up code: {code}</p>
          </div>
        </div>
      </LayoutWrapper>
    );
  }

  // No container found with this code
  return (
    <LayoutWrapper>
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-4">Code Not Found</h1>
          <p className="text-muted-foreground mb-2">
            No item found with code: <code className="bg-muted px-2 py-1 rounded font-mono">{code}</code>
          </p>
          <p className="text-sm text-muted-foreground">
            This code may not be assigned to any item yet, or the item may not belong to your account.
          </p>
        </div>
      </div>
    </LayoutWrapper>
  );
}