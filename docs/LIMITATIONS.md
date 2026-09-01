# What this prototype does not establish

The whitepaper's credibility comes from stating its own limits. A prototype that
quietly widened its claims would undo that, so this file is written to the same
standard: it is the first thing to read, not an appendix.

Nothing here is a caveat added after the fact. Each item names something the
code genuinely does not do, and where the paper already concedes the point, it
says so.

---

## 1. Assumption A2 — identity resolution — is assumed, not demonstrated

The uniqueness invariant holds only if one person resolves to one subject
commitment everywhere. There is no national ID verification service in this
prototype. Duplicate or forged identities defeat equation (4) **before**
chaincode is entered, and chaincode cannot detect them: it sees a commitment it
has never seen before and opens an event, correctly, for what is in fact the
same person.

This is the strongest guarantee in the paper — the protocol turns a
claims-integrity problem into an identity-integrity one — and it is the one the
prototype cannot test. The commitment service does what it can: the commitment
is a keyed pseudorandom function under threshold custody rather than a bare
hash, so nobody can mint commitments alone and nobody can enumerate the input
space from a digest. That closes an attack on the commitment. It does not
establish that two commitments belong to two people.

**What would falsify it:** a pilot where the same person enrols twice through
two aggregators and the ledger fails to notice.

## 2. Assumption A1 — membership — is assumed

A claim settled entirely off-network is invisible to the ledger, and no
uniqueness guarantee reaches it. Every party in this prototype is a member by
construction. In a real deployment the fraction of the market on the network is
the fraction of the market the mechanism covers, and early on that fraction is
small.

## 3. Anonymous attestation is partial, and Fabric is the reason

`AttestEventAnonymously` records a class and a nullifier rather than an
individual, so the same agent cannot attest twice while remaining unlinkable.
That is the right on-chain record.

What is missing is the client-side proof that would make it genuinely anonymous.
Idemix is the mechanism the paper names, and the paper already concedes its
limits: **Fabric does not extend Idemix to chaincode endorsement**, so the peer
signature is an ordinary X.509 identity regardless. In this prototype the
nullifier is supplied by the caller rather than derived from a credential the
caller cannot forge. On a real deployment it would come from a group signature
or a BBS+ credential.

**Read this as:** the ledger record has the right shape; the cryptography behind
it is not there yet.

## 4. No zero-knowledge diagnosis proof

The adjudicating insurer sees the diagnosis group. The paper's roadmap target is
a proof that the diagnosis falls in the covered set without revealing which
condition it is; the paper explicitly does not claim it for the MVP, and neither
does this.

## 5. Payment is mocked

`services/src/mfs` reproduces the *semantics* the paper specifies —
payload-bound request identifiers, idempotent retries, refusal of a repeated
identifier with a changed payload, a pending state resolved from the daily
settlement file rather than by re-sending — and those behaviours are exercised.

It is not bKash. There is no real MFS integration, no real disbursement, and no
real reconciliation file.

## 6. Raft is crash-fault tolerant, not Byzantine

The demonstration network runs five ordering nodes in five different
organisations, one per institutional class, exactly as the paper describes.
That bounds **who can stall** the ordering service. It does not make a malicious
ordering majority harmless: three colluding orderers can censor transactions,
and no arrangement of Raft nodes changes that.

## 7. Private data collections are declared but not exercised under a real network

`network/collections.json` separates each insurer's commercial terms, the
enrolment mapping, and clinical document references. The declaration is real and
is passed to `approveformyorg` and `commit`.

**But the confidentiality property only exists on a real Fabric network.** The
in-process ledger used by the local node and the scenarios implements the
private-data *API* and stores collections separately; it does not enforce
membership on reads, because there is no MSP there to enforce it against. The
access-control refusals in scenario S11 are chaincode-level checks, which is
genuine but is not the same claim.

**Consequence:** "Insurer B cannot read Insurer A's terms" is demonstrated at
the application layer and configured at the network layer, and has not been
observed failing at the network layer on this machine.

## 8. The seven-organisation network has not been brought up here

`cryptogen` generates crypto material for all twelve organisations and
`configtxgen` produces all three channel genesis blocks; the endorsement policy
was read back out of the generated block and is correct. The containers were
not started, because Docker Desktop was not running on the machine this was
built on.

So: **the configuration is validated, the network is not.** Anything that can
only be observed on a running network — endorsement actually collecting
signatures from two attesting classes, gossip, private-data dissemination,
chaincode running under a peer's container build — is unverified.

## 9. cryptogen, not Fabric CA

There is no registration, no enrolment, and no certificate revocation list.
Identities are generated in bulk from a manifest. Mechanism 3 — revocable
provider accreditation — is therefore enforced **in chaincode only**: a
de-accredited facility is refused by `ProviderRegistry`, but its X.509 identity
still exists and is still valid to the MSP. On a real deployment both layers
would carry it.

## 10. Scale is untested

Toy volumes on one machine. No throughput number is claimed anywhere in this
repository, because none was measured under conditions that would mean anything.

## 11. No legal or data-protection finding

The on-chain/off-chain split is designed toward Bangladesh's Personal Data
Protection Act, 2026, and the world-state scan checks that no field on the
ledger is protected health information on its own. That is an engineering
posture, not a compliance finding. A documented legal basis per field, a
retention and deletion schedule, and a formal data-protection impact assessment
are none of them here.

## 12. Metadata linkage is mitigated, not eliminated

`./obhoy.sh privacy` dumps the entire world state and scans it for anything
shaped like a national identity number, a name or a free-text diagnosis, and it
finds nothing — on every run, as a test.

That is a narrower claim than anonymity, and the difference matters. Category
code, subject commitment, provider identity and timestamps together are a
metadata surface: a party seeing enough of them over enough periods can
plausibly link a subject to an illness category without ever reading a diagnosis
field. Hashes and pseudonyms are not automatically anonymous. Private data
collections scope who sees which combination; the residual is a
data-protection-impact question, and the paper treats it as one.

## 13. The demonstration seed is synthetic, and deliberately implausible

Facility names are placeholders. Subject commitments are derived from a fixed
demonstration string, not from any identity number real or invented. The HMIS
feed emits identifiers beginning `0000`, which no issued Bangladeshi NID does.
The benefit schedule amounts are illustrative and have not been near an actuary.

Nothing in this repository has been priced, and the affordability thesis in the
paper — that removing fraud from the premium makes cover affordable — is
untouched by anything here. A prototype can show the verification works. It
cannot show the premium falls.
