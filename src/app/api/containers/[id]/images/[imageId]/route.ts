import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { database } from "@/db";
import { containers, images } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { unlink } from "fs/promises";
import { join } from "path";
import { config } from "@/lib/config";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: containerId, imageId } = await params;

    // Verify container ownership
    const [container] = await database
      .select()
      .from(containers)
      .where(
        and(
          eq(containers.id, containerId),
          eq(containers.userId, session.user.id)
        )
      );

    if (!container) {
      return NextResponse.json({ error: "Container not found" }, { status: 404 });
    }

    // Get the image to delete
    const [image] = await database
      .select()
      .from(images)
      .where(
        and(
          eq(images.id, imageId),
          eq(images.containerId, containerId)
        )
      );

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Delete files from filesystem
    try {
      const originalPath = join(process.cwd(), config.uploadsDir, image.filepath);
      
      // Generate thumbnail and medium paths based on the original path
      const pathParts = image.filepath.split('/');
      const filename = pathParts[pathParts.length - 1];
      const directory = pathParts.slice(0, -1).join('/');
      
      const thumbnailPath = join(process.cwd(), config.uploadsDir, directory, `thumb_${filename}`);
      const mediumPath = join(process.cwd(), config.uploadsDir, directory, `med_${filename}`);

      // Try to delete all versions, but don't fail if some don't exist
      await Promise.allSettled([
        unlink(originalPath),
        unlink(thumbnailPath),
        unlink(mediumPath),
      ]);
    } catch (fileError) {
      console.error("Failed to delete image files:", fileError);
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database
    await database
      .delete(images)
      .where(
        and(
          eq(images.id, imageId),
          eq(images.containerId, containerId)
        )
      );

    // Add a small delay to ensure Zero picks up the change
    // This is a workaround for potential CDC lag
    await new Promise(resolve => setTimeout(resolve, 100));

    return NextResponse.json({ 
      success: true,
      // Include a timestamp to help with cache busting
      timestamp: Date.now() 
    });
  } catch (error) {
    console.error("Failed to delete image:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}