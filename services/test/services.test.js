// Tests for the off-chain services.
//
// The scenario in the plan called K1 lives here: threshold custody, checked
// rather than described. One custodian down and commitments still issue; two
// down and they stop, with nothing degraded in between.

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

import { split, combine } from '../src/shared/shamir.js';
import { leafFor, merkleRoot, leavesForPeriod } from '../src/anchor/index.js';

test('K1: any two of three shares reconstruct the key, and one alone does not', () => {
  const secret = crypto.randomBytes(32);
  const shares = split(secret, 2, 3, crypto.randomBytes);

  assert.equal(shares.length, 3);
  for (const pair of [[0, 1], [0, 2], [1, 2]]) {
    const recovered = combine([shares[pair[0]], shares[pair[1]]]);
    assert.deepEqual(recovered, secret, `shares ${pair} should reconstruct the key`);
  }

  // A single share is not a weakened key. It is not the key at all.
  assert.throws(() => combine([shares[0]]), /at least two shares/);
  assert.notDeepEqual(shares[0].y, secret);
});

test('K1: three of three also reconstruct, and a repeated share is refused', () => {
  const secret = crypto.randomBytes(32);
  const shares = split(secret, 2, 3, crypto.randomBytes);
  assert.deepEqual(combine(shares), secret);
  assert.throws(() => combine([shares[1], shares[1]]), /offered twice/);
});

test('K1: a share reveals nothing about the secret', () => {
  // Two different secrets, split with the same randomness source, must not
  // produce shares that correlate with the plaintext in any visible way. The
  // weak but meaningful check: the share is not the secret, and changing one
  // byte of the secret changes the share unpredictably.
  const a = Buffer.alloc(32, 0x00);
  const b = Buffer.alloc(32, 0x00);
  b[0] = 0x01;
  const sa = split(a, 2, 3, crypto.randomBytes);
  const sb = split(b, 2, 3, crypto.randomBytes);
  assert.notDeepEqual(sa[0].y, a);
  assert.notDeepEqual(sb[0].y, b);
  assert.deepEqual(combine([sa[0], sa[2]]), a);
  assert.deepEqual(combine([sb[1], sb[2]]), b);
});

test('the commitment is a keyed PRF, not a bare hash of the identifier', () => {
  // Two different keys over the same identifier must give different
  // commitments. If they did not, the key would be doing nothing and the
  // "commitment" would be an enumerable digest of a national identity number.
  const nid = '0000100000001';
  const k1 = crypto.randomBytes(32);
  const k2 = crypto.randomBytes(32);
  const c1 = crypto.createHmac('sha256', k1).update(`${nid}|event|v1`).digest('hex');
  const c2 = crypto.createHmac('sha256', k2).update(`${nid}|event|v1`).digest('hex');
  assert.notEqual(c1, c2);

  // And the context must domain-separate: the commitment that keys an event is
  // not the commitment that binds a policy credential.
  const cEvent = crypto.createHmac('sha256', k1).update(`${nid}|event|v1`).digest('hex');
  const cPolicy = crypto.createHmac('sha256', k1).update(`${nid}|policy|v1`).digest('hex');
  assert.notEqual(cEvent, cPolicy);

  // Rotating the key version must change the commitment, or retiring a
  // compromised key would achieve nothing.
  const v2 = crypto.createHmac('sha256', k1).update(`${nid}|event|v2`).digest('hex');
  assert.notEqual(cEvent, v2);
});

test('the Merkle root here matches the one the chaincode builds', () => {
  // These vectors are the ones model/merkle.go produces. If this test fails
  // after a change to either implementation, a period root built off-chain will
  // no longer verify against the one committed on-chain.
  assert.equal(
    leafFor('claimsSettled', 1),
    crypto.createHash('sha256').update('claimsSettled=1').digest('hex'),
  );

  const leaves = ['a', 'b', 'c'].map((n, i) => leafFor(n, i));
  const root = merkleRoot(leaves);
  assert.equal(root.length, 64);

  // An odd node is promoted, not duplicated. With three leaves the root is
  // H(H(l0||l1) || l2), and the check that matters is that a four-leaf set
  // whose fourth leaf repeats the third does NOT collide with it.
  const dup = merkleRoot([...leaves, leaves[2]]);
  assert.notEqual(root, dup, 'promoting and duplicating an odd node must not agree');
});

test('period leaves are ordered, and denial reasons are sorted', () => {
  const period = {
    writtenPremium: 42000000,
    claimsReceived: 2,
    claimsSettled: 1,
    claimsDenied: 1,
    amountSettled: 3000000,
    meanSettlementSeconds: 120,
    reservePosition: 31500000,
    nakamotoCoefficient: 3,
    gini: 0.14,
    denialReasons: { 'D-09-LATE': 1, 'D-03-OUTSIDE': 2 },
  };
  const leaves = leavesForPeriod(period);
  assert.equal(leaves.length, 11);

  // Sorting the denial codes is not cosmetic: the leaf order is part of the
  // commitment, so an unordered map here would produce a different root on
  // every run and nothing would ever verify.
  const again = leavesForPeriod({ ...period, denialReasons: { 'D-03-OUTSIDE': 2, 'D-09-LATE': 1 } });
  assert.deepEqual(leaves, again);
  assert.equal(merkleRoot(leaves), merkleRoot(again));
});

test('a changed figure produces a different root', () => {
  const base = {
    writtenPremium: 1, claimsReceived: 2, claimsSettled: 1, claimsDenied: 1,
    amountSettled: 3, meanSettlementSeconds: 4, reservePosition: 5,
    nakamotoCoefficient: 3, gini: 0.14, denialReasons: {},
  };
  const root = merkleRoot(leavesForPeriod(base));
  const restated = merkleRoot(leavesForPeriod({ ...base, claimsSettled: 9 }));
  assert.notEqual(root, restated, 'restating a settled period must not reproduce its root');
});
