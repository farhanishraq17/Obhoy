# Demonstration runbook

Ten minutes, timed to the 600-second video requirement. Every claim below is
demonstrated live rather than described; nothing is a slide.

**Before you start**

```bash
./obhoy.sh dev          # terminal 1 — the ledger and the web application
./obhoy.sh services     # terminal 2 — the off-chain services
```

Open http://localhost:7545. Have a second terminal ready for the curl commands
in sections 4 and 6.

---

## 0:00–1:00 · Team and the problem

Per the competition rules, each member's responsibility is stated in this first
minute — that requirement belongs to the video, not the whitepaper.

The problem, in one number: general insurers in Bangladesh settled **9.37%** of
filed claims in the final quarter of 2025. Not "claims were disputed" — nine in
a hundred were paid.

The thesis in one sentence: **nobody can independently check that the insured
event happened, because the only record comes from a party with a stake in it.**

---

## 1:00–2:30 · The claim path works

*Screen: Claim desk, acting as Provider association.*

1. Assert an admission. Point out that the event identifier is **derived**, not
   supplied — `H(subjectCommitment ‖ admissionWindow)` — and that diagnosis and
   provider are deliberately absent from it, so changing either cannot mint a
   different event.
2. Switch to **Independent clinician**. Attest. Note the "1 of 2" becoming
   "2 of 2": the quorum spans *classes*, not signatures.
3. Close the episode.
4. Switch to **Insurer A**. Claim, adjudicate, authorise the payout.

Say while adjudicating: *the amount comes from a benefit schedule published in
advance, keyed by category. It is not a number the claimant wrote down. Inflating
an invoice earns nothing here, because no invoice is read.*

---

## 2:30–4:00 · The headline: refusal at commit

*Still on the Claim desk, as Provider association.*

Assert the **same subject** from a second facility without closing the first.

```
invariant (4) violated: subject already has open event 9dc18c22…;
use continueEvent for a transfer or readmission
```

Then go to **Ledger** and show the refused transaction: recorded as an attempt,
**write set empty**.

The line to land: *these two hospitals answer to two different insurers who
cannot see each other's books at any price. The second claim was refused before
it was written. No single-party database can do that, because no single party
can see both sides. That is the answer to "why blockchain".*

---

## 4:00–5:30 · The harder half — not breaking legitimate care

A uniqueness rule that also blocks real medicine is not a stricter system; it is
a broken one. Three cases, from the **Harness** tab — run S4, S5 and S6.

- **S5 Transfer.** Upazila to district. Two admissions, one clinical episode,
  one benefit. The receiving hospital adds a *segment*; it does not open a second
  event, and it is not refused at the worst possible moment.
- **S6 Readmission.** Links to the same event, judged against a single ceiling.
- **S4 Dual cover.** A garment worker with an employer scheme *and* an MFI
  hospital-cash policy. **Both settle.** Blocking the second because the event
  was "already claimed" would deny valid cover, and a regulator would reject the
  design on first reading.

Show the coverage view in S4: *before Insurer B settles, it can see what Insurer
A already paid. Today no insurer in this market can see that at any price. The
ledger does not forbid the second claim — it lets the second insurer see the
first.*

---

## 5:30–7:00 · Privacy, checked rather than asserted

*Screen: Ledger tab, world state.*

Scroll the entire world state. Every subject is a 32-byte commitment. The banner
reports the identifier scan: **no national identity number, no name, no
free-text diagnosis, on any key.** It runs as a test on every build.

Then be precise about what that is not:

> This is not anonymity. Category code, subject commitment, provider identity
> and timestamps together are a metadata surface. The paper treats that residual
> as a data-protection question rather than a solved problem, and so do we.

*Switch to terminal.* Threshold custody, live:

```bash
curl -s -XPOST localhost:7560/commit -H 'content-type: application/json' \
     -d '{"nid":"0000100000001","context":"event"}'
```

Take one custodian offline — commitments still issue, from a different pair, and
the value is **identical**. Take a second offline — they stop.

> The key that turns an identity number into a commitment is split across three
> organisations in three different classes. No single class can compute a
> commitment. No single class can be compelled to.

---

