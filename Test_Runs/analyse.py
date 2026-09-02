#!/usr/bin/env python3
"""Check a scenario transcript step by step.

    python Test_Runs/analyse.py Test_Runs/runs/<stamp>/04-scenarios.json

`go run ./cmd/scenarios` already reports pass or fail per scenario. This goes a
level deeper and asks the questions a pass/fail line cannot answer:

  * Did every step get the outcome it asserted, or did a scenario pass while a
    step inside it drifted?
  * When the ledger refused something, did it refuse for the RIGHT reason? A
    refusal that cites the wrong invariant -- or no invariant at all -- is a
    refusal that would still make the scenario green while proving nothing.
  * Which of Appendix A's equations does the harness actually exercise, and
    which are covered only by the Go unit tests?

The last one matters. The harness is the evidence a reviewer watches; the unit
tests are the evidence a reviewer reads. Knowing which equations appear only in
the second is the difference between a demonstration and a claim.

Exit status is non-zero if any step failed its assertion.
"""

import collections
import json
import io
import re
import sys

# On Windows, sys.stdout falls back to the locale encoding (cp1252) when it is
# redirected to a file. Every em dash in this output would then be written as a
# cp1252 byte, and the captured evidence -- which is committed and read on
# GitHub -- would come back as mojibake. Pin it.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Every invariant in Appendix A, and where the refusal for it is demonstrated.
APPENDIX_A = {
    "(2)": "coordination of benefits — sum paid <= loss / cap",
    "(4)": "no two open events share a subject commitment",
    "(5)": "a continuation preserves the subject and is not consumed",
    "(6)": "eligibility spans at least two attesting classes",
    "(7)": "at least one attestation is not from the payee",
    "(8)": "at most one entitlement per (event, policy) pair",
    "(9)": "settlement needs an eligible event, a valid policy, no re-open",
}

# Equations the harness is not expected to reach, and why. Anything refused
# here that is NOT in this map is a genuine gap in the demonstration.
EXPECTED_ABSENT = {
    "(7)": (
        "implied by (6) under every domain profile in the paper, since each has "
        "exactly one payee class and attestEvent refuses a repeated class. "
        "Covered directly by TestInvariant_NonPayeeAttestationRequired. "
        "See docs/FINDINGS.md section 3."
    ),
}


def main(path):
    runs = json.load(io.open(path, encoding="utf-8"))
    failures = []

    print(f"{len(runs)} scenarios, analysed step by step\n")
    print(f"  {'ID':<5} {'RESULT':<7} {'STEPS':>5} {'REFUSED':>8}  TITLE")
    print(f"  {'-'*5} {'-'*7} {'-'*5} {'-'*8}  {'-'*46}")

    with_refusal, without_refusal = [], []
    equations = collections.Counter()
    uncited = []

    for run in runs:
        steps = run["steps"]
        refusals = [s for s in steps if s["got"] == "refused"]
        (with_refusal if refusals else without_refusal).append(run["id"])

        for step in steps:
            if not step["ok"]:
                failures.append((run["id"], step))

        for step in refusals:
            found = re.search(r"invariant (\(\d\))", step["detail"])
            if found:
                equations[found.group(1)] += 1
            else:
                uncited.append((run["id"], step))

        verdict = "PASS" if run["passed"] else "FAIL"
        print(f"  {run['id']:<5} {verdict:<7} {len(steps):>5} {len(refusals):>8}  {run['title'][:46]}")

    total = sum(len(r["steps"]) for r in runs)
    refused = sum(1 for r in runs for s in r["steps"] if s["got"] == "refused")
    print(f"\n  {total} steps total: {refused} refusals, {total - refused} accepted")

    # ---------------------------------------------------------------- shape
    print(f"\n{'=' * 72}")
    print("How the scenarios pass")
    print(f"{'=' * 72}\n")
    print(f"  by producing a REFUSAL   {len(with_refusal):>2}   {', '.join(with_refusal)}")
    print(f"  by SUCCEEDING            {len(without_refusal):>2}   {', '.join(without_refusal)}")
    print("\n  The second group is not the weaker one. A uniqueness rule that also")
    print("  blocked a hospital transfer, a readmission or a second valid policy")
    print("  would not be a stricter system -- it would be a broken one.")

    # ------------------------------------------------------------ refusals
    print(f"\n{'=' * 72}")
    print("Every refusal, and the reason the ledger gave for it")
    print(f"{'=' * 72}\n")
    for run in runs:
        for step in run["steps"]:
            if step["got"] != "refused":
                continue
            found = re.search(r"invariant (\(\d\))", step["detail"])
            tag = found.group(1) if found else " -- "
            print(f"  {run['id']:<4} step {step['n']:<2} {tag:<5} {step['action'][:36]}")
            print(f"       {step['detail'][:96]}")

    # ----------------------------------------------------------- coverage
    print(f"\n{'=' * 72}")
    print("Appendix A coverage — which equations does the HARNESS exercise?")
    print(f"{'=' * 72}\n")
    gaps = []
    for eq, desc in sorted(APPENDIX_A.items()):
        count = equations.get(eq, 0)
        if count:
            mark, note = "demonstrated", f"{count} refusal(s) in the harness"
        elif eq in EXPECTED_ABSENT:
            mark, note = "unit test    ", "not reachable here — see below"
        else:
            mark, note = "UNIT TEST ONLY", "not demonstrated by any scenario"
            gaps.append(eq)
        print(f"  {eq}  {mark}   {desc}")
        print(f"        {note}")

    if EXPECTED_ABSENT:
        print("\n  Documented as not reachable by an integration scenario:")
        for eq, why in EXPECTED_ABSENT.items():
            print(f"    {eq}  {why}")

    if gaps:
        print(f"\n  GAP: {', '.join(gaps)} refuse correctly in the Go unit suite but no")
        print("  scenario shows it. The unit tests cover them, so this is not a")
        print("  correctness problem -- it is a demonstration that is thinner than")
        print("  it could be. Worth a scenario each if the video has room.")

    if uncited:
        print(f"\n  {len(uncited)} refusal(s) cite no invariant number. That is expected for")
        print("  access-control and governance refusals, which are not Appendix A rules:")
        for sid, step in uncited:
            print(f"    {sid} step {step['n']}: {step['action'][:60]}")

    # ------------------------------------------------------------ verdict
    print(f"\n{'=' * 72}")
    if failures:
        print(f"FAILED — {len(failures)} step(s) did not match their asserted outcome")
        print(f"{'=' * 72}\n")
        for sid, step in failures:
            print(f"  {sid} step {step['n']} ({step['actor']} {step['action']})")
            print(f"    expected {step['expect']}, got {step['got']}")
            print(f"    {step['detail'][:160]}")
        return 1

    print("PASSED — every step matched its asserted outcome")
    print(f"{'=' * 72}")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    sys.exit(main(sys.argv[1]))
