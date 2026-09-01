# Architecture

How the paper's design maps onto this code. Read
[LIMITATIONS.md](LIMITATIONS.md) alongside it — several things below are
configured but not exercised on a running network.

---

## The one primitive

The protocol defines one object and parameterises it. An **insurable event** is
a non-transferable, single-use on-chain asset; an **entitlement** is a claim of
cover against that event under one policy. The relation is many-to-one, and it
has to be.

```
Event                                     Entitlement
  eventId = H(subjectCommitment            entitlementId = H(eventId ‖ policyId)
              ‖ admissionWindow)           eventId, policyId, insurerMsp
  subjectCommitment                        type: INDEMNITY | FIXED
  categoryCode                             amount, settlementRef
  attestations[]  ← spans classes          state: CREATED → ADJUDICATED → SETTLED
  segments[]      ← transfers, readmits             ↘ DENIED → APPEALED → …
  state: OPEN → CLOSED_ELIGIBLE
                ↘ EXPIRED
```

The event has **no settlement state**. That is not an omission: it is what lets
a second legitimate entitlement settle against the same occurrence later. See
[FINDINGS.md §2](FINDINGS.md) — the paper contradicts itself here and §5.6 is
the reading that works.

### Three parameters, four lines of business

`model.DomainProfile` carries the whole generalisation claim, and nothing else in
the chaincode reads the line name:

| | Health | Crop |
|---|---|---|
| Uniqueness key | `H(NIDCommitment ‖ admissionWindow)` | `H(parcelID ‖ season)` |
| Attesting classes | provider, clinical, field | provider, clinical, field |
| Quorum | 2 of 3 | 2 of 3 |
| Payee class | provider | provider |
| Settlement basis | defined benefit | parametric |
| Continuation window | 30 days | 120 days |

Both are registered by the demonstration seed. Supply the three parameters and
a line runs on the protocol unchanged — that is the claim, and it is checkable
rather than asserted.

---

## Where each mechanism lives

| Mechanism | Where | Enforced by |
|---|---|---|
| **1.** Event as a single-use asset | `contracts/event.go` `OpenEvent` | `invariants.SingleOpenEvent`, equation (4) — plus a check that the exact key has never existed in any state |
| **2.** Multi-class attestation quorum | `configtx.yaml` **and** `CloseEvent` | The `OutOf(2, …)` term is the endorsement policy, at protocol level. The non-payee half is runtime-dependent and lives in chaincode |
| **3.** Revocable accreditation | `contracts/provider.go` | `Accredit` refuses to overwrite a de-accreditation; history survives revocation |
| **4.** Published reserves and settlement ratio | `contracts/transparency.go` + `anchor/` | Totals accrue from the claim path; the period Merkle root is committed to an EVM chain |
| **5.** Independent appeals | `contracts/settlement.go` `PanelDecision` | The denying insurer's MSP is refused by name |

### The endorsement policy is the architectural claim

```
AND(OutOf(2, 'ProviderMSP.peer', 'ClinicalMSP.peer', 'FieldMSP.peer'),
    OutOf(1, 'InsurerAMSP.peer', 'InsurerBMSP.peer'))
```

Read out of the generated genesis block, not out of a file:

```json
{"n_out_of": {"n": 2, "rules": [
  {"n_out_of": {"n": 2, "rules": [{"signed_by": 0}, {"signed_by": 1}, {"signed_by": 2}]}},
  {"n_out_of": {"n": 1, "rules": [{"signed_by": 3}, {"signed_by": 4}]}}]}}
```

with identities `ProviderMSP/PEER, ClinicalMSP/PEER, FieldMSP/PEER,
InsurerAMSP/PEER, InsurerBMSP/PEER`.

The insurer signs **as payer**, not as a third attesting class. Softening this to
`MAJORITY Endorsement` would leave the quorum enforced only by application code,
and Mechanism 2 would become a convention.

The policy is set in the **channel configuration**, not passed at deploy time.
A policy supplied on the command line can be changed at the next deploy without
a channel-configuration update, and the multi-class quorum is not something one
organisation should be able to loosen alone.

---

## Network topology

Twelve organisations. Five ordering nodes, each in **its own MSP** — five
orderers in one organisation would look identical in `docker ps` and would mean
nothing, because one organisation would still hold the whole ordering service.

```
ordering (Raft)                     endorsing peers
  O1  OrdererIDRAMSP                  ProviderMSP    asserts, is the payee
  O2  OrdererInsurerAMSP              ClinicalMSP    independent attestation
  O3  OrdererInsurerBMSP              FieldMSP       independent attestation, enrols
  O4  OrdererAggregatorMSP            InsurerAMSP    adjudicates, settles
  O5  OrdererAcademicMSP              InsurerBMSP    competitor
                                      RegulatorMSP   audit channel, orderer O1
                                      AcademicMSP    totals only, orderer O5
```

Raft is crash-fault tolerant, not Byzantine. Institutional spread bounds who can
stall the service; it does not make a malicious ordering majority harmless.

### Channels

- **`obhoy-main`** — policy credentials, the event registry, settlement state.
  All seven peer organisations.
- **`obhoy-audit`** — transparency aggregates only. Regulator, academic auditor
  and the provider association. **The insurers are not members**, which is how
  oversight reads continuously without seeing commercial detail.

### Private data collections

