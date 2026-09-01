<#
.SYNOPSIS
  Obhoy prototype task runner (Windows / PowerShell).

.DESCRIPTION
  There is no `make` on a stock Windows machine, so the tasks live here and in
  obhoy.sh instead. The two are kept in step deliberately: a team running half
  on Windows and half in WSL should not have to translate commands between
  them.

  Nothing here needs Docker except the `fabric` task. The demonstration path --
  the ledger, the web application, all thirteen scenarios -- runs on Go alone.

.EXAMPLE
  .\obhoy.ps1 dev
  .\obhoy.ps1 test
  .\obhoy.ps1 scenarios -Id S2
#>

[CmdletBinding()]
param(
  [Parameter(Position = 0)]
  [ValidateSet('help', 'dev', 'services', 'test', 'scenarios', 'privacy', 'fabric', 'anchor', 'clean')]
  [string]$Task = 'help',

  [Parameter(Position = 1)]
  [string]$Arg = '',

  [string]$Id = '',
  [int]$Port = 7545
)

$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
$Chaincode = Join-Path $Root 'chaincode\obhoycc'

function Write-Head($text) {
  Write-Host ''
  Write-Host "==> $text" -ForegroundColor Cyan
}

function Assert-Go {
  if (-not (Get-Command go -ErrorAction SilentlyContinue)) {
    $candidate = Join-Path $env:LOCALAPPDATA 'go-sdk\go\bin'
    if (Test-Path (Join-Path $candidate 'go.exe')) {
      $env:PATH = "$env:PATH;$candidate"
    } else {
      throw "Go is not on PATH. Install Go 1.21 or later from https://go.dev/dl/"
    }
  }
}

function Assert-Node {
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node is not on PATH. Install Node 20 or later from https://nodejs.org/"
  }
}

function Invoke-Help {
  Write-Host ''
  Write-Host '  Obhoy prototype' -ForegroundColor White
  Write-Host ''
  Write-Host '    .\obhoy.ps1 dev              start the ledger and the web application'
  Write-Host '    .\obhoy.ps1 services         start the off-chain services'
  Write-Host '    .\obhoy.ps1 test             run every test suite'
  Write-Host '    .\obhoy.ps1 scenarios        run the adversarial harness'
  Write-Host '    .\obhoy.ps1 scenarios -Id S2 run one scenario'
  Write-Host '    .\obhoy.ps1 privacy          dump the world state and scan it'
  Write-Host '    .\obhoy.ps1 anchor test      compile and test the anchoring contract'
  Write-Host '    .\obhoy.ps1 fabric up        bring up the real Fabric network (needs Docker)'
  Write-Host '    .\obhoy.ps1 clean            remove build output and generated material'
  Write-Host ''
  Write-Host '  Start here:' -ForegroundColor White
  Write-Host '    .\obhoy.ps1 dev   then open http://localhost:7545'
  Write-Host ''
}

function Invoke-Dev {
  Assert-Go
  Write-Head "Starting the local node on http://localhost:$Port"
  Write-Host '  The web application is served from the same port.'
  Write-Host '  Ctrl-C to stop.'
  Push-Location $Chaincode
  try {
    go run ./cmd/localnode -addr ":$Port" -web (Join-Path $Root 'web')
  } finally { Pop-Location }
}

function Invoke-Services {
  Assert-Node
  Write-Head 'Starting the off-chain services'
  Push-Location (Join-Path $Root 'services')
  try { node src/index.js } finally { Pop-Location }
}

function Invoke-Test {
  Assert-Go; Assert-Node
  $failed = @()

  Write-Head 'Chaincode: the Appendix A invariant suite'
  Push-Location $Chaincode
  try {
    go test ./...
    if ($LASTEXITCODE -ne 0) { $failed += 'chaincode' }
  } finally { Pop-Location }

  Write-Head 'Services: threshold custody and the Merkle vectors'
  Push-Location (Join-Path $Root 'services')
  try {
    node --test test/services.test.js
    if ($LASTEXITCODE -ne 0) { $failed += 'services' }
  } finally { Pop-Location }

  Write-Head 'Scenarios: the adversarial harness'
  Push-Location $Chaincode
  try {
    go run ./cmd/scenarios -quiet
    if ($LASTEXITCODE -ne 0) { $failed += 'scenarios' }
  } finally { Pop-Location }

  $anchorModules = Join-Path $Root 'anchor\node_modules'
  if (Test-Path $anchorModules) {
    Write-Head 'Anchor: the Solidity contract'
    Push-Location (Join-Path $Root 'anchor')
    try {
      npx hardhat test
      if ($LASTEXITCODE -ne 0) { $failed += 'anchor' }
    } finally { Pop-Location }
  } else {
    Write-Host ''
    Write-Host '  skipping the anchor tests -- run `npm install` in anchor/ first' -ForegroundColor DarkYellow
  }

  Write-Host ''
  if ($failed.Count -eq 0) {
    Write-Host '  every suite passed' -ForegroundColor Green
    Write-Host ''
  } else {
    Write-Host "  failed: $($failed -join ', ')" -ForegroundColor Red
    Write-Host ''
    exit 1
  }
}

