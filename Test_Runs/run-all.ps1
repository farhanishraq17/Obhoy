<#
.SYNOPSIS
  Run every suite in the prototype and capture the evidence. (Windows twin of
  run-all.sh — the two are kept in step deliberately.)

.DESCRIPTION
  Writes a timestamped directory under Test_Runs/runs/ containing the raw output
  of each suite, a machine-readable scenario transcript, and a summary. Nothing
  is reformatted on the way through, so a reader can check the summary against
  the raw output rather than taking it on trust.

  Exits non-zero if any suite failed.

.EXAMPLE
  .\Test_Runs\run-all.ps1
#>

[CmdletBinding()]
param()

$ErrorActionPreference = 'Continue'
$Here = $PSScriptRoot
$Root = Split-Path $Here -Parent
$Chaincode = Join-Path $Root 'chaincode\obhoycc'

$Stamp = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH-mm-ssZ')
$Out = Join-Path $Here "runs\$Stamp"
New-Item -ItemType Directory -Force $Out | Out-Null

function Write-Head($t) { Write-Host ''; Write-Host "==> $t" -ForegroundColor Cyan }
function Write-Ok($t)   { Write-Host "  $t" -ForegroundColor Green }
function Write-Bad($t)  { Write-Host "  $t" -ForegroundColor Red }
function Write-Warn($t) { Write-Host "  $t" -ForegroundColor DarkYellow }

if (-not (Get-Command go -ErrorAction SilentlyContinue)) {
  $sdk = Join-Path $env:LOCALAPPDATA 'go-sdk\go\bin'
  if (Test-Path (Join-Path $sdk 'go.exe')) { $env:PATH = "$env:PATH;$sdk" }
}

$results = [System.Collections.ArrayList]@()
function Record($name, $status, $detail, $file) {
  [void]$results.Add([pscustomobject]@{ Name = $name; Status = $status; Detail = $detail; File = $file })
}

function Get-Tool($name, $fallback) {
  $c = Get-Command $name -ErrorAction SilentlyContinue
  if ($c) { return (& $name --version 2>&1 | Select-Object -First 1) }
  return $fallback
}

# --------------------------------------------------------------- environment
Write-Head 'Environment'
$commit = try { git -C $Root rev-parse --short HEAD 2>$null } catch { 'not a git repo' }
$dirty  = try { (git -C $Root status --porcelain 2>$null | Measure-Object -Line).Lines } catch { '?' }
$env_lines = @(
  "run          $Stamp",
  "host         $([System.Environment]::OSVersion.VersionString)",
  "go           $(Get-Tool go 'not installed')",
  "node         $(Get-Tool node 'not installed')",
  "python       $(Get-Tool python 'not installed')",
  "configtxgen  $(if (Get-Command configtxgen -ErrorAction SilentlyContinue) { 'on PATH' } else { 'not on PATH' })",
  "commit       $commit",
  "tree state   $dirty uncommitted change(s)"
)
$env_lines | Tee-Object -FilePath (Join-Path $Out '00-environment.txt')

# ------------------------------------------------------- 1. chaincode tests
Write-Head '1/6  Chaincode — the Appendix A invariant suite'
Push-Location $Chaincode
$log = Join-Path $Out '01-chaincode-tests.txt'
go test ./... -v *>&1 | Out-File -FilePath $log -Encoding utf8
$chaincodeOk = ($LASTEXITCODE -eq 0)
Pop-Location
if ($chaincodeOk) {
  $n = (Select-String -Path $log -Pattern '^--- PASS' -AllMatches).Count
  Write-Ok "$n tests passed"; Record 'chaincode' 'PASS' "$n tests" '01-chaincode-tests.txt'
} else {
  $n = (Select-String -Path $log -Pattern '^--- FAIL' -AllMatches).Count
  Write-Bad "$n tests FAILED"; Record 'chaincode' 'FAIL' "$n failing" '01-chaincode-tests.txt'
}

# -------------------------------------------------------- 2. services tests
Write-Head '2/6  Services — threshold custody, keyed PRF, Merkle vectors'
Push-Location (Join-Path $Root 'services')
$log = Join-Path $Out '02-services-tests.txt'
node --test test/services.test.js *>&1 | Out-File -FilePath $log -Encoding utf8
$servicesOk = ($LASTEXITCODE -eq 0)
Pop-Location
if ($servicesOk) {
  $m = Select-String -Path $log -Pattern 'pass (\d+)' | Select-Object -First 1
  $n = if ($m) { $m.Matches[0].Groups[1].Value } else { '?' }
  Write-Ok "$n tests passed"; Record 'services' 'PASS' "$n tests" '02-services-tests.txt'
} else {
  Write-Bad 'FAILED'; Record 'services' 'FAIL' 'see log' '02-services-tests.txt'
}

# ------------------------------------------------------------ 3. scenarios
Write-Head '3/6  Adversarial harness — all thirteen scenarios'
Push-Location $Chaincode
$log = Join-Path $Out '03-scenarios.txt'
go run ./cmd/scenarios *>&1 | Out-File -FilePath $log -Encoding utf8
$scenOk = ($LASTEXITCODE -eq 0)
go run ./cmd/scenarios -json 2>$null | Out-File -FilePath (Join-Path $Out '04-scenarios.json') -Encoding utf8
Pop-Location
if ($scenOk) {
  $m = Select-String -Path $log -Pattern '(\d+ of \d+ scenarios passed)' | Select-Object -Last 1
  $line = if ($m) { $m.Matches[0].Groups[1].Value } else { 'passed' }
  Write-Ok $line; Record 'scenarios' 'PASS' $line '03-scenarios.txt'
} else {
  Write-Bad 'one or more scenarios FAILED'; Record 'scenarios' 'FAIL' 'see log' '03-scenarios.txt'
}

