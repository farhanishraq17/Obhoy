#!/usr/bin/env bash
#
# Run every suite in the prototype and capture the evidence.
#
#   ./Test_Runs/run-all.sh
#
# Writes a timestamped directory under Test_Runs/runs/ containing the raw
# output of each suite, a machine-readable scenario transcript, and a summary.
# Nothing is interpreted or reformatted on the way through -- what lands in
# those files is exactly what the tools printed, so a reader can check the
# summary against the raw output rather than taking it on trust.
#
# Exit status is non-zero if any suite failed, so this is usable in CI.

set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
CHAINCODE="$ROOT/chaincode/obhoycc"

STAMP="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
OUT="$HERE/runs/$STAMP"
mkdir -p "$OUT"

section() { printf '\n\033[1;36m==>\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m  %s\033[0m\n' "$*"; }
bad()  { printf '\033[1;31m  %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m  %s\033[0m\n' "$*"; }

if ! command -v go >/dev/null 2>&1 && [[ -x "${LOCALAPPDATA:-}/go-sdk/go/bin/go.exe" ]]; then
  export PATH="$PATH:$LOCALAPPDATA/go-sdk/go/bin"
fi

declare -a NAMES=() STATUS=() DETAIL=()

record() { NAMES+=("$1"); STATUS+=("$2"); DETAIL+=("$3"); }

# Every test runner here colours its output. An escape sequence captured into a
# count corrupts the summary table and, worse, prints as though something had
# failed. Strip colour and carriage returns before pulling any figure out of a
# log.
plain() { sed -e 's/\x1b\[[0-9;]*[a-zA-Z]//g' -e 's/\r$//' "$1"; }

# ------------------------------------------------------------- environment

section "Environment"
{
  echo "run          $STAMP"
  echo "host         $(uname -s) $(uname -m)"
  echo "go           $(go version 2>/dev/null || echo 'not installed')"
  echo "node         $(node --version 2>/dev/null || echo 'not installed')"
  echo "python       $( (python3 --version 2>/dev/null || python --version 2>&1) || echo 'not installed')"
  echo "docker       $( (docker version --format '{{.Server.Version}}' 2>/dev/null || echo 'daemon not reachable') | tr -d '
' )"
  echo "configtxgen  $(configtxgen --version 2>/dev/null | sed -n 2p | tr -d ' ' || echo 'not on PATH')"
  echo "commit       $(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo 'not a git repo')"
  echo "tree state   $(git -C "$ROOT" status --porcelain 2>/dev/null | wc -l | tr -d ' ') uncommitted change(s)"
} | tee "$OUT/00-environment.txt"

# --------------------------------------------------------- 1. chaincode

section "1/6  Chaincode - the Appendix A invariant suite"
if ( cd "$CHAINCODE" && go test ./... -v ) > "$OUT/01-chaincode-tests.txt" 2>&1; then
  n=$(grep -c '^--- PASS' "$OUT/01-chaincode-tests.txt")
  ok "$n tests passed"
  record "chaincode" "PASS" "$n tests"
else
  n=$(grep -c '^--- FAIL' "$OUT/01-chaincode-tests.txt")
  bad "$n tests FAILED - see 01-chaincode-tests.txt"
  record "chaincode" "FAIL" "$n failing"
fi

# ---------------------------------------------------------- 2. services

section "2/6  Services - threshold custody, keyed PRF, Merkle vectors"
if ( cd "$ROOT/services" && node --test test/services.test.js ) > "$OUT/02-services-tests.txt" 2>&1; then
  n=$(plain "$OUT/02-services-tests.txt" | sed -n 's/.*pass \([0-9][0-9]*\).*/\1/p' | head -1)
  ok "${n:-?} tests passed"
  record "services" "PASS" "${n:-?} tests"
else
  bad "FAILED - see 02-services-tests.txt"
  record "services" "FAIL" "see log"
fi

# --------------------------------------------------------- 3. scenarios

section "3/6  Adversarial harness - all thirteen scenarios"
( cd "$CHAINCODE" && go run ./cmd/scenarios ) > "$OUT/03-scenarios.txt" 2>&1
scen_status=$?
( cd "$CHAINCODE" && go run ./cmd/scenarios -json ) > "$OUT/04-scenarios.json" 2>/dev/null

if [[ $scen_status -eq 0 ]]; then
  line=$(plain "$OUT/03-scenarios.txt" | grep -E '[0-9]+ of [0-9]+ scenarios passed' | tail -1 | sed 's/^ *//')
  ok "$line"
  record "scenarios" "PASS" "$line"
else
  bad "one or more scenarios FAILED - see 03-scenarios.txt"
  record "scenarios" "FAIL" "see log"
fi

# ----------------------------------------------------- 4. step analysis

