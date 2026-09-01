# Obhoy — prototype

A working prototype of the claims-integrity protocol described in
*Obhoy: A Blockchain Claims-Integrity Network for Catastrophic Health
Protection*.

The whitepaper argues that insurance fails in low-trust markets in large part
because of how the record is kept: nobody can independently check that the
insured event happened, because the only record comes from a party with a stake
in it. This repository is that argument made executable — the event as a
single-use on-chain asset, the multi-class attestation quorum, coordination of
benefits across insurers who cannot see each other, and a published record that
cannot be restated after the fact.

**Everything below has been run.** Where something has not, it says so.

```bash
./obhoy.sh dev          # or:  .\obhoy.ps1 dev
```

Then open **http://localhost:7545**. That is the whole setup: one command, one
port, no Docker, no `npm install`, no build step.

---

## What is here

| | |
|---|---|
| **Chaincode** | Eight Go contracts implementing the event/entitlement model, the six Appendix A invariants and the governance metrics |
| **Two ledgers** | Hyperledger Fabric for the claim path; an EVM chain for public anchoring of period totals |
| **A web application** | Eight role surfaces, a public transparency explorer, a ledger view, a USSD simulator |
| **Off-chain services** | Keyed-PRF commitments under 2-of-3 threshold custody, an encrypted vault, a payload-bound payout adapter, an HMIS feed, a collusion scorer |
| **An adversarial harness** | Thirteen scripted scenarios; eight of them pass by producing a refusal |

### Verified, on this machine

| Suite | Result |
|---|---|
| `chaincode/obhoycc` — 21 Go tests, one per invariant plus the cases that must not fail | **all pass** |
| `services` — threshold custody, keyed-PRF properties, Merkle vectors | **7 pass** |
| `cmd/scenarios` — the adversarial harness | **13 of 13 pass** |
| `anchor` — the Solidity anchoring contract | **7 pass** |
| `network/configtx.yaml` — three channel genesis blocks generated with `configtxgen` v2.5.10 | **generated; endorsement policy verified in the block** |
| End-to-end anchoring: ledger → independent Merkle rebuild → on-chain commit → recorded back | **works** |

### Not run here

The full seven-organisation Fabric network has **not** been brought up on this
machine, because Docker Desktop was not running. Its configuration is
validated — `cryptogen` produces the crypto material for all twelve
organisations, and `configtxgen` produces all three channel genesis blocks with
the endorsement policy intact — but the containers have not been started. See
[docs/RUNNING.md](docs/RUNNING.md) for the commands and
[docs/LIMITATIONS.md](docs/LIMITATIONS.md) for what that means.

---

## The two ledgers, and why both

**Hyperledger Fabric** carries the claim path. Every participant is a known,
licensed, legally accountable body — insurers licensed by IDRA, hospitals
registered with the DGHS, MFIs regulated by the MRA. Nobody needs anonymity;
everybody must be identifiable to the regulator. A public permissionless chain
cannot offer that together with the confidentiality health data demands.

**An EVM chain** carries one Merkle root per settlement period. A consortium can
be captured or legally compelled; if the transparency totals live only inside
it, it can rewrite them. Confidentiality inside, immutability outside — neither
half works alone.

There is **no token**, fungible or otherwise. No cryptocurrency, no speculative
instrument. All money moves in taka through regulated mobile financial services
and banking rails, outside both ledgers. The anchoring contract stores 32 bytes
per period and nothing else.

---

## The headline

Two hospitals. Two insurers who cannot see each other's books at any price. One
patient.

```
ProviderMSP  openEvent  subject 6d0e01e6…  HOSP-UPAZILA-KLG   → committed
ProviderMSP  openEvent  subject 6d0e01e6…  HOSP-PRIVATE-SVR   → REFUSED

  invariant (4) violated: subject already has open event 9dc18c22…;
  use continueEvent for a transfer or readmission
```

The second assertion is refused **at commit**. Nothing is written and then
flagged; the transaction produces no ledger entry at all. No single insurer's
database can do this, because no single insurer can see the other's claims —
which is the answer to *why blockchain*.

And the same run demonstrates the harder half. A patient transferred from an
upazila health complex to a district hospital produces two admissions and one
clinical episode; a naive uniqueness rule would refuse the receiving facility at
the worst possible moment. A garment worker covered by an employer scheme *and*
enrolled through an MFI group holds two policies, and paying both is the
contract, not a fraud. Scenarios S4, S5 and S6 exist to prove those still work.

