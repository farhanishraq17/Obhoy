/**
 * ID generator & cryptographic hash simulator for Obhoy Protocol
 */

export function generateId(prefix: string): string {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${randomNum}`;
}

/**
 * Deterministic pseudo-random Hash function simulating H(NID || window)
 */
export function computeEventKey(nidCommitment: string, admissionWindow: string): string {
  let hash = 0;
  const str = `${nidCommitment}::${admissionWindow}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `0x${hex}f92a4b88e17c32910d65421a88b`;
}

export function computeNIDCommitment(nid: string): string {
  let hash = 0;
  const salt = 'OBHOY_GLOBAL_SALT_2026';
  const str = `${nid}::${salt}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `COMMIT-${hex.toUpperCase()}`;
}

export function computeMerkleRoot(entries: string[]): string {
  const combined = entries.join('::');
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(12, '0');
  return `0x${hex}992a71bc4ef8109`;
}
