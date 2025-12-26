#!/bin/bash

#
# Sync from Upstream Repository
#
# Pulls files from upstream repo and overlays them into current repo.
#
# Usage:
#   ./sync-from-upstream.sh           # Sync to latest
#   ./sync-from-upstream.sh abc123f   # Sync to specific commit
#   ./sync-from-upstream.sh v1.0.0    # Sync to tag
#

set -e

# =============================================================================
# CONFIGURATION - Edit these values
# =============================================================================

UPSTREAM="https://github.com/acho1833/ride.git"

EXCLUDE=(
  ".git/"
  ".claude/"
  "CLAUDE.md"
  "tasks/"
  ".next/",
  "sync-from-upstream.sh"
)

# =============================================================================
# Script - No need to edit below
# =============================================================================

COMMIT_REF="${1:-HEAD}"
TEMP_DIR="/tmp/upstream-sync-$$"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check for required tools
check_dependencies() {
  for cmd in git rsync; do
    if ! command -v "$cmd" &> /dev/null; then
      log_error "$cmd is required but not installed."
      exit 1
    fi
  done
}

# Build rsync exclude arguments
build_exclude_args() {
  local args=""
  for pattern in "${EXCLUDE[@]}"; do
    args="$args --exclude=$pattern"
  done
  echo "$args"
}

# Cleanup function
cleanup() {
  if [ -d "$TEMP_DIR" ]; then
    log_info "Cleaning up temp directory..."
    rm -rf "$TEMP_DIR"
  fi
}

trap cleanup EXIT

# Main
main() {
  check_dependencies

  log_info "Cloning upstream: $UPSTREAM"
  git clone --quiet "$UPSTREAM" "$TEMP_DIR"

  cd "$TEMP_DIR"

  if [ "$COMMIT_REF" != "HEAD" ]; then
    log_info "Checking out: $COMMIT_REF"
    git checkout --quiet "$COMMIT_REF"
  fi

  COMMIT_SHA=$(git rev-parse --short HEAD)
  COMMIT_MSG=$(git log -1 --format="%B")
  COMMIT_SUBJECT=$(git log -1 --format="%s")

  log_info "Syncing from commit: $COMMIT_SHA - $COMMIT_SUBJECT"

  cd - > /dev/null

  EXCLUDE_ARGS=$(build_exclude_args)

  log_info "Copying files..."
  eval rsync -av --quiet $EXCLUDE_ARGS "$TEMP_DIR/" "./"

  if git diff --quiet && git diff --staged --quiet; then
    log_warn "No changes to commit."
  else
    git add .
    git commit -m "$COMMIT_MSG"
    log_info "Committed changes with upstream message."
  fi

  log_info "Sync complete! (upstream: $COMMIT_SHA)"
}

main
