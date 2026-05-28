#!/usr/bin/env bash
# Start Hermes gateway with API server for the Angular dashboard.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Ensure API vars exist in ~/.hermes/.env
ENV_FILE="$HOME/.hermes/.env"
if ! grep -q '^API_SERVER_ENABLED=true' "$ENV_FILE" 2>/dev/null; then
  cat >> "$ENV_FILE" << 'EOF'

# analysis-agent dashboard
API_SERVER_ENABLED=true
API_SERVER_HOST=127.0.0.1
API_SERVER_PORT=8642
API_SERVER_KEY=change-me-local-dev
API_SERVER_CORS_ORIGINS=http://localhost:4200,http://127.0.0.1:4200
EOF
  echo "Added API_SERVER_* to $ENV_FILE"
fi

export API_SERVER_ENABLED=true
export API_SERVER_HOST=127.0.0.1
export API_SERVER_PORT=8642
export API_SERVER_KEY="${API_SERVER_KEY:-change-me-local-dev}"
export API_SERVER_CORS_ORIGINS="${API_SERVER_CORS_ORIGINS:-http://localhost:4200,http://127.0.0.1:4200}"

echo "Starting Hermes gateway → http://${API_SERVER_HOST}:${API_SERVER_PORT}"
exec hermes gateway run --replace