# ---------------------------------------------------- 4. per-step analysis
Write-Head '4/6  Per-step analysis — did each refusal cite the right invariant?'
$json = Join-Path $Out '04-scenarios.json'
$log = Join-Path $Out '05-step-analysis.txt'
if ((Get-Command python -ErrorAction SilentlyContinue) -and (Test-Path $json)) {
  python (Join-Path $Here 'analyse.py') $json *>&1 | Out-File -FilePath $log -Encoding utf8
  if ($LASTEXITCODE -eq 0) {
    $m = Select-String -Path $log -Pattern 'steps total.*' | Select-Object -Last 1
    Write-Ok ($m.Matches[0].Value)
    Record 'step analysis' 'PASS' 'every step matched its asserted outcome' '05-step-analysis.txt'
  } else {
    Write-Bad 'a step did not match its asserted outcome'
    Record 'step analysis' 'FAIL' 'see log' '05-step-analysis.txt'
  }
} else {
  Write-Warn 'skipped — needs python and a scenario transcript'
  Record 'step analysis' 'SKIP' 'python not on PATH' '05-step-analysis.txt'
}

# -------------------------------------------------------------- 5. anchor
Write-Head '5/6  Anchor — the Solidity contract'
$log = Join-Path $Out '06-anchor-tests.txt'
if (Test-Path (Join-Path $Root 'anchor\node_modules')) {
  Push-Location (Join-Path $Root 'anchor')
  npx hardhat test *>&1 | Out-File -FilePath $log -Encoding utf8
  $anchorOk = ($LASTEXITCODE -eq 0)
  Pop-Location
  if ($anchorOk) {
    $m = Select-String -Path $log -Pattern '(\d+ passing)' | Select-Object -First 1
    $n = if ($m) { $m.Matches[0].Groups[1].Value } else { 'passed' }
    Write-Ok $n; Record 'anchor' 'PASS' $n '06-anchor-tests.txt'
  } else {
    Write-Bad 'FAILED'; Record 'anchor' 'FAIL' 'see log' '06-anchor-tests.txt'
  }
} else {
  Write-Warn "skipped — run 'npm install' in anchor/ first"
  'skipped: anchor/node_modules is absent' | Out-File -FilePath $log -Encoding utf8
  Record 'anchor' 'SKIP' 'dependencies not installed' '06-anchor-tests.txt'
}

# ------------------------------------------------- 6. network config check
Write-Head '6/6  Network — does configtx.yaml still produce valid channels?'
$log = Join-Path $Out '07-network-config.txt'
if ((Get-Command configtxgen -ErrorAction SilentlyContinue) -and (Get-Command bash -ErrorAction SilentlyContinue)) {
  bash (Join-Path $Here 'check-network.sh') *>&1 | Out-File -FilePath $log -Encoding utf8
  if ($LASTEXITCODE -eq 0) {
    Write-Ok 'three genesis blocks generated; endorsement policy verified'
    Record 'network config' 'PASS' '3 channels, policy verified' '07-network-config.txt'
  } else {
    Write-Bad 'FAILED'; Record 'network config' 'FAIL' 'see log' '07-network-config.txt'
  }
} else {
  Write-Warn 'skipped — needs bash and the Fabric binaries on PATH'
  'skipped: bash or the Fabric binaries are not on PATH.' | Out-File -FilePath $log -Encoding utf8
  Record 'network config' 'SKIP' 'Fabric binaries not on PATH' '07-network-config.txt'
}

# --------------------------------------------------------------- summary
$summary = [System.Collections.ArrayList]@()
[void]$summary.Add("# Test run — $Stamp")
[void]$summary.Add('')
[void]$summary.Add('Produced by `Test_Runs/run-all.ps1`. Every figure below is taken from the')
[void]$summary.Add('raw output in this directory; nothing here is retyped by hand.')
[void]$summary.Add('')
[void]$summary.Add('| Suite | Result | Detail | Raw output |')
[void]$summary.Add('|---|---|---|---|')
foreach ($r in $results) {
  $icon = switch ($r.Status) { 'PASS' { '✅' } 'FAIL' { '❌' } default { '⏭️' } }
  [void]$summary.Add("| $($r.Name) | $icon $($r.Status) | $($r.Detail) | ``$($r.File)`` |")
}
[void]$summary.Add('')
[void]$summary.Add('## Environment')
[void]$summary.Add('')
[void]$summary.Add('```')
$env_lines | ForEach-Object { [void]$summary.Add($_) }
[void]$summary.Add('```')
$summary | Out-File -FilePath (Join-Path $Out 'README.md') -Encoding utf8
Copy-Item (Join-Path $Out 'README.md') (Join-Path $Here 'LATEST.md') -Force

Write-Head 'Done'
Write-Host ''
$results | Format-Table -AutoSize Name, Status, Detail
Write-Host "  evidence written to Test_Runs/runs/$Stamp/"
Write-Host '  summary            Test_Runs/LATEST.md'
Write-Host ''
if ($results | Where-Object { $_.Status -eq 'FAIL' }) { exit 1 } else { exit 0 }
