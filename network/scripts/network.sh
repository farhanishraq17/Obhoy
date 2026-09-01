#!/usr/bin/env bash
#
# Bring the Fabric network up, create the channels, deploy the chaincode.
#
#   ./network.sh up      [dev|demo]      crypto material, containers, channels
#   ./network.sh deploy  [dev|demo]      package, install, approve, commit
#   ./network.sh status  [dev|demo]      the org / peer / orderer table
#   ./network.sh down    [dev|demo]      stop and remove everything
#
# Run this from WSL2 Ubuntu with the repository on the ext4 filesystem, NOT on
# /mnt/d. Fabric's TLS key files must be mode 0600 and the Windows mount cannot
# represent that; the peers start and then fail to handshake, which looks like a
# certificate problem and is not one.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="$(cd "$HERE/.." && pwd)"
ROOT="$(cd "$NETWORK_DIR/.." && pwd)"

PROFILE="${2:-demo}"
FABRIC_VERSION="2.5.10"
CC_NAME="obhoycc"
CC_VERSION="1.0"
CC_SEQUENCE="${CC_SEQUENCE:-1}"

if [[ "$PROFILE" == "dev" ]]; then
  COMPOSE_FILE="$NETWORK_DIR/compose/docker-compose.dev.yaml"
  CHANNELS=("obhoy-dev")
  MAIN_CHANNEL="obhoy-dev"
  PEER_ORGS=("provider" "field" "insurera")
  ORDERERS=("orderer1.idra.obhoy.local:7053:idra")
else
  COMPOSE_FILE="$NETWORK_DIR/compose/docker-compose.demo.yaml"
  CHANNELS=("obhoy-main" "obhoy-audit")
  MAIN_CHANNEL="obhoy-main"
  PEER_ORGS=("provider" "clinical" "field" "insurera" "insurerb" "regulator" "academic")
  ORDERERS=(
    "orderer1.idra.obhoy.local:7053:idra"
    "orderer2.insurera.obhoy.local:8053:insurera"
    "orderer3.insurerb.obhoy.local:9053:insurerb"
    "orderer4.aggregator.obhoy.local:10053:aggregator"
    "orderer5.academic.obhoy.local:11053:academic"
  )
fi

declare -A MSP_OF=(
  [provider]=ProviderMSP [clinical]=ClinicalMSP [field]=FieldMSP
  [insurera]=InsurerAMSP [insurerb]=InsurerBMSP
  [regulator]=RegulatorMSP [academic]=AcademicMSP
)
declare -A PORT_OF=(
  [provider]=7051 [clinical]=8051 [field]=9051
  [insurera]=10051 [insurerb]=11051
  [regulator]=12051 [academic]=13051
)
# The audit channel carries transparency aggregates only. The insurers are not
# members of it, which is the point: the regulator and the academic auditor read
# continuously without seeing commercial detail.
AUDIT_ORGS=("regulator" "academic" "provider")

log()  { printf '\n\033[1;36m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m !\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31mxx\033[0m %s\n' "$*" >&2; exit 1; }

require() {
  command -v "$1" >/dev/null 2>&1 || die "$1 is not on PATH. See docs/RUNNING.md."
}

compose() { docker compose -f "$COMPOSE_FILE" "$@"; }

# ---------------------------------------------------------------------- up

generate_material() {
  log "Generating crypto material and channel genesis blocks"
  require cryptogen
  require configtxgen

  rm -rf "$ROOT/organizations" "$ROOT/channel-artifacts"
  mkdir -p "$ROOT/channel-artifacts"

  cryptogen generate --config="$NETWORK_DIR/crypto-config.yaml" --output="$ROOT/organizations"

  export FABRIC_CFG_PATH="$NETWORK_DIR"
  for ch in "${CHANNELS[@]}"; do
    case "$ch" in
      obhoy-main)  profile=ObhoyMainChannel ;;
      obhoy-audit) profile=ObhoyAuditChannel ;;
      obhoy-dev)   profile=ObhoyDevChannel ;;
    esac
    configtxgen -profile "$profile" -channelID "$ch" \
      -outputBlock "$ROOT/channel-artifacts/$ch.block"
    echo "    $ch <- $profile"
  done
}

