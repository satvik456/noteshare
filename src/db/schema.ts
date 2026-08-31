import {
  pgTable,
  text,
  timestamp,
  integer,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Enums
export const shareTypeEnum = pgEnum("share_type", ["one_time", "time_based"]);
export const accessTypeEnum = pgEnum("access_type", ["public", "password"]);

// Users table
export const users = pgTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email)]
);

// Notes table
export const notes = pgTable(
  "notes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("notes_user_id_idx").on(table.userId)]
);

// Share links table
export const shareLinks = pgTable(
  "share_links",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    noteId: text("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    // We store the hash of the token for lookup, never the raw token
    tokenHash: text("token_hash").notNull(),
    shareType: shareTypeEnum("share_type").notNull(),
    accessType: accessTypeEnum("access_type").notNull(),
    // Bcrypt hash of the access key (only for password-protected shares)
    accessKeyHash: text("access_key_hash"),
    // Expiry for time-based shares (and optional hard-cap for one-time shares)
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    // Set when first successfully consumed (one-time shares)
    usedAt: timestamp("used_at", { withTimezone: true }),
    // Set when owner revokes the share
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    // Atomic counter – only incremented on successful access
    viewCount: integer("view_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Primary lookup index – every share access hashes the token and looks up here
    uniqueIndex("share_links_token_hash_idx").on(table.tokenHash),
    index("share_links_note_id_idx").on(table.noteId),
  ]
);

// Rate limiting table for brute-force protection on password-protected shares
export const rateLimitAttempts = pgTable(
  "rate_limit_attempts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // Composite key: shareLinkId + IP for tracking per-share-per-IP attempts
    shareLinkId: text("share_link_id").notNull(),
    ipAddress: text("ip_address").notNull(),
    failedAttempts: integer("failed_attempts").notNull().default(0),
    blockedUntil: timestamp("blocked_until", { withTimezone: true }),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("rate_limit_share_ip_idx").on(table.shareLinkId, table.ipAddress),
  ]
);

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type ShareLink = typeof shareLinks.$inferSelect;
export type NewShareLink = typeof shareLinks.$inferInsert;
export type RateLimitAttempt = typeof rateLimitAttempts.$inferSelect;
