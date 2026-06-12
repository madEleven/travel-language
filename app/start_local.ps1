# Local development startup script (Windows).
# Loads backend/.env, starts the backend (port 8000) in a new window,
# then runs the frontend dev server (port 3000) in this window.
# Prerequisites: backend/.venv created and deps installed, frontend npm install done.

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'

# Load environment variables from backend/.env (KEY=VALUE lines, # comments allowed)
$envFile = Join-Path $backend '.env'
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#=][^=]*)=(.*)$') {
            $key = $Matches[1].Trim()
            $value = $Matches[2].Trim()
            if ($value) { [System.Environment]::SetEnvironmentVariable($key, $value) }
        }
    }
    Write-Host "Loaded environment from $envFile"
} else {
    Write-Host "No backend/.env found - copy backend/.env.example to backend/.env first" -ForegroundColor Yellow
}

# Sensible defaults for local development
if (-not $env:DATABASE_URL) { $env:DATABASE_URL = 'sqlite+aiosqlite:///./app.db' }
if (-not $env:ENVIRONMENT) { $env:ENVIRONMENT = 'dev' }
$env:IS_LAMBDA = 'false'

# Start backend in a separate window
$python = Join-Path $backend '.venv\Scripts\python.exe'
if (-not (Test-Path $python)) {
    Write-Host "Backend venv not found. Run:  python -m venv backend\.venv; backend\.venv\Scripts\pip install -r backend\requirements.txt" -ForegroundColor Red
    exit 1
}
Start-Process -WorkingDirectory $backend -FilePath $python -ArgumentList '-m','uvicorn','main:app','--host','0.0.0.0','--port','8000'
Write-Host "Backend starting at http://127.0.0.1:8000 (docs: /docs)"

# Run frontend in this window (Ctrl+C to stop; close the backend window separately)
Set-Location $frontend
npm run dev