start_containers() {
  log "Starting containers ($PROFILE profile)"
  compose up -d
  echo "    waiting for peers to accept connections"
  sleep 8
}

join_orderers() {
  local channel="$1"
  log "Joining ordering nodes to $channel"
  for entry in "${ORDERERS[@]}"; do
    IFS=':' read -r host port domain <<<"$entry"
    # The audit channel runs on two consenters only, so skip the rest.
    if [[ "$channel" == "obhoy-audit" && "$domain" != "idra" && "$domain" != "academic" ]]; then
      continue
    fi
    local tlsdir="$ROOT/organizations/ordererOrganizations/$domain.obhoy.local/orderers/${host%%.*}.$domain.obhoy.local/tls"
    osnadmin channel join \
      --channelID "$channel" \
      --config-block "$ROOT/channel-artifacts/$channel.block" \
      -o "localhost:$port" \
      --ca-file "$tlsdir/ca.crt" \
      --client-cert "$tlsdir/server.crt" \
      --client-key "$tlsdir/server.key" >/dev/null
    echo "    $host joined $channel"
  done
}

peer_env() {
  local org="$1"
  export CORE_PEER_TLS_ENABLED=true
  export CORE_PEER_LOCALMSPID="${MSP_OF[$org]}"
  export CORE_PEER_TLS_ROOTCERT_FILE="$ROOT/organizations/peerOrganizations/$org.obhoy.local/peers/peer0.$org.obhoy.local/tls/ca.crt"
  export CORE_PEER_MSPCONFIGPATH="$ROOT/organizations/peerOrganizations/$org.obhoy.local/users/Admin@$org.obhoy.local/msp"
  export CORE_PEER_ADDRESS="localhost:${PORT_OF[$org]}"
  export FABRIC_CFG_PATH="$NETWORK_DIR/config"
}

orderer_tls() {
  echo "$ROOT/organizations/ordererOrganizations/idra.obhoy.local/orderers/orderer1.idra.obhoy.local/tls/ca.crt"
}

join_peers() {
  local channel="$1"; shift
  local orgs=("$@")
  log "Joining peers to $channel"
  for org in "${orgs[@]}"; do
    peer_env "$org"
    peer channel join -b "$ROOT/channel-artifacts/$channel.block" >/dev/null
    echo "    peer0.$org joined $channel"
  done
}

cmd_up() {
  generate_material
  start_containers
  for ch in "${CHANNELS[@]}"; do
    join_orderers "$ch"
    if [[ "$ch" == "obhoy-audit" ]]; then
      join_peers "$ch" "${AUDIT_ORGS[@]}"
    else
      join_peers "$ch" "${PEER_ORGS[@]}"
    fi
  done
  log "Network is up"
  cmd_status
}

# ------------------------------------------------------------------ deploy

