import { createHash, randomBytes } from "crypto";

/**
 * Generate a cryptographically secure random share token.
 *
 * We use Node's crypto.randomBytes which reads from the OS CSPRNG.
 * 32 bytes → 256 bits of entropy → base64url encoded for URL safety.
 *
 * This token is returned to the user in the share URL (raw form).
 * We NEVER store the raw token in the database.
 */
export function generateShareToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Generate a human-readable, cryptographically secure access key.
 *
 * Format: XXXX-XXXX-XXXX (e.g., "P7K9-X2M8-Q4RT")
 * Uses only uppercase alphanumeric characters for readability.
 * 12 random characters from a 36-char alphabet → ~62 bits of entropy.
 *
 * This key is shown to the note owner exactly once.
 * We NEVER store the raw key – only a bcrypt hash.
 */
export function generateAccessKey(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1 for readability
  const bytes = randomBytes(12);
  const chars = Array.from(bytes).map((b) => alphabet[b % alphabet.length]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8, 12).join("")}`;
}

/**
 * Hash the raw share token using SHA-256 for database storage.
 *
 * Why SHA-256 here (not bcrypt)?
 *  - The token is 256-bit random → no need for slow hashing (unlike passwords)
 *  - We need fast lookup by token hash on every share access
 *  - bcrypt is intentionally slow and would add latency to every page load
 *
 * The raw token is never stored in the DB, so even if the DB leaks,
 * an attacker must brute-force 256-bit random tokens – computationally infeasible.
 */
export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
