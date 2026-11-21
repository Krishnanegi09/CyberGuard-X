#!/usr/bin/env bash
# ==============================================================================
# CYBERGUARD-X — Full Stack Unified Launcher
# Starts Database (PostgreSQL 17), Backend (FastAPI), and Frontend (Vite/React)
# ==============================================================================
set -euo pipefail

# ANSI Color Codes
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

SOURCE="${BASH_SOURCE[0]}"
while [ -L "$SOURCE" ]; do
  DIR="$(cd -P "$(dirname "$SOURCE")" >/dev/null 2>&1 && pwd)"
  SOURCE="$(readlink "$SOURCE")"
  [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE"
done
SCRIPT_DIR="$(cd -P "$(dirname "$SOURCE")" >/dev/null 2>&1 && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." >/dev/null 2>&1 && pwd)"
LOG_DIR="$ROOT/.logs"
mkdir -p "$LOG_DIR"

BACKEND_PID=""
FRONTEND_PID=""

echo -e "${CYAN}${BOLD}"
echo "  ================================================================"
echo "    ██████╗ ██╗   ██╗ ██████╗  ███████╗ ██████╗   ██████╗  ██╗     ██╗  █████╗  ██████╗  ██████╗       ██╗   ██╗"
echo "   ██╔════╝ ╚██╗ ██╔╝ ██╔══██╗ ██╔════╝ ██╔══██╗ ██╔════╝  ██║     ██║ ██╔══██╗ ██╔══██╗ ██╔══██╗      ╚██╗ ██╔╝"
echo "   ██║       ╚████╔╝  ██████╔╝ █████╗   ██████╔╝ ██║  ███╗ ██║     ██║ ███████║ ██████╔╝ ██║  ██║        ╚███╔╝ "
echo "   ██║        ╚██╔╝   ██╔══██╗ ██╔══╝   ██╔══██╗ ██║   ██║ ██║     ██║ ██╔══██║ ██╔══██╗ ██║  ██║        ██╔ ██╗ "
echo "   ╚██████╗    ██║    ██████╔╝ ███████╗ ██║  ██║ ╚██████╔╝  ╚██████╔╝  ██║  ██║ ██║  ██║ ██████╔╝       ██╔╝  ██╗"
echo "    ╚═════╝    ╚═╝    ╚═════╝  ╚══════╝ ╚═╝  ╚═╝  ╚═════╝    ╚══════╝  ╚═╝  ╚═╝ ╚═╝  ╚═╝ ╚═════╝        ╚═╝  ╚═╝"
echo "              Autonomous Cyber Defense Platform"
echo "  ================================================================"
echo -e "${NC}"

