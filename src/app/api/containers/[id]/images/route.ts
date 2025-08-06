import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { database } from "@/db";
import { containers, images } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { processImage } from "@/lib/image-utils";
import { config } from "@/lib/config";

// GET - Get images for a container
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: containerId } = await params;

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

    // Get images for the container
    const containerImages = await database
      .select()
      .from(images)
      .where(eq(images.containerId, containerId))
      .orderBy(desc(images.createdAt));

    return NextResponse.json(containerImages);
  } catch (error) {
    console.error("Failed to fetch images:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Upload new image
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: containerId } = await params;

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

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    // Validate file
    if (file.size > config.maxFileSize) {
      return NextResponse.json(
        { error: `File size exceeds ${config.maxFileSize / 1024 / 1024}MB limit` },
        { status: 400 }
      );
    }

    if (!config.allowedMimeTypes.includes(file.type as typeof config.allowedMimeTypes[number])) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Process image (create thumbnails, optimize)
    const processedImage = await processImage(buffer, file.name, containerId);

    // Get current max order for this container
    const [maxOrderResult] = await database
      .select({ maxOrder: images.order })
      .from(images)
      .where(eq(images.containerId, containerId))
      .orderBy(desc(images.order))
      .limit(1);

    const nextOrder = (maxOrderResult?.maxOrder || 0) + 1;

    // Save to database
    const [newImage] = await database
      .insert(images)
      .values({
        filename: file.name,
        filepath: processedImage.originalPath,
        mimeType: processedImage.metadata.mimeType,
        size: processedImage.metadata.size,
        width: processedImage.metadata.width,
        height: processedImage.metadata.height,
        containerId,
        order: nextOrder,
      })
      .returning();

    return NextResponse.json(newImage);
  } catch (error) {
    console.error("Failed to upload image:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}