import { useQuery, useZero } from "@rocicorp/zero/react";
import { useMemo } from "react";
import type { Schema } from "@/zero/schema";
// import type { Mutators } from '@/lib/zero-mutators';
import type { Container } from "@/types/container";

// Hook to get all containers for a user with full relationships
export function useAllContainers(userId?: string) {
  const z = useZero<Schema>();

  // Query containers for user
  const containerQuery = useMemo(() => {
    if (!userId) return z.query.containers.where("userId", ""); // Empty query
    return z.query.containers.where("userId", userId);
  }, [z, userId]);

  // Query all tags
  const tagQuery = useMemo(() => z.query.tags, [z]);

  const [containers, containerDetails] = useQuery(containerQuery);
  const [tags, tagDetails] = useQuery(tagQuery);

  const isLoading = containerDetails === undefined || tagDetails === undefined;
  const error = null; // Remove error handling for now

  // Build container graph with tags and children
  const containerGraph = useMemo(() => {
    if (!containers || !tags)
      return { allContainers: [], rootContainers: [], containerMap: new Map() };

    // Create map of tags by container ID
    const tagsByContainer = new Map<string, string[]>();
    tags.forEach((tag) => {
      const containerId = tag.containerId;
      if (!tagsByContainer.has(containerId)) {
        tagsByContainer.set(containerId, []);
      }
      tagsByContainer.get(containerId)!.push(tag.name);
    });

    // Convert containers to our type and add tags
    const allContainers: Container[] = containers.map((container) => ({
      id: container.id,
      name: container.name,
      description: container.description,
      code: container.code,
      isItem: container.isItem,
      userId: container.userId,
      parentId: container.parentId,
      createdAt: new Date(container.createdAt), // createdAt is now a number (timestamp)
      updatedAt: new Date(container.updatedAt), // updatedAt is now a number (timestamp)
      tags: tagsByContainer.get(container.id) || [],
      children: [],
    }));

    // Create container map
    const containerMap = new Map<string, Container>();
    allContainers.forEach((container) => {
      containerMap.set(container.id, container);
    });

    // Build parent-child relationships
    const rootContainers: Container[] = [];
    allContainers.forEach((container) => {
      if (container.parentId) {
        const parent = containerMap.get(container.parentId);
        if (parent) {
          parent.children!.push(container);
        }
      } else {
        rootContainers.push(container);
      }
    });

    return { allContainers, rootContainers, containerMap };
  }, [containers, tags]);

  return {
    ...containerGraph,
    isLoading,
    error,
  };
}

// Hook to get root containers (hoards)
export function useRootContainers(userId?: string) {
  const { rootContainers, isLoading, error } = useAllContainers(userId);

  return {
    containers: rootContainers.filter((c) => !c.isItem), // Only containers, not items
    isLoading,
    error,
  };
}

// Hook to get a specific container with full tree data
export function useContainer(containerId: string, userId?: string) {
  const { containerMap, isLoading, error } = useAllContainers(userId);

  const container = containerMap.get(containerId) || null;

  return {
    container,
    isLoading,
    error,
  };
}

// Hook to get containers suitable for moving (all containers except items)
export function useMoveDestinations(userId?: string, excludeId?: string) {
  const { rootContainers, isLoading, error } = useAllContainers(userId);

  const destinations = useMemo(() => {
    const filterContainers = (containers: Container[]): Container[] => {
      return containers
        .filter((c) => !c.isItem && c.id !== excludeId) // Exclude items and the container being moved
        .map((c) => ({
          ...c,
          children: c.children ? filterContainers(c.children) : [],
        }));
    };

    return filterContainers(rootContainers);
  }, [rootContainers, excludeId]);

  return {
    destinations,
    isLoading,
    error,
  };
}

// Hook to get breadcrumb trail for a container
export function useBreadcrumbs(containerId: string, userId?: string) {
  const { containerMap, isLoading, error } = useAllContainers(userId);

  const breadcrumbs = useMemo(() => {
    if (!containerMap.has(containerId)) return [];

    const trail: Container[] = [];
    let currentId: string | null = containerId;

    while (currentId && containerMap.has(currentId)) {
      const container: Container = containerMap.get(currentId)!;
      trail.unshift(container);
      currentId = container.parentId;
    }

    return trail;
  }, [containerMap, containerId]);

  return {
    breadcrumbs,
    isLoading,
    error,
  };
}

// Legacy hooks for backward compatibility
export function useContainers(userId?: string) {
  return useRootContainers(userId);
}

export function useTags(containerId?: string) {
  const z = useZero<Schema>();

  const tagQuery = useMemo(() => {
    if (containerId) {
      return z.query.tags.where("containerId", containerId);
    }
    return z.query.tags;
  }, [z, containerId]);

  const [allTags, tagDetails] = useQuery(tagQuery);

  const isLoading = tagDetails === undefined;
  const error = null;

  return {
    tags: allTags || [],
    isLoading,
    error,
  };
}

// Hook to get images for a container
export function useImages(containerId?: string) {
  const z = useZero<Schema>();

  const imageQuery = useMemo(() => {
    if (!containerId) return z.query.images.where("containerId", ""); // Empty query
    return z.query.images
      .where("containerId", containerId)
      .orderBy("order", "asc");
  }, [z, containerId]);

  const [data, imageDetails] = useQuery(imageQuery);

  const isLoading = imageDetails === undefined;
  const error = null;

  const images = useMemo(() => {
    if (!data || !containerId) return [];

    // Convert to our expected format
    const convertedImages = data.map((image) => ({
      id: image.id,
      filename: image.filename,
      filepath: image.filepath,
      mimeType: image.mimeType,
      size: image.size,
      width: image.width,
      height: image.height,
      containerId: image.containerId,
      order: image.order,
      createdAt: new Date(image.createdAt), // createdAt is now a number (timestamp)
    }));

    return convertedImages;
  }, [data, containerId]);

  return {
    images,
    isLoading,
    error,
  };
}

// Hook to get favorites for a user
export function useFavorites(userId?: string) {
  const z = useZero<Schema>();

  const favoriteQuery = useMemo(() => {
    if (!userId) return z.query.favorites.where("userId", ""); // Empty query
    return z.query.favorites.where("userId", userId);
  }, [z, userId]);

  const [data, favoriteDetails] = useQuery(favoriteQuery);

  const isLoading = favoriteDetails === undefined;
  const error = null;

  const favorites = useMemo(() => {
    if (!data) return [];
    return data.map((fav) => ({
      id: fav.id,
      userId: fav.userId,
      containerId: fav.containerId,
      createdAt: new Date(fav.createdAt),
    }));
  }, [data]);

  // Helper to check if a container is favorited
  const isFavorite = (containerId: string) => {
    return favorites.some((fav) => fav.containerId === containerId);
  };

  return {
    favorites,
    isFavorite,
    isLoading,
    error,
  };
}

// Hook to get Zero instance for mutations
export function useZeroMutate() {
  return useZero<Schema>();
}
