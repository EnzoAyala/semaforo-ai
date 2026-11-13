# SemaforoIA - arranque SIN Arduino (solo Docker: db + api + frontend)
# Uso:
#   .\scripts\start-sin-arduino.ps1

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

if ($env:API_BASE_URL) { $apiBase = $env:API_BASE_URL } else { $apiBase = "http://localhost:8000" }
if ($env:FRONTEND_PORT) { $frontendPort = $env:FRONTEND_PORT } else { $frontendPort = "5173" }

Write-Host ""
Write-Host "=== SemaforoIA - sin Arduino ===" -ForegroundColor Cyan
Write-Host "API          : $apiBase"
Write-Host "Dashboard    : http://localhost:$frontendPort"
Write-Host ""

try {
    docker info 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "docker info failed" }
} catch {
    Write-Host "ERROR: Docker Desktop no esta corriendo. Abrelo y vuelve a intentar." -ForegroundColor Red
    exit 1
}

Write-Host "[1/2] Levantando Docker (postgres + api + frontend)..." -ForegroundColor Yellow
docker compose up --build -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: fallo docker compose." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "[2/2] Esperando a que la API responda..." -ForegroundColor Yellow
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

Write-Host ""
Write-Host "Listo (sin hardware)." -ForegroundColor Green
Write-Host ("  Dashboard : http://localhost:" + $frontendPort)
Write-Host ("  API       : " + $apiBase)
Write-Host "  Prueba manual desde el dashboard (boton de cruce)." -ForegroundColor DarkGray
Write-Host "  Para parar: docker compose down" -ForegroundColor DarkGray
Write-Host ""
exit 0
