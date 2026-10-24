#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if ! command -v ollama >/dev/null 2>&1; then
  echo "Install Ollama: https://ollama.com"
  exit 1
fi
ollama serve &
sleep 2
ollama pull gemma4:e4b || true
ollama create gemma4-hermes -f "$ROOT/config/gemma4-hermes.Modelfile"
echo "Ollama ready. Run: ollama run gemma4-hermes"