## 7:00–8:15 · Governance that binds

*Screen: Governance tab.*

The weight table, and the two numbers recomputed from it on-chain each period:
**Nakamoto Coefficient 3**, **Gini 0.14**.

Propose the distribution that pushes insurers to 0.35. **Refused, before any
vote is taken.** Then the one that drops the Nakamoto Coefficient to 2. Refused.
Then a compliant one — vote it through with three classes, 0.30 + 0.20 + 0.20 =
0.70, past the two-thirds threshold.

> The council cannot vote itself past its own concentration limits. That is what
> "the metrics bind rather than describe" means, and it is enforced in chaincode.

Then run **S9** from the harness: an insurer denies a claim, the denial is
appealed, and the same insurer tries to decide the appeal. Refused —
*conflict of interest* — in the contract, not in a policy document.

---

## 8:15–9:15 · Two chains

*Screen: Oversight tab.* Close a settlement period. The totals were never
declared — they accrued from the claim path.

*Terminal:*

```bash
cd anchor && npx hardhat run scripts/anchor.js --network localhost
```

Read the output aloud as it goes: the script **rebuilds the Merkle root from the
published figures itself** and refuses to submit if it disagrees with the
chaincode's root. Then the transaction hash and `verifyRoot true`.

Back on **Published record**, verify a figure — and then try one that was never
committed. It has no path to the root.

> Confidentiality inside, immutability outside. A consortium can be captured or
> legally compelled; if the totals live only inside it, it can rewrite them. And
> the honest limit: anchoring binds integrity *after inclusion*, not
> completeness. A claim that never reached the ledger is absent from the tree.

---

## 9:15–10:00 · Who this is for, and what it does not prove

*Screen: USSD tab.*

> The target household does not have a smartphone. A scheme that assumes one has
> already excluded the people it was built for. Every policyholder function is
> reachable on a feature phone, over the menus bKash already taught this
> population to use — and nobody is asked to manage a private key, because a
> scheme that costs a widow her cover because she lost a seed phrase is worse
> than no scheme.

Close on the limits, in your own voice, not on a claim:

> What this does not prove. Identity resolution is assumed — two identities for
> one person defeat the invariant before the chaincode sees it, and that is the
> strongest guarantee in the paper and the one we cannot test. Payment is mocked.
> Raft is crash-fault tolerant, not Byzantine. Scale is untested. And payee–
> verifier collusion is not closed by anything here; we score it and flag it, and
> a flag is a place to look, not a finding.

---

## The thirteen scenarios, for reference

Run the whole set from the **Harness** tab, or:

```bash
./obhoy.sh scenarios
```

| | Scenario | Criterion |
|---|---|---|
| S1 | Happy path: a claim settles | Problem & Solution |
| S2 | **Cross-insurer duplicate refused at commit** | Problem & Solution |
| S3 | Second entitlement on the same policy refused | Problem & Solution |
| S4 | **Genuine dual cover pays** | Problem & Solution |
| S5 | Transfer between facilities settles once | Problem & Solution |
| S6 | Readmission inside the window links | Problem & Solution |
| S7 | Payee cannot corroborate itself | Architecture |
| S8 | De-accredited provider cannot re-register clean | Governance |
| S9 | Denying insurer cannot decide the appeal | Governance |
| S10 | Period anchored; tampering detected | Problem & Solution |
| S11 | Access control and the world state | Privacy & Security |
| S12 | Payout instructions are payload-bound | Architecture |
| G1 | Governance caps bind, not describe | Governance |

Nine of these pass by producing a refusal. If you have time for only one, it is
S2 — and if you have time for two, the second is S4, because it is the one that
shows the mechanism is not simply strict.

---

## If something goes wrong on the day

- **Everything is local.** No internet, no faucet, no testnet, no Docker on the
  demonstration path. The only thing that can fail is the node not being started.
- **Restart resets cleanly.** `Ctrl-C`, `./obhoy.sh dev`, and the demonstration
  network is rebuilt in under a second.
- **The harness runs against its own ledger.** Firing S2 does not leave wreckage
  in the ledger you are browsing, so you can run scenarios in any order and go
  back to the claim desk afterwards.
