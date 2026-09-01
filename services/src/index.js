// Starts every off-chain service.
//
//   node src/index.js
//
// Ports are fixed so the web application and the harness can find them without
// service discovery. Nothing here holds durable state: restarting resets the
// vault, the receipts and the custodian shares, which is what you want in a
// demonstration and is not what you would want anywhere else.

import crypto from 'node:crypto';

import { split } from './shared/shamir.js';
import { startCustodian } from './custodian/index.js';
import { startCommitmentService } from './commitment/index.js';
import { startVault } from './vault/index.js';
import { startMfs } from './mfs/index.js';
import { startHmis } from './hmis/index.js';
import { startAnomaly } from './anomaly/index.js';
import { startAnchor } from './anchor/index.js';

const NODE_URL = process.env.OBHOY_NODE_URL || 'http://localhost:7545';

const PORTS = {
  custodianRegulator: 7551,
  custodianInsurer: 7552,
  custodianAggregator: 7553,
  commitment: 7560,
  vault: 7561,
  mfs: 7562,
  hmis: 7563,
  anomaly: 7564,
  anchor: 7565,
};

// The PRF key is generated here once, split three ways, and then dropped. From
// this point on no process in the system holds it: reconstructing it requires
// two of the three custodians to agree to release their shares.
const masterKey = crypto.randomBytes(32);
const shares = split(masterKey, 2, 3, crypto.randomBytes);
masterKey.fill(0);

const custodianDefs = [
  { id: 'idra', name: 'Insurance Development and Regulatory Authority', msp: 'RegulatorMSP', port: PORTS.custodianRegulator, share: shares[0] },
  { id: 'insurer', name: 'Participating insurer', msp: 'InsurerAMSP', port: PORTS.custodianInsurer, share: shares[1] },
  { id: 'aggregator', name: 'MFI/NGO aggregator', msp: 'FieldMSP', port: PORTS.custodianAggregator, share: shares[2] },
];

console.log('');
console.log('obhoy off-chain services');
console.log('  the ledger is at ' + NODE_URL);
console.log('');

for (const def of custodianDefs) startCustodian(def);

startCommitmentService({
  port: PORTS.commitment,
  threshold: 2,
  custodians: custodianDefs.map((c) => ({ id: c.id, url: `http://localhost:${c.port}` })),
});
startVault({ port: PORTS.vault });
startMfs({ port: PORTS.mfs });
startHmis({ port: PORTS.hmis });
startAnomaly({ port: PORTS.anomaly, nodeUrl: NODE_URL });
startAnchor({ port: PORTS.anchor, nodeUrl: NODE_URL });

setTimeout(() => {
  console.log('');
  console.log('  try:');
  console.log(`    curl -s localhost:${PORTS.commitment}/health`);
  console.log(`    curl -s -XPOST localhost:${PORTS.commitment}/commit -H 'content-type: application/json' \\`);
  console.log('         -d \'{"nid":"0000100000001","context":"event"}\'');
  console.log(`    curl -s -XPOST localhost:${PORTS.custodianInsurer}/admin/offline -H 'content-type: application/json' -d '{"offline":true}'`);
  console.log('    # one custodian down: commitments still issue. Take a second down and they stop.');
  console.log('');
}, 150);
