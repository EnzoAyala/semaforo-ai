param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateSet('app', 'test')]
    [string]$Mode,

    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$CommandArgs
)

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$cacheRoot = Join-Path $projectRoot '.cache'
$env:PYTHONPYCACHEPREFIX = Join-Path $cacheRoot 'python'
$env:PYTHONUTF8 = '1'
$pytestCache = Join-Path $cacheRoot 'pytest'

Push-Location $projectRoot
try {
    if ($Mode -eq 'app') {
        & python src/app.py @CommandArgs
    }
    else {
        & python -m pytest '-o' "cache_dir=$pytestCache" @CommandArgs
    }

    $exitCode = $LASTEXITCODE
}
finally {
    Pop-Location
}

exit $exitCode