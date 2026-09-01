# Findings against the whitepaper

Building the prototype surfaced things the paper gets wrong or leaves
ambiguous. They are recorded here rather than silently patched in code, because
the paper is the deliverable being defended and the authors need to decide what
to do about each one.

Two of these change what the paper should say. Two are implementation
ambiguities that had to be resolved to write the chaincode at all.

---

## 1. The comparison Gini coefficient does not follow from the paper's own formula

**Where:** Section 6.2, "Governance voting weights and measured decentralisation".

**What the paper says.** Obhoy's weights (0.30 / 0.20 / 0.20 / 0.15 / 0.15) give
a Gini of 1.40/10 = **0.14** and a Nakamoto Coefficient of **3**. It then
compares against a published three-class consortium model weighted
0.4 / 0.3 / 0.3, reporting **Gini 0.26** and **Nakamoto Coefficient 2**.

**What the formula gives.** Using the formula the same paragraph states,

    G = Σ_i Σ_j |w_i − w_j| / (2 n² w̄)

- Obhoy's weights: ΣΣ|w_i − w_j| = 1.40, n = 5, w̄ = 0.2, so
  G = 1.40 / (2 × 25 × 0.2) = 1.40/10 = **0.14**. ✔ Matches the paper exactly.
- The comparison weights: ΣΣ|w_i − w_j| = 0.40, n = 3, w̄ = 1/3, so
  G = 0.40 / (2 × 9 × 0.333…) = 0.40/6 = **0.0667**. ✘ The paper says 0.26.

The formula is not in doubt — applied to Obhoy's own weights it reproduces the
paper's number exactly, which is what makes the second figure conspicuous. The
alternative normalisation (dividing by 2n(n−1)w̄) gives 0.10, also not 0.26.

**Why it matters.** The comparison is used to support a claim of *wider*
dispersion than a published alternative. On the Gini, the correctly computed
figures say the opposite: 0.14 against 0.0667 makes the three-class model **more**
equal, because three near-equal weights are more equal than five unequal ones.
A reviewer who checks the arithmetic will find this, and finding it undermines
the paragraph it sits in.

**What still holds.** The Nakamoto Coefficient comparison is correct and is the
load-bearing one: 0.4 + 0.3 = 0.7 clears a majority with two classes, so NC = 2,
against Obhoy's 3. "Two classes cannot reach a majority and three can" is a real
structural property, and it is the one that constrains capture. The Gini is a
descriptive statistic; the Nakamoto Coefficient is the binding one.

**Recommendation.** Either resolve 0.26 against the primary source — it may be
computed on a different basis there, over member firms rather than classes, in
which case say so — or drop the Gini from the comparison and make the argument
on the Nakamoto Coefficient, where it is sound. Do not report a Gini that the
paper's own formula contradicts.

**In the code.** `ComputeMetrics` implements the stated formula.
`TestGovernanceMetrics_MatchThePaper` asserts 0.14 and NC 3 for Obhoy's weights,
asserts NC 2 for the comparison, and asserts 0.0667 for its Gini with this
discrepancy referenced in the test body. Nothing in the code adopts either
number silently.

---

## 2. The event state list contradicts the state machine

**Where:** Section 5.8 lists the on-chain event state as

    State ∈ {OPEN, CLOSED_ELIGIBLE, SETTLED, DENIED, APPEALED, EXPIRED}

**But** Section 5.6 says the event "reaches CLOSED_ELIGIBLE once and stays
there — it has no settlement state of its own, so a second legitimate
entitlement can still settle against it later", and that the entitlement is what
settlement consumes.

These cannot both be true. If an event can be SETTLED, then a second entitlement
against a settled event is settling against a consumed object, and the dual-cover
case the paper spends a subsection defending becomes incoherent.

**Resolved as:** Section 5.6 is correct and is what the chaincode implements.

    EventState       = OPEN | CLOSED_ELIGIBLE | EXPIRED
    EntitlementState = CREATED | ADJUDICATED | SETTLED | DENIED | APPEALED | DENIED_UPHELD

`TestDualCover_BothPoliciesSettle` and scenario S4 both depend on this. Under
the §5.8 reading they would fail, and correctly so.

**Recommendation.** Correct the field list in §5.8 to name only the three event
states. It is a one-line fix and it removes a real contradiction from the
architecture section.

---

## 3. Equation (7) is implied by equation (6) under every profile in the paper

**Where:** Appendix A.

    (6)  Elig(e) ⇒ |{cls(a)}| ≥ 2
    (7)  Elig(e) ⇒ ∃ a ∈ Att(e) : cls(a) ≠ Pay(e)

Under every domain profile in Table II exactly one class is the payee — the
hospital in health, the workshop in motor — and `attestEvent` refuses a class
that has already attested. Given both, an attestation set spanning two classes
*necessarily* contains a non-payee one. So on these profiles (7) can never fire
without (6) firing first.

This is not a defect. It is a redundant guard, and it stops being redundant the
moment a profile designates more than one payee-side class — a hospital and a
diagnostic centre under common ownership, say, which is exactly the pairing the
collusion row of the fraud taxonomy is about.

**Resolved as:** the check is kept and tested on its own terms
(`TestInvariant_NonPayeeAttestationRequired`) so that widening the profile cannot
silently remove it. `PayeeClass` is a per-profile parameter, not a constant.

**Recommendation.** No change to the paper is required, but a sentence in
Appendix A noting that (7) becomes load-bearing only when the payee side spans
more than one class would pre-empt the question from a technical reviewer.

---

## 4. "openEvent checks the policy is active" needs a reading

**Where:** Section 5.8: "`openEvent` checks the policy is active and the
asserting party accredited".

An event is policy-independent — that is the entire point of splitting events
from entitlements — so there is no single policy for `openEvent` to check.

**Resolved as:** `openEvent` requires that *at least one* active policy responds
to the subject at the time of the event. Which policies actually respond is
settled later, per entitlement. This refuses an assertion against someone with
no cover at all, which is presumably what the sentence intends, without
reintroducing a policy dependency into the event.

**Recommendation.** Reword to "checks that some cover was live and the asserting
party accredited".

---

## 5. Minor: the continuation window is unspecified

The paper says a readmission "inside a set window" links to the same event but
never sets the window. The prototype makes it a domain-profile parameter —
30 days for health, 120 for crop — so it is a configuration decision rather than
a constant buried in code. Worth stating in the paper, since it is a clinical
judgement rather than an engineering one and an actuary will ask.
