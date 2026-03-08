<#
PowerShell helper to ensure backend virtualenv is active.

Usage (in PowerShell):
  . .\scripts\ensure_venv.ps1

Dot-sourcing is required so the activation affects the current shell.
#>

try {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
} catch {
    $scriptDir = $PSScriptRoot
}

$venvRelative = '..\backend\venv'
$venvPathObj = Resolve-Path -Path (Join-Path $scriptDir $venvRelative) -ErrorAction SilentlyContinue
if (-not $venvPathObj) {
    Write-Error "Virtual environment folder not found at path: $venvRelative (from $scriptDir)"
    return 1
}

$venvPath = $venvPathObj.Path
$activatePs1 = Join-Path $venvPath 'Scripts\Activate.ps1'

if ($env:VIRTUAL_ENV) {
    Write-Host "Virtual environment already active: $env:VIRTUAL_ENV"
    return 0
}

if (-not (Test-Path $activatePs1)) {
    Write-Error "Activate script not found: $activatePs1"
    return 2
}

Write-Host "Activating virtual environment at: $venvPath"

# Dot-source the activate script so it affects the current session
. $activatePs1

if ($env:VIRTUAL_ENV) {
    Write-Host "Activated virtual environment: $env:VIRTUAL_ENV"
    return 0
} else {
    Write-Error 'Activation attempted but VIRTUAL_ENV is not set. You may need to run PowerShell as an administrator or set ExecutionPolicy: Set-ExecutionPolicy -Scope CurrentUser RemoteSigned'
    return 3
}
