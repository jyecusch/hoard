import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { database } from "@/db";
import { containers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PUT(
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
    const { parentId } = await req.json();

    console.log(`Moving container ${containerId} to parent ${parentId}`);

    // Verify the container exists and belongs to the user
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

    // If moving to a specific parent, verify it exists and belongs to the user
    if (parentId) {
      const [parentContainer] = await database
        .select()
        .from(containers)
        .where(
          and(
            eq(containers.id, parentId),
            eq(containers.userId, session.user.id)
          )
        );

      if (!parentContainer) {
        return NextResponse.json({ error: "Parent container not found" }, { status: 404 });
      }

      // Verify parent is not an item
      if (parentContainer.isItem) {
        return NextResponse.json({ error: "Cannot move to an item" }, { status: 400 });
      }

      // Prevent moving to self or descendants
      const isDescendant = async (checkId: string, targetId: string): Promise<boolean> => {
        if (checkId === targetId) return true;
        
        const descendants = await database
          .select({ id: containers.id })
          .from(containers)
          .where(
            and(
              eq(containers.parentId, checkId),
              eq(containers.userId, session.user.id)
            )
          );

        for (const descendant of descendants) {
          if (await isDescendant(descendant.id, targetId)) {
            return true;
          }
        }
        return false;
      };

      if (await isDescendant(containerId, parentId)) {
        return NextResponse.json(
          { error: "Cannot move container to its own descendant" },
          { status: 400 }
        );
      }
    }

    // Update the container's parentId
    await database
      .update(containers)
      .set({ 
        parentId: parentId || null,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(containers.id, containerId),
          eq(containers.userId, session.user.id)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to move container:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}