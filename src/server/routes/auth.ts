import { Hono } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import { db } from "@/db";
import { users, passwordResetTokens } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../utils/password";
import { createSession, verifyToken, COOKIE_NAME } from "../utils/auth";
import { registerSchema, loginSchema } from "../utils/validation";
import { generateShareToken, hashToken } from "../utils/token";

const authRoutes = new Hono();

// POST /api/auth/register
authRoutes.post("/register", async (c) => {
  try {
    const body = await c.req.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        400
      );
    }

    const { name, email, password, confirmPassword } = result.data;

    if (password !== confirmPassword) {
      return c.json({ error: "Passwords do not match" }, 400);
    }

    // Check for duplicate email
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      return c.json({ error: "An account with this email already exists" }, 409);
    }

    const passwordHash = await hashPassword(password);

    const [user] = await db
      .insert(users)
      .values({
        name,
        email: email.toLowerCase(),
        passwordHash,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
      });

    const token = await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    setCookie(c, COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return c.json({
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Register error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// POST /api/auth/login
authRoutes.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        400
      );
    }

    const { email, password } = result.data;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      // Generic message to prevent user enumeration
      return c.json({ error: "Invalid email or password" }, 401);
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return c.json({ error: "Invalid email or password" }, 401);
    }

    const token = await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    setCookie(c, COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return c.json({
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Login error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// POST /api/auth/logout
authRoutes.post("/logout", (c) => {
  deleteCookie(c, COOKIE_NAME, { path: "/" });
  return c.json({ success: true });
});

// GET /api/auth/me
authRoutes.get("/me", async (c) => {
  try {
    const cookieHeader = c.req.header("cookie") ?? "";
    const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
    const token = match?.[1];

    if (!token) {
      return c.json({ user: null }, 200);
    }

    const session = await verifyToken(token);
    if (!session) {
      return c.json({ user: null }, 200);
    }

    return c.json({
      user: {
        id: session.userId,
        name: session.name,
        email: session.email,
      },
    });
  } catch (err) {
    console.error("Me error:", err);
    return c.json({ user: null }, 200);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password — request a secure password reset link
// ──────────────────────────────────────────────────────────────────────────────
authRoutes.post("/forgot-password", async (c) => {
  try {
    const body = await c.req.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return c.json({ error: "Please enter a valid email address." }, 400);
    }

    const [user] = await db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // If user does not exist, return generic success message to prevent user enumeration
    if (!user) {
      return c.json({
        success: true,
        message: "If an account exists with this email address, a password reset link has been generated.",
        resetUrl: null,
      });
    }

    // Invalidate previous unused reset tokens for this user
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(passwordResetTokens.userId, user.id),
          isNull(passwordResetTokens.usedAt)
        )
      );

    // Generate cryptographic token
    const rawToken = generateShareToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    // Detect base URL
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

    const resetUrl = `${baseAppUrl}/reset-password?token=${rawToken}`;

    return c.json({
      success: true,
      message: "Password reset link generated successfully.",
      resetUrl,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/auth/verify-reset-token — check if a reset token is valid before showing form
// ──────────────────────────────────────────────────────────────────────────────
authRoutes.get("/verify-reset-token", async (c) => {
  try {
    const rawToken = c.req.query("token");
    if (!rawToken) {
      return c.json({ valid: false, error: "invalid", message: "Missing reset token." }, 400);
    }

    const tokenHash = hashToken(rawToken);

    const [record] = await db
      .select({
        id: passwordResetTokens.id,
        expiresAt: passwordResetTokens.expiresAt,
        usedAt: passwordResetTokens.usedAt,
        userId: passwordResetTokens.userId,
        email: users.email,
        name: users.name,
      })
      .from(passwordResetTokens)
      .innerJoin(users, eq(passwordResetTokens.userId, users.id))
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
      .limit(1);

    if (!record) {
      return c.json({ valid: false, error: "invalid", message: "Invalid password reset link." }, 404);
    }

    if (record.usedAt) {
      return c.json(
        { valid: false, error: "used", message: "This password reset link has already been used." },
        410
      );
    }

    if (record.expiresAt < new Date()) {
      return c.json(
        { valid: false, error: "expired", message: "This password reset link has expired (valid for 1 hour)." },
        410
      );
    }

    return c.json({
      valid: true,
      email: record.email,
      name: record.name,
      expiresAt: record.expiresAt,
    });
  } catch (err) {
    console.error("Verify reset token error:", err);
    return c.json({ valid: false, error: "server_error", message: "Internal server error" }, 500);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/auth/reset-password — perform password update with validated token
// ──────────────────────────────────────────────────────────────────────────────
authRoutes.post("/reset-password", async (c) => {
  try {
    const body = await c.req.json();
    const { token: rawToken, password, confirmPassword } = body ?? {};

    if (!rawToken || typeof rawToken !== "string") {
      return c.json({ error: "Missing reset token." }, 400);
    }

    if (!password || typeof password !== "string") {
      return c.json({ error: "Password is required." }, 400);
    }

    if (password.length < 8) {
      return c.json({ error: "Password must be at least 8 characters long." }, 400);
    }

    if (!/[A-Z]/.test(password)) {
      return c.json({ error: "Password must contain at least one uppercase letter." }, 400);
    }

    if (!/[0-9]/.test(password)) {
      return c.json({ error: "Password must contain at least one number." }, 400);
    }

    if (password !== confirmPassword) {
      return c.json({ error: "Passwords do not match." }, 400);
    }

    const tokenHash = hashToken(rawToken);

    const [record] = await db
      .select({
        id: passwordResetTokens.id,
        userId: passwordResetTokens.userId,
        expiresAt: passwordResetTokens.expiresAt,
        usedAt: passwordResetTokens.usedAt,
      })
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
      .limit(1);

    if (!record) {
      return c.json({ error: "Invalid password reset link." }, 400);
    }

    if (record.usedAt) {
      return c.json({ error: "This password reset link has already been used." }, 400);
    }

    if (record.expiresAt < new Date()) {
      return c.json({ error: "This password reset link has expired." }, 400);
    }

    // Hash new password with bcrypt
    const newPasswordHash = await hashPassword(password);

    // Update user password
    await db
      .update(users)
      .set({
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, record.userId));

    // Mark reset token as used
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, record.id));

    return c.json({
      success: true,
      message: "Your password has been successfully reset. You can now sign in with your new password.",
    });
  } catch (err) {
    console.error("Reset password error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default authRoutes;