```bash
./obhoy.sh scenarios          # all thirteen
./obhoy.sh scenarios S2       # just the headline
```

---

## Layout

```
chaincode/obhoycc/       Go — the eight contracts, and the ledger itself
  contracts/             identity · policy · provider · schedule
                         event · settlement · transparency · governance
  invariants/            Appendix A of the paper, in code
  model/                 the object model, key derivation, Merkle
  internal/ledgerstub/   an in-process ChaincodeStubInterface
  internal/httpapi/      the REST surface and the demonstration seed
  internal/scenarios/    the adversarial harness
  cmd/chaincode/         the Fabric entry point
  cmd/localnode/         the same contracts, in-process, over HTTP
  cmd/scenarios/         the harness as a command
web/                     the application — no framework, no build step
services/                the off-chain services — no dependencies
gateway/                 REST over a real Fabric peer, same surface
network/                 configtx, compose, the network script
anchor/                  ObhoyAnchor.sol and its Hardhat project
docs/                    limitations, findings, runbook, architecture
```

### One decision worth explaining

The contracts are written once and run two ways. `cmd/chaincode` is the Fabric
entry point; `cmd/localnode` runs **the same contract functions** against an
in-process ledger and serves them over HTTP.

That is why the web application, the thirteen scenarios and the privacy dump all
work with nothing installed but Go — and why none of them is a mock. What the
local node does not provide is everything *outside* chaincode: endorsement,
ordering, MSP validation, private-data confidentiality. Those are real
properties and they exist only on the real network.

---

## What the prototype does not prove

This is the short version. The full list is
[docs/LIMITATIONS.md](docs/LIMITATIONS.md), and it is worth reading before the
rest of the repository.

- **A2, identity resolution, is assumed.** There is no national ID verification
  service here. Two identities for one person defeat the uniqueness invariant
  *before* chaincode sees it, and chaincode cannot detect that. This is the
  strongest guarantee in the paper and it is the one the prototype cannot test.
- **Payment is mocked.** The adapter reproduces the idempotency and
  reconciliation semantics, not bKash.
- **Raft is crash-fault tolerant, not Byzantine.** Spreading the ordering nodes
  across institutional classes bounds who can stall the service. It does not
  make a malicious ordering majority harmless.
- **Scale is untested.** Toy volumes, one machine.
- **Metadata linkage is mitigated, not eliminated.** No on-chain field is
  protected health information on its own — the world-state scan checks this on
  every run — but category code, subject commitment, provider identity and
  timestamps together remain a linkage surface.

Two discrepancies between the paper and what the code derives are recorded in
[docs/FINDINGS.md](docs/FINDINGS.md), including one number in the governance
section that does not follow from the formula the paper itself states.

---

## Running it

Detail in [docs/RUNNING.md](docs/RUNNING.md). The short version:

```bash
./obhoy.sh dev          # the ledger + the web application on :7545
./obhoy.sh services     # the off-chain services on :7551-7565
./obhoy.sh test         # every suite
./obhoy.sh scenarios    # the adversarial harness
./obhoy.sh privacy      # dump the world state and scan it
./obhoy.sh anchor test  # the Solidity contract
./obhoy.sh fabric up    # the real network (needs Docker, run from WSL2)
```

`obhoy.ps1` takes the same subcommands on Windows. There is no `make` here
because there is no `make` on a stock Windows machine.

Requirements: **Go 1.21+** for the ledger. **Node 20+** for the services, the
gateway and the anchoring contract. **Docker** only for the real Fabric network.

---

## Reading it

If you have ten minutes, in this order:

1. [`invariants/invariants.go`](chaincode/obhoycc/invariants/invariants.go) —
   Appendix A of the paper, in code, with the equation numbers.
2. [`contracts/event.go`](chaincode/obhoycc/contracts/event.go) — `OpenEvent`,
   and the six refusals it makes in order.
3. [`contracts/invariants_test.go`](chaincode/obhoycc/contracts/invariants_test.go)
   — each invariant refusing what it should, and the three cases that must not
   fail.
4. [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md) — what none of this establishes.

---

Everything in this repository is synthetic. No real person, facility, policy or
national identity number appears anywhere in it; the demonstration identifiers
are structurally invalid by construction, and a test fails the build if anything
identifier-shaped reaches the ledger.
