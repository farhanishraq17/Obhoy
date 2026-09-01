# Running the prototype

Three paths, in increasing order of what they need and what they prove.

| Path | Needs | Proves |
|---|---|---|
| **1. The local node** | Go 1.21+ | The contracts, the invariants, the web application, all thirteen scenarios |
| **2. Services and anchoring** | + Node 20+ | Threshold custody, the payout boundary, the two-chain anchor |
| **3. The real Fabric network** | + Docker, WSL2 | Endorsement, ordering, MSP validation, private data |

Path 1 is the demonstration. Paths 2 and 3 are what make it a system rather than
a simulation.

---

## 1. The local node

```bash
./obhoy.sh dev
```

```powershell
.\obhoy.ps1 dev
```

Or directly, if you would rather see what the script does:

```bash
cd chaincode/obhoycc && go run ./cmd/localnode -addr :7545 -web ../../web
```

Open **http://localhost:7545**.

The node bootstraps a demonstration network on start-up — five council classes,
two domain profiles, seven accredited parties, a published benefit schedule,
eight synthetic subjects, ten policies, two open reporting periods — and prints
every transaction as it commits. Restarting resets it; there is no persistence,
by design.

### What to do first

1. **Published record** is the public explorer. No credential, no login.
2. **Claim desk** as `Provider association`: assert an admission. Then assert
   the *same* subject from a different facility without closing the first. That
   refusal is the headline.
3. Switch to `Independent clinician`, attest. Switch to `Insurer A`, claim,
   adjudicate, authorise.
4. **Harness** → *Run all*. Thirteen scenarios, eight of which pass by producing
   a refusal.
5. **Ledger** shows every transaction including the refused ones, and the entire
   world state with the identifier scan over it.

### The tests

```bash
./obhoy.sh test
```

Runs the Go invariant suite, the services tests, the scenario harness and — if
`anchor/node_modules` exists — the Solidity tests.

To read the invariant suite on its own:

```bash
cd chaincode/obhoycc && go test ./contracts/... -v
```

Each test name carries the equation number from Appendix A of the paper, so the
appendix and the suite can be diffed line by line.

---

## 2. The off-chain services

```bash
./obhoy.sh services
```

Nine processes on ports 7551–7565. No dependencies — the whole package has an
empty `dependencies` block, deliberately, because the security-relevant code
here is the part a reviewer should be able to read without a dependency tree in
the way.

### Threshold custody, demonstrated

The PRF key that turns a national identity number into a subject commitment is
generated once, split three ways, and dropped. No process holds it.

```bash
# a commitment, using two of the three custodians
curl -s -XPOST localhost:7560/commit -H 'content-type: application/json' \
     -d '{"nid":"0000100000001","context":"event"}'

# take one custodian offline -- commitments still issue, from a different pair
curl -s -XPOST localhost:7552/admin/offline -H 'content-type: application/json' \
     -d '{"offline":true}'

# take a second one offline -- they stop, and nothing degrades gracefully
curl -s -XPOST localhost:7553/admin/offline -H 'content-type: application/json' \
     -d '{"offline":true}'
```

The commitment is identical whichever pair reconstructs the key. That is the
property: one key across the network, held by nobody.

### The payout boundary

```bash
# pay
curl -s -XPOST localhost:7562/disburse -H 'content-type: application/json' \
  -d '{"requestId":"MFS-REQ-1","payload":{"msisdn":"01700000001","amount":3000000,"entitlementId":"ent-1"}}'

# retry the same instruction -- returns the ORIGINAL receipt, does not pay twice
# same call again

# same identifier, different money -- refused outright
curl -s -XPOST localhost:7562/disburse -H 'content-type: application/json' \
  -d '{"requestId":"MFS-REQ-1","payload":{"msisdn":"01700000001","amount":9999999,"entitlementId":"ent-1"}}'
```

---

## 3. Public anchoring

Two chains, one command each. The local Hardhat chain always works and needs no
funds; Polygon Amoy produces a clickable block-explorer link and needs a faucet.
Use the local one for the demonstration.

```bash
cd anchor
npm install
npx hardhat node                 # terminal 1 -- a local EVM chain on :8545
```

```bash
# terminal 2
cd anchor
npx hardhat run scripts/deploy.js --network localhost
export OBHOY_ANCHOR_ADDRESS=<the address it prints>

# close a period on the ledger first, from the Oversight tab or:
curl -s -XPOST localhost:7545/api/periods/close \
     -H 'content-type: application/json' -H 'X-Obhoy-MSP: RegulatorMSP' \
     -d '{"periodId":"2026Q1-POOL-A"}'

npx hardhat run scripts/anchor.js --network localhost
```

