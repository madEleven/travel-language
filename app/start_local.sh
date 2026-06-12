#!/bin/bash
# Local development startup script (macOS/Linux).
# Loads backend/.env, starts the backend (port 8000) in the background,
# then runs the frontend dev server (port 3000) in the foreground.
# Prerequisites: backend/.venv created and deps installed, frontend npm install done.
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

# Load environment variables from backend/.env
if [ -f "$BACKEND/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    source "$BACKEND/.env"
    set +a
    echo "Loaded environment from $BACKEND/.env"
else
    echo "No backend/.env found - copy backend/.env.example to backend/.env first"
fi

# Sensible defaults for local development
export DATABASE_URL="${DATABASE_URL:-sqlite+aiosqlite:///./app.db}"
export ENVIRONMENT="${ENVIRONMENT:-dev}"
export IS_LAMBDA=false

if [ ! -x "$BACKEND/.venv/bin/python" ]; then
    echo "Backend venv not found. Run:  python -m venv backend/.venv && backend/.venv/bin/pip install -r backend/requirements.txt"
    exit 1
fi

(cd "$BACKEND" && .venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000) &
BACKEND_PID=$!
trap 'kill $BACKEND_PID 2>/dev/null' EXIT
echo "Backend starting at http://127.0.0.1:8000 (docs: /docs)"

cd "$FRONTEND"
npm run dev
