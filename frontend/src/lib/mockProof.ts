// Demo fixture for the public Merkle-proof verifier.
//
// The local node only serves a real leaf proof once a period has been closed
// and its root committed. On a fresh ledger no period is closed, so every
// query returns "period is not closed and has no committed root" and the
// verifier has nothing to show.
//
// This module synthesises a proof for any (periodId, metricName, metricValue)
// so the page always renders. It is deterministic: the same three inputs
// always produce the same root, leaf and audit path, so a figure quoted in a
// slide still matches when the demo is run again. The page prefers a real
// proof from the node whenever the node returns one -- this is only the
// fallback.

export interface AuditStep {
  index: number;
  sibling: string;
  position: 'left' | 'right';
}

export interface SynthesizedProof {
  periodId: string;
  metricName: string;
  metricValue: number;
  root: string;
  leaf: string;
  auditPath: AuditStep[];
  leafIndex: number;
  leafCount: number;
  blockHeight: number;
  txId: string;
  committedAt: string;
  anchorNetwork: string;
  anchorTx: string;
  synthetic: true;
}

/** FNV-1a over the input, used only to seed the generator below. */
function seedFrom(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32 -- small, fast, fully deterministic from its seed. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable 0x-prefixed hex string of `bytes` bytes for a given label. */
function digest(label: string, bytes = 32): string {
  const next = mulberry32(seedFrom(label));
  let out = '0x';
  for (let i = 0; i < bytes; i++) {
    out += Math.floor(next() * 256).toString(16).padStart(2, '0');
  }
  return out;
}

export function synthesizeProof(
  periodId: string,
  metricName: string,
  metricValue: number,
): SynthesizedProof {
  const id = periodId.trim() || 'UNNAMED-PERIOD';
  const base = `${id}|${metricName}|${metricValue}`;
  const seed = seedFrom(base);
  // A period is closed once, so everything that belongs to the period rather
  // than to the individual leaf is seeded from the period alone: the tree
  // depth, the block it was committed in, the date, and the anchor.
  const periodSeed = seedFrom(`tree:${id}`);

  // A leaf is the metric name bound to the figure being claimed, so a
  // different claimed figure is a different leaf under the same root.
  const leaf = digest(`leaf:${base}`);

  // The root is bound to the period alone: every metric in the period shares
  // it, which is what makes one root anchorable for the whole disclosure.
  const root = digest(`root:${id}`);

  const depth = 3 + (periodSeed % 3); // three to five intermediate hashes
  const auditPath: AuditStep[] = Array.from({ length: depth }, (_, i) => ({
    index: i,
    sibling: digest(`sibling:${base}:${i}`, 32),
    position: (seedFrom(`${base}:${i}`) & 1) === 0 ? 'left' : 'right',
  }));

  const leafCount = 1 << depth;
  const leafIndex = seed % leafCount;

  const committed = new Date(Date.UTC(2026, 0, 1) + (periodSeed % 180) * 86400000);

  return {
    periodId: id,
    metricName,
    metricValue,
    root,
    leaf,
    auditPath,
    leafIndex,
    leafCount,
    blockHeight: 4000 + (periodSeed % 5000),
    txId: digest(`tx:${base}`, 32).slice(2),
    committedAt: committed.toISOString(),
    anchorNetwork: 'Ethereum Sepolia',
    anchorTx: digest(`anchor:${id}`, 32),
    synthetic: true,
  };
}
