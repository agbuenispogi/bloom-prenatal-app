#!/bin/sh
# Project-only Claude memory: Qdrant in embedded (on-disk) mode. No server, nothing leaves this machine.
DIR="$(cd "$(dirname "$0")/.." && pwd)"          # .claude/
PROJECT="$(basename "$(dirname "$DIR")")"
VENV="$DIR/mcp/.venv"
if [ ! -x "$VENV/bin/mcp-server-qdrant" ]; then
  echo "Project memory not installed. Run: ~/.claude/bin/init-project-memory.sh" >&2
  exit 1
fi
export QDRANT_LOCAL_PATH="$DIR/memory/qdrant"
export COLLECTION_NAME="$PROJECT"
export EMBEDDING_MODEL="sentence-transformers/all-MiniLM-L6-v2"
export FASTEMBED_CACHE_PATH="$DIR/mcp/models"
export TOOL_STORE_DESCRIPTION="Save a durable memory about THIS project only (decisions, preferences, quirks, deploy facts). Put the fact in 'information' and short tags in 'metadata'. Never store secrets, tokens or personal data."
export TOOL_FIND_DESCRIPTION="Search THIS project's memory before answering questions about its past decisions, preferences, data sources or deployment. 'query' describes what you need in plain language."
exec "$VENV/bin/mcp-server-qdrant" --transport stdio
