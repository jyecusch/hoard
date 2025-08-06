import { createSchema, table, string, number, boolean, definePermissions, ANYONE_CAN_DO_ANYTHING } from '@rocicorp/zero';

// Define tables manually to match database structure exactly
const containers = table('containers')
  .columns({
    id: string(),
    name: string(),
    description: string().optional(),
    code: string().optional(), // Custom QR/data matrix code
    isItem: boolean().from('is_item'),
    userId: string().from('user_id'),
    parentId: string().from('parent_id').optional(),
    createdAt: number().from('created_at'), // Use number for timestamp
    updatedAt: number().from('updated_at'), // Use number for timestamp
  })
  .primaryKey('id');

const tags = table('tags')
  .columns({
    id: string(),
    name: string(),
    containerId: string().from('container_id'),
  })
  .primaryKey('id');

const images = table('images')
  .columns({
    id: string(),
    filename: string(),
    filepath: string(),
    mimeType: string().from('mime_type'),
    size: number(),
    width: number().optional(),
    height: number().optional(),
    containerId: string().from('container_id'),
    order: number(),
    createdAt: number().from('created_at'), // Use number for timestamp
    updatedAt: number().from('updated_at'), // Use number for timestamp
  })
  .primaryKey('id');

const favorites = table('favorites')
  .columns({
    id: string(),
    userId: string().from('user_id'),
    containerId: string().from('container_id'),
    createdAt: number().from('created_at'), // Use number for timestamp
  })
  .primaryKey('id');

// Create schema
export const schema = createSchema({
  tables: [containers, tags, images, favorites],
});

// Define permissions - allow all for now
export const permissions = definePermissions<unknown, Schema>(schema, () => ({
  containers: ANYONE_CAN_DO_ANYTHING,
  tags: ANYONE_CAN_DO_ANYTHING,
  images: ANYONE_CAN_DO_ANYTHING,
  favorites: ANYONE_CAN_DO_ANYTHING,
}));

export type Schema = typeof schema;