section "4/6  Per-step analysis - did each refusal cite the right invariant?"
PY="$(command -v python3 || command -v python || true)"
if [[ -n "$PY" ]] && [[ -s "$OUT/04-scenarios.json" ]]; then
  if "$PY" "$HERE/analyse.py" "$OUT/04-scenarios.json" > "$OUT/05-step-analysis.txt" 2>&1; then
    ok "$(plain "$OUT/05-step-analysis.txt" | grep -E 'steps total' | tail -1 | sed 's/^ *//')"
    record "step analysis" "PASS" "every step matched its asserted outcome"
  else
    bad "a step did not match its asserted outcome - see 05-step-analysis.txt"
    record "step analysis" "FAIL" "see log"
  fi
else
  warn "skipped - needs python and a scenario transcript"
  record "step analysis" "SKIP" "python not on PATH"
fi

# ------------------------------------------------------------ 5. anchor

section "5/6  Anchor - the Solidity contract"
if [[ -d "$ROOT/anchor/node_modules" ]]; then
  if ( cd "$ROOT/anchor" && npx hardhat test ) > "$OUT/06-anchor-tests.txt" 2>&1; then
    n=$(plain "$OUT/06-anchor-tests.txt" | grep -oE '[0-9]+ passing' | head -1)
    ok "${n:-passed}"
    record "anchor" "PASS" "${n:-passed}"
  else
    bad "FAILED - see 06-anchor-tests.txt"
    record "anchor" "FAIL" "see log"
  fi
else
  warn "skipped - run 'npm install' in anchor/ first"
  echo "skipped: anchor/node_modules is absent" > "$OUT/06-anchor-tests.txt"
  record "anchor" "SKIP" "dependencies not installed"
fi

# ---------------------------------------------------- 6. network config

section "6/6  Network - does configtx.yaml still produce valid channels?"
if command -v configtxgen >/dev/null 2>&1 && command -v cryptogen >/dev/null 2>&1; then
  if bash "$HERE/check-network.sh" > "$OUT/07-network-config.txt" 2>&1; then
    ok "three genesis blocks generated; endorsement policy verified"
    record "network config" "PASS" "3 channels, policy verified"
  else
    bad "FAILED - see 07-network-config.txt"
    record "network config" "FAIL" "see log"
  fi
else
  warn "skipped - cryptogen/configtxgen not on PATH"
  echo "skipped: Fabric binaries not on PATH." > "$OUT/07-network-config.txt"
  record "network config" "SKIP" "Fabric binaries not on PATH"
fi

# --------------------------------------------------------------- summary

FILES=(01-chaincode-tests.txt 02-services-tests.txt 03-scenarios.txt \
       05-step-analysis.txt 06-anchor-tests.txt 07-network-config.txt)

{
  echo "# Test run - $STAMP"
  echo
  echo "Produced by \`Test_Runs/run-all.sh\`. Every figure below is taken from the"
  echo "raw output in this directory; nothing here is retyped by hand."
  echo
  echo "| Suite | Result | Detail | Raw output |"
  echo "|---|---|---|---|"
  for i in "${!NAMES[@]}"; do
    icon="PASS"
    [[ "${STATUS[$i]}" == "FAIL" ]] && icon="FAIL"
    [[ "${STATUS[$i]}" == "SKIP" ]] && icon="SKIP"
    echo "| ${NAMES[$i]} | \`$icon\` | ${DETAIL[$i]} | [\`${FILES[$i]}\`](${FILES[$i]}) |"
  done
  echo
  echo "## Environment"
  echo
  echo '```'
  cat "$OUT/00-environment.txt"
  echo '```'
  echo
  echo "## Scenario summary"
  echo
  echo '```'
  plain "$OUT/03-scenarios.txt" | sed -n '/^SUMMARY$/,$p' | head -30
  echo '```'
  echo
  echo "## Appendix A coverage"
  echo
  echo '```'
  plain "$OUT/05-step-analysis.txt" 2>/dev/null | sed -n '/^Appendix A coverage/,/^====/p' | head -40
  echo '```'
} > "$OUT/README.md"

# Keep a stable pointer at the newest run so links to it do not rot.
cp "$OUT/README.md" "$HERE/LATEST.md" 2>/dev/null

section "Done"
echo
printf '  %-16s %-6s %s\n' "SUITE" "RESULT" "DETAIL"
printf '  %-16s %-6s %s\n' "----------------" "------" "------"
failed=0
for i in "${!NAMES[@]}"; do
  printf '  %-16s %-6s %s\n' "${NAMES[$i]}" "${STATUS[$i]}" "${DETAIL[$i]}"
  [[ "${STATUS[$i]}" == "FAIL" ]] && failed=1
done
echo
echo "  evidence written to Test_Runs/runs/$STAMP/"
echo "  summary            Test_Runs/LATEST.md"
echo
exit $failed
