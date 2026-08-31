import { Hono } from "hono";
import type { Context } from "hono";
import { db } from "@/db";
import { notes, shareLinks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyToken, COOKIE_NAME } from "../utils/auth";
import { generateShareToken, generateAccessKey, hashToken } from "../utils/token";
import { hashPassword } from "../utils/password";
import { createNoteSchema } from "../utils/validation";

const notesRoutes = new Hono();

/**
 * Extract and verify session from cookie header.
 */
export async function requireAuth(c: Context) {
  const cookieHeader = c.req.header("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  const token = match?.[1];
  if (!token) return null;
  return verifyToken(token);
}

// POST /api/notes — create a new note with share configuration
notesRoutes.post("/", async (c) => {
  try {
    const session = await requireAuth(c);
    if (!session) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const result = createNoteSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        400
      );
    }

    const { title, content, expiresAt, shareType, accessType } = result.data;

    // Create the note
    const [note] = await db
      .insert(notes)
      .values({
        userId: session.userId,
        title,
        content,
      })
      .returning();

    // Generate a cryptographically secure random token
    const rawToken = generateShareToken();
    const tokenHash = hashToken(rawToken);

    // Generate access key if password-protected
    let rawAccessKey: string | null = null;
    let accessKeyHash: string | null = null;

    if (accessType === "password") {
      rawAccessKey = generateAccessKey();
      accessKeyHash = await hashPassword(rawAccessKey);
    }

    // Create the share link record
    const [shareLink] = await db
      .insert(shareLinks)
      .values({
        noteId: note.id,
        tokenHash,
        shareType,
        accessType,
        accessKeyHash,
        expiresAt: new Date(expiresAt),
      })
      .returning();

    // Extract base URL reliably:
    // 1. If APP_URL is configured (and not localhost), use it (stripping trailing slashes).
    // 2. Otherwise, detect dynamically from request headers (x-forwarded-host / host / origin).
    const originHeader = c.req.header("origin");
    const protoHeader = c.req.header("x-forwarded-proto") ?? "https";
    const hostHeader = c.req.header("x-forwarded-host") ?? c.req.header("host");
    const detectedOrigin = originHeader || (hostHeader ? `${protoHeader}://${hostHeader}` : null);

    let baseAppUrl = process.env.APP_URL ? process.env.APP_URL.trim().replace(/\/+$/, "") : "";
    if (!baseAppUrl || baseAppUrl.includes("localhost")) {
      if (detectedOrigin && !detectedOrigin.includes("localhost")) {
        baseAppUrl = detectedOrigin.replace(/\/+$/, "");
      } else if (!baseAppUrl) {
        baseAppUrl = "http://localhost:3000";
      }
    }

    const shareUrl = `${baseAppUrl}/share/${rawToken}`;

    return c.json({
      note: {
        id: note.id,
        title: note.title,
        createdAt: note.createdAt,
      },
      share: {
        id: shareLink.id,
        shareType: shareLink.shareType,
        accessType: shareLink.accessType,
        expiresAt: shareLink.expiresAt,
        shareUrl,
        // Only return the raw access key once – never stored in plaintext
        accessKey: rawAccessKey,
      },
    });
  } catch (err) {
    console.error("Create note error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// GET /api/notes/:id — get note details (owner only)
notesRoutes.get("/:id", async (c) => {
  try {
    const session = await requireAuth(c);
    if (!session) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const noteId = c.req.param("id");

    const [note] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, noteId), eq(notes.userId, session.userId)))
      .limit(1);

    if (!note) {
      return c.json({ error: "Note not found" }, 404);
    }

    // Get the share link for this note
    const [share] = await db
      .select()
      .from(shareLinks)
      .where(eq(shareLinks.noteId, noteId))
      .orderBy(shareLinks.createdAt)
      .limit(1);

    return c.json({
      note: {
        id: note.id,
        title: note.title,
        content: note.content,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      },
      share: share
        ? {
            id: share.id,
            shareType: share.shareType,
            accessType: share.accessType,
            expiresAt: share.expiresAt,
            usedAt: share.usedAt,
            revokedAt: share.revokedAt,
            viewCount: share.viewCount,
          }
        : null,
    });
  } catch (err) {
    console.error("Get note error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// GET /api/notes — list all notes for authenticated user with share status
notesRoutes.get("/", async (c) => {
  try {
    const session = await requireAuth(c);
    if (!session) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userNotes = await db
      .select({
        id: notes.id,
        title: notes.title,
        createdAt: notes.createdAt,
        shareId: shareLinks.id,
        shareType: shareLinks.shareType,
        accessType: shareLinks.accessType,
        expiresAt: shareLinks.expiresAt,
        usedAt: shareLinks.usedAt,
        revokedAt: shareLinks.revokedAt,
        viewCount: shareLinks.viewCount,
      })
      .from(notes)
      .leftJoin(shareLinks, eq(notes.id, shareLinks.noteId))
      .where(eq(notes.userId, session.userId))
      .orderBy(notes.createdAt);

    return c.json({ notes: userNotes });
  } catch (err) {
    console.error("List notes error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default notesRoutes;

