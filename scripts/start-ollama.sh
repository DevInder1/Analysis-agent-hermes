#!/usr/bin/env bash
set -euo pipefail
if ! command -v ollama >/dev/null 2>&1; then
  echo "Install Ollama: https://ollama.com"
  exit 1
fi
ollama serve &
sleep 2
ollama pull gemma4:e4b || true
echo "Ollama ready. Run: ollama run gemma4:e4b"