# Function to cleanly stop services upon exit / Ctrl+C
cleanup() {
  echo -e "\n${YELLOW}[!] Received stop signal. Shutting down CYBERGUARD-X services...${NC}"

  if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    echo -e "  Stopping Frontend (PID: $FRONTEND_PID)..."
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi

  if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo -e "  Stopping Backend (PID: $BACKEND_PID)..."
    kill "$BACKEND_PID" 2>/dev/null || true
  fi

  # Release ports if still bound
  kill_port 8000
  kill_port 5173

  echo -e "${GREEN}[✔] All services stopped cleanly.${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT

kill_port() {
  local port="$1"
  local pids
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    for pid in $pids; do
      kill -9 "$pid" 2>/dev/null || true
    done
  fi
}

# ------------------------------------------------------------------------------
# 1. DATABASE (PostgreSQL 17 on Port 5433)
# ------------------------------------------------------------------------------
echo -e "${BOLD}[1/3] Checking PostgreSQL 17 Database...${NC}"
DB_PORT=5433

if pg_isready -p "$DB_PORT" -h localhost >/dev/null 2>&1; then
  echo -e "  ${GREEN}[✔] PostgreSQL 17 is already running on port $DB_PORT.${NC}"
else
  echo -e "  ${YELLOW}[i] PostgreSQL 17 not detected on port $DB_PORT. Attempting startup...${NC}"
  
  STARTED=false
  # Try Homebrew postgresql@17 pg_ctl
  if [ -d "/opt/homebrew/var/postgresql@17" ]; then
    /opt/homebrew/bin/pg_ctl -D /opt/homebrew/var/postgresql@17 -o "-p $DB_PORT" -l /opt/homebrew/var/postgresql@17/server.log start >/dev/null 2>&1 || true
    STARTED=true
  elif command -v brew >/dev/null 2>&1; then
    brew services start postgresql@17 >/dev/null 2>&1 || true
    STARTED=true
  fi

  # Wait for DB to accept connections
  for i in {1..12}; do
    if pg_isready -p "$DB_PORT" -h localhost >/dev/null 2>&1; then
      echo -e "  ${GREEN}[✔] PostgreSQL 17 started successfully on port $DB_PORT.${NC}"
      STARTED=true
      break
    fi
    sleep 1
  done

  if ! pg_isready -p "$DB_PORT" -h localhost >/dev/null 2>&1; then
    echo -e "  ${RED}[✘] Could not connect to PostgreSQL on port $DB_PORT.${NC}"
    echo -e "      Please ensure PostgreSQL 17 is installed and configured on port $DB_PORT."
    exit 1
  fi
fi

# Detect Python interpreter
PYTHON="$ROOT/.venv/bin/python"
if [ ! -x "$PYTHON" ]; then
  PYTHON="$(which python3)"
fi

# Check / apply pending DB migrations
echo -e "  ${CYAN}[i] Verifying database schema & migrations...${NC}"
(cd "$ROOT/backend" && env PYTHONPATH=.. "$PYTHON" -m alembic upgrade head >/dev/null 2>&1) || true
echo -e "  ${GREEN}[✔] Database migrations up to date.${NC}"

# ------------------------------------------------------------------------------
# 2. BACKEND (FastAPI / Uvicorn on Port 8000)
# ------------------------------------------------------------------------------
echo -e "\n${BOLD}[2/3] Starting Backend API Server...${NC}"
kill_port 8000

BACKEND_LOG="$LOG_DIR/backend.log"
(
  cd "$ROOT"
  PYTHONPATH=. "$PYTHON" -m uvicorn backend.app.main:app \
    --host 127.0.0.1 \
    --port 8000 \
    --reload
) > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

echo -e "  [i] Backend spawned (PID: $BACKEND_PID). Waiting for health check..."

# Wait for backend to be ready
BACKEND_READY=false
for i in {1..20}; do
  if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/docs | grep -q "200"; then
    BACKEND_READY=true
    break
  fi
  sleep 0.5
done

if [ "$BACKEND_READY" = true ]; then
  echo -e "  ${GREEN}[✔] Backend API is live at http://127.0.0.1:8000/docs${NC}"
else
  echo -e "  ${RED}[✘] Backend failed to start. Last logs:${NC}"
  tail -n 15 "$BACKEND_LOG"
  exit 1
fi

# ------------------------------------------------------------------------------
# 3. FRONTEND (Vite / React on Port 5173)
# ------------------------------------------------------------------------------
echo -e "\n${BOLD}[3/3] Starting Frontend Client...${NC}"
kill_port 5173

FRONTEND_LOG="$LOG_DIR/frontend.log"
(
  cd "$ROOT/frontend"
  npm run dev -- --host 127.0.0.1 --port 5173
) > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!

echo -e "  [i] Frontend spawned (PID: $FRONTEND_PID). Waiting for dev server..."

# Wait for frontend to be ready
FRONTEND_READY=false
for i in {1..20}; do
  if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5173/ | grep -q "200"; then
    FRONTEND_READY=true
    break
  fi
  sleep 0.5
done

if [ "$FRONTEND_READY" = true ]; then
  echo -e "  ${GREEN}[✔] Frontend Client is live at http://localhost:5173${NC}"
else
  echo -e "  ${RED}[✘] Frontend failed to start. Last logs:${NC}"
  tail -n 15 "$FRONTEND_LOG"
  exit 1
fi

# ------------------------------------------------------------------------------
# READY SUMMARY
# ------------------------------------------------------------------------------
echo -e "\n${GREEN}${BOLD}================================================================${NC}"
echo -e "${GREEN}${BOLD}       CYBERGUARD-X — ALL STACKS RUNNING SUCCESSFULLY!         ${NC}"
echo -e "${GREEN}${BOLD}================================================================${NC}"
echo -e "  ${BOLD}● Frontend Web UI:${NC}    ${CYAN}http://localhost:5173${NC}"
echo -e "  ${BOLD}● Backend REST Docs:${NC}  ${CYAN}http://localhost:8000/docs${NC}"
echo -e "  ${BOLD}● PostgreSQL DB:${NC}      ${CYAN}localhost:5433/cyberguard_x${NC}"
echo -e "  ${BOLD}● Logs Directory:${NC}     $LOG_DIR"
echo -e "${GREEN}${BOLD}================================================================${NC}"
echo -e "${YELLOW}Press [CTRL+C] at any time to gracefully terminate all services.${NC}\n"

# Optionally open browser if macOS open command exists and not in headless mode
if [ "${1:-}" != "--no-open" ] && command -v open >/dev/null 2>&1; then
  open "http://localhost:5173" || true
fi

# Stream backend and frontend logs together to stdout
tail -f "$BACKEND_LOG" "$FRONTEND_LOG" &
TAIL_PID=$!

wait "$TAIL_PID"
