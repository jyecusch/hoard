"use client";

import { useAuth } from "./auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { Button } from "@/components/ui/button";
import { ScanLine } from "lucide-react";
import { QRScannerModal } from "./qr-scanner-modal";
import { useIsMobile } from "@/hooks/use-mobile";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1">
          <header className="border-b">
            <div className="flex h-16 items-center px-4">
              <SidebarTrigger />
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </div>
      
      {/* Floating scan button for mobile */}
      {isMobile && (
        <Button
          onClick={() => setScannerOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
          size="icon"
        >
          <ScanLine className="h-6 w-6" />
          <span className="sr-only">Scan QR Code</span>
        </Button>
      )}

      {/* QR Scanner Modal */}
      {isMobile && (
        <QRScannerModal 
          open={scannerOpen} 
          onOpenChange={setScannerOpen} 
        />
      )}
    </SidebarProvider>
  );
}