function Invoke-Scenarios {
  Assert-Go
  Push-Location $Chaincode
  try {
    if ($Id) { go run ./cmd/scenarios -id $Id } else { go run ./cmd/scenarios }
  } finally { Pop-Location }
}

function Invoke-Privacy {
  Write-Head 'Scanning the world state for anything identifier-shaped'
  try {
    $state = Invoke-RestMethod -Uri "http://localhost:$Port/api/ledger/state" -TimeoutSec 5
  } catch {
    throw "The node is not answering on port $Port. Start it with .\obhoy.ps1 dev"
  }
  $keys = $state.result.PSObject.Properties
  $suspects = @()
  foreach ($k in $keys) {
    $blob = "$($k.Name) $($k.Value)"
    if ($blob -match '"(\d{10}|\d{13}|\d{17})"') { $suspects += $k.Name }
    if ($blob -match '(?i)(diagnosis|patient|surname)') { $suspects += $k.Name }
  }
  Write-Host ''
  Write-Host "  $($keys.Count) world-state keys scanned"
  if ($suspects.Count -eq 0) {
    Write-Host '  no national identity number, name or free-text diagnosis found' -ForegroundColor Green
    Write-Host ''
    Write-Host '  This is not a claim of anonymity. Category code, subject commitment,'
    Write-Host '  provider identity and timestamps together remain a metadata surface.'
    Write-Host ''
  } else {
    Write-Host "  FOUND identifier-shaped values in: $($suspects -join ', ')" -ForegroundColor Red
    exit 1
  }
}

function Invoke-Fabric {
  $sub = if ($Arg) { $Arg } else { 'status' }
  Write-Head "Fabric: $sub"
  Write-Host '  The Fabric network is driven by network/scripts/network.sh, which is'
  Write-Host '  bash. Run it from WSL2 Ubuntu with the repository on the ext4'
  Write-Host '  filesystem -- not on /mnt/d, where TLS key file modes cannot be'
  Write-Host '  represented and the peers fail the handshake.'
  Write-Host ''
  Write-Host "    wsl bash network/scripts/network.sh $sub demo"
  Write-Host ''
  if (Get-Command wsl -ErrorAction SilentlyContinue) {
    Write-Host '  Attempting it through WSL now.' -ForegroundColor DarkYellow
    wsl bash network/scripts/network.sh $sub demo
  }
}

function Invoke-Anchor {
  Assert-Node
  $dir = Join-Path $Root 'anchor'
  if (-not (Test-Path (Join-Path $dir 'node_modules'))) {
    Write-Head 'Installing anchor dependencies'
    Push-Location $dir; try { npm install --no-audit --no-fund } finally { Pop-Location }
  }
  $sub = if ($Arg) { $Arg } else { 'test' }
  Write-Head "Anchor: $sub"
  Push-Location $dir
  try {
    switch ($sub) {
      'test'   { npx hardhat test }
      'node'   { npx hardhat node }
      'deploy' { npx hardhat run scripts/deploy.js --network localhost }
      'run'    { npx hardhat run scripts/anchor.js --network localhost }
      default  { npx hardhat $sub }
    }
  } finally { Pop-Location }
}

function Invoke-Clean {
  Write-Head 'Cleaning'
  foreach ($p in @('organizations', 'channel-artifacts', 'chaincode\obhoycc\vendor',
                   'anchor\artifacts', 'anchor\cache')) {
    $full = Join-Path $Root $p
    if (Test-Path $full) { Remove-Item -Recurse -Force $full; Write-Host "  removed $p" }
  }
  Write-Host '  (node_modules left in place; delete them by hand if you mean it)'
  Write-Host ''
}

switch ($Task) {
  'help'      { Invoke-Help }
  'dev'       { Invoke-Dev }
  'services'  { Invoke-Services }
  'test'      { Invoke-Test }
  'scenarios' { Invoke-Scenarios }
  'privacy'   { Invoke-Privacy }
  'fabric'    { Invoke-Fabric }
  'anchor'    { Invoke-Anchor }
  'clean'     { Invoke-Clean }
}