The anchor script **rebuilds the Merkle root from the published figures** before
it submits anything, and refuses if its root disagrees with the one the
chaincode computed. Anchoring a root the chaincode handed over would only prove
that the chaincode agrees with itself.

Verify a published figure afterwards, without trusting anything in this
repository:

```bash
curl -s "localhost:7565/verify?periodId=2026Q1-POOL-A&name=claimsSettled&value=1"
```

### On Polygon Amoy

```bash
export AMOY_RPC_URL=https://rpc-amoy.polygon.technology
export ANCHOR_PRIVATE_KEY=<a funded testnet key>
npx hardhat run scripts/deploy.js --network amoy
npx hardhat run scripts/anchor.js --network amoy
```

Do not put a key with real funds in that variable, and do not commit it.

---

## 4. The real Fabric network

**Run this from WSL2 Ubuntu with the repository on the ext4 filesystem — not on
`/mnt/d`.** Fabric requires TLS private key files to be mode 0600 and the
Windows mount cannot represent that. The peers start, then fail the TLS
handshake, and the error looks like a certificate problem and is not one. This
costs an afternoon if you meet it late.

```bash
# in WSL2
cp -r "/mnt/d/Project Based Learning/Block-chain/Obhoy/Obhoy - Github" ~/obhoy
cd ~/obhoy
```

Install the Fabric binaries and images:

```bash
curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh
chmod +x install-fabric.sh
./install-fabric.sh --fabric-version 2.5.10 docker binary
export PATH=$PATH:$PWD/bin
```

Then:

```bash
./obhoy.sh fabric up demo       # crypto material, 13 containers, two channels
./obhoy.sh fabric deploy demo   # package, install, approve ×7, commit
./obhoy.sh fabric status demo   # the org / peer / orderer table
./obhoy.sh fabric down demo
```

`up` generates crypto material for twelve organisations, produces the channel
genesis blocks, starts the containers, joins five ordering nodes to the main
channel and two to the audit channel, and joins seven peers.

Point the web application at the gateway instead of the local node:

```bash
cd gateway && npm install && npm start     # :7546, same REST surface
```

### The development profile

Three organisations, one ordering node, six containers.

```bash
./obhoy.sh fabric up dev
```

Use it for day-to-day work. **Do not use it for the demonstration**: with one
insurer there is no cross-insurer duplicate to refuse, so scenario S2 — the
headline — cannot be shown on it at all, and its endorsement policy is weaker
than the real one.

### What to look at once it is up

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}'
```

Seven peers in seven MSPs, five orderers in five MSPs. Then read the endorsement
policy out of the channel itself rather than out of a file:

```bash
configtxgen -inspectBlock channel-artifacts/obhoy-main.block \
  | python -c "import json,sys; d=json.load(sys.stdin); \
      print(json.dumps(d['data']['data'][0]['payload']['data']['config'] \
      ['channel_group']['groups']['Application']['policies']['Endorsement'], indent=2))"
```

That is Mechanism 2 at protocol level:

```
AND(OutOf(2, ProviderMSP.peer, ClinicalMSP.peer, FieldMSP.peer),
    OutOf(1, InsurerAMSP.peer, InsurerBMSP.peer))
```

---

## Ports

| Port | What |
|---|---|
| 7545 | The local node — API and the web application |
| 7546 | The Fabric gateway (same REST surface, real peer) |
| 7551–7553 | Key custodians: regulator, insurer, aggregator |
| 7560 | Commitment service |
| 7561 | Encrypted vault |
| 7562 | MFS payout adapter |
| 7563 | HMIS feed |
| 7564 | Anomaly scorer |
| 7565 | Anchor service |
| 8545 | Local EVM chain (Hardhat) |
| 7050–13051 | Fabric orderers and peers (demo profile) |

## When something does not work

**"node unreachable" in the web footer.** The local node is not running, or is
on a different port. `./obhoy.sh dev`.

**`go: command not found`.** Go is not on `PATH`. The task runner also looks in
`%LOCALAPPDATA%\go-sdk\go\bin`, where this repository's Go was installed.

**Peers start then die on the Fabric network.** Almost always the filesystem.
See the warning at the top of section 4.

**Chaincode install times out.** The peer builds the chaincode in a container,
which pulls a Go image the first time. Give it several minutes on a first run.

**A scenario fails.** That is what it is for. Read the transcript: each step
names the organisation, the transaction and the refusal in the chaincode's own
words.
