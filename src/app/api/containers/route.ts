import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { database } from "@/db";
import { containers, tags } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all top-level hoards (containers with no parent)
    const hoards = await database
      .select({
        id: containers.id,
        name: containers.name,
        description: containers.description,
        isItem: containers.isItem,
        childrenCount: sql<number>`(
          SELECT COUNT(*) 
          FROM ${containers} AS children 
          WHERE children.parent_id = ${containers.id}
        )`.as("childrenCount"),
      })
      .from(containers)
      .where(
        and(
          eq(containers.userId, session.user.id),
          isNull(containers.parentId),
          eq(containers.isItem, false)
        )
      );

    // Get tags for each hoard
    const hoardsWithTags = await Promise.all(
      hoards.map(async (hoard) => {
        const hoardTags = await database
          .select({ name: tags.name })
          .from(tags)
          .where(eq(tags.containerId, hoard.id));

        return {
          ...hoard,
          tags: hoardTags.map((t) => t.name),
        };
      })
    );

    return NextResponse.json(hoardsWithTags);
  } catch (error) {
    console.error("Failed to fetch containers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, isItem, parentId, tags: tagsList } = body;

    // Create the container
    const result = await database
      .insert(containers)
      .values({
        name,
        description: description || null,
        isItem: isItem || false,
        userId: session.user.id,
        parentId: parentId || null,
      })
      .returning();
    
    const newContainer = (result as Array<typeof containers.$inferInsert>)[0];

    // Add tags if provided
    if (tagsList && tagsList.length > 0) {
      await database.insert(tags).values(
        tagsList.map((tag: string) => ({
          name: tag,
          containerId: newContainer.id,
        }))
      );
    }

    return NextResponse.json({
      ...newContainer,
      tags: tagsList || [],
      childrenCount: 0,
    });
  } catch (error) {
    console.error("Failed to create container:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}