# NoteShare — Secure Note-Taking & Expiring Share Links

## Overview

NoteShare is a full-stack web application that allows authenticated users to create private notes and share them via cryptographically secure, expiring links. Each share link supports configurable access controls (public or password-protected) and lifetime controls (one-time or time-based access).

This project is a technical POC demonstrating production-quality security patterns including atomic database operations, bcrypt hashing, cryptographically secure token generation, brute-force protection, and race-condition-safe one-time link consumption.

---

## Features

- **Authentication** — Register, login, logout with JWT sessions stored in HTTP-only cookies
- **Note Creation** — Private notes with title and content stored in PostgreSQL
- **Secure Share Links** — Cryptographically secure random tokens (256-bit entropy); raw token never stored
- **One-Time Access** — Atomically consumed via a single conditional `UPDATE ... RETURNING` — immune to race conditions
- **Time-Based Access** — Configurable expiry date/time validated server-side
- **Public Share** — Anyone with the link can view (no password required)
- **Password-Protected Share** — Randomly generated access key, bcrypt-hashed before storage; shown to owner only once
- **Share Revocation** — Owners can instantly invalidate any active share link
- **Accurate View Counting** — Only successful accesses increment the counter; wrong passwords, expired/revoked/used links do not count
- **Brute-Force Protection** — Rate limiting per (share × IP) with configurable block duration
- **Authorization** — Server-side ownership checks on all note/share management endpoints
- **Responsive UI** — Works on desktop, tablet, and mobile

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Backend API | Hono.js (integrated with Next.js via `hono/vercel`) |
| ORM | Drizzle ORM |
| Database | PostgreSQL |
| Auth | JWT via `jose` library, HTTP-only cookies |
| Password Hashing | `bcryptjs` (12 salt rounds) |
| Token Generation | Node.js `crypto.randomBytes` (CSPRNG) |

---

## Project Structure

```
src/
├── app/                        # Next.js App Router pages
│   ├── api/[[...route]]/       # Hono catch-all API handler
│   ├── login/                  # Login page
│   ├── register/               # Registration page
│   ├── dashboard/              # User's note list
│   ├── notes/
│   │   ├── new/                # Create note form
│   │   └── [id]/               # Note detail & share management
│   └── share/[token]/          # Public share access page
├── server/                     # Hono backend (business logic)
│   ├── app.ts                  # Hono app instance
│   ├── routes/
│   │   ├── auth.ts             # Register / Login / Logout / Me
│   │   ├── notes.ts            # Note CRUD (authenticated)
│   │   └── shares.ts           # Share access, unlock, revoke
│   └── utils/
│       ├── auth.ts             # JWT session helpers
│       ├── token.ts            # Token/key generation and hashing
│       ├── password.ts         # bcrypt helpers
│       └── validation.ts       # Zod schemas
├── db/
│   ├── index.ts                # Drizzle + pg Pool setup
│   └── schema.ts               # Table definitions
├── lib/
│   ├── auth-context.tsx         # React auth context (client)
│   └/utils.ts                  # cn() utility
└── components/
    ├── Navbar.tsx
    └── ui/                     # shadcn/ui-compatible components
```

---

## Setup Instructions

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or pnpm

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/note-share-app.git
cd note-share-app
```

### 2. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:

```
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/note_share_db
AUTH_SECRET=your-long-random-secret-at-least-32-characters
APP_URL=http://localhost:3000
```

> ⚠️ **Never commit `.env` to version control.** It is listed in `.gitignore`.

### 4. Set Up PostgreSQL

```bash
createdb note_share_db
```

### 5. Run Migrations

This project uses Drizzle ORM. Push the schema to PostgreSQL:

```bash
npx drizzle-kit push
```

This creates the following tables:
- `users` — registered accounts
- `notes` — private notes
- `share_links` — share link configurations
- `rate_limit_attempts` — brute-force protection records

### 6. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 7. Production Build

```bash
npm run build
npm run start
```

---

## API Endpoints

### Authentication

```
POST /api/auth/register    — Create account
POST /api/auth/login       — Sign in
POST /api/auth/logout      — Sign out
GET  /api/auth/me          — Current session
```

### Notes (requires authentication)

```
POST /api/notes            — Create note + share link
GET  /api/notes            — List my notes
GET  /api/notes/:id        — Get note details (owner only)
```

### Shares (public)

```
GET  /api/share/:token              — Check share metadata
POST /api/share/:token/access       — Access a public share
POST /api/share/:token/unlock       — Unlock with access key
POST /api/share/:token/revoke       — Revoke (owner only)
POST /api/share/by-note/:id/revoke  — Revoke by note ID (owner only)
```

---

## Security Design

### Password Security

- Passwords hashed with `bcryptjs` using **12 salt rounds**
- Never stored or logged as plaintext
- Generic error messages prevent user enumeration (`"Invalid email or password"`)

### Share Token Security

```
User creates note
    ↓
crypto.randomBytes(32) → 256-bit CSPRNG token
    ↓
Raw token → base64url encoded → returned in share URL
    ↓
SHA-256(raw token) → token_hash stored in PostgreSQL
    ↓
On access: SHA-256(incoming token) → lookup by token_hash
```

**Why SHA-256 here, not bcrypt?**
- The token has 256 bits of entropy — brute-force is computationally infeasible even with SHA-256
- bcrypt is intentionally slow — would add 100-300ms to every share page load
- bcrypt is designed for low-entropy passwords; SHA-256 is appropriate for high-entropy random tokens

### Access Key Security

```
crypto.randomBytes(12) → 12 random bytes
    ↓
Mapped to 12 chars from unambiguous alphabet (no I, O, 0, 1)
    ↓
Formatted: XXXX-XXXX-XXXX
    ↓
bcrypt(key, 12 rounds) → stored as access_key_hash
    ↓
Raw key shown to owner ONCE — never stored
```

### Authentication

- JWT signed with HS256 using `AUTH_SECRET`
- Stored in **HTTP-only** cookie (`SameSite=Lax`, `Secure` in production)
- 7-day expiry
- All protected endpoints verify the JWT on every request

---

## Share Link Flow

```
Create Note
    ↓
Create Share Configuration (shareType, accessType, expiresAt)
    ↓
crypto.randomBytes(32) → rawToken
    ↓
SHA-256(rawToken) → tokenHash stored in DB
    ↓
If password: generate accessKey → bcrypt(accessKey) → accessKeyHash stored in DB
    ↓
Return rawToken in URL → show accessKey to owner once
    ↓
Receiver opens /share/<rawToken>
    ↓
Server: SHA-256(rawToken) → lookup share by tokenHash
    ↓
Check: revoked? expired? one-time already used?
    ↓
Check accessType: public or password?
    ↓
If password: verify submitted key against accessKeyHash
    ↓
Atomic operation: consume one-time OR increment view_count
    ↓
Return note content
```

---

## One-Time Race Condition Handling

This is the most critical security feature.

### The Problem

If two users open the same one-time link simultaneously:

```
User A ──┐
         ├── GET /share/token (both see usedAt = NULL)
User B ──┘
         ↓
User A: set usedAt = NOW() → shows note ✓
User B: set usedAt = NOW() (too late!) → shows note ✗ (race condition!)
```

A naive read-then-update approach allows both users to see the note.

### Our Solution

We use a **single atomic conditional UPDATE ... RETURNING** in PostgreSQL:

```sql
UPDATE share_links
SET used_at = NOW(),
    view_count = view_count + 1
WHERE id = $1
  AND used_at IS NULL        -- only if not yet consumed
  AND revoked_at IS NULL     -- only if not revoked
  AND (expires_at IS NULL OR expires_at > NOW())  -- only if not expired
RETURNING id;
```

**Why this works:**
- PostgreSQL row-level locking ensures only ONE transaction can successfully update a row and get a `RETURNING` result
- If `rowCount === 0`: this request lost the race (or the share was already invalid) → reject
- If `rowCount === 1`: this request won → return note content
- The check and update happen in a single atomic operation — there is no window for a race condition

```
User A ──┐
         ├── Both reach the UPDATE simultaneously
User B ──┘
         ↓
PostgreSQL row-lock serializes them:
  User A gets RETURNING id → Winner → note returned + view counted
  User B gets rowCount=0  → Loser  → "Already used" error
