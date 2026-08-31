import { Hono } from "hono";
import type { Context } from "hono";
import { db } from "@/db";
import { notes, shareLinks, rateLimitAttempts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { hashToken } from "../utils/token";
import { verifyPassword } from "../utils/password";
import { verifyToken, COOKIE_NAME } from "../utils/auth";
import { pool } from "@/db";

const sharesRoutes = new Hono();

// ──────────────────────────────────────────────────────────────────────────────
// Rate limiting constants
// NOTE: For a POC, rate limiting state lives in PostgreSQL.
// In production, use Redis for distributed rate limiting across multiple instances.
// ──────────────────────────────────────────────────────────────────────────────
const MAX_FAILED_ATTEMPTS = 5;
const BLOCK_DURATION_MINUTES = 15;

async function requireAuth(c: Context) {
  const cookieHeader = c.req.header("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  const token = match?.[1];
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Get IP address from request headers.
 */
function getClientIp(c: Context): string {
  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    c.req.header("x-real-ip") ??
    "unknown"
  );
}

/**
 * Check if the IP is rate-limited for a given share link.
 * Returns true if blocked.
 */
async function isRateLimited(
  shareLinkId: string,
  ipAddress: string
): Promise<boolean> {
  const [record] = await db
    .select()
    .from(rateLimitAttempts)
    .where(
      and(
        eq(rateLimitAttempts.shareLinkId, shareLinkId),
        eq(rateLimitAttempts.ipAddress, ipAddress)
      )
    )
    .limit(1);

  if (!record) return false;

  // Check if currently blocked
  if (record.blockedUntil && record.blockedUntil > new Date()) {
    return true;
  }

  // Reset block if it has expired but keep attempt count logic
  return false;
}

/**
 * Record a failed attempt and possibly block the IP.
 */
async function recordFailedAttempt(
  shareLinkId: string,
  ipAddress: string
): Promise<void> {
  const [existing] = await db
    .select()
    .from(rateLimitAttempts)
    .where(
      and(
        eq(rateLimitAttempts.shareLinkId, shareLinkId),
        eq(rateLimitAttempts.ipAddress, ipAddress)
      )
    )
    .limit(1);

  const now = new Date();

  if (!existing) {
    await db.insert(rateLimitAttempts).values({
      shareLinkId,
      ipAddress,
      failedAttempts: 1,
      lastAttemptAt: now,
    });
    return;
  }

  const newAttempts = existing.failedAttempts + 1;
  const shouldBlock = newAttempts >= MAX_FAILED_ATTEMPTS;
  const blockedUntil = shouldBlock
    ? new Date(now.getTime() + BLOCK_DURATION_MINUTES * 60 * 1000)
    : existing.blockedUntil;

  await db
    .update(rateLimitAttempts)
    .set({
      failedAttempts: newAttempts,
      blockedUntil: blockedUntil ?? undefined,
      lastAttemptAt: now,
    })
    .where(eq(rateLimitAttempts.id, existing.id));
}

/**
 * Reset the rate limit counter after a successful unlock.
 */
async function resetRateLimit(
  shareLinkId: string,
  ipAddress: string
): Promise<void> {
  await db
    .delete(rateLimitAttempts)
    .where(
      and(
        eq(rateLimitAttempts.shareLinkId, shareLinkId),
        eq(rateLimitAttempts.ipAddress, ipAddress)
      )
    );
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/share/:token — check share status without consuming it
// ──────────────────────────────────────────────────────────────────────────────
sharesRoutes.get("/:token", async (c) => {
  try {
    const rawToken = c.req.param("token");
    const tokenHash = hashToken(rawToken);

    const [share] = await db
      .select()
      .from(shareLinks)
      .where(eq(shareLinks.tokenHash, tokenHash))
      .limit(1);

    if (!share) {
      return c.json({ error: "invalid", message: "Invalid share link." }, 404);
    }

    if (share.revokedAt) {
      return c.json({ error: "revoked", message: "This share link has been revoked." }, 410);
    }

    const now = new Date();
    if (share.expiresAt && share.expiresAt < now) {
      return c.json({ error: "expired", message: "This share link has expired." }, 410);
    }

    if (share.shareType === "one_time" && share.usedAt) {
      return c.json(
        { error: "used", message: "This one-time share link has already been used." },
        410
      );
    }

    // Return metadata so the frontend knows what to render
    return c.json({
      shareId: share.id,
      shareType: share.shareType,
      accessType: share.accessType,
      expiresAt: share.expiresAt,
      // Never return note content or access key hash at this stage
    });
  } catch (err) {
    console.error("Get share error:", err);
    return c.json({ error: "server_error", message: "Internal server error" }, 500);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/share/:token/access — access a public share link
// This is where the atomic one-time consumption happens.
// ──────────────────────────────────────────────────────────────────────────────
sharesRoutes.post("/:token/access", async (c) => {
  try {
    const rawToken = c.req.param("token");
    const tokenHash = hashToken(rawToken);

    // First, get the share to check access type
    const [share] = await db
      .select()
      .from(shareLinks)
      .where(eq(shareLinks.tokenHash, tokenHash))
      .limit(1);

    if (!share) {
      return c.json({ error: "invalid", message: "Invalid share link." }, 404);
    }

    if (share.accessType !== "public") {
      return c.json(
        { error: "forbidden", message: "This share requires an access key." },
        403
      );
    }

    if (share.revokedAt) {
      return c.json({ error: "revoked", message: "This share link has been revoked." }, 410);
    }

    if (share.shareType === "one_time") {
      // ────────────────────────────────────────────────────────────────────────
      // CRITICAL: Atomic one-time consumption using conditional UPDATE.
      //
      // Problem: If we first SELECT then UPDATE, two concurrent requests can
      // both read usedAt=null and both proceed to show the note.
      //
      // Solution: Use a single atomic conditional UPDATE ... RETURNING.
      // PostgreSQL guarantees that only ONE transaction can successfully set
      // used_at when it was previously NULL. The second transaction sees no
      // rows returned and knows it lost the race.
      //
      // This is NOT vulnerable to TOCTOU (time-of-check/time-of-use) because
      // the check and the update are a single atomic database operation.
      // ────────────────────────────────────────────────────────────────────────
      const result = await pool.query<{ id: string }>(
        `UPDATE share_links
         SET used_at = NOW(),
             view_count = view_count + 1
         WHERE id = $1
           AND used_at IS NULL
           AND revoked_at IS NULL
           AND (expires_at IS NULL OR expires_at > NOW())
         RETURNING id`,
        [share.id]
      );

      if (result.rowCount === 0) {
        // Another request won the race, or the share is expired/revoked
        const [freshShare] = await db
          .select()
          .from(shareLinks)
          .where(eq(shareLinks.id, share.id))
          .limit(1);

        if (freshShare?.usedAt) {
          return c.json(
            { error: "used", message: "This one-time share link has already been used." },
            410
          );
        }
        if (freshShare?.revokedAt) {
          return c.json({ error: "revoked", message: "This share link has been revoked." }, 410);
        }
        if (freshShare?.expiresAt && freshShare.expiresAt < new Date()) {
          return c.json({ error: "expired", message: "This share link has expired." }, 410);
        }
        return c.json({ error: "invalid", message: "Unable to access share link." }, 410);
      }

      // Fetch the note content
      const [note] = await db
        .select()
        .from(notes)
        .where(eq(notes.id, share.noteId))
        .limit(1);

      return c.json({
        success: true,
        note: { title: note.title, content: note.content, createdAt: note.createdAt },
        viewCount: share.viewCount + 1,
      });
    }

    // Time-based share: check expiry then increment view count atomically
    const now = new Date();
    if (share.expiresAt && share.expiresAt < now) {
      return c.json({ error: "expired", message: "This share link has expired." }, 410);
    }

    // Atomic view count increment – never do read/increment/write at app level
    await pool.query(
      `UPDATE share_links SET view_count = view_count + 1 WHERE id = $1`,
      [share.id]
    );

    const [note] = await db
      .select()
      .from(notes)
      .where(eq(notes.id, share.noteId))
      .limit(1);

    return c.json({
      success: true,
      note: { title: note.title, content: note.content, createdAt: note.createdAt },
      viewCount: share.viewCount + 1,
    });
  } catch (err) {
    console.error("Access share error:", err);
    return c.json({ error: "server_error", message: "Internal server error" }, 500);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/share/:token/unlock — unlock a password-protected share
// ──────────────────────────────────────────────────────────────────────────────
sharesRoutes.post("/:token/unlock", async (c) => {
  try {
    const rawToken = c.req.param("token");
    const tokenHash = hashToken(rawToken);
    const ip = getClientIp(c);

    const [share] = await db
      .select()
      .from(shareLinks)
      .where(eq(shareLinks.tokenHash, tokenHash))
      .limit(1);

    if (!share) {
      return c.json({ error: "invalid", message: "Invalid share link." }, 404);
    }

    if (share.accessType !== "password") {
      return c.json({ error: "forbidden", message: "This share is not password protected." }, 403);
    }

    // Check revocation and expiry BEFORE rate limiting check
    // (don't waste rate limit slots on already-invalid links)
    if (share.revokedAt) {
      return c.json({ error: "revoked", message: "This share link has been revoked." }, 410);
    }

    const now = new Date();
    if (share.expiresAt && share.expiresAt < now) {
      return c.json({ error: "expired", message: "This share link has expired." }, 410);
    }

    if (share.shareType === "one_time" && share.usedAt) {
      return c.json(
        { error: "used", message: "This one-time share link has already been used." },
        410
      );
    }

    // ── Rate limiting check ──
    const blocked = await isRateLimited(share.id, ip);
    if (blocked) {
      return c.json(
        {
          error: "rate_limited",
          message: `Too many failed attempts. Please try again in ${BLOCK_DURATION_MINUTES} minutes.`,
        },
        429
      );
    }

    // Parse request body
    const body = await c.req.json();
    const accessKey = typeof body?.accessKey === "string" ? body.accessKey.trim() : "";

    if (!accessKey) {
      return c.json({ error: "validation", message: "Access key is required." }, 400);
    }

    if (!share.accessKeyHash) {
      return c.json({ error: "server_error", message: "Share configuration error." }, 500);
    }

    // Verify the access key against the stored hash
    const keyValid = await verifyPassword(accessKey, share.accessKeyHash);

    if (!keyValid) {
      // Wrong password: do NOT increment view count, do NOT consume one-time link
      await recordFailedAttempt(share.id, ip);
      return c.json({ error: "invalid_key", message: "Invalid access key." }, 401);
    }

    // ── Correct key ──
    // Reset rate limiter on successful unlock
    await resetRateLimit(share.id, ip);

    if (share.shareType === "one_time") {
      // Atomic one-time consumption (same strategy as public access above)
      const result = await pool.query<{ id: string }>(
        `UPDATE share_links
         SET used_at = NOW(),
             view_count = view_count + 1
         WHERE id = $1
           AND used_at IS NULL
           AND revoked_at IS NULL
           AND (expires_at IS NULL OR expires_at > NOW())
         RETURNING id`,
        [share.id]
      );

      if (result.rowCount === 0) {
        const [freshShare] = await db
          .select()
          .from(shareLinks)
          .where(eq(shareLinks.id, share.id))
          .limit(1);

        if (freshShare?.usedAt) {
          return c.json(
            { error: "used", message: "This one-time share link has already been used." },
            410
          );
        }
        return c.json({ error: "invalid", message: "Unable to access share link." }, 410);
      }

      const [note] = await db
        .select()
        .from(notes)
        .where(eq(notes.id, share.noteId))
        .limit(1);

      return c.json({
        success: true,
        note: { title: note.title, content: note.content, createdAt: note.createdAt },
        viewCount: share.viewCount + 1,
      });
    }

    // Time-based: just increment view count atomically
    await pool.query(
      `UPDATE share_links SET view_count = view_count + 1 WHERE id = $1`,
      [share.id]
    );

    const [note] = await db
      .select()
      .from(notes)
      .where(eq(notes.id, share.noteId))
      .limit(1);

    return c.json({
      success: true,
      note: { title: note.title, content: note.content, createdAt: note.createdAt },
      viewCount: share.viewCount + 1,
    });
  } catch (err) {
    console.error("Unlock share error:", err);
    return c.json({ error: "server_error", message: "Internal server error" }, 500);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/share/:token/revoke — revoke a share (owner only)
// ──────────────────────────────────────────────────────────────────────────────
sharesRoutes.post("/:token/revoke", async (c) => {
  try {
    const session = await requireAuth(c);
    if (!session) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const rawToken = c.req.param("token");
    const tokenHash = hashToken(rawToken);

    const [share] = await db
      .select()
      .from(shareLinks)
      .where(eq(shareLinks.tokenHash, tokenHash))
      .limit(1);

    if (!share) {
      return c.json({ error: "Not found" }, 404);
    }

    // Verify ownership: the share's note must belong to the authenticated user
    const [note] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, share.noteId), eq(notes.userId, session.userId)))
      .limit(1);

    if (!note) {
      return c.json({ error: "Forbidden" }, 403);
    }

    if (share.revokedAt) {
      return c.json({ error: "Already revoked" }, 400);
    }

    await db
      .update(shareLinks)
      .set({ revokedAt: new Date() })
      .where(eq(shareLinks.id, share.id));

    return c.json({ success: true, message: "Share link revoked successfully." });
  } catch (err) {
    console.error("Revoke share error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/notes/:noteId/share — revoke by note ID (from owner page)
// ──────────────────────────────────────────────────────────────────────────────
sharesRoutes.post("/by-note/:noteId/revoke", async (c) => {
  try {
    const session = await requireAuth(c);
    if (!session) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const noteId = c.req.param("noteId");

    // Verify ownership
    const [note] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, noteId), eq(notes.userId, session.userId)))
      .limit(1);

    if (!note) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const [share] = await db
      .select()
      .from(shareLinks)
      .where(eq(shareLinks.noteId, noteId))
      .limit(1);

    if (!share) {
      return c.json({ error: "No share link found" }, 404);
    }

    if (share.revokedAt) {
      return c.json({ error: "Already revoked" }, 400);
    }

    await db
      .update(shareLinks)
      .set({ revokedAt: new Date() })
      .where(eq(shareLinks.id, share.id));

    return c.json({ success: true, message: "Share link revoked successfully." });
  } catch (err) {
    console.error("Revoke by note error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default sharesRoutes;
