// Shamir secret sharing over GF(256).
//
// This is what "threshold custody split across institutional classes" means in
// practice. The PRF key that turns a national identity number into an on-chain
// commitment is never held whole by anybody: it is split into three shares held
// by three organisations with different interests, and any two of them can
// reconstruct it for the length of one request.
//
// Written out rather than pulled from a package, because it is short, it is the
// part of the privacy design a reviewer will actually want to read, and a
// dependency here would be a dependency in the most security-sensitive path in
// the system.

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);

// Multiply by the polynomial x, reducing modulo the AES field polynomial.
const xtime = (a) => ((a << 1) ^ (a & 0x80 ? 0x1b : 0)) & 0xff;

(() => {
  // The generator is 3, not 2. This matters: 2 is not a primitive element of
  // GF(2^8) under the AES polynomial -- it has order 51, so walking its powers
  // reaches only a fifth of the field and leaves most of the log table zeroed.
  // Multiplication then silently returns wrong answers for the elements that
  // were never indexed, which is the kind of failure that produces shares that
  // look random and do not reconstruct.
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    EXP[i] = x;
    LOG[x] = i;
    x = xtime(x) ^ x; // multiply by 3
  }
  for (let i = 255; i < 512; i += 1) EXP[i] = EXP[i - 255];
})();

const mul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);
const div = (a, b) => {
  if (b === 0) throw new Error('shamir: division by zero in GF(256)');
  return a === 0 ? 0 : EXP[LOG[a] + 255 - LOG[b]];
};

/**
 * Split a secret into `total` shares, any `threshold` of which reconstruct it.
 * Fewer than `threshold` shares reveal nothing at all -- not a weaker key, not
 * a narrowed search space: nothing.
 *
 * @param {Buffer} secret
 * @param {number} threshold
 * @param {number} total
 * @param {(n:number)=>Buffer} randomBytes
 * @returns {{x:number, y:Buffer}[]}
 */
export function split(secret, threshold, total, randomBytes) {
  if (threshold < 2) throw new Error('shamir: a threshold below 2 is not a threshold');
  if (total < threshold) throw new Error('shamir: cannot issue fewer shares than the threshold');
  if (total > 255) throw new Error('shamir: at most 255 shares');

  const shares = [];
  for (let x = 1; x <= total; x += 1) shares.push({ x, y: Buffer.alloc(secret.length) });

  for (let i = 0; i < secret.length; i += 1) {
    // A random polynomial of degree threshold-1 whose constant term is the
    // secret byte. Each share is one point on it.
    const coeffs = Buffer.concat([Buffer.from([secret[i]]), randomBytes(threshold - 1)]);
    for (const share of shares) {
      let acc = 0;
      for (let d = coeffs.length - 1; d >= 0; d -= 1) acc = mul(acc, share.x) ^ coeffs[d];
      share.y[i] = acc;
    }
  }
  return shares;
}

/**
 * Reconstruct the secret by Lagrange interpolation at x = 0.
 * @param {{x:number, y:Buffer}[]} shares
 * @returns {Buffer}
 */
export function combine(shares) {
  if (!shares || shares.length < 2) {
    throw new Error('shamir: at least two shares are required to reconstruct');
  }
  const seen = new Set();
  for (const s of shares) {
    if (seen.has(s.x)) throw new Error(`shamir: share ${s.x} was offered twice`);
    seen.add(s.x);
  }
  const length = shares[0].y.length;
  const out = Buffer.alloc(length);

  for (let i = 0; i < length; i += 1) {
    let acc = 0;
    for (let j = 0; j < shares.length; j += 1) {
      let basis = 1;
      for (let m = 0; m < shares.length; m += 1) {
        if (m === j) continue;
        basis = mul(basis, div(shares[m].x, shares[j].x ^ shares[m].x));
      }
      acc ^= mul(shares[j].y[i], basis);
    }
    out[i] = acc;
  }
  return out;
}
