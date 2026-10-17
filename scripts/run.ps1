param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateSet('app', 'test', 'api', 'bridge', 'compose')]
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
    switch ($Mode) {
        'app' {
            & python src/app.py @CommandArgs
        }
        'test' {
            & python -m pytest '-o' "cache_dir=$pytestCache" @CommandArgs
        }
        'api' {
            & python -m uvicorn src.api:app --reload --host 0.0.0.0 --port 8000 @CommandArgs
        }
        'bridge' {
            & python -m src.bridge_serial @CommandArgs
        }
        'compose' {
            & docker compose up --build @CommandArgs
        }
    }

    $exitCode = $LASTEXITCODE
}
finally {
    Pop-Location
}

exit $exitCode