cmd_deploy() {
  log "Packaging chaincode"
  require peer
  ( cd "$ROOT/chaincode/obhoycc" && go mod vendor )
  peer lifecycle chaincode package "$ROOT/channel-artifacts/$CC_NAME.tar.gz" \
    --path "$ROOT/chaincode/obhoycc" --lang golang --label "${CC_NAME}_${CC_VERSION}"

  local package_id=""
  for org in "${PEER_ORGS[@]}"; do
    peer_env "$org"
    peer lifecycle chaincode install "$ROOT/channel-artifacts/$CC_NAME.tar.gz" >/dev/null 2>&1 || true
    echo "    installed on peer0.$org"
  done

  peer_env "${PEER_ORGS[0]}"
  package_id="$(peer lifecycle chaincode queryinstalled 2>/dev/null \
    | sed -n "s/^Package ID: \(${CC_NAME}_${CC_VERSION}:[a-f0-9]*\).*/\1/p" | head -1)"
  [[ -n "$package_id" ]] || die "chaincode package was not installed"
  echo "    package id $package_id"

  # ------------------------------------------------------------------------
  # The endorsement policy is NOT passed on the command line here. It comes
  # from the channel's Application/Endorsement policy in configtx.yaml, which
  # is where Mechanism 2 belongs: a policy supplied at deploy time can be
  # changed at the next deploy without a channel-configuration update, and the
  # multi-class quorum is not something one organisation should be able to
  # loosen on its own.
  # ------------------------------------------------------------------------
  log "Approving chaincode as each organisation"
  for org in "${PEER_ORGS[@]}"; do
    peer_env "$org"
    peer lifecycle chaincode approveformyorg \
      -o localhost:7050 --ordererTLSHostnameOverride orderer1.idra.obhoy.local \
      --tls --cafile "$(orderer_tls)" \
      --channelID "$MAIN_CHANNEL" --name "$CC_NAME" \
      --version "$CC_VERSION" --package-id "$package_id" --sequence "$CC_SEQUENCE" \
      --collections-config "$NETWORK_DIR/collections.json" >/dev/null
    echo "    approved by ${MSP_OF[$org]}"
  done

  log "Committing chaincode definition"
  local peer_args=()
  for org in "${PEER_ORGS[@]}"; do
    peer_args+=(--peerAddresses "localhost:${PORT_OF[$org]}"
      --tlsRootCertFiles "$ROOT/organizations/peerOrganizations/$org.obhoy.local/peers/peer0.$org.obhoy.local/tls/ca.crt")
  done
  peer_env "${PEER_ORGS[0]}"
  peer lifecycle chaincode commit \
    -o localhost:7050 --ordererTLSHostnameOverride orderer1.idra.obhoy.local \
    --tls --cafile "$(orderer_tls)" \
    --channelID "$MAIN_CHANNEL" --name "$CC_NAME" \
    --version "$CC_VERSION" --sequence "$CC_SEQUENCE" \
    --collections-config "$NETWORK_DIR/collections.json" \
    "${peer_args[@]}"

  log "Committed. Verifying:"
  peer lifecycle chaincode querycommitted --channelID "$MAIN_CHANNEL" --name "$CC_NAME"
}

# ------------------------------------------------------------------ status

cmd_status() {
  log "Network topology ($PROFILE profile)"
  printf '\n  %-38s %-24s %s\n' "CONTAINER" "MSP" "ROLE"
  printf '  %-38s %-24s %s\n' "$(printf '%.0s-' {1..38})" "$(printf '%.0s-' {1..24})" "----"
  for entry in "${ORDERERS[@]}"; do
    IFS=':' read -r host port domain <<<"$entry"
    printf '  %-38s %-24s %s\n' "$host" "Orderer${domain^}MSP" "ordering (Raft)"
  done
  for org in "${PEER_ORGS[@]}"; do
    printf '  %-38s %-24s %s\n' "peer0.$org.obhoy.local" "${MSP_OF[$org]}" "endorsing peer"
  done
  echo
  echo "  channels: ${CHANNELS[*]}"
  echo "  endorsement on $MAIN_CHANNEL:"
  echo "    AND(OutOf(2, ProviderMSP.peer, ClinicalMSP.peer, FieldMSP.peer),"
  echo "        OutOf(1, InsurerAMSP.peer, InsurerBMSP.peer))"
  echo
  compose ps --format 'table {{.Name}}\t{{.Status}}' 2>/dev/null || true
}

cmd_down() {
  log "Stopping the network"
  compose down --volumes --remove-orphans
  docker rm -f $(docker ps -aq --filter "name=dev-peer0") 2>/dev/null || true
  rm -rf "$ROOT/organizations" "$ROOT/channel-artifacts"
  log "Down. Crypto material and channel artifacts removed."
}

case "${1:-}" in
  up)     cmd_up ;;
  deploy) cmd_deploy ;;
  status) cmd_status ;;
  down)   cmd_down ;;
  *)
    sed -n '2,14p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
    exit 1
    ;;
esac
