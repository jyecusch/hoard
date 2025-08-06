"use client";

import { useState } from "react";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { useAuth } from "@/components/auth-provider";
import { useContainers, useZeroMutate } from "@/hooks/use-zero";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Package } from "lucide-react";
import Link from "next/link";


export default function HomePage() {
  const { user } = useAuth();
  const { containers: hoards, isLoading: loading } = useContainers(user?.id);
  const z = useZeroMutate();
  const [isCreating, setIsCreating] = useState(false);
  const [newHoardName, setNewHoardName] = useState("");
  const [newHoardDescription, setNewHoardDescription] = useState("");
  const [newHoardTags, setNewHoardTags] = useState("");

  // Filter for top-level hoards (no parent) that are not items
  const topLevelHoards = hoards.filter((hoard) => 
    !hoard.parentId && !hoard.isItem
  );

  const handleCreateHoard = async () => {
    if (!newHoardName.trim() || !user) return;

    const tagsList = newHoardTags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    try {
      
      // Use Zero's built-in CRUD mutators
      const containerId = crypto.randomUUID();
      const now = Date.now();
      
      // Insert container using built-in mutator
      await z.mutate.containers.insert({
        id: containerId,
        name: newHoardName,
        description: newHoardDescription || null,
        isItem: false,
        parentId: null,
        userId: user.id,
        createdAt: now,
        updatedAt: now,
      });
      
      
      // Insert tags using built-in mutator
      for (const tagName of tagsList) {
        if (tagName.trim()) {
          await z.mutate.tags.insert({
            id: crypto.randomUUID(),
            name: tagName.trim(),
            containerId,
          });
        }
      }
      

      // Clear form and close modal
      setNewHoardName("");
      setNewHoardDescription("");
      setNewHoardTags("");
      setIsCreating(false);
    } catch (error) {
      console.error("Failed to create hoard:", error);
    }
  };

  const content = (
    <div className="p-6 max-w-7xl mx-auto">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading hoards...</p>
          </div>
        </div>
      ) : topLevelHoards.length === 0 && !isCreating ? (
        <div className="text-center py-12">
          <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-4">Welcome to Hoard</h1>
          <div className="max-w-md mx-auto text-muted-foreground mb-8">
            <p>Get started by creating your first hoard to organize your items.</p>
          </div>
          <Button onClick={() => setIsCreating(true)} size="lg">
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Hoard
          </Button>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">My Hoards</h1>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Hoard
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {topLevelHoards.map((hoard) => (
              <Link key={hoard.id} href={`/i/${hoard.id}`} className="block">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      {hoard.name}
                    </CardTitle>
                    {hoard.description && (
                      <CardDescription>{hoard.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {hoard.children?.length || 0} items
                      </p>
                      {hoard.tags && hoard.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {hoard.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}

      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Hoard</DialogTitle>
            <DialogDescription>
              Give your hoard a name and optional description to get started.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g., Kitchen Supplies"
                value={newHoardName}
                onChange={(e) => setNewHoardName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateHoard()}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Items and supplies for the kitchen"
                value={newHoardDescription}
                onChange={(e) => setNewHoardDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (optional)</Label>
              <Input
                id="tags"
                placeholder="kitchen, supplies, food (comma-separated)"
                value={newHoardTags}
                onChange={(e) => setNewHoardTags(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateHoard()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setIsCreating(false);
                setNewHoardName("");
                setNewHoardDescription("");
                setNewHoardTags("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateHoard}>Create Hoard</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  return <LayoutWrapper>{content}</LayoutWrapper>;
}