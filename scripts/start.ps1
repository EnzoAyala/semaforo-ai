# Compatibilidad: elige modo con/sin Arduino.
# Preferidos:
#   .\scripts\start-sin-arduino.ps1
#   .\scripts\start-arduino.ps1

param(
    [ValidateSet("sin-arduino", "arduino")]
    [string]$Modo = "sin-arduino"
)

$script = if ($Modo -eq "arduino") {
    Join-Path $PSScriptRoot "start-arduino.ps1"
} else {
    Join-Path $PSScriptRoot "start-sin-arduino.ps1"
}

& powershell -ExecutionPolicy Bypass -File $script
exit $LASTEXITCODE