```

---

## View Count Correctness

### What Counts

| Event | View Count |
|-------|-----------|
| Successful public access | +1 |
| Successful password unlock | +1 |
| Wrong access key | +0 |
| Invalid token | +0 |
| Expired link | +0 |
| Revoked link | +0 |
| Already-used one-time link | +0 |

### Why Atomic Increment

We never do this at the application level:

```js
// ❌ WRONG — lost update under concurrency
const share = await db.select()...
const newCount = share.viewCount + 1;
await db.update()...set({ viewCount: newCount })
```

Instead, the database does the increment atomically:

```sql
-- ✓ CORRECT — single atomic operation
UPDATE share_links SET view_count = view_count + 1 WHERE id = $1;
```

For one-time shares, the view count increment is combined with the `used_at` update in the same atomic statement, ensuring exactly-once counting.

---

## Expiry Logic

- Expiry is stored as a `TIMESTAMP WITH TIME ZONE` in PostgreSQL
- All expiry checks use **database/server time** (`NOW()`)
- The browser clock is never trusted
- Expiry is enforced in:
  1. The `GET /api/share/:token` metadata check
  2. The atomic `UPDATE ... WHERE expires_at > NOW()` for one-time links
  3. Explicit check before time-based link access

---

## Revoke Logic

```
Owner clicks "Revoke Share Link"
    ↓
Server verifies JWT session
    ↓
Server verifies note.user_id = session.userId
    ↓
UPDATE share_links SET revoked_at = NOW() WHERE id = $1
    ↓
All subsequent requests check revoked_at IS NULL → return "Revoked" error
```

Revocation is **immediate** — there is no caching that would allow a revoked link to remain valid.

---

## Brute-Force Protection

Password-protected share links are vulnerable to brute-force access key guessing.

### Protection Strategy

- Tracks failed attempts per `(share_link_id, ip_address)` in `rate_limit_attempts` table
- After **5 consecutive failed attempts**, the IP is blocked for **15 minutes**
- Successful unlock resets the counter
- Wrong passwords do NOT increment view count or consume one-time links

### Limitations

The current implementation uses PostgreSQL for rate limit state. In production with multiple server instances, use **Redis** for distributed rate limiting:

- `rate_limit_attempts` table → Redis `INCR` + `EXPIRE`
- Ensures consistent enforcement across all server instances
- Lower latency than a DB query per attempt

---

## Scaling to 1 Million Users

### Challenge: 1M users opening the same share link simultaneously

### Solutions

1. **Horizontal Scaling**: Run multiple Next.js/Hono instances behind a load balancer (Nginx, AWS ALB). Stateless JWT auth allows any instance to handle any request.

2. **Database Connection Pooling**: Use `pg` pool (already implemented) or PgBouncer in front of PostgreSQL to handle many concurrent connections without exhausting DB connections.

3. **Read-Heavy Caching**: For time-based public share links (not one-time!), cache the share metadata (not the note content) in Redis with a short TTL. This reduces DB load for metadata checks. **One-time links must always hit the database** to maintain strong consistency.

4. **PostgreSQL Indexes**: 
   - `share_links(token_hash)` — unique index for O(log n) token lookup
   - `share_links(note_id)` — for owner queries
   - `notes(user_id)` — for dashboard listing

5. **CDN**: Serve static Next.js assets via CDN (Vercel, CloudFront). Only API calls hit the server.

6. **Rate Limiting**: Move to Redis-based rate limiting (e.g., `ioredis` + sliding window algorithm) for consistency across instances.

7. **Database Monitoring**: Use `pg_stat_statements` to identify slow queries. Add `EXPLAIN ANALYZE` for the atomic UPDATE query if needed.

8. **One-Time Consistency**: Never sacrifice one-time link correctness for performance. The atomic `UPDATE ... WHERE used_at IS NULL ... RETURNING id` must always execute against the primary database replica — **not a read replica**.

---

## Drizzle ORM Migrations

```bash
# Generate migration files (for version-controlled migration history)
npx drizzle-kit generate

# Apply migrations to database
npx drizzle-kit migrate

# Push schema directly (for development, skips migration files)
npx drizzle-kit push

# Inspect current database schema
npx drizzle-kit studio
```

### Schema → PostgreSQL Mapping

| Drizzle | PostgreSQL |
|---------|-----------|
| `text().primaryKey()` | `TEXT PRIMARY KEY` |
| `text().notNull()` | `TEXT NOT NULL` |
| `timestamp({ withTimezone: true })` | `TIMESTAMP WITH TIME ZONE` |
| `integer()` | `INTEGER` |
| `pgEnum()` | `CREATE TYPE ... AS ENUM` |
| `uniqueIndex()` | `CREATE UNIQUE INDEX` |

---

## Running Validations

```bash
npm run lint          # ESLint
npm run typecheck     # TypeScript
npm run build         # Production build
```

---

## Test Accounts

After running the app locally, register at `/register`.

For demo purposes:
- Email: `demo@example.com`
- Password: `Demo1234`

---

## License

MIT