| Collection | Who can read | Why |
|---|---|---|
| `insurerA_terms` / `insurerB_terms` | that insurer only | Competing insurers settle on one channel while keeping pricing and reserving out of each other's sight. Without this the consortium is commercially impossible |
| `enrolment_pii` | the enrolling aggregator and insurer | The mapping back to a real person. Neither party holds the PRF key that produced the commitment — two secrets, two custodians |
| `clinical_refs` | providers, clinicians, insurers | Content hashes and access envelopes. Field verifiers are **absent** by design: they attest that an admission happened and never see clinical data |

---

## On-chain and off-chain

| On-chain | Off-chain |
|---|---|
| Subject commitment (keyed PRF) | National ID numbers, names, addresses |
| Event record, state, timestamps | Clinical notes, imaging, labs |
| Attestation class and signature reference | Itemised invoices |
| Benefit schedule version hash | Insurer actuarial models |
| Settlement authorisation, denial code | Bank / MFS account details |
| Provider accreditation history | Biometric templates |
| Period aggregates and Merkle root | Documents — content hash on-chain only |

Every write goes through this table. `./obhoy.sh privacy` dumps the entire world
state and scans it, and the same check runs as a Go test on every build.

---

## Identity

```
NID ──▶ HMAC_Kv(NID ‖ context) ──▶ subjectCommitment (32 bytes, on-chain)
         ▲
         │  Kv is never held whole
         │
    ┌────┴────┬──────────┬────────────┐
  IDRA     Insurer   Aggregator      ← Shamir 2-of-3, three institutional classes
  share 1   share 2    share 3          reconstructed in memory per request,
                                        zeroed immediately after
```

Three decisions, all from the paper:

1. **Keyed**, not a bare hash. A SHA-256 of a national identity number is not a
   pseudonym — the space is small enough to enumerate, so the digest *is* the
   number.
2. **One key across the network**, not a salt per insurer. Independent salts
   would mint a different commitment per insurer for the same person, silently
   breaking the cross-insurer invariant. The mechanism would appear to work
   while doing nothing.
3. **Never held whole.** No single class can compute a commitment, and no single
   class can be compelled to.

`context` domain-separates the uses: the commitment that keys an event is not
the one that binds a policy credential, so a leak in one does not unlock the
other. Key version travels with every commitment, so a compromise can be scoped
and retired.

---

## The claim path, end to end

```
 HMIS ADT feed
      │  identifier converted to a commitment BEFORE any ledger write
      ▼
 openEvent            ProviderMSP    ─┐  key derived, not supplied
      │                               │  refuses: not accredited · not enrolled
      │                               │  · no live cover · key already used
      │                               │  · subject already has an open event  (4)
 attestEvent          ClinicalMSP     │  refuses a class already present      (6)
 attestEvent          FieldMSP        │
 continueEvent        ProviderMSP     │  transfer / readmission → a segment   (5)
      ▼                               │
 closeEvent                          ─┘  ≥2 classes (6), ≥1 non-payee (7)
      │                                  ENDORSEMENT POLICY enforces the first half
      ▼
 createEntitlement    InsurerAMSP        one per (event, policy)              (8)
 adjudicate           InsurerAMSP        amount from the published schedule
 authoriseSettlement  InsurerAMSP        eligible · active · not re-opened    (9)
      │                                  coordination of benefits             (2)
      ▼
 SettlementAuthorised ──▶ MFS adapter ──▶ payload-bound request identifier
      │                                   retry → original receipt
      ▼                                   changed payload → refused
 TransparencyLedger accrues ──▶ closePeriod ──▶ Merkle root ──▶ EVM anchor
```

Equation numbers are Appendix A of the paper.
[`invariants/invariants.go`](../chaincode/obhoycc/invariants/invariants.go)
implements each one once, and each has a test named for it.

---

## Legacy integration

The paper's claim is that Obhoy is API-first and attaches to existing systems
rather than replacing them. Four of the five integration points are stood up as
mocks with the right *semantics*:

| Real system | Here | What is faithful |
|---|---|---|
| Hospital HMIS / DGHS registry | `services/src/hmis` | ADT-shaped admission messages carrying the identifier on the far side of the boundary — the feed shows the privacy problem honestly rather than pretending it is not there |
| bKash / Nagad / Rocket | `services/src/mfs` | Payload-bound request identifiers, idempotent retries, pending state reconciled from a daily file |
| Off-chain clinical store | `services/src/vault` | AES-256-GCM; the ledger holds the plaintext hash and an access envelope; every granted read is logged |
| Public chain anchor | `anchor/` | A real EVM contract on a real chain, local or Amoy |
| National ID verification | **absent** | This is assumption A2, and its absence is the prototype's largest limitation |

---

## Why the contracts run two ways

`contracts/` is written once. `cmd/chaincode` is the Fabric entry point;
`cmd/localnode` runs the same functions against `internal/ledgerstub`, an
in-process implementation of the parts of `ChaincodeStubInterface` this chaincode
uses.

The seam is one variable — `contracts.ResolveMSP` — which reads the caller's
organisation from a validated X.509 identity under Fabric and from the stub
under the local node.

That is why the web application, the thirteen scenarios and the privacy scan run
with nothing installed but Go, and why none of them is testing a reimplementation
of the logic in another language. What the local node does not provide is
everything outside chaincode: endorsement, ordering, MSP validation,
private-data confidentiality. Those exist only on the real network, and
[LIMITATIONS.md §7 and §8](LIMITATIONS.md) say what follows from that.
