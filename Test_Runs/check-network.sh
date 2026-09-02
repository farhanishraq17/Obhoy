#!/usr/bin/env bash
#
# Check that network/configtx.yaml still produces valid channels, and that the
# endorsement policy in the generated block is still the one the whitepaper
# describes.
#
# This is the only part of the Fabric network that can be verified without
# Docker, and it is the part most worth verifying: the OutOf(2, ...) term IS
# Mechanism 2. If somebody softens it to MAJORITY Endorsement, every test in
# this repository still passes and the design quietly stops being enforced by
# the network. This check is what would catch that.
#
# Needs cryptogen and configtxgen on PATH. Writes into a temporary directory
# and cleans up; it does not disturb any material a running network is using.

set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
NETWORK="$ROOT/network"

WORK="$(mktemp -d 2>/dev/null || echo "${TMPDIR:-/tmp}/obhoy-netcheck-$$")"
mkdir -p "$WORK"
cleanup() { rm -rf "$WORK"; }
trap cleanup EXIT

fail() { echo "FAIL: $*"; exit 1; }

echo "network configuration check"
echo "  configtx   $NETWORK/configtx.yaml"
echo "  workdir    $WORK"
echo

# configtx.yaml refers to organizations/ by relative path, so the check has to
# generate real crypto material -- MSPDir must exist for configtxgen to resolve.
echo "== generating crypto material =="
cryptogen generate --config="$NETWORK/crypto-config.yaml" --output="$WORK/organizations" >/dev/null 2>&1 \
  || fail "cryptogen could not generate material from crypto-config.yaml"

peers=$(ls "$WORK/organizations/peerOrganizations" | wc -l | tr -d ' ')
orderers=$(ls "$WORK/organizations/ordererOrganizations" | wc -l | tr -d ' ')
echo "  $peers peer organisations, $orderers orderer organisations"
[[ "$peers" == "7" ]]   || fail "expected 7 peer organisations, got $peers"
[[ "$orderers" == "5" ]] || fail "expected 5 orderer organisations, got $orderers"

# configtxgen resolves MSPDir relative to FABRIC_CFG_PATH, so the generated
# material has to sit where configtx.yaml expects it.
STAGE="$WORK/stage"
mkdir -p "$STAGE"
cp -r "$NETWORK" "$STAGE/network"
cp -r "$WORK/organizations" "$STAGE/organizations"
mkdir -p "$STAGE/channel-artifacts"

echo
echo "== generating channel genesis blocks =="
export FABRIC_CFG_PATH="$STAGE/network"
for pair in ObhoyMainChannel:obhoy-main ObhoyAuditChannel:obhoy-audit ObhoyDevChannel:obhoy-dev; do
  profile="${pair%%:*}"; channel="${pair##*:}"
  if configtxgen -profile "$profile" -channelID "$channel" \
       -outputBlock "$STAGE/channel-artifacts/$channel.block" >/dev/null 2>&1; then
    echo "  ok    $channel  <- $profile"
  else
    fail "configtxgen could not build $channel from profile $profile"
  fi
done

echo
echo "== reading the endorsement policy back out of the block =="
PY="$(command -v python3 || command -v python || true)"
[[ -n "$PY" ]] || { echo "  skipped: python is not on PATH"; exit 0; }

configtxgen -inspectBlock "$STAGE/channel-artifacts/obhoy-main.block" > "$WORK/main.json" 2>/dev/null \
  || fail "could not inspect obhoy-main.block"

"$PY" - "$WORK/main.json" <<'PY'
import json, io, sys

doc = json.load(io.open(sys.argv[1], encoding="utf-8"))
groups = doc["data"]["data"][0]["payload"]["data"]["config"]["channel_group"]["groups"]
app, orderer = groups["Application"], groups["Orderer"]

orgs = sorted(app["groups"])
print("  application organisations:", ", ".join(orgs))
assert len(orgs) == 7, f"expected 7 application organisations, got {len(orgs)}"

policy = app["policies"]["Endorsement"]["policy"]["value"]
identities = [i["principal"]["msp_identifier"] + "/" + str(i["principal"].get("role", "MEMBER"))
              for i in policy.get("identities", [])]
rule = policy["rule"]

print("  endorsement identities:  ", ", ".join(identities))
print("  endorsement rule:        ", json.dumps(rule))

# The shape that matters: AND( OutOf(2, three attesters), OutOf(1, insurers) ).
outer = rule["n_out_of"]
assert outer["n"] == 2, f"outer AND should require both terms, got n={outer['n']}"
inner = [r["n_out_of"] for r in outer["rules"]]
attest, insurer = inner[0], inner[1]

assert attest["n"] == 2, f"attesting quorum should be 2, got {attest['n']}"
assert len(attest["rules"]) == 3, f"quorum should be drawn from 3 classes, got {len(attest['rules'])}"
assert insurer["n"] == 1, f"insurer term should require 1, got {insurer['n']}"

expected = ["ProviderMSP/PEER", "ClinicalMSP/PEER", "FieldMSP/PEER",
            "InsurerAMSP/PEER", "InsurerBMSP/PEER"]
assert identities == expected, f"identity list drifted:\n  got      {identities}\n  expected {expected}"

consenters = [c["host"] for c in
              orderer["values"]["ConsensusType"]["value"]["metadata"]["consenters"]]
orderer_orgs = sorted(orderer["groups"])
print("  orderer organisations:   ", ", ".join(orderer_orgs))
print("  raft consenters:         ", ", ".join(consenters))
assert len(consenters) == 5, f"expected 5 consenters, got {len(consenters)}"
assert len(orderer_orgs) == 5, "each ordering node must sit in its own MSP"

print()
print("  VERIFIED  AND(OutOf(2, ProviderMSP.peer, ClinicalMSP.peer, FieldMSP.peer),")
print("                OutOf(1, InsurerAMSP.peer, InsurerBMSP.peer))")
print()
print("  This is Mechanism 2 at protocol level. The insurer signs as payer, not")
print("  as a third attesting class.")
PY

status=$?
[[ $status -eq 0 ]] || fail "the endorsement policy in the generated block is not the expected one"

echo
echo "PASSED"
