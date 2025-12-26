#!/bin/bash

#
# Sync from Upstream Repository
#
# Pulls files from upstream repo and overlays them into current repo.
# Uses .sync-config.json for configuration.
#
# Usage:
#   ./sync-from-upstream.sh           # Sync to latest
#   ./sync-from-upstream.sh abc123f   # Sync to specific commit
#   ./sync-from-upstream.sh v1.0.0    # Sync to tag
#

set -e

COMMIT_REF="${1:-HEAD}"
CONFIG_FILE=".sync-config.json"
TEMP_DIR="/tmp/upstream-sync-$$"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check for required tools
check_dependencies() {
  for cmd in git rsync jq; do
    if ! command -v "$cmd" &> /dev/null; then
      log_error "$cmd is required but not installed."
      exit 1
    fi
  done
}

# Read config file
read_config() {
  if [ ! -f "$CONFIG_FILE" ]; then
    log_error "Config file $CONFIG_FILE not found."
    exit 1
  fi

  UPSTREAM=$(jq -r '.upstream' "$CONFIG_FILE")

  if [ "$UPSTREAM" == "null" ] || [ -z "$UPSTREAM" ]; then
    log_error "upstream URL not configured in $CONFIG_FILE"
    exit 1
  fi
}

# Build rsync exclude arguments from config
build_exclude_args() {
  EXCLUDE_ARGS=""

  # Read exclude patterns from config
  while IFS= read -r pattern; do
    EXCLUDE_ARGS="$EXCLUDE_ARGS --exclude=$pattern"
  done < <(jq -r '.exclude[]? // empty' "$CONFIG_FILE")

  echo "$EXCLUDE_ARGS"
}

# Cleanup function
cleanup() {
  if [ -d "$TEMP_DIR" ]; then
    log_info "Cleaning up temp directory..."
    rm -rf "$TEMP_DIR"
  fi
}

# Set trap for cleanup
trap cleanup EXIT

# Main
main() {
  check_dependencies
  read_config

  log_info "Cloning upstream: $UPSTREAM"
  git clone --quiet "$UPSTREAM" "$TEMP_DIR"

  # Checkout specific commit/tag if not HEAD
  cd "$TEMP_DIR"

  if [ "$COMMIT_REF" != "HEAD" ]; then
    log_info "Checking out: $COMMIT_REF"
    git checkout --quiet "$COMMIT_REF"
  fi

  # Get the actual commit SHA and message
  COMMIT_SHA=$(git rev-parse --short HEAD)
  COMMIT_MSG=$(git log -1 --format="%B")
  COMMIT_SUBJECT=$(git log -1 --format="%s")

  log_info "Syncing from commit: $COMMIT_SHA - $COMMIT_SUBJECT"

  # Go back to original directory
  cd - > /dev/null

  # Build exclude arguments
  EXCLUDE_ARGS=$(build_exclude_args)

  # Rsync files (overlay, no delete)
  log_info "Copying files..."
  eval rsync -av --quiet $EXCLUDE_ARGS "$TEMP_DIR/" "./"

  # Check if there are changes to commit
  if git diff --quiet && git diff --staged --quiet; then
    log_warn "No changes to commit."
  else
    # Stage and commit with same message
    git add .
    git commit -m "$COMMIT_MSG"
    log_info "Committed changes with upstream message."
  fi

  log_info "Sync complete! (upstream: $COMMIT_SHA)"
}

main
