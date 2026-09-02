# Test_Runs

The programs that run every suite in the prototype, and the captured output from
each run.

```bash
./Test_Runs/run-all.sh          # or  .\Test_Runs\run-all.ps1
```

Six checks, a timestamped directory of raw output under `runs/`, and a summary
at [`LATEST.md`](LATEST.md). Exit status is non-zero if anything failed, so it
drops into CI unchanged.

| | |
|---|---|
| [`run-all.sh`](run-all.sh) / [`run-all.ps1`](run-all.ps1) | The runner |
| [`analyse.py`](analyse.py) | Reads a scenario transcript step by step |
| [`check-network.sh`](check-network.sh) | Rebuilds the Fabric channels and reads the endorsement policy back out of the generated block |
| `runs/<timestamp>/` | One run, unedited |
| [`LATEST.md`](LATEST.md) | The newest summary, at a stable path |

A run directory holds:

```
00-environment.txt     versions, commit hash, whether the tree was clean
01-chaincode-tests.txt go test ./... -v          — the Appendix A invariants
02-services-tests.txt  node --test               — threshold custody, Merkle
03-scenarios.txt       the harness transcript    — human-readable
04-scenarios.json      the same, machine-readable
05-step-analysis.txt   analyse.py over the JSON  — the deeper check
06-anchor-tests.txt    hardhat test              — the Solidity contract
07-network-config.txt  check-network.sh          — configtx and the policy
README.md              the summary for that run
```

---

## Why analyse.py exists

`go run ./cmd/scenarios` prints pass or fail per scenario, and that turns out not
to be enough.

A scenario can go green while a step inside it quietly drifts, so the analyser
confirms every individual step got the outcome it asserted rather than trusting
the aggregate. More importantly, a refusal can happen for the *wrong reason*: if
`openEvent` started refusing because the provider was unaccredited rather than
because the subject already had an open event, S2 would still pass and would
prove nothing at all. So the analyser reads the refusal text and reports which
Appendix A equation each one actually cited.

It also prints which equations the harness never reaches. That distinction
matters more than it sounds — the harness is what a reviewer *watches*, the Go
tests are what a reviewer *reads*, and an invariant that only appears in the
second is a claim rather than a demonstration.

As it stands, equations **(2)** and **(5)** refuse correctly in the Go suite but
no scenario shows it, and **(7)** cannot be reached by an integration scenario at
all — it is implied by (6) under every domain profile in the paper
([FINDINGS.md](../docs/FINDINGS.md) §3). The unit tests cover all three, so this
is a thinner demonstration rather than a hole.

---

## Why the Go test files are not in this folder

They cannot be. Go requires `_test.go` files to sit in the same directory as the
package they test — moving `contracts/invariants_test.go` here would put it in a
different package, cut it off from the unexported functions it exercises, and
stop it compiling. That is the language, not a preference.

So the tests stay where Go needs them:

```
chaincode/obhoycc/contracts/harness_test.go       the fixture
chaincode/obhoycc/contracts/invariants_test.go    equations (2), (4)–(9)
chaincode/obhoycc/contracts/governance_test.go    governance, privacy, access
chaincode/obhoycc/internal/scenarios/             the thirteen scenarios
services/test/services.test.js                    threshold custody, Merkle
anchor/test/anchor.test.js                        the Solidity contract
```

This folder holds what runs them and what happened when it did. The split is a
useful one anyway: tests live beside the code so they stay honest as it changes,
and the evidence lives here so it can be committed, cited by commit hash in the
whitepaper, and read by someone who never builds the project.

---

## Reading a run

Start with the summary — six rows, one per suite. When everything passes, the
file still worth opening is `05-step-analysis.txt`, because that is where a green
run tells you something: every refusal, the invariant behind it, and the
equations nothing exercised. When something fails, the raw log named in the
summary row has the unedited output; nothing is summarised away.

Run directories are a few hundred kilobytes of text and are deliberately **not**
gitignored. A dated record of the suite passing, tied to the commit it passed at,
is the hardest thing to reconstruct after the fact and exactly what a submission
is asked for. Prune old ones by hand if the folder gets noisy, but keep the one
matching the commit hash cited in the paper.
