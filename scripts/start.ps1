# SemaforoIA - un solo comando: Docker (db+api+frontend) + bridge serial
# Uso:
#   .\scripts\start.ps1

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $projectRoot

function Import-DotEnv {
    param([string]$Path)
    if (-not (Test-Path $Path)) { return }
    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if ($line -eq "" -or $line.StartsWith("#")) { return }
        $idx = $line.IndexOf("=")
        if ($idx -lt 1) { return }
        $key = $line.Substring(0, $idx).Trim()
        $value = $line.Substring($idx + 1).Trim()
        if ($value.StartsWith('"') -and $value.EndsWith('"')) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        [Environment]::SetEnvironmentVariable($key, $value, "Process")
        Set-Item -Path "Env:$key" -Value $value
    }
}

Import-DotEnv (Join-Path $projectRoot ".env")

if ($env:SERIAL_PORT) { $serialPort = $env:SERIAL_PORT } else { $serialPort = "COM5" }
if ($env:API_BASE_URL) { $apiBase = $env:API_BASE_URL } else { $apiBase = "http://localhost:8000" }
if ($env:FRONTEND_PORT) { $frontendPort = $env:FRONTEND_PORT } else { $frontendPort = "5173" }

Write-Host ""
Write-Host "=== SemaforoIA - inicio automatico ===" -ForegroundColor Cyan
Write-Host "Puerto serial : $serialPort"
Write-Host "API          : $apiBase"
Write-Host ""

try {
    docker info 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "docker info failed" }
} catch {
    Write-Host "ERROR: Docker Desktop no esta corriendo. Abrelo y vuelve a intentar." -ForegroundColor Red
    exit 1
}

Write-Host "[1/3] Levantando Docker (postgres + api + frontend)..." -ForegroundColor Yellow
docker compose up --build -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: fallo docker compose." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "[2/3] Esperando a que la API responda..." -ForegroundColor Yellow
$ready = $false
for ($i = 0; $i -lt 60; $i++) {
    try {
        $r = Invoke-WebRequest -Uri ($apiBase + "/api/estado") -UseBasicParsing -TimeoutSec 2
        if ($r.StatusCode -eq 200) {
            $ready = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 2
    }
}

if (-not $ready) {
    Write-Host ("ERROR: la API no respondio a tiempo en " + $apiBase) -ForegroundColor Red
    Write-Host "Revisa: docker compose logs api" -ForegroundColor Red
    exit 1
}

Write-Host ("API lista. Dashboard: http://localhost:" + $frontendPort) -ForegroundColor Green

Write-Host "[3/3] Iniciando bridge serial (Ctrl+C detiene solo el bridge)..." -ForegroundColor Yellow
Write-Host "Docker sigue en segundo plano. Para pararlo: docker compose down" -ForegroundColor DarkGray
Write-Host ""

$env:SERIAL_PORT = $serialPort
$env:API_BASE_URL = $apiBase
$env:PYTHONUTF8 = "1"

python -m src.bridge_serial
exit $LASTEXITCODE
