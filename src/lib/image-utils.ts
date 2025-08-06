import sharp from 'sharp';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { config } from './config';

export interface ImageMetadata {
  width: number;
  height: number;
  size: number;
  mimeType: string;
}

export interface ProcessedImage {
  originalPath: string;
  thumbnailPath: string;
  mediumPath: string;
  metadata: ImageMetadata;
}

// Ensure upload directory exists
export function ensureUploadDir(containerId: string): string {
  const containerDir = join(process.cwd(), config.uploadsDir, 'containers', containerId);
  
  if (!existsSync(containerDir)) {
    mkdirSync(containerDir, { recursive: true });
  }
  
  return containerDir;
}

// Generate unique filename
export function generateFilename(originalName: string, size?: string): string {
  const timestamp = Date.now();
  const ext = originalName.split('.').pop()?.toLowerCase() || 'jpg';
  const basename = originalName.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_');
  const sizePrefix = size ? `${size}_` : '';
  
  return `${sizePrefix}${timestamp}_${basename}.${ext}`;
}

// Process and resize images
export async function processImage(
  buffer: Buffer,
  originalFilename: string,
  containerId: string
): Promise<ProcessedImage> {
  const containerDir = ensureUploadDir(containerId);
  
  // Get metadata from original
  const sharpImage = sharp(buffer);
  const metadata = await sharpImage.metadata();
  
  if (!metadata.width || !metadata.height) {
    throw new Error('Invalid image metadata');
  }

  const imageMetadata: ImageMetadata = {
    width: metadata.width,
    height: metadata.height,
    size: buffer.length,
    mimeType: `image/${metadata.format}` || 'image/jpeg',
  };

  // Generate filenames
  const originalFilename_generated = generateFilename(originalFilename);
  const thumbnailFilename = generateFilename(originalFilename, 'thumb');
  const mediumFilename = generateFilename(originalFilename, 'med');

  // File paths
  const originalPath = join(containerDir, originalFilename_generated);
  const thumbnailPath = join(containerDir, thumbnailFilename);
  const mediumPath = join(containerDir, mediumFilename);

  // Relative paths for database storage
  const relativeOriginal = join('containers', containerId, originalFilename_generated);
  const relativeThumbnail = join('containers', containerId, thumbnailFilename);
  const relativeMedium = join('containers', containerId, mediumFilename);

  // Process and save images
  await Promise.all([
    // Original (optimize but keep full size)
    sharpImage
      .jpeg({ quality: 85 })
      .png({ compressionLevel: 8 })
      .webp({ quality: 85 })
      .toFile(originalPath),
    
    // Thumbnail
    sharpImage
      .resize(config.imageSizes.thumbnail.width, config.imageSizes.thumbnail.height, {
        fit: 'cover',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .png({ compressionLevel: 8 })
      .webp({ quality: 80 })
      .toFile(thumbnailPath),
    
    // Medium
    sharpImage
      .resize(config.imageSizes.medium.width, config.imageSizes.medium.height, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85 })
      .png({ compressionLevel: 8 })
      .webp({ quality: 85 })
      .toFile(mediumPath),
  ]);

  return {
    originalPath: relativeOriginal,
    thumbnailPath: relativeThumbnail,
    mediumPath: relativeMedium,
    metadata: imageMetadata,
  };
}