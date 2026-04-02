/**
 * CellNames — Domain name handling
 *
 * Normalisation, hashing, and cell identification.
 */

/**
 * Normalise a domain name for hashing.
 * - Lowercase
 * - Strip whitespace
 * - Strip trailing dots
 * - Validate format
 *
 * @param {string} name — raw domain input (with or without .ckb suffix)
 * @returns {string} — normalised name (without .ckb)
 * @throws {Error} if name is invalid
 */
export function normaliseDomain(name) {
  let n = name.trim().toLowerCase();

  // Strip .ckb suffix if present
  if (n.endsWith(".ckb")) {
    n = n.slice(0, -4);
  }

  // Strip trailing dots
  while (n.endsWith(".")) {
    n = n.slice(0, -1);
  }

  if (!n) throw new Error("Domain name is empty");
  if (n.length > 253) throw new Error("Domain name exceeds 253 characters");

  // Validate each label
  const labels = n.split(".");
  for (const label of labels) {
    if (label.length === 0) throw new Error("Empty label in domain");
    if (label.length > 63) throw new Error(`Label "${label}" exceeds 63 characters`);
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(label)) {
      throw new Error(`Invalid label "${label}" — must be alphanumeric with optional hyphens`);
    }
  }

  return n;
}

/**
 * Hash a normalised domain name to a 32-byte domain ID.
 * Uses Blake2b-256 (CKB standard).
 *
 * @param {string} normalisedName — output of normaliseDomain()
 * @returns {Uint8Array} — 32 bytes
 */
export async function hashDomain(normalisedName) {
  // Use SubtleCrypto SHA-256 as a fallback until we wire in blake2b
  // TODO: Replace with CKB blake2b (ckb-js-toolkit or @ckb-ccc/core)
  const encoded = new TextEncoder().encode(normalisedName);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return new Uint8Array(hash);
}

/**
 * Format a domain hash as a hex string.
 * @param {Uint8Array} hash
 * @returns {string} — 0x-prefixed hex
 */
export function domainHashHex(hash) {
  return "0x" + Array.from(hash).map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Format a domain for display.
 * @param {string} normalisedName
 * @returns {string} — e.g. "mysite.ckb"
 */
export function displayDomain(normalisedName) {
  return `${normalisedName}.ckb`;
}
