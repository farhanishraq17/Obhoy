#!/usr/bin/env bash
#
# Obhoy prototype task runner (bash / WSL / macOS / Linux).
#
# The PowerShell twin of this file is obhoy.ps1. They are kept in step
# deliberately: a team running half on Windows and half in WSL should not have
# to translate commands between them.
#
# Nothing here needs Docker except `fabric`. The demonstration path -- the
# ledger, the web application, all thirteen scenarios -- runs on Go alone.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHAINCODE="$ROOT/chaincode/obhoycc"
PORT="${OBHOY_PORT:-7545}"

head()  { printf '\n\033[1;36m==>\033[0m %s\n' "$*"; }
ok()    { printf '\033[1;32m%s\033[0m\n' "$*"; }
bad()   { printf '\033[1;31m%s\033[0m\n' "$*"; }
warn()  { printf '\033[1;33m%s\033[0m\n' "$*"; }

need_go() {
  if ! command -v go >/dev/null 2>&1; then
    if [[ -x "$LOCALAPPDATA/go-sdk/go/bin/go.exe" ]]; then
      export PATH="$PATH:$LOCALAPPDATA/go-sdk/go/bin"
    else
      bad "Go is not on PATH. Install Go 1.21 or later from https://go.dev/dl/"; exit 1
    fi
  fi
}

usage() {
  cat <<'EOF'

  Obhoy prototype

    ./obhoy.sh dev              start the ledger and the web application
    ./obhoy.sh services         start the off-chain services
    ./obhoy.sh test             run every test suite
    ./obhoy.sh scenarios [S2]   run the adversarial harness, or one scenario
    ./obhoy.sh privacy          dump the world state and scan it
    ./obhoy.sh anchor test      compile and test the anchoring contract
    ./obhoy.sh fabric up        bring up the real Fabric network (needs Docker)
    ./obhoy.sh clean            remove build output and generated material

  Start here:
    ./obhoy.sh dev    then open http://localhost:7545

EOF
}

task_dev() {
  need_go
  head "Starting the local node on http://localhost:$PORT"
  echo "  The web application is served from the same port. Ctrl-C to stop."
  cd "$CHAINCODE"
  exec go run ./cmd/localnode -addr ":$PORT" -web "$ROOT/web"
}

task_services() {
  head "Starting the off-chain services"
  cd "$ROOT/services"
  exec node src/index.js
}

task_test() {
  need_go
  local failed=()

  head "Chaincode: the Appendix A invariant suite"
  ( cd "$CHAINCODE" && go test ./... ) || failed+=("chaincode")

  head "Services: threshold custody and the Merkle vectors"
  ( cd "$ROOT/services" && node --test test/services.test.js ) || failed+=("services")

  head "Scenarios: the adversarial harness"
  ( cd "$CHAINCODE" && go run ./cmd/scenarios -quiet ) || failed+=("scenarios")

  if [[ -d "$ROOT/anchor/node_modules" ]]; then
    head "Anchor: the Solidity contract"
    ( cd "$ROOT/anchor" && npx hardhat test ) || failed+=("anchor")
  else
    warn "  skipping the anchor tests -- run npm install in anchor/ first"
  fi

  echo
  if [[ ${#failed[@]} -eq 0 ]]; then
    ok "  every suite passed"; echo
  else
    bad "  failed: ${failed[*]}"; echo; exit 1
  fi
}

task_scenarios() {
  need_go
  cd "$CHAINCODE"
  if [[ -n "${1:-}" ]]; then go run ./cmd/scenarios -id "$1"; else go run ./cmd/scenarios; fi
}

task_privacy() {
  head "Scanning the world state for anything identifier-shaped"
  local state
  state="$(curl -sf "http://localhost:$PORT/api/ledger/state")" || {
    bad "  The node is not answering on port $PORT. Start it with ./obhoy.sh dev"; exit 1; }

  local py
  py="$(command -v python3 || command -v python || true)"
  [[ -n "$py" ]] || { bad "  python is needed for this check and is not on PATH"; exit 1; }

  "$py" - "$state" <<'PY'
import json, re, sys
state = json.loads(sys.argv[1])["result"]
nid = re.compile(r'"(\d{10}|\d{13}|\d{17})"')
words = re.compile(r'(?i)(diagnosis|patient|surname)')
suspects = [k for k, v in state.items() if nid.search(k + " " + v) or words.search(k + " " + v)]
print()
print(f"  {len(state)} world-state keys scanned")
if suspects:
    print("  FOUND identifier-shaped values in:")
    for s in suspects:
        print("   ", s)
    sys.exit(1)
print("  no national identity number, name or free-text diagnosis found")
print()
print("  This is not a claim of anonymity. Category code, subject commitment,")
print("  provider identity and timestamps together remain a metadata surface.")
print()
PY
}

task_fabric() {
  local sub="${1:-status}"
  head "Fabric: $sub"
  if [[ "$(uname -s)" == MINGW* || "$(uname -s)" == MSYS* ]]; then
    warn "  Run this from WSL2 Ubuntu with the repository on the ext4 filesystem."
    warn "  On /mnt/d the TLS key file modes cannot be represented and the peers"
    warn "  fail the handshake in a way that looks like a certificate problem."
    echo
  fi
  bash "$ROOT/network/scripts/network.sh" "$sub" "${2:-demo}"
}

task_anchor() {
  local sub="${1:-test}"
  cd "$ROOT/anchor"
  [[ -d node_modules ]] || { head "Installing anchor dependencies"; npm install --no-audit --no-fund; }
  head "Anchor: $sub"
  case "$sub" in
    test)   npx hardhat test ;;
    node)   npx hardhat node ;;
    deploy) npx hardhat run scripts/deploy.js --network localhost ;;
    run)    npx hardhat run scripts/anchor.js --network localhost ;;
    *)      npx hardhat "$sub" ;;
  esac
}

task_clean() {
  head "Cleaning"
  for p in organizations channel-artifacts chaincode/obhoycc/vendor anchor/artifacts anchor/cache; do
    if [[ -e "$ROOT/$p" ]]; then rm -rf "$ROOT/$p"; echo "  removed $p"; fi
  done
  echo "  (node_modules left in place; delete them by hand if you mean it)"
  echo
}

case "${1:-help}" in
  dev)       task_dev ;;
  services)  task_services ;;
  test)      task_test ;;
  scenarios) task_scenarios "${2:-}" ;;
  privacy)   task_privacy ;;
  fabric)    task_fabric "${2:-status}" "${3:-demo}" ;;
  anchor)    task_anchor "${2:-test}" ;;
  clean)     task_clean ;;
  *)         usage ;;
esac
