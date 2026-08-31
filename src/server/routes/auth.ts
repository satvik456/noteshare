import { Hono } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../utils/password";
import { createSession, verifyToken, COOKIE_NAME } from "../utils/auth";
import { registerSchema, loginSchema } from "../utils/validation";

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

export default authRoutes;
