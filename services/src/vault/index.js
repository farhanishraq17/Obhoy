// The encrypted off-chain store.
//
// Clinical notes, imaging, labs and itemised invoices never go on the ledger.
// They sit here, encrypted, under the control of the institution that holds
// them, and the ledger carries only a content hash and an access envelope.
//
// Two properties are worth reading the code for. First, the hash the ledger
// holds is over the PLAINTEXT, so a document can be proved to be the one that
// was referenced without the verifier being given the key. Second, every read
// is checked against an explicit grant, and every read of a granted object is
// logged -- so "who saw this" is answerable after the fact, which is most of
// what a data-protection regime actually asks for.

import crypto from 'node:crypto';
import { serve, required } from '../shared/http.js';

export function startVault({ port }) {
  const objects = new Map(); // id -> { iv, tag, ciphertext, sha256, ownerMsp, grants:Set, reads:[] }
  const key = crypto.randomBytes(32); // per-run; a deployment would use an HSM

  function encrypt(plaintext) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return { iv, tag: cipher.getAuthTag(), ciphertext };
  }

  function decrypt({ iv, tag, ciphertext }) {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }

  const routes = {
    'GET /health': async () => [200, {
      ok: true, service: 'vault', objects: objects.size, cipher: 'aes-256-gcm',
    }],

    // Store a document. What comes back is the hash to put on the ledger --
    // and nothing else about the content ever leaves this service unencrypted
    // except to a party holding a grant.
    'POST /objects': async ({ body }) => {
      required(body, 'content', 'ownerMsp');
      const id = crypto.randomUUID();
      const sha256 = crypto.createHash('sha256').update(body.content, 'utf8').digest('hex');
      objects.set(id, {
        ...encrypt(body.content),
        sha256,
        ownerMsp: body.ownerMsp,
        kind: body.kind || 'document',
        grants: new Set([body.ownerMsp]),
        reads: [],
        storedAt: Date.now(),
      });
      return [201, {
        ok: true,
        objectId: id,
        sha256,
        note: 'put sha256 on the ledger, not the document',
      }];
    },

    // An access envelope. The grant is explicit, per requester, and revocable.
    'POST /objects/grant': async ({ body }) => {
      required(body, 'objectId', 'grantorMsp', 'granteeMsp');
      const obj = objects.get(body.objectId);
      if (!obj) throw new Error(`no object ${body.objectId}`);
      if (obj.ownerMsp !== body.grantorMsp) {
        throw new Error(`only ${obj.ownerMsp} controls this object; ${body.grantorMsp} cannot grant access to it`);
      }
      obj.grants.add(body.granteeMsp);
      return [200, { ok: true, objectId: body.objectId, grants: [...obj.grants] }];
    },

    'POST /objects/revoke': async ({ body }) => {
      required(body, 'objectId', 'grantorMsp', 'granteeMsp');
      const obj = objects.get(body.objectId);
      if (!obj) throw new Error(`no object ${body.objectId}`);
      if (obj.ownerMsp !== body.grantorMsp) throw new Error('only the controlling institution may revoke');
      obj.grants.delete(body.granteeMsp);
      return [200, { ok: true, grants: [...obj.grants] }];
    },

    // Read. Refused without a grant, and logged when allowed.
    'POST /objects/read': async ({ body }) => {
      required(body, 'objectId', 'requesterMsp');
      const obj = objects.get(body.objectId);
      if (!obj) throw new Error(`no object ${body.objectId}`);
      if (!obj.grants.has(body.requesterMsp)) {
        throw new Error(
          `${body.requesterMsp} holds no grant on ${body.objectId}; the controlling institution is ${obj.ownerMsp}`,
        );
      }
      obj.reads.push({ requesterMsp: body.requesterMsp, at: Date.now() });
      const content = decrypt(obj);
      return [200, {
        ok: true,
        content,
        sha256: obj.sha256,
        verifiesAgainstLedgerHash: crypto.createHash('sha256').update(content, 'utf8').digest('hex') === obj.sha256,
      }];
    },

    // The audit trail: who read what, and when.
    'GET /objects/audit': async ({ query }) => {
      const id = query.get('objectId');
      const obj = objects.get(id);
      if (!obj) throw new Error(`no object ${id}`);
      return [200, {
        ok: true,
        objectId: id,
        ownerMsp: obj.ownerMsp,
        grants: [...obj.grants],
        reads: obj.reads,
      }];
    },
  };

  return serve({
    name: 'vault',
    port,
    routes,
    banner: ['AES-256-GCM; the ledger holds only the plaintext hash'],
  });
}
