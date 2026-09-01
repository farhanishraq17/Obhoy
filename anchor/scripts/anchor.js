// Anchor a closed settlement period on the public chain.
//
//   npx hardhat run scripts/anchor.js --network localhost
//
// The sequence matters and is worth reading in order:
//
//   1. Read the period's PUBLISHED FIGURES from the Fabric ledger.
//   2. Rebuild the Merkle root from those figures, here, independently.
//   3. Compare it against the root the chaincode computed. If they disagree,
//      stop -- the published totals are not what was committed, and that is the
//      single finding this whole mechanism exists to surface.
//   4. Only then submit.
//   5. Write the transaction back to the Fabric ledger, so the anchor is part
//      of the permissioned record too.
//
// Step 3 is the reason this script rebuilds rather than trusts. Anchoring a
// root the chaincode handed over would prove that the chaincode and the chain
// agree with each other, which is not a claim anybody needs.

const hre = require('hardhat');
const crypto = require('node:crypto');

const NODE = process.env.OBHOY_NODE_URL || 'http://localhost:7545';
const ANCHOR_SERVICE = process.env.OBHOY_ANCHOR_URL || 'http://localhost:7565';
const PERIOD = process.env.OBHOY_PERIOD || '2026Q1-POOL-A';

const sha256hex = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const leafFor = (name, value) => sha256hex(Buffer.from(`${name}=${value}`, 'utf8'));
const hashPair = (a, b) => sha256hex(Buffer.concat([Buffer.from(a, 'hex'), Buffer.from(b, 'hex')]));

function merkleRoot(leaves) {
  if (!leaves.length) throw new Error('empty leaf set');
  let level = [...leaves];
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 === level.length) next.push(level[i]);
      else next.push(hashPair(level[i], level[i + 1]));
    }
    level = next;
  }
  return level[0];
}

function leavesForPeriod(p) {
  const leaves = [
    leafFor('writtenPremium', p.writtenPremium),
    leafFor('claimsReceived', p.claimsReceived),
    leafFor('claimsSettled', p.claimsSettled),
    leafFor('claimsDenied', p.claimsDenied),
    leafFor('amountSettled', p.amountSettled),
    leafFor('meanSettlementSeconds', p.meanSettlementSeconds),
    leafFor('reservePosition', p.reservePosition),
    leafFor('nakamotoCoefficient', p.nakamotoCoefficient),
    leafFor('giniBp', Math.floor(p.gini * 10000 + 0.5)),
  ];
  for (const code of Object.keys(p.denialReasons || {}).sort()) {
    leaves.push(leafFor(`denial:${code}`, p.denialReasons[code]));
  }
  return leaves;
}

async function main() {
  const address = process.env.OBHOY_ANCHOR_ADDRESS;
  if (!address) {
    throw new Error('set OBHOY_ANCHOR_ADDRESS to the deployed ObhoyAnchor (scripts/deploy.js prints it)');
  }

  console.log(`\nReading period ${PERIOD} from ${NODE}`);
  const res = await fetch(`${NODE}/api/periods?id=${encodeURIComponent(PERIOD)}`);
  const body = await res.json();
  if (!body.ok) throw new Error(body.error);
  const period = body.result;
  if (!period.closed) throw new Error(`period ${PERIOD} is still open; there is nothing settled to anchor`);

  const leaves = leavesForPeriod(period);
  const rebuilt = merkleRoot(leaves);

  console.log(`  leaves rebuilt here      ${leaves.length}`);
  console.log(`  root from the chaincode  ${period.merkleRoot}`);
  console.log(`  root rebuilt here        ${rebuilt}`);

  if (rebuilt !== period.merkleRoot) {
    console.error('\n  MISMATCH. The published figures do not reproduce the committed root.');
    console.error('  Either the totals were altered after the period closed, or the leaf');
    console.error('  ordering has drifted between the chaincode and this script.');
    console.error('  Refusing to anchor.\n');
    process.exit(1);
  }
  console.log('  they agree — the published figures reproduce the commitment\n');

  const anchor = await hre.ethers.getContractAt('ObhoyAnchor', address);
  const network = await hre.ethers.provider.getNetwork();
  console.log(`Anchoring on ${hre.network.name} (chain ${network.chainId})`);

  const tx = await anchor.anchorPeriod(PERIOD, `0x${rebuilt}`);
  const receipt = await tx.wait();
  console.log(`  transaction ${receipt.hash}`);
  console.log(`  block       ${receipt.blockNumber}`);
  if (hre.network.name === 'amoy') {
    console.log(`  explorer    https://amoy.polygonscan.com/tx/${receipt.hash}`);
  }

  // Anyone can now check the number without trusting anything in this repo.
  const verified = await anchor.verifyRoot(PERIOD, `0x${rebuilt}`);
  console.log(`  verifyRoot  ${verified}`);

  console.log('\nRecording the anchor back on the Fabric ledger');
  const back = await fetch(`${ANCHOR_SERVICE}/record`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      periodId: PERIOD,
      chain: hre.network.name === 'amoy' ? 'polygon-amoy' : 'hardhat-local',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    }),
  }).then((r) => r.json()).catch((e) => ({ ok: false, error: e.message }));

  if (back.ok) {
    console.log('  recorded. The permissioned ledger now names the public transaction.\n');
  } else {
    console.log(`  could not record it: ${back.error}`);
    console.log('  (is the anchor service running? npm start in services/)\n');
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
