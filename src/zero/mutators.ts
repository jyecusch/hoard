import { Zero } from "@rocicorp/zero";
import type { Schema } from "./schema";

export type Mutators = typeof mutators;

export const mutators = {
  // Container mutations
  async createContainer(
    z: Zero<Schema>,
    {
      name,
      description,
      code,
      isItem,
      parentId,
      userId,
      tags = [],
    }: {
      name: string;
      description?: string;
      code?: string;
      isItem: boolean;
      parentId?: string;
      userId: string;
      tags?: string[];
    }
  ) {
    const containerId = crypto.randomUUID();
    const now = Date.now(); // Use timestamp instead of Date object

    await z.mutate.containers.insert({
      id: containerId,
      name,
      description: description || null,
      code: code || null,
      isItem,
      parentId: parentId || null,
      userId,
      createdAt: now,
      updatedAt: now,
    });

    // Insert tags (removed createdAt since it's not in schema)
    for (const tagName of tags) {
      if (tagName.trim()) {
        await z.mutate.tags.insert({
          id: crypto.randomUUID(),
          name: tagName.trim(),
          containerId,
        });
      }
    }

    return containerId;
  },

  async updateContainer(
    z: Zero<Schema>,
    {
      id,
      name,
      description,
      code,
    }: {
      id: string;
      name?: string;
      description?: string;
      code?: string;
    }
  ) {
    const updates: Record<string, unknown> = {
      updatedAt: Date.now(), // Use timestamp instead of Date object
    };

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (code !== undefined) updates.code = code;

    await z.mutate.containers.update({
      id,
      ...updates,
    });
  },

  async deleteContainer(
    z: Zero<Schema>,
    { id, deleteContents }: { id: string; deleteContents: boolean }
  ) {
    if (deleteContents) {
      // Delete all children recursively
      const children = await z.query.containers.where("parentId", id);
      for (const child of children) {
        await this.deleteContainer(z, { id: child.id, deleteContents: true });
      }
    } else {
      // Move children to root level (set parentId to null)
      // TODO: Fix bulk update - Zero API doesn't support where clause on update
      console.log("Bulk update not implemented for Zero mutators");
    }

    // Delete associated tags
    const tags = await z.query.tags.where("containerId", id);
    for (const tag of tags) {
      await z.mutate.tags.delete({ id: tag.id });
    }

    // Delete associated images
    const images = await z.query.images.where("containerId", id);
    for (const image of images) {
      await z.mutate.images.delete({ id: image.id });
    }

    // Delete the container
    await z.mutate.containers.delete({ id });
  },

  async moveContainer(
    z: Zero<Schema>,
    { id, newParentId }: { id: string; newParentId?: string }
  ) {
    await z.mutate.containers.update({
      id,
      parentId: newParentId || null,
      updatedAt: Date.now(), // Use timestamp instead of Date object
    });
  },

  // Image mutations
  async createImage(
    z: Zero<Schema>,
    {
      filename,
      filepath,
      mimeType,
      size,
      width,
      height,
      containerId,
      order,
    }: {
      filename: string;
      filepath: string;
      mimeType: string;
      size: number;
      width?: number;
      height?: number;
      containerId: string;
      order: number;
    }
  ) {
    const imageId = crypto.randomUUID();

    await z.mutate.images.insert({
      id: imageId,
      filename,
      filepath,
      mimeType,
      size,
      width: width || null,
      height: height || null,
      containerId,
      order,
      createdAt: Date.now(), // Use timestamp instead of Date object
      updatedAt: Date.now(), // Add required updatedAt
    });

    return imageId;
  },

  async deleteImage(z: Zero<Schema>, { id }: { id: string }) {
    await z.mutate.images.delete({ id });
  },

  // Tag mutations
  async createTag(
    z: Zero<Schema>,
    { name, containerId }: { name: string; containerId: string }
  ) {
    const tagId = crypto.randomUUID();

    await z.mutate.tags.insert({
      id: tagId,
      name,
      containerId,
      // Removed createdAt since it's not in the tags schema
    });

    return tagId;
  },

  async deleteTag(z: Zero<Schema>, { id }: { id: string }) {
    await z.mutate.tags.delete({ id });
  },

  async updateContainerTags(
    z: Zero<Schema>,
    { containerId, tags }: { containerId: string; tags: string[] }
  ) {
    // Delete existing tags
    const existingTags = await z.query.tags.where("containerId", containerId);
    for (const tag of existingTags) {
      await z.mutate.tags.delete({ id: tag.id });
    }

    // Insert new tags
    for (const tagName of tags) {
      if (tagName.trim()) {
        await this.createTag(z, { name: tagName.trim(), containerId });
      }
    }
  },
};
