"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { useAuth } from "@/components/auth-provider";
import {
  useContainer,
  useZeroMutate,
  useFavorites,
  useImages,
} from "@/hooks/use-zero";
import { mutators } from "@/zero/mutators";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ContainerControls } from "@/components/container-controls";
import { ContainerHeader } from "@/components/container-header";
import { DescriptionCard } from "@/components/description-card";
import { ContentsCard } from "@/components/contents-card";
import { PhotosCard } from "@/components/photos-card";
import { AddEntityModal } from "@/components/add-entity-modal";
import { DeleteConfirmModal } from "@/components/delete-confirm-modal";
import { MoveModal } from "@/components/move-modal";
import { Button } from "@/components/ui/button";
import { Package, ArrowLeft } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { TreeView } from "@/components/tree-view";
import { Container } from "@/types/container";

export default function ContainerRoute() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isAddingContainer, setIsAddingContainer] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);

  const containerId = params.id as string;

  // Use Zero hook for reactive container data
  const {
    container,
    isLoading: loading,
    error,
  } = useContainer(containerId, user?.id);
  const { favorites, isFavorite } = useFavorites(user?.id);
  const { images } = useImages(containerId);
  const z = useZeroMutate();

  // Use Zero data directly
  const containerWithExtras = container;

  // No need for manual refetch with Zero - data is reactive

  const handleAddItem = async (
    name: string,
    description: string,
    tags: string
  ) => {
    if (!name.trim() || !user) return;

    const tagsList = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    try {
      // Use Zero mutators for creating items
      const itemId = uuidv4();
      const now = Date.now();

      // Insert item using built-in mutator
      await z.mutate.containers.insert({
        id: itemId,
        name: name,
        description: description || null,
        isItem: true,
        parentId: containerId,
        userId: user.id,
        createdAt: now,
        updatedAt: now,
      });

      // Insert tags using built-in mutator
      for (const tagName of tagsList) {
        if (tagName.trim()) {
          await z.mutate.tags.insert({
            id: uuidv4(),
            name: tagName.trim(),
            containerId: itemId,
          });
        }
      }

      // Zero will automatically update the data reactively
    } catch (error) {
      console.error("Failed to create item:", error);
      throw error;
    }
  };

  const handleAddContainer = async (
    name: string,
    description: string,
    tags: string
  ) => {
    if (!name.trim() || !user) return;

    const tagsList = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    try {
      // Use Zero mutators for creating containers
      const newContainerId = uuidv4();
      const now = Date.now();

      // Insert container using built-in mutator
      await z.mutate.containers.insert({
        id: newContainerId,
        name: name,
        description: description || null,
        isItem: false,
        parentId: containerId,
        userId: user.id,
        createdAt: now,
        updatedAt: now,
      });

      // Insert tags using built-in mutator
      for (const tagName of tagsList) {
        if (tagName.trim()) {
          await z.mutate.tags.insert({
            id: uuidv4(),
            name: tagName.trim(),
            containerId: newContainerId,
          });
        }
      }

      // Zero will automatically update the data reactively
    } catch (error) {
      console.error("Failed to create container:", error);
      throw error;
    }
  };

  const handleDelete = async (deleteContents = false) => {
    try {
      // Use Zero mutators for deleting containers
      if (deleteContents) {
        // Delete all children recursively (simplified for now)
        // TODO: Implement recursive deletion with Zero mutators
      } else {
        // Move children to root level
        if (containerWithExtras?.children) {
          for (const child of containerWithExtras.children) {
            await z.mutate.containers.update({
              id: child.id,
              parentId: null,
              updatedAt: Date.now(),
            });
          }
        }
      }

      // Delete associated tags
      // TODO: Get tags for this container and delete them

      // Delete the container
      await z.mutate.containers.delete({ id: containerId });

      // Navigate back to parent or home
      if (containerWithExtras?.parentId) {
        router.push(`/i/${containerWithExtras.parentId}`);
      } else {
        router.push("/");
      }
    } catch (error) {
      console.error("Failed to delete container:", error);
      throw error;
    }
  };

  const handleMove = async (destinationId: string | null) => {
    try {
      // Use Zero mutator for moving containers
      await z.mutate.containers.update({
        id: containerId,
        parentId: destinationId,
        updatedAt: Date.now(),
      });

      // Stay on current page - Zero will reactively update the data
      // The move has completed successfully, modal will close automatically
    } catch (error) {
      console.error("Failed to move container:", error);
      throw error;
    }
  };

  const handleToggleFavorite = async () => {
    if (!user) return;

    try {
      const isCurrentlyFavorite = isFavorite(containerId);

      if (isCurrentlyFavorite) {
        // Find and remove the favorite
        const favoriteToRemove = favorites.find(
          (fav) => fav.containerId === containerId
        );
        if (favoriteToRemove) {
          await z.mutate.favorites.delete({ id: favoriteToRemove.id });
        }
      } else {
        // Add new favorite
        await z.mutate.favorites.insert({
          id: uuidv4(),
          userId: user.id,
          containerId: containerId,
          createdAt: Date.now(),
        });
      }
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      throw error;
    }
  };

  const primaryImage = images && images.length > 0 ? images[0] : null;

  const handleTagsUpdate = async (tags: string[]) => {
    try {
      await mutators.updateContainerTags(z, { containerId, tags });
    } catch (error) {
      console.error("Failed to update tags:", error);
    }
  };

  const handleCodeUpdate = async (code: string) => {
    try {
      await mutators.updateContainer(z, { id: containerId, code });
    } catch (error) {
      console.error("Failed to update code:", error);
    }
  };

  const content = loading ? (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    </div>
  ) : error ? (
    <div className="text-center py-12">
      <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
      <h1 className="text-2xl font-bold mb-4">Not Found</h1>
      <p className="text-muted-foreground mb-8">Unable to load container</p>
      <Button onClick={() => router.push("/")} variant="outline">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Hoards
      </Button>
    </div>
  ) : containerWithExtras ? (
    <>
      <div className="p-6 max-w-7xl mx-auto">
        <Breadcrumbs containerId={containerId} />

        <ContainerControls
          containerId={containerId}
          containerName={containerWithExtras.name}
          code={containerWithExtras.code}
          isFavorite={isFavorite(containerId)}
          onToggleFavorite={handleToggleFavorite}
          onDelete={() => setIsDeleteModalOpen(true)}
          onMove={() => setIsMoveModalOpen(true)}
        />

        <ContainerHeader
          containerId={containerId}
          container={containerWithExtras}
          primaryImage={primaryImage}
          onTagsUpdate={handleTagsUpdate}
          onCodeUpdate={handleCodeUpdate}
        />

        <div className="flex flex-col gap-4">
          <DescriptionCard description={containerWithExtras.description} />

          {/* Contents Section - only show for containers */}
          {!containerWithExtras.isItem && (
            <ContentsCard
              containerName={containerWithExtras.name}
              itemCount={containerWithExtras.children?.length || 0}
              onAddItem={() => setIsAddingItem(true)}
              onAddContainer={() => setIsAddingContainer(true)}
            >
              {containerWithExtras.children &&
              containerWithExtras.children.length > 0 ? (
                <TreeView items={containerWithExtras.children as Container[]} />
              ) : (
                <p className="text-muted-foreground text-sm">
                  This container is empty
                </p>
              )}
            </ContentsCard>
          )}

          <PhotosCard
            containerId={containerId}
            containerName={containerWithExtras.name}
            images={images}
          />
        </div>
      </div>

      {/* Modals - only show for containers */}
      {!containerWithExtras.isItem && (
        <>
          <AddEntityModal
            open={isAddingItem}
            onOpenChange={setIsAddingItem}
            entityType="item"
            parentName={containerWithExtras?.name || "Container"}
            onAdd={handleAddItem}
          />

          <AddEntityModal
            open={isAddingContainer}
            onOpenChange={setIsAddingContainer}
            entityType="container"
            parentName={containerWithExtras?.name || "Container"}
            onAdd={handleAddContainer}
          />
        </>
      )}

      {/* Delete Modal */}
      <DeleteConfirmModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        itemName={containerWithExtras?.name || ""}
        isContainer={!containerWithExtras?.isItem}
        hasContents={
          !!(
            containerWithExtras?.children &&
            containerWithExtras.children.length > 0
          )
        }
        onDelete={handleDelete}
      />

      {/* Move Modal */}
      <MoveModal
        open={isMoveModalOpen}
        onOpenChange={setIsMoveModalOpen}
        itemName={containerWithExtras?.name || ""}
        currentContainerId={containerId}
        onMove={handleMove}
      />
    </>
  ) : null;

  return <LayoutWrapper>{content}</LayoutWrapper>;
}
