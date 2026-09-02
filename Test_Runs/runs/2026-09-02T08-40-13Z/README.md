# Test run - 2026-09-02T08-40-13Z

Produced by `Test_Runs/run-all.sh`. Every figure below is taken from the
raw output in this directory; nothing here is retyped by hand.

| Suite | Result | Detail | Raw output |
|---|---|---|---|
| chaincode | `PASS` | 21 tests | [`01-chaincode-tests.txt`](01-chaincode-tests.txt) |
| services | `PASS` | 7 tests | [`02-services-tests.txt`](02-services-tests.txt) |
| scenarios | `PASS` | 13 of 13 scenarios passed | [`03-scenarios.txt`](03-scenarios.txt) |
| step analysis | `PASS` | every step matched its asserted outcome | [`05-step-analysis.txt`](05-step-analysis.txt) |
| anchor | `PASS` | 7 passing | [`06-anchor-tests.txt`](06-anchor-tests.txt) |
| network config | `PASS` | 3 channels, policy verified | [`07-network-config.txt`](07-network-config.txt) |

## Environment

```
run          2026-09-02T08-40-13Z
host         MINGW64_NT-10.0-26200 x86_64
go           go version go1.23.4 windows/amd64
node         v24.11.1
python       Python 3.13.3
docker       daemon not reachable
configtxgen  Version:v2.5.10
commit       a2377dd
tree state   4 uncommitted change(s)
```

## Scenario summary

```
SUMMARY
------------------------------------------------------------------------------
  PASS  S1   Happy path: a claim settles                    Problem & Solution
  PASS  S2   Cross-insurer duplicate refused at commit      Problem & Solution
  PASS  S3   Second entitlement on the same policy refused  Problem & Solution
  PASS  S4   Genuine dual cover pays                        Problem & Solution
  PASS  S5   Transfer between facilities settles once       Problem & Solution
  PASS  S6   Readmission inside the window links            Problem & Solution
  PASS  S7   Payee cannot corroborate itself                Architecture
  PASS  S8   De-accredited provider cannot re-register cle… Governance
  PASS  S9   Denying insurer cannot decide the appeal       Governance
  PASS  S10  Period anchored; tampering detected            Problem & Solution
  PASS  S11  Access control and the world state             Privacy & Security
  PASS  S12  Payout instructions are payload-bound          Architecture
  PASS  G1   Governance caps bind, not describe             Governance
------------------------------------------------------------------------------
  13 of 13 scenarios passed

```

## Appendix A coverage

```
Appendix A coverage — which equations does the HARNESS exercise?
========================================================================
```
