import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { database } from "@/db";
import { containers, tags } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";

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

    const { id: containerIdOrCode } = await params;

    // Get the container by ID or by code
    const [container] = await database
      .select()
      .from(containers)
      .where(
        and(
          or(
            eq(containers.id, containerIdOrCode),
            eq(containers.code, containerIdOrCode)
          ),
          eq(containers.userId, session.user.id)
        )
      );

    if (!container) {
      return NextResponse.json({ error: "Container not found" }, { status: 404 });
    }

    // Use the actual container ID for subsequent queries
    const containerId = container.id;

    // Get tags for this container
    const containerTags = await database
      .select({ name: tags.name })
      .from(tags)
      .where(eq(tags.containerId, containerId));

    // Get children containers
    const children = await database
      .select()
      .from(containers)
      .where(
        and(
          eq(containers.parentId, containerId),
          eq(containers.userId, session.user.id)
        )
      );

    // Get tags for each child
    const childrenWithTags = await Promise.all(
      children.map(async (child) => {
        const childTags = await database
          .select({ name: tags.name })
          .from(tags)
          .where(eq(tags.containerId, child.id));

        return {
          ...child,
          tags: childTags.map((t) => t.name),
        };
      })
    );

    const result = {
      ...container,
      tags: containerTags.map((t) => t.name),
      children: childrenWithTags,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch container:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    
    let deleteContents = false;
    try {
      const body = await req.json();
      deleteContents = body.deleteContents || false;
    } catch {
      // If no body or invalid JSON, default to false (move contents)
      console.log("No body or invalid JSON, defaulting to move contents");
    }

    // Get the container to verify ownership and check if it has children
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

    // Get children before deletion
    const children = await database
      .select()
      .from(containers)
      .where(
        and(
          eq(containers.parentId, containerId),
          eq(containers.userId, session.user.id)
        )
      );

    console.log(`Container ${containerId} has ${children.length} children, deleteContents: ${deleteContents}`);

    // If this is a container with contents and deleteContents is false,
    // move contents to parent
    if (!container.isItem && children.length > 0 && !deleteContents) {
      console.log(`Moving ${children.length} children from ${containerId} to parent ${container.parentId}`);
      
      const updateResult = await database
        .update(containers)
        .set({ parentId: container.parentId })
        .where(eq(containers.parentId, containerId));
        
      console.log("Update result:", updateResult);
    }

    // Delete tags associated with this container
    await database
      .delete(tags)
      .where(eq(tags.containerId, containerId));

    // Delete the container (this will cascade delete children if deleteContents is true
    // due to the foreign key constraint with onDelete: "cascade")
    await database
      .delete(containers)
      .where(
        and(
          eq(containers.id, containerId),
          eq(containers.userId, session.user.id)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete container:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}