import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { config } from "@/lib/config";
import { auth } from "@/lib/auth";
import { database } from "@/db";
import { containers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// Simple in-memory cache for container ownership (in production, use Redis)
const containerOwnershipCache = new Map<string, { userId: string, timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const imagePath = path.join('/');
    
    // Extract container ID from path (containers/{containerId}/filename)
    const pathParts = imagePath.split('/');
    if (pathParts[0] !== 'containers' || pathParts.length < 3) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const containerId = pathParts[1];

    // Check cache first
    const cached = containerOwnershipCache.get(containerId);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      // Use cached ownership, skip session check for performance
    } else {
      // Verify session and cache the result
      const session = await auth.api.getSession({
        headers: req.headers,
      });

      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Verify container ownership and cache it
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

      // Cache the ownership
      containerOwnershipCache.set(containerId, {
        userId: session.user.id,
        timestamp: now
      });
    }

    // Get the full file path
    const fullPath = join(process.cwd(), config.uploadsDir, imagePath);

    try {
      const imageBuffer = await readFile(fullPath);
      
      // Determine content type from file extension
      const extension = imagePath.split('.').pop()?.toLowerCase();
      const contentTypeMap: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
      };
      
      const contentType = contentTypeMap[extension || ''] || 'image/jpeg';

      return new NextResponse(new Uint8Array(imageBuffer), {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch (fileError) {
      console.error("File read error:", fileError);
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Failed to serve image:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}