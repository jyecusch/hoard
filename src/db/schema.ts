import { pgTable, uuid, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Export all auth-related tables from Better Auth
export * from "./auth-schema";

// Container table (both hoards and items)
export const containers = pgTable("containers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  code: text("code"), // Custom QR/data matrix code
  isItem: boolean("is_item").notNull().default(false),
  userId: text("user_id").notNull(),
  parentId: uuid("parent_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Tags table
export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  containerId: uuid("container_id").notNull(),
});

// Images table
export const images = pgTable("images", {
  id: uuid("id").primaryKey().defaultRandom(),
  filename: text("filename").notNull(), // original filename from user
  filepath: text("filepath").notNull(), // relative path from uploads root
  mimeType: text("mime_type").notNull(), // image/jpeg, image/png, etc.
  size: integer("size").notNull(), // file size in bytes
  width: integer("width"), // image width in pixels
  height: integer("height"), // image height in pixels
  containerId: uuid("container_id").notNull(),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Favorites table
export const favorites = pgTable("favorites", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  containerId: uuid("container_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations
export const containersRelations = relations(containers, ({ one, many }) => ({
  parent: one(containers, {
    fields: [containers.parentId],
    references: [containers.id],
    relationName: "parentChild"
  }),
  children: many(containers, { relationName: "parentChild" }),
  tags: many(tags),
  images: many(images),
  favorites: many(favorites),
}));

export const tagsRelations = relations(tags, ({ one }) => ({
  container: one(containers, {
    fields: [tags.containerId],
    references: [containers.id],
  }),
}));

export const imagesRelations = relations(images, ({ one }) => ({
  container: one(containers, {
    fields: [images.containerId],
    references: [containers.id],
  }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  container: one(containers, {
    fields: [favorites.containerId],
    references: [containers.id],
  }),
}));
