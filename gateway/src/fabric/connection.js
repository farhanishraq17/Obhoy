// Connecting to the real Fabric network.
//
// The local node in chaincode/obhoycc/cmd/localnode runs the same contract
// functions against an in-process ledger, and everything -- the web
// application, the twelve scenarios -- is driven through it. This gateway is
// the other path: the same REST surface, backed by a peer.
//
// One identity per organisation, and the route decides which one signs. There
// is no admin identity that can do everything, because the moment such an
// identity exists the access control the chaincode enforces stops being the
// access control the system has.

import { connect, hash, signers } from '@hyperledger/fabric-gateway';
import * as grpc from '@grpc/grpc-js';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const ORG_DIR = process.env.OBHOY_ORGANIZATIONS
  || path.resolve(process.cwd(), '..', 'organizations');
const CHANNEL = process.env.OBHOY_CHANNEL || 'obhoy-main';
const CHAINCODE = process.env.OBHOY_CHAINCODE || 'obhoycc';

/**
 * The organisations, their MSP identifiers and the peer each one submits
 * through. These are the SAME strings the chaincode maps to stakeholder
 * classes and the same ones configtx.yaml names -- three places that must
 * agree, and the reason they are listed once here.
 */
export const ORGS = {
  ProviderMSP: { domain: 'provider.obhoy.local', port: 7051 },
  ClinicalMSP: { domain: 'clinical.obhoy.local', port: 8051 },
  FieldMSP: { domain: 'field.obhoy.local', port: 9051 },
  InsurerAMSP: { domain: 'insurera.obhoy.local', port: 10051 },
  InsurerBMSP: { domain: 'insurerb.obhoy.local', port: 11051 },
  RegulatorMSP: { domain: 'regulator.obhoy.local', port: 12051 },
  AcademicMSP: { domain: 'academic.obhoy.local', port: 13051 },
};

async function firstFileIn(dir) {
  const entries = await fs.readdir(dir);
  if (!entries.length) throw new Error(`no files in ${dir}`);
  return path.join(dir, entries[0]);
}

async function buildGateway(mspId) {
  const org = ORGS[mspId];
  if (!org) throw new Error(`unknown organisation ${mspId}`);

  const orgRoot = path.join(ORG_DIR, 'peerOrganizations', org.domain);
  const peerHost = `peer0.${org.domain}`;
  const tlsCert = await fs.readFile(path.join(orgRoot, 'peers', peerHost, 'tls', 'ca.crt'));

  const client = new grpc.Client(
    `localhost:${org.port}`,
    grpc.credentials.createSsl(tlsCert),
    // The certificate names the peer by its network hostname; the gateway
    // reaches it on localhost through a published port, so the authority has
    // to be overridden or the TLS handshake fails on the name.
    { 'grpc.ssl_target_name_override': peerHost },
  );

  const userDir = path.join(orgRoot, 'users', `Admin@${org.domain}`, 'msp');
  const certPath = await firstFileIn(path.join(userDir, 'signcerts'));
  const keyPath = await firstFileIn(path.join(userDir, 'keystore'));

  const identity = { mspId, credentials: await fs.readFile(certPath) };
  const privateKey = crypto.createPrivateKey(await fs.readFile(keyPath));

  return connect({
    client,
    identity,
    signer: signers.newPrivateKeySigner(privateKey),
    hash: hash.sha256,
    // Endorsement across seven organisations is slower than a single peer.
    // These are generous on purpose: a timeout here looks exactly like a
    // policy refusal in the logs, and confusing the two costs hours.
    evaluateOptions: () => ({ deadline: Date.now() + 15_000 }),
    endorseOptions: () => ({ deadline: Date.now() + 30_000 }),
    submitOptions: () => ({ deadline: Date.now() + 30_000 }),
    commitStatusOptions: () => ({ deadline: Date.now() + 60_000 }),
  });
}

const gateways = new Map();

async function contractFor(mspId, contractName) {
  if (!gateways.has(mspId)) gateways.set(mspId, await buildGateway(mspId));
  const network = gateways.get(mspId).getNetwork(CHANNEL);
  return network.getContract(CHAINCODE, contractName);
}

const decode = (bytes) => {
  const text = new TextDecoder().decode(bytes);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

/**
 * Submit a transaction. A chaincode refusal arrives here as a thrown error
 * carrying the endorsers' message -- which is the text the whole prototype is
 * built to produce -- so it is unwrapped rather than swallowed.
 */
export async function submit(mspId, contractName, fn, args = []) {
  const contract = await contractFor(mspId, contractName);
  try {
    const result = await contract.submitTransaction(fn, ...args.map(String));
    return { ok: true, result: decode(result) };
  } catch (err) {
    return { ok: false, error: refusalMessage(err) };
  }
}

/** Evaluate a query. Nothing is written and no endorsement is gathered. */
export async function evaluate(mspId, contractName, fn, args = []) {
  const contract = await contractFor(mspId, contractName);
  try {
    const result = await contract.evaluateTransaction(fn, ...args.map(String));
    return { ok: true, result: decode(result) };
  } catch (err) {
    return { ok: false, error: refusalMessage(err) };
  }
}

/**
 * Pull the chaincode's own words out of a gateway error.
 *
 * The default message is a gRPC wrapper that says almost nothing. What matters
 * is the endorser's detail -- "invariant (4) violated: subject already has open
 * event ..." -- and losing it turns every demonstration into a shrug.
 */
function refusalMessage(err) {
  const details = err?.details;
  if (Array.isArray(details) && details.length) {
    const messages = details.map((d) => d.message).filter(Boolean);
    if (messages.length) return [...new Set(messages)].join('; ');
  }
  if (err?.cause?.details) return err.cause.details;
  return err?.message || String(err);
}

export async function closeAll() {
  for (const gw of gateways.values()) gw.close();
  gateways.clear();
}

export const config = { CHANNEL, CHAINCODE, ORG_DIR };
