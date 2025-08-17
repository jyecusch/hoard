"use client";

import { useAuth } from "./auth-provider";
import { useRootContainers, useFavorites, useAllContainers } from "@/hooks/use-zero";
import { useMemo } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Package, Home, Star, LogOut, User, FolderOpen, Heart, QrCode } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const { containers: rootContainers } = useRootContainers(user?.id);
  const { favorites } = useFavorites(user?.id);
  const { containerMap } = useAllContainers(user?.id);
  
  // Get favorite containers with their details
  const favoriteContainers = useMemo(() => {
    return favorites
      .map(fav => containerMap.get(fav.containerId))
      .filter(Boolean);
  }, [favorites, containerMap]);

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-4">
          <Package className="h-6 w-6" />
          <span className="text-xl font-bold">Hoard</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/">
                    <Home className="h-4 w-4" />
                    <span>My Hoards</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        {/* Favorites Section */}
        {favoriteContainers.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>
              <div className="flex items-center gap-2">
                <Star className="h-3 w-3" />
                <span>Favorites</span>
              </div>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {favoriteContainers.map((container) => (
                  <SidebarMenuItem key={container.id}>
                    <SidebarMenuButton asChild>
                      <Link href={`/i/${container.id}`}>
                        <Heart className="h-4 w-4" />
                        <span className="truncate">{container.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        
        {/* Top Level Containers Section */}
        {rootContainers.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>
              <div className="flex items-center gap-2">
                <FolderOpen className="h-3 w-3" />
                <span>Hoards</span>
              </div>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {rootContainers.map((container) => (
                  <SidebarMenuItem key={container.id}>
                    <SidebarMenuButton asChild>
                      <Link href={`/i/${container.id}`}>
                        <Package className="h-4 w-4" />
                        <span className="truncate">{container.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/labels">
                <QrCode className="h-4 w-4" />
                <span>Label Generator</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <div className="flex items-center justify-between px-2 py-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="text-sm">{user?.name || user?.email}</span>
              </div>
              <ThemeToggle />
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={signOